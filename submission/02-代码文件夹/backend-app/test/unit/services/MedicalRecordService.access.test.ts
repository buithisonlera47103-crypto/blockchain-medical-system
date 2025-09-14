import { MedicalRecordService } from '../../../src/services/MedicalRecordService';
import { BlockchainService } from '../../../src/services/BlockchainService';

// Minimal mock for mysql2/promise Pool
class MockPool {
  public execute = jest.fn<Promise<any>, any[]>();
  public query = jest.fn<Promise<any>, any[]>();
}

describe('MedicalRecordService access management', () => {
  let pool: MockPool;
  let svc: MedicalRecordService;

  beforeEach(() => {
    pool = new MockPool();
    svc = new MedicalRecordService((pool as unknown) as any);
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('updateAccess grants permission in DB and calls blockchain grantAccess', async () => {
    // DB upsert success
    pool.execute.mockResolvedValueOnce([[], undefined]);

    const grantMock = jest.fn().mockResolvedValue({ success: true });
    jest.spyOn(BlockchainService, 'getInstance').mockReturnValue(({
      grantAccess: grantMock,
    } as unknown) as any);

    const result = await svc.updateAccess(
      'rec-1',
      { granteeId: 'user-2', action: 'read', expiresAt: new Date('2030-01-01T00:00:00Z') },
      'owner-1'
    );

    // SQL verification
    const sql = String(pool.execute.mock.calls[0]?.[0]);
    expect(sql).toContain('INSERT INTO access_permissions');
    expect(sql).toContain('ON DUPLICATE KEY UPDATE');

    // Blockchain grantAccess called
    expect(grantMock).toHaveBeenCalledWith(
      'rec-1',
      'user-2',
      'read',
      '2030-01-01T00:00:00.000Z'
    );

    expect(result).toEqual({ success: true, message: 'access updated' });
  });

  test('revokeAccess deactivates permission in DB and calls blockchain revokeAccess', async () => {
    // DB update success
    pool.execute.mockResolvedValueOnce([[], undefined]);

    const revokeMock = jest.fn().mockResolvedValue({ success: true });
    jest.spyOn(BlockchainService, 'getInstance').mockReturnValue(({
      revokeAccess: revokeMock,
    } as unknown) as any);

    const result = await svc.revokeAccess('rec-2', 'user-3', 'owner-1');

    const sql = String(pool.execute.mock.calls[0]?.[0]);
    expect(sql).toContain('UPDATE access_permissions');
    expect(sql).toContain('SET is_active = FALSE');
    expect(sql).toContain('WHERE record_id = ? AND user_id = ?');

    expect(revokeMock).toHaveBeenCalledWith('rec-2', 'user-3');
    expect(result).toEqual({ success: true, message: 'access revoked' });
  });
});

