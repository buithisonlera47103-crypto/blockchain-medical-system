/**
 * /permissions/check 单元测试（服务层）
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MedicalRecordService } from '../../src/services/MedicalRecordService';
import { IPFSService } from '../../src/services/IPFSService';
import { MerkleTreeService } from '../../src/services/MerkleTreeService';
import { AuditService } from '../../src/services/AuditService';
import { Pool } from 'mysql2/promise';
import { Gateway, Network, Contract } from 'fabric-network';
import winston from 'winston';

jest.mock('../../src/services/IPFSService');
jest.mock('../../src/services/MerkleTreeService');
jest.mock('../../src/services/AuditService');
jest.mock('mysql2/promise');
jest.mock('fabric-network');
jest.mock('winston');

describe('Permissions check (service layer)', () => {
  let svc: MedicalRecordService;
  let mockDb: jest.Mocked<Pool>;
  let mockGateway: jest.Mocked<Gateway>;
  let mockNetwork: jest.Mocked<Network>;
  let mockContract: jest.Mocked<Contract>;
  let mockIPFS: jest.Mocked<IPFSService>;
  let mockMerkle: jest.Mocked<MerkleTreeService>;
  let mockAudit: jest.Mocked<AuditService>;
  let mockLogger: jest.Mocked<winston.Logger>;

  let conn: any;

  beforeEach(() => {
    conn = { execute: jest.fn(), query: jest.fn(), release: jest.fn() };
    mockDb = {
      execute: jest.fn(),
      query: jest.fn(),
      getConnection: jest.fn<any>().mockResolvedValue(conn),
    } as any;
    mockGateway = { getNetwork: jest.fn(), disconnect: jest.fn() } as any;
    mockNetwork = { getContract: jest.fn() } as any;
    mockContract = { submitTransaction: jest.fn(), evaluateTransaction: jest.fn() } as any;
    mockIPFS = new (IPFSService as any)();
    mockMerkle = new (MerkleTreeService as any)();
    mockAudit = new (AuditService as any)();
    mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } as any;

    // 创建mock cache
    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      clear: jest.fn(),
      keys: jest.fn().mockReturnValue([]),
    } as any;

    mockGateway.getNetwork.mockResolvedValue(mockNetwork);
    mockNetwork.getContract.mockReturnValue(mockContract);

    svc = new MedicalRecordService(
      mockGateway,
      mockIPFS,
      mockMerkle,
      mockAudit,
      mockCache,
      mockLogger
    );
    (svc as any).contract = mockContract;
  });

  it('无权限时返回 hasAccess=false 且 reason=无访问权限', async () => {
    // findRecordById 存在
    const mockFindRecordById = jest
      .fn<any>()
      .mockResolvedValue({ record_id: 'rec1', patient_id: 'pat1', created_at: new Date() });
    (svc as any).findRecordById = mockFindRecordById;
    // 无授权记录
    const mockFindAccessControl = jest.fn<any>().mockResolvedValue(null);
    (svc as any).findAccessControl = mockFindAccessControl;

    const res = await svc.checkPermission('doc1', 'rec1', 'read', { requesterId: 'doc1' });
    expect(res.hasAccess).toBe(false);
    expect(res.reason).toContain('无访问权限');
  });

  it('授权存在但已过期时返回 hasAccess=false 且 reason=权限已过期', async () => {
    const mockFindRecordById = jest
      .fn<any>()
      .mockResolvedValue({ record_id: 'rec1', patient_id: 'pat1', created_at: new Date() });
    (svc as any).findRecordById = mockFindRecordById;
    const mockFindAccessControl = jest
      .fn<any>()
      .mockResolvedValue({
        access_id: 'acc1',
        action: 'READ',
        expires_at: new Date(Date.now() - 1000),
      });
    (svc as any).findAccessControl = mockFindAccessControl;
    const mockUpdateAccessControlStatus = jest.fn<any>().mockResolvedValue(undefined);
    (svc as any).updateAccessControlStatus = mockUpdateAccessControlStatus;

    const res = await svc.checkPermission('doc1', 'rec1', 'read', { requesterId: 'doc1' });
    expect(res.hasAccess).toBe(false);
    expect(res.reason).toContain('权限已过期');
  });

  it('记录所有者应拥有所有权限', async () => {
    const now = new Date();
    const mockFindRecordById = jest
      .fn<any>()
      .mockResolvedValue({ record_id: 'rec1', patient_id: 'owner1', created_at: now });
    (svc as any).findRecordById = mockFindRecordById;
    const res = await svc.checkPermission('owner1', 'rec1', 'write', { requesterId: 'owner1' });
    expect(res.hasAccess).toBe(true);
    expect(res.reason).toContain('Record owner');
    expect(res.grantedAt).toEqual(now);
  });
});
