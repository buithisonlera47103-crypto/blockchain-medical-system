import { SearchService } from '../../../src/services/SearchService';

// Minimal mock for mysql2/promise Pool
class MockPool {
  public execute = jest.fn<Promise<any>, any[]>();
}

describe('SearchService.initialize', () => {
  test('creates table and indexes when missing', async () => {
    const pool = new MockPool();

    // 1) create table
    pool.execute.mockResolvedValueOnce([[], undefined]);

    // 2) ensureIndex idx_search_type: check -> not exists (cnt=0), then create
    pool.execute.mockResolvedValueOnce([[{ cnt: 0 }], undefined]);
    pool.execute.mockResolvedValueOnce([[], undefined]);

    // 3) ensureIndex idx_search_created_at: check -> not exists, then create
    pool.execute.mockResolvedValueOnce([[{ cnt: 0 }], undefined]);
    pool.execute.mockResolvedValueOnce([[], undefined]);

    // 4) ensureIndex idx_search_updated_at: check -> not exists, then create
    pool.execute.mockResolvedValueOnce([[{ cnt: 0 }], undefined]);
    pool.execute.mockResolvedValueOnce([[], undefined]);

    const svc = new SearchService(pool as any);
    await svc.initialize();

    // Assert: first call is CREATE TABLE
    const firstSql = pool.execute.mock.calls[0]?.[0];
    expect(String(firstSql)).toContain('CREATE TABLE');
    expect(String(firstSql)).toContain('search_records');

    const allSqls = pool.execute.mock.calls.map(c => String(c[0]));
    expect(allSqls.join('\n')).toContain('CREATE INDEX idx_search_type');
    expect(allSqls.join('\n')).toContain('CREATE INDEX idx_search_created_at');
    expect(allSqls.join('\n')).toContain('CREATE INDEX idx_search_updated_at');
  });

  test('does not recreate existing indexes', async () => {
    const pool = new MockPool();

    // create table ok
    pool.execute.mockResolvedValueOnce([[], undefined]);

    // all three indexes already exist: cnt=1 for each check
    pool.execute.mockResolvedValueOnce([[{ cnt: 1 }], undefined]);
    pool.execute.mockResolvedValueOnce([[{ cnt: 1 }], undefined]);
    pool.execute.mockResolvedValueOnce([[{ cnt: 1 }], undefined]);

    const svc = new SearchService(pool as any);
    await svc.initialize();

    // After the first CREATE TABLE call, only 3 check calls should be made (no CREATE INDEX)
    // total calls = 1 (table) + 3 (checks) = 4
    expect(pool.execute).toHaveBeenCalledTimes(4);

    // Verify no CREATE INDEX in subsequent calls
    const subsequentSqls = pool.execute.mock.calls.slice(1).map(c => String(c[0])).join('\n');
    expect(subsequentSqls).not.toMatch(/CREATE INDEX idx_search_type/);
    expect(subsequentSqls).not.toMatch(/CREATE INDEX idx_search_created_at/);
    expect(subsequentSqls).not.toMatch(/CREATE INDEX idx_search_updated_at/);
  });
});

