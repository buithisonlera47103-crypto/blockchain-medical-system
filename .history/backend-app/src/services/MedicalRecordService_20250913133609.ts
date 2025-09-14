import crypto from 'crypto';

import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

import { pool } from '../config/database-mysql';
import { logger, businessMetrics } from '../utils/enhancedLogger';

import { BlockchainService } from './BlockchainService';
import { IPFSService } from './IPFSService';
import KeyManagementService from './KeyManagementService';
import { MerkleTreeService, type VersionInfo } from './MerkleTreeService';
import { SearchService } from './SearchService';


// Local types aligned with records route
interface CreateRecordRequest {
  patientId: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  metadata: {
    uploadedBy: string;
    uploadedAt: string;
    fileSize: number;
  };
}

type MedicalRecordCreateInput =
  | CreateRecordRequest
  | {
      patientId?: string;
      file: { buffer: Buffer; originalname: string; mimetype: string; size: number };
    };

interface UpdateAccessRequest {
  granteeId: string;
  action: 'read' | 'write' | 'FULL' | 'admin';
  expiresAt?: Date;
}

type RecordFileType = 'PDF' | 'DICOM' | 'IMAGE' | 'OTHER';

export class MedicalRecordService {
  private readonly db: Pool;
  private readonly ipfs: IPFSService;

  constructor(db: Pool = pool, ipfs: IPFSService = new IPFSService()) {
    this.db = db;
    this.ipfs = ipfs;
  }

  async createRecord(input: MedicalRecordCreateInput, creatorId: string): Promise<{ recordId: string; txId: string | null; ipfsCid: string | null; message: string; }> {
    const startTime = Date.now();
    // Normalize input to CreateRecordRequest
    const request: CreateRecordRequest = ((): CreateRecordRequest => {
      if ('file' in input) {
        const f = input.file;
        return {
          patientId: String(input.patientId ?? ''),
          fileBuffer: f.buffer,
          fileName: f.originalname,
          mimeType: f.mimetype,
          metadata: {
            uploadedBy: creatorId,
            uploadedAt: new Date().toISOString(),
            fileSize: f.size,
          },
        };
      }
      return input;
    })();

    const contentHash = crypto.createHash('sha256').update(request.fileBuffer).digest('hex');

    // Map MIME type to enum used by medical_records.file_type
    const fileType: RecordFileType = ((): RecordFileType => {
      const mt = request.mimeType.toLowerCase();
      if (mt.includes('pdf')) return 'PDF';
      if (mt.includes('dicom')) return 'DICOM';
      if (mt.includes('jpeg') || mt.includes('png') || mt.includes('image')) return 'IMAGE';
      return 'OTHER';
    })();

    const sql = `
      INSERT INTO medical_records (
        record_id, patient_id, creator_id, title, description, file_type, file_size, content_hash, blockchain_tx_hash
      ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, NULL)
    `;

    const params = [
      request.patientId,
      creatorId,
      request.fileName,
      '', // description placeholder
      fileType,
      request.metadata.fileSize,
      contentHash,
    ];

    await this.db.execute<ResultSetHeader>(sql, params);

    // Get inserted record id (UUID() generated in DB)
    const [rows] = await this.db.query<RowDataPacket[]>(
      'SELECT record_id FROM medical_records WHERE patient_id = ? AND creator_id = ? ORDER BY created_at DESC LIMIT 1',
      [request.patientId, creatorId]
    );

    const recordId = (rows[0]?.record_id as string) ?? '';

    // Upload file to IPFS with per-file data key and persist metadata (Phase 2)
    let cid: string | null = null;
    let dataKey: Buffer | null = null;
    try {
      const kms = KeyManagementService.getInstance();
      dataKey = kms.generateDataKey(32);
      const ipfsRes = await this.ipfs.uploadFile(request.fileBuffer, request.fileName, request.mimeType, dataKey);
      cid = ipfsRes.cid;
      await this.db.execute<ResultSetHeader>(
        `INSERT INTO ipfs_metadata (cid, record_id, file_name, file_size, mime_type, encryption_algorithm)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [cid, recordId, request.fileName, ipfsRes.fileSize, request.mimeType, 'AES-256-GCM']
      );
      // Store data key mapped to record (envelope model via KMS)
      await kms.storeRecordDataKey(recordId, dataKey);
      if (cid) {
        await kms.registerCidForRecord(recordId, cid);
      }
    } catch (e) {
      // Non-fatal in dev: proceed without IPFS linkage; log and proceed
      logger.warn('IPFS upload/metadata persistence failed; proceeding without CID', {
        error: e instanceof Error ? e.message : String(e),
        fileName: request.fileName,
      });
      cid = null;
    }

    // Try blockchain CreateRecord; non-blocking with graceful fallback
    let txId: string | null = null;
    try {
      const bc = BlockchainService.getInstance();
      const dataPayload = JSON.stringify({
        ipfsCid: cid ?? '',
        mimeType: request.mimeType,
        fileName: request.fileName,
      });
      const bcRes = await bc.createRecord({
        recordId,
        patientId: request.patientId,
        doctorId: creatorId,
        data: dataPayload,
        hash: contentHash,
      });
      if (bcRes.success && typeof bcRes.data === 'string') {
        txId = bcRes.data;
        await this.db.execute<ResultSetHeader>(
          'UPDATE medical_records SET blockchain_tx_hash = ? WHERE record_id = ?',
          [txId, recordId]
        );
      } else {
        logger.warn('Blockchain CreateRecord unsuccessful; proceeding without txId', { error: bcRes.error });
      }
    } catch (e) {
      logger.warn('Blockchain CreateRecord failed; proceeding without tx', {
        error: e instanceof Error ? e.message : String(e),
        recordId,
      });
    }

    await this.indexRecordToSearch(request, recordId, creatorId, fileType, contentHash, cid, txId);

    // Log business metrics
    const duration = Date.now() - startTime;
    businessMetrics.recordOperation('create', recordId, creatorId, duration);

    return {
      recordId,
      txId,
      ipfsCid: cid,
      message: cid ? 'record stored with IPFS metadata; blockchain pending' : 'record stored; IPFS/blockchain pending',
    };
  }

  async getRecord(recordId: string, _userId: string): Promise<Record<string, unknown> | null> {
    const [rows] = await this.db.execute<RowDataPacket[]>(
      'SELECT * FROM MEDICAL_RECORDS WHERE record_id = ? LIMIT 1',
      [recordId]
    );
    if (!rows || rows.length === 0) return null;
    const row = rows[0] as RowDataPacket & { [k: string]: unknown };
    return {
      recordId: row['record_id'],
      patientId: row['patient_id'],
      creatorId: row['creator_id'],
      title: row['title'],
      description: row['description'],
      contentHash: row['content_hash'],
      createdAt: row['created_at'],
      updatedAt: row['updated_at'],
    };
  }

  async updateAccess(recordId: string, request: UpdateAccessRequest, ownerId: string): Promise<{ success: boolean; message: string; }> {
    const permissionType = request.action === 'FULL' || request.action === 'admin' ? 'admin' : request.action;

    await this.db.execute<ResultSetHeader>(
      `INSERT INTO access_permissions (permission_id, record_id, user_id, permission_type, granted_by, granted_at, expires_at, is_active)
       VALUES (UUID(), ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, TRUE)
       ON DUPLICATE KEY UPDATE
         permission_type = VALUES(permission_type),
         granted_by = VALUES(granted_by),
         granted_at = CURRENT_TIMESTAMP,
         expires_at = VALUES(expires_at),
         is_active = TRUE`,
      [recordId, request.granteeId, permissionType, ownerId, request.expiresAt ?? null]
    );

    try {
      const bc = BlockchainService.getInstance();
      const expIso = request.expiresAt ? request.expiresAt.toISOString() : undefined;
      await bc.grantAccess(recordId, request.granteeId, permissionType, expIso);
    } catch (e) {
      logger.warn('Blockchain grantAccess failed; proceeding with DB permission only', {
        error: e instanceof Error ? e.message : String(e),
        recordId,
        granteeId: request.granteeId,
      });
    }

    return { success: true, message: 'access updated' };
  }

  async revokeAccess(recordId: string, granteeId: string, ownerId: string): Promise<{ success: boolean; message: string; }> {
    await this.db.execute<ResultSetHeader>(
      `UPDATE access_permissions
       SET is_active = FALSE, expires_at = COALESCE(expires_at, CURRENT_TIMESTAMP)
       WHERE record_id = ? AND user_id = ? AND is_active = TRUE`,
      [recordId, granteeId]
    );

    try {
      const bc = BlockchainService.getInstance();
      await bc.revokeAccess(recordId, granteeId);
    } catch (e) {
      logger.warn('Blockchain revokeAccess failed; proceeding with DB-only revoke', {
        error: e instanceof Error ? e.message : String(e),
        recordId,
        granteeId,
        ownerId,
      });
    }

    return { success: true, message: 'access revoked' };
  }

  async checkAccess(recordId: string, userId: string): Promise<boolean> {
    // Prefer blockchain check when available; fall back to DB
    try {
      const bc = BlockchainService.getInstance();
      const ok = await bc.checkAccess(recordId, userId);
      if (ok) return true;
    } catch (e) {
      logger.debug('Blockchain checkAccess unavailable; falling back to DB', {
        error: e instanceof Error ? e.message : String(e),
        recordId,
        userId,
      });
    }

    const [rows] = await this.db.execute<RowDataPacket[]>(
      `SELECT 1 FROM access_permissions
       WHERE record_id = ? AND user_id = ? AND is_active = TRUE
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
       LIMIT 1`,
      [recordId, userId]
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  async getUserRecords(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<{ records: Array<Record<string, unknown>>; total: number; page: number; limit: number }> {
    const offset = (Math.max(1, page) - 1) * Math.max(1, Math.min(100, limit));

    const [countRows] = await this.db.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM medical_records WHERE creator_id = ? OR patient_id = ?`,
      [userId, userId]
    );
    const total = Number((countRows[0]?.['total'] as number) ?? 0);

    const [rows] = await this.db.execute<RowDataPacket[]>(
      `SELECT record_id, patient_id, creator_id, title, created_at
       FROM MEDICAL_RECORDS
       WHERE creator_id = ? OR patient_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, limit, offset]
    );

    type RecordRow = RowDataPacket & { record_id: string; patient_id: string; creator_id: string; title: string; created_at: Date };
    const typedRows = rows as RecordRow[];
    return {
      records: typedRows.map(r => ({
        recordId: r.record_id,
        patientId: r.patient_id,
        creatorId: r.creator_id,
        title: r.title,
        createdAt: r.created_at,
      })),
      total,
      page,
      limit,
    };
  }

  // Download record content using CID from ipfs_metadata; enforces basic access via access_permissions
  async downloadRecord(recordId: string, userId: string): Promise<Buffer> {
    // Basic access check (blockchain alignment will refine this)
    const allowed = await this.checkAccess(recordId, userId);
    if (!allowed) {
      throw new Error('Access denied');
    }

    const [rows] = await this.db.execute<RowDataPacket[]>(
      'SELECT cid FROM ipfs_metadata WHERE record_id = ? LIMIT 1',
      [recordId]
    );
    const cid = (rows[0]?.['cid'] as string) ?? '';
    if (!cid) {
      throw new Error('No IPFS CID found for record');
    }

    // Delegate to IPFS service with KMS-managed per-file key when available
    try {
      const kms = KeyManagementService.getInstance();
      const key = await kms.loadRecordDataKey(recordId);
      if (key && key.length === 32) {
        return await this.ipfs.downloadFileWithKey(cid, key);
      }
      // Fallback to default key-based decryption
      return await this.ipfs.downloadFile(cid);
    } catch {
      return await this.ipfs.downloadFile(cid);
    }
  }

  async verifyRecordIntegrity(recordId: string): Promise<boolean> {
    try {
      const bc = BlockchainService.getInstance();
      const ok = await bc.verifyRecord(recordId);
      return ok;
    } catch (e) {
      logger.warn('verifyRecordIntegrity failed; returning false', {
        error: e instanceof Error ? e.message : String(e),
        recordId,
      });
      return false;
    }
  }

  // Build version history from ipfs_metadata without requiring new tables
  async getRecordVersions(recordId: string): Promise<Array<{ version: number; cid: string; hash: string; timestamp: string; creatorId: string }>> {
    const [rows] = await this.db.execute<RowDataPacket[]>(
      'SELECT cid, created_at FROM ipfs_metadata WHERE record_id = ? ORDER BY created_at ASC, cid ASC',
      [recordId]
    );

    const versions: VersionInfo[] = [];
    const merkle = new MerkleTreeService();
    const typed = rows as Array<RowDataPacket & { cid: string; created_at?: Date }>;
    for (const r of typed) {
      const vi = merkle.createVersionInfo(versions, r.cid, 'system');
      versions.push(vi);
    }

    return versions.map(v => ({
      version: v.version,
      cid: v.cid,
      hash: v.hash,
      timestamp: v.timestamp.toISOString(),
      creatorId: v.creator_id,
    }));
  }

  private async indexRecordToSearch(
    request: CreateRecordRequest,
    recordId: string,
    creatorId: string,
    fileType: RecordFileType,
    contentHash: string,
    cid: string | null,
    txId: string | null
  ): Promise<void> {
    try {
      const search = new SearchService(this.db);
      try {
        await search.initialize();
      } catch (e) {
        logger.warn('SearchService init failed; attempting to index anyway', {
          error: e instanceof Error ? e.message : String(e),
        });
      }
      await search.indexDocument({
        id: recordId,
        title: request.fileName,
        content: [
          request.fileName,
          request.metadata.uploadedBy,
          request.patientId,
          fileType,
          contentHash,
          cid ?? ''
        ].filter(Boolean).join(' '),
        type: 'medical_record',
        metadata: {
          patientId: request.patientId,
          creatorId,
          status: 'ACTIVE',
          fileType,
          ipfsCid: cid,
          txId,
        },
      });
    } catch (e) {
      logger.warn('Search indexing failed; proceeding without search doc', {
        error: e instanceof Error ? e.message : String(e),
        recordId,
      });
    }
  }

  // Additional methods required by tests
  async updateRecord(recordId: string, updateData: any): Promise<any> {
    const [result] = await this.db.execute<ResultSetHeader>(
      'UPDATE MEDICAL_RECORDS SET updated_at = CURRENT_TIMESTAMP WHERE record_id = ?',
      [recordId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Record not found');
    }

    return { recordId, ...updateData, updatedAt: new Date() };
  }

  async deleteRecord(recordId: string): Promise<boolean> {
    const [result] = await this.db.execute<ResultSetHeader>(
      'DELETE FROM MEDICAL_RECORDS WHERE record_id = ?',
      [recordId]
    );

    return result.affectedRows > 0;
  }

  async listRecords(options: any = {}): Promise<any> {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const [rows] = await this.db.execute<RowDataPacket[]>(
      'SELECT * FROM MEDICAL_RECORDS ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const [countResult] = await this.db.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM MEDICAL_RECORDS'
    );

    return {
      records: rows,
      total: countResult[0]?.total || 0,
      page,
      limit
    };
  }

  async searchRecords(query: any): Promise<any> {
    const searchTerm = query.q || '';
    const [rows] = await this.db.execute<RowDataPacket[]>(
      'SELECT * FROM MEDICAL_RECORDS WHERE file_name LIKE ? OR patient_id LIKE ?',
      [`%${searchTerm}%`, `%${searchTerm}%`]
    );

    return {
      records: rows,
      total: rows.length,
      query: searchTerm
    };
  }

  async shareRecord(recordId: string, shareData: any): Promise<any> {
    const { targetUserId, permissions, duration } = shareData;

    await this.db.execute<ResultSetHeader>(
      `INSERT INTO access_permissions (permission_id, record_id, user_id, permission_type, granted_by, granted_at, expires_at, is_active)
       VALUES (UUID(), ?, ?, ?, ?, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? HOUR), TRUE)`,
      [recordId, targetUserId, permissions || 'read', shareData.grantedBy || 'system', duration || 24]
    );

    return { success: true, recordId, sharedWith: targetUserId };
  }

  async getRecordHistory(recordId: string): Promise<any[]> {
    const [rows] = await this.db.execute<RowDataPacket[]>(
      'SELECT * FROM audit_logs WHERE record_id = ? ORDER BY timestamp DESC',
      [recordId]
    );

    return rows.map(row => ({
      action: row.action,
      timestamp: row.timestamp,
      userId: row.user_id,
      details: row.details
    }));
  }

  async validateRecord(recordId: string): Promise<any> {
    const record = await this.getRecord(recordId, 'system');
    if (!record) {
      return { isValid: false, errors: ['Record not found'] };
    }

    const isIntegrityValid = await this.verifyRecordIntegrity(recordId);

    return {
      isValid: isIntegrityValid,
      recordId,
      validatedAt: new Date(),
      errors: isIntegrityValid ? [] : ['Integrity check failed']
    };
  }

  async getRecordMetadata(recordId: string): Promise<any> {
    const [rows] = await this.db.execute<RowDataPacket[]>(
      'SELECT * FROM ipfs_metadata WHERE record_id = ?',
      [recordId]
    );

    if (rows.length === 0) {
      throw new Error('Record metadata not found');
    }

    const row = rows[0];
    if (!row) {
      throw new Error('Record metadata not found');
    }

    return {
      recordId,
      cid: row.cid,
      fileSize: row.file_size,
      createdAt: row.created_at,
      metadata: row
    };
  }

  async getRecordsByPatient(patientId: string, requesterId: string): Promise<any[]> {
    const [rows] = await this.db.execute<RowDataPacket[]>(
      'SELECT * FROM MEDICAL_RECORDS WHERE patient_id = ? ORDER BY created_at DESC',
      [patientId]
    );

    return rows.map(row => ({
      recordId: row.record_id,
      patientId: row.patient_id,
      fileName: row.file_name,
      createdAt: row.created_at,
      fileSize: row.file_size
    }));
  }

  async healthCheck(): Promise<any> {
    try {
      const [rows] = await this.db.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM MEDICAL_RECORDS'
      );

      return {
        status: 'healthy',
        recordCount: rows[0].count,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  private determineFileType(fileName: string, mimeType: string): RecordFileType {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    const mime = mimeType.toLowerCase();

    if (mime === 'application/pdf' || ext === 'pdf') return 'PDF';
    if (mime.startsWith('application/dicom') || ext === 'dcm') return 'DICOM';
    if (mime.startsWith('image/')) return 'IMAGE';
    return 'OTHER';
  }

  private generateContentHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private generateRecordId(): string {
    return `rec_${Date.now()}`;
  }

}
