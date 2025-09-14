/**
 * 数据迁移服务类
 * 处理数据导入、导出和迁移相关的业务逻辑
 */

import crypto from 'crypto';
import { Readable } from 'stream';

import csv from 'csv-parser';
import { Pool, RowDataPacket } from 'mysql2/promise';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';

import { Logger } from '../utils/logger';

import { AuditService } from './AuditService';
import { BlockchainService } from './BlockchainService';
import { CacheLike } from './CacheService';
import { IPFSService } from './IPFSService';

// 枚举定义
enum MigrationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

enum OperationType {
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
}



// 接口定义
interface MigrationLog {
  log_id: string;
  user_id: string;
  operation_type: OperationType;
  source_type: string;
  status: MigrationStatus;
  total_records: number;
  processed_records: number;
  failed_records: number;
  file_path?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface MigrationLogRow {
  log_id: string;
  user_id: string;
  operation_type: string;
  source_type: string;
  status: string;
  total_records: number;
  processed_records: number;
  failed_records: number;
  file_path?: string;
  error_message?: string;
  metadata?: string;
  created_at: Date;
  updated_at: Date;
}

interface MigrationStats {
  totalImports: number;
  totalExports: number;
  successfulImports: number;
  failedImports: number;
  successfulExports: number;
  failedExports: number;
  lastImportDate?: Date;
  lastExportDate?: Date;
}

interface CSVRecord {
  patient_id: string;
  title: string;
  description?: string;
  file_type: string;
  content: string;
  source_system?: string;
}

interface ImportResult {
  recordId: string;
  success: boolean;
  error?: string;
  rowIndex: number;
}



interface ExtendedMedicalRecord {
  record_id: string;
  patient_id: string;
  creator_id: string;
  title: string;
  description?: string;
  file_type: string;
  file_size: number;
  content_hash: string;
  status: string;
  source_system?: string;
  created_at: Date;
  updated_at: Date;
  cid?: string;
  encryption_key?: string;
}

interface PaginatedMigrationLogs {
  logs: MigrationLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface MigrationImportResponse {
  success: boolean;
  message: string;
  logId: string;
  importedCount?: number;
  failedCount?: number;
}

interface ExportResult {
  stream: Readable;
  filename: string;
  contentType: string;
}

/**
 * 数据迁移服务
 * 处理数据导入、导出和迁移相关的业务逻辑
 */
export class MigrationService {
  private readonly BATCH_SIZE = 100;
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  constructor(
    private readonly db: Pool,
    private readonly logger: Logger,
    private readonly cache: CacheLike,
    private readonly ipfsService: IPFSService,
    private readonly auditService: AuditService,
    private readonly blockchainService: BlockchainService
  ) {}

  /**
   * 初始化Fabric网络连接
   */
  async initializeFabricNetwork(): Promise<void> {
    try {
      await this.blockchainService.initialize();
      this.logger.info('Migration Service: 区块链网络连接初始化成功');
    } catch (error: unknown) {
      this.logger.error('Migration Service: 区块链网络连接初始化失败:', error);
      throw error;
    }
  }

  /**
   * 导入数据
   * @param file 上传的文件
   * @param sourceType 数据源类型
   * @param userId 用户ID
   * @param fileName 文件名
   * @returns 导入结果
   */
  async importData(
    file: Buffer,
    sourceType: string,
    userId: string,
    fileName?: string
  ): Promise<MigrationImportResponse> {
    const logId = uuidv4();
    let importedCount = 0;
    const failed: number[] = [];

    try {
      // 1. 验证文件大小
      if (file.length > this.MAX_FILE_SIZE) {
        throw new Error(`文件大小超过限制 (${this.MAX_FILE_SIZE / 1024 / 1024}MB)`);
      }

      // 2. 创建迁移日志
      await this.createMigrationLog({
        log_id: logId,
        user_id: userId,
        operation_type: OperationType.IMPORT,
        source_type: sourceType,
        status: MigrationStatus.IN_PROGRESS,
        total_records: 0,
        processed_records: 0,
        failed_records: 0,
        file_path: fileName,
      });

      // 3. 解析文件内容
      const records = await this.parseImportFile(file, sourceType);
      this.logger.info(`解析到 ${records.length} 条记录`);

      // 4. 更新总记录数
      await this.updateMigrationLog(logId, {
        total_records: records.length,
      });

      // 5. 批量处理记录
      const results = await this.processBatchImport(records, userId, logId);

      // 6. 统计结果
      importedCount = results.filter(r => r.success).length;
      failed.push(...results.filter(r => !r.success).map(r => r.rowIndex));

      // 7. 更新迁移日志
      await this.updateMigrationLog(logId, {
        status: failed.length > 0 && importedCount === 0 ? MigrationStatus.FAILED : MigrationStatus.COMPLETED,
        processed_records: importedCount,
        failed_records: failed.length,
        error_message: failed.length > 0 ? `${failed.length} 条记录导入失败` : undefined,
      });

      // 8. 记录审计日志
      await this.auditService.logAction({
        user_id: userId,
        action: 'DATA_IMPORT',
        resource: 'migration',
        resource_type: 'MIGRATION',
        resource_id: logId,
        details: {
          source_type: sourceType,
          total_records: records.length,
          imported_count: importedCount,
          failed_count: failed.length,
        },
        ip_address: '',
        user_agent: '',
      });

      return {
        success: true,
        message:
          failed.length === 0
            ? `成功导入 ${importedCount} 条记录`
            : `导入 ${importedCount} 条记录，${failed.length} 条失败`,
        logId,
        importedCount,
        failedCount: failed.length,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateMigrationLog(logId, {
        status: MigrationStatus.FAILED,
        error_message: errorMessage,
      });

      throw error;
    }
  }

  /**
   * 导出数据
   * @param format 导出格式
   * @param recordIds 记录ID列表
   * @param userId 用户ID
   * @param filters 过滤条件
   * @returns 导出的文件流
   */
  async exportData(
    format: 'csv' | 'pdf',
    recordIds: string[],
    userId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      patientId?: string;
    }
  ): Promise<ExportResult> {
    const logId = uuidv4();

    try {
      // 1. 创建导出日志
      await this.createMigrationLog({
        log_id: logId,
        user_id: userId,
        operation_type: OperationType.EXPORT,
        source_type: format.toUpperCase(),
        status: MigrationStatus.IN_PROGRESS,
        total_records: 0,
        processed_records: 0,
        failed_records: 0,
      });

      // 2. 获取记录数据
      const records = await this.getRecordsForExport(recordIds, userId, filters);

      if (records.length === 0) {
        throw new Error('没有找到可导出的记录');
      }

      // 3. 生成导出文件
      let result: ExportResult;

      if (format === 'csv') {
        result = await this.generateCSVExport(records, logId);
      } else {
        result = await this.generatePDFExport(records, logId);
      }

      // 4. 更新导出日志
      await this.updateMigrationLog(logId, {
        status: MigrationStatus.COMPLETED,
        processed_records: records.length,
        total_records: records.length,
      });

      // 记录审计日志
      await this.auditService.logAction({
        user_id: userId,
        action: 'DATA_EXPORT',
        resource: 'migration',
        resource_type: 'MIGRATION',
        resource_id: logId,
        details: {
          format,
          record_count: records.length,
        },
        ip_address: '',
        user_agent: '',
      });

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateMigrationLog(logId, {
        status: MigrationStatus.FAILED,
        error_message: errorMessage,
      });

      throw error;
    }
  }

  /**
   * 获取迁移日志列表
   * @param userId 用户ID
   * @param page 页码
   * @param limit 每页数量
   * @param filters 过滤条件
   * @returns 分页的迁移日志
   */
  async getMigrationLogs(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      operation_type?: OperationType;
      status?: string;
      source_type?: string;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<PaginatedMigrationLogs> {
    try {
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE user_id = ?';
      const queryParams: (string | number)[] = [userId];

      // 构建过滤条件
      if (filters?.operation_type) {
        whereClause += ' AND operation_type = ?';
        queryParams.push(filters.operation_type);
      }

      if (filters?.status) {
        whereClause += ' AND status = ?';
        queryParams.push(filters.status);
      }

      if (filters?.source_type) {
        whereClause += ' AND source_type = ?';
        queryParams.push(filters.source_type);
      }

      if (filters?.start_date) {
        whereClause += ' AND created_at >= ?';
        queryParams.push(filters.start_date);
      }

      if (filters?.end_date) {
        whereClause += ' AND created_at <= ?';
        queryParams.push(filters.end_date);
      }

      // 获取总数
      const countResult = await this.db.query(
        `SELECT COUNT(*) as total FROM MIGRATION_LOG ${whereClause}`,
        queryParams
      );
      const countRows = (countResult as RowDataPacket[] | { rows: RowDataPacket[] });
      const total = ('rows' in countRows ? countRows.rows[0]?.total : countRows[0]?.total) ?? 0;
      const totalPages = Math.ceil(total / limit);

      // 获取分页数据
      const result = await this.db.query(
        `SELECT * FROM MIGRATION_LOG ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
      );
      const queryResult = (result as RowDataPacket[] | { rows: RowDataPacket[] });
      const rows = 'rows' in queryResult ? queryResult.rows : queryResult;

      const logs: MigrationLog[] = rows.map((row: RowDataPacket) =>
        this.mapRowToMigrationLog(row as MigrationLogRow)
      );

      return {
        logs,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error: unknown) {
      this.logger.error('获取迁移日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取迁移统计信息
   * @param userId 用户ID
   * @returns 迁移统计
   */
  async getMigrationStats(userId: string): Promise<MigrationStats> {
    const cacheKey = `migration_stats_${userId}`;
    const cached = await this.cache.get<MigrationStats>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.db.query(
        `SELECT 
          operation_type,
          status,
          COUNT(*) as count,
          MAX(created_at) as last_date
        FROM MIGRATION_LOG 
        WHERE user_id = ? 
        GROUP BY operation_type, status`,
        [userId]
      );

      const statsResult = (result as RowDataPacket[] | { rows: RowDataPacket[] });
      const statsRows = 'rows' in statsResult ? statsResult.rows : statsResult;

      const stats: MigrationStats = {
        totalImports: 0,
        totalExports: 0,
        successfulImports: 0,
        failedImports: 0,
        successfulExports: 0,
        failedExports: 0,
      };

      // 计算统计数据
      statsRows.forEach((row: RowDataPacket) => {
        if (row.operation_type === 'IMPORT') {
          stats.totalImports += row.count;
          if (row.status === 'COMPLETED') {
            stats.successfulImports += row.count;
          } else if (row.status === 'FAILED') {
            stats.failedImports += row.count;
          }
          if (
            row.last_date &&
            (!stats.lastImportDate || new Date(row.last_date) > stats.lastImportDate)
          ) {
            stats.lastImportDate = new Date(row.last_date);
          }
        } else if (row.operation_type === 'EXPORT') {
          stats.totalExports += row.count;
          if (row.status === 'COMPLETED') {
            stats.successfulExports += row.count;
          } else if (row.status === 'FAILED') {
            stats.failedExports += row.count;
          }
          if (
            row.last_date &&
            (!stats.lastExportDate || new Date(row.last_date) > stats.lastExportDate)
          ) {
            stats.lastExportDate = new Date(row.last_date);
          }
        }
      });

      void this.cache.set(cacheKey, stats, 300); // 缓存5分钟
      return stats;
    } catch (error: unknown) {
      this.logger.error('获取迁移统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取迁移日志
   * @param logId 日志ID
   * @returns 迁移日志
   */
  async getMigrationLog(logId: string): Promise<MigrationLog | null> {
    try {
      const result = await this.db.query('SELECT * FROM MIGRATION_LOG WHERE log_id = ?', [logId]);

      const logResult = (result as RowDataPacket[] | { rows: RowDataPacket[] });
      const rows = 'rows' in logResult ? logResult.rows : logResult;
      if (rows.length === 0) {
        return null;
      }

      return this.mapRowToMigrationLog(rows[0] as MigrationLogRow);
    } catch (error: unknown) {
      this.logger.error('获取迁移日志失败:', error);
      throw error;
    }
  }

  /**
   * 解析导入文件
   */
  private async parseImportFile(file: Buffer, sourceType: string): Promise<CSVRecord[]> {
    if (sourceType !== 'CSV') {
      throw new Error('目前只支持CSV格式的文件导入');
    }

    return new Promise((resolve, reject) => {
      const records: CSVRecord[] = [];
      const stream = Readable.from(file.toString());

      stream
        .pipe(csv())
        .on('data', (data: Record<string, string>) => {
          // 验证必需字段
          if (!data.patient_id || !data.title || !data.file_type || !data.content) {
            this.logger.warn('跳过无效记录:', data);
            return;
          }

          records.push({
            patient_id: data.patient_id,
            title: data.title,
            description: data.description ?? '',
            file_type: data.file_type,
            content: data.content,
            source_system: data.source_system ?? 'IMPORT',
          });
        })
        .on('end', () => {
          resolve(records);
        })
        .on('error', (error: unknown) => {
          const err = error instanceof Error ? error : new Error(String(error));
          reject(err);
        });
    });
  }

  /**
   * 批量处理导入
   */
  private async processBatchImport(
    records: CSVRecord[],
    userId: string,
    logId: string
  ): Promise<ImportResult[]> {
    const results: ImportResult[] = [];
    const batchCount = Math.ceil(records.length / this.BATCH_SIZE);

    for (let i = 0; i < batchCount; i++) {
      const start = i * this.BATCH_SIZE;
      const end = Math.min(start + this.BATCH_SIZE, records.length);
      const batch = records.slice(start, end);

      this.logger.info(`处理批次 ${i + 1}/${batchCount}，记录 ${start + 1}-${end}`);

      const batchResults = await this.processBatch(batch, userId, start);
      results.push(...batchResults);

      // 更新进度
      await this.updateMigrationLog(logId, {
        processed_records: results.filter(r => r.success).length,
        failed_records: results.filter(r => !r.success).length,
      });

      this.logger.info(
        `批次 ${i + 1}/${batchCount} 完成，当前进度: ${results.length}/${records.length}`
      );
    }

    return results;
  }

  /**
   * 处理单个批次
   */
  private async processBatch(
    batch: CSVRecord[],
    userId: string,
    startIndex: number
  ): Promise<ImportResult[]> {
    const results: ImportResult[] = [];

    for (let i = 0; i < batch.length; i++) {
      const record = batch[i];
      if (!record) {
        continue;
      }
      const rowIndex = startIndex + i + 1;

      try {
        const recordId = await this.createMedicalRecordFromCSV(record, userId);

        results.push({
          recordId: recordId ?? '',
          success: true,
          rowIndex,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`处理第 ${rowIndex} 行失败:`, error);
        results.push({
          recordId: '',
          success: false,
          error: errorMessage,
          rowIndex,
        });
      }
    }

    return results;
  }

  /**
   * 从CSV记录创建医疗记录
   */
  private async createMedicalRecordFromCSV(csvRecord: CSVRecord, userId: string): Promise<string> {
    const recordId = uuidv4();

    // 1. 准备文件内容
    const fileBuffer = Buffer.from(csvRecord.content, 'utf8');
    const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // 2. 上传到IPFS
    const ipfsUpload = await this.ipfsService.uploadFile(fileBuffer, `${recordId}.json`, 'application/json');
    const ipfsCid = ipfsUpload && (typeof ipfsUpload === 'object' && 'cid' in ipfsUpload ? ipfsUpload.cid : ipfsUpload);

    // 3. 插入医疗记录
    await this.db.query(
      `INSERT INTO MEDICAL_RECORDS (
        record_id, patient_id, creator_id, title, description,
        file_type, file_size, content_hash, status, source_system,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, NOW(), NOW())`,
      [
        recordId,
        csvRecord.patient_id,
        userId,
        csvRecord.title,
        csvRecord.description,
        csvRecord.file_type,
        fileBuffer.length,
        contentHash,
        csvRecord.source_system,
      ]
    );

    // 4. 插入IPFS元数据
    await this.db.query(
      `INSERT INTO IPFS_METADATA (cid, record_id, encryption_key, file_size, file_hash)
       VALUES (?, ?, ?, ?, ?)`,
      [
        ipfsCid,
        recordId,
        process.env['KMS_MODE'] === 'envelope'
          ? 'ENVELOPE'
          : process.env['ENCRYPTION_KEY'] ?? 'default',
        fileBuffer.length,
        contentHash,
      ]
    );

    return recordId;
  }

  /**
   * 获取导出记录
   */
  private async getRecordsForExport(
    recordIds: string[],
    userId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      patientId?: string;
    }
  ): Promise<ExtendedMedicalRecord[]> {
    let query = `
      SELECT 
        mr.*,
        im.cid,
        im.encryption_key
      FROM MEDICAL_RECORDS mr
      LEFT JOIN IPFS_METADATA im ON mr.record_id = im.record_id
      WHERE mr.creator_id = ?
    `;
    const params: (string | number)[] = [userId];

    if (recordIds.length > 0) {
      query += ` AND mr.record_id IN (${recordIds.map(() => '?').join(',')})`;
      params.push(...recordIds);
    }

    if (filters?.startDate) {
      query += ` AND mr.created_at >= ?`;
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      query += ` AND mr.created_at <= ?`;
      params.push(filters.endDate);
    }

    if (filters?.patientId) {
      query += ` AND mr.patient_id = ?`;
      params.push(filters.patientId);
    }

    query += ` ORDER BY mr.created_at DESC LIMIT 1000`;

    const result = await this.db.query(query, params);
    const queryResult = result as RowDataPacket[] | { rows: RowDataPacket[] };
    const rows = 'rows' in queryResult ? queryResult.rows : queryResult;
    return rows as ExtendedMedicalRecord[];
  }

  /**
   * 生成CSV导出
   */
  private async generateCSVExport(
    records: ExtendedMedicalRecord[],
    _logId: string
  ): Promise<ExportResult> {
    const csvHeader =
      'Record ID,Patient ID,Title,Description,File Type,File Size,Status,Created At\n';

    const csvData = records
      .map(record => {
        return [
          record.record_id ?? '',
          record.patient_id ?? '',
          `"${(record.title ?? '').replace(/"/g, '""')}"`,
          `"${(record.description ?? '').replace(/"/g, '""')}"`,
          record.file_type ?? '',
          record.file_size ?? 0,
          record.status ?? 'ACTIVE',
          record.created_at ? new Date(record.created_at).toISOString() : '',
        ].join(',');
      })
      .join('\n');

    const csvContent = csvHeader + csvData;
    const stream = Readable.from([csvContent]);

    return {
      stream,
      filename: `medical_records_export_${new Date().toISOString().split('T')[0]}.csv`,
      contentType: 'text/csv',
    };
  }

  /**
   * 生成PDF导出
   */
  private async generatePDFExport(
    records: ExtendedMedicalRecord[],
    _logId: string
  ): Promise<ExportResult> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const stream = Readable.from([buffer]);
        resolve({
          stream,
          filename: `medical_records_export_${new Date().toISOString().split('T')[0]}.pdf`,
          contentType: 'application/pdf',
        });
      });

      doc.on('error', reject);

      // 生成PDF内容
      doc.fontSize(20).text('医疗记录导出报告', 100, 100);
      doc.fontSize(12).text(`导出时间: ${new Date().toLocaleString('zh-CN')}`, 100, 130);
      doc.text(`记录数量: ${records.length}`, 100, 150);
      doc.text(`导出ID: ${_logId}`, 100, 170);

      let yPosition = 200;

      records.forEach((record, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 100;
        }

        doc.fontSize(14).text(`${index + 1}. ${record.title ?? '未命名记录'}`, 100, yPosition);
        yPosition += 20;

        doc
          .fontSize(10)
          .text(`记录ID: ${record.record_id}`, 120, yPosition)
          .text(`患者ID: ${record.patient_id}`, 120, yPosition + 15)
          .text(`文件类型: ${record.file_type ?? '未知'}`, 120, yPosition + 30)
          .text(
            `创建时间: ${new Date(record.created_at).toLocaleString('zh-CN')}`,
            120,
            yPosition + 45
          );

        if (record.description) {
          doc.text(`描述: ${record.description}`, 120, yPosition + 60);
          yPosition += 80;
        } else {
          yPosition += 65;
        }

        yPosition += 20;
      });

      doc.end();
    });
  }

  /**
   * 创建迁移日志
   */
  private async createMigrationLog(log: Partial<MigrationLog>): Promise<void> {
    const logId = log.log_id ?? uuidv4();

    await this.db.query(
      `INSERT INTO MIGRATION_LOG (
        log_id, user_id, operation_type, source_type, status,
        total_records, processed_records, failed_records,
        file_path, error_message, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        logId,
        log.user_id,
        log.operation_type,
        log.source_type,
        log.status,
        log.total_records ?? 0,
        log.processed_records ?? 0,
        log.failed_records ?? 0,
        log.file_path,
        log.error_message,
        log.metadata ? JSON.stringify(log.metadata) : null,
      ]
    );
  }

  /**
   * 更新迁移日志
   */
  private async updateMigrationLog(logId: string, updates: Partial<MigrationLog>): Promise<void> {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        if (key === 'metadata' && typeof value === 'object') {
          values.push(JSON.stringify(value));
        } else if (value instanceof Date) {
          values.push(value.toISOString());
        } else if (typeof value === 'object') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value as string | number | null);
        }
      }
    });

    if (fields.length > 0) {
      fields.push('updated_at = NOW()');
      values.push(logId);

      await this.db.query(`UPDATE MIGRATION_LOG SET ${fields.join(', ')} WHERE log_id = ?`, values);
    }
  }

  /**
   * 映射数据库行到迁移日志对象
   */
  private mapRowToMigrationLog(row: MigrationLogRow): MigrationLog {
    return {
      log_id: row.log_id,
      user_id: row.user_id,
      operation_type: row.operation_type as OperationType,
      source_type: row.source_type,
      status: row.status as MigrationStatus,
      total_records: row.total_records,
      processed_records: row.processed_records,
      failed_records: row.failed_records,
      file_path: row.file_path,
      error_message: row.error_message,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
