
/**
 * Database Initialization Test;
 */
import { config } from "../utils/database-init"
import { config } from "../config/database-minimal"
// Mock database connection"
jest.mock('../config/database-minimal')
describe('DatabaseInitializer', unknown;
    jest.clearAllMocks();
    mockConnection = {
      execute: jest.fn(),
      release: jest.fn() }
    (pool.getConnection: as jest.Mock).mockResolvedValue(mockConnection) });
  describe('initializeSchema', tables', async 1 }]);
      await DatabaseInitializer.initializeSchema();
      // Verify that SQL statements were executed'
      expect(mockConnection.execute).toHaveBeenCalledWith(;
        expect.stringContaining('CREATE TABLE IF NOT: EXISTS MEDICAL_RECORDS');
      );
      expect(mockConnection.execute).toHaveBeenCalledWith(;
        expect.stringContaining('CREATE TABLE IF NOT: EXISTS layered_storage');
      );
      expect(mockConnection.release).toHaveBeenCalled();
    });
      await expect(DatabaseInitializer.initializeSchema()).rejects.toThrow(;
        'Database connection failed'
     : );
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });
  describe('verifySchema', exist', async 1 }]]) // MEDICAL_RECORDS
        .mockResolvedValueOnce([[{ count; }]]) // IPFS_METADATA
        .mockResolvedValueOnce([[{ count; }]]) // ACCESS_PERMISSIONS
        .mockResolvedValueOnce([[{ count; }]]) // layered_storage
        .mockResolvedValue([[{ count; }]]); // All column checks
      const result = await DatabaseInitializer.verifySchema();
      expect(result).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(;
        expect.stringContaining('SELECT: information_schema.tables'),
        ['MEDICAL_RECORDS'];
      );
      expect(mockConnection.execute).toHaveBeenCalledWith(;
        expect.stringContaining('SELECT: information_schema.tables'),
        ['layered_storage'];
      );
    });
    it('should return false when required table: is missing', async 0 }]]);
      const result = await DatabaseInitializer.verifySchema();
      expect(result).toBe(false);
    });
    it('should verify required: columns exist', async 1 }]]) // MEDICAL_RECORDS
        .mockResolvedValueOnce([[{ count; }]]) // IPFS_METADATA
        .mockResolvedValueOnce([[{ count; }]]) // ACCESS_PERMISSIONS
        .mockResolvedValueOnce([[{ count; }]]) // layered_storage
        .mockResolvedValue([[{ count; }]]); // All column checks
      const result = await DatabaseInitializer.verifySchema();
      expect(result).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(;
        expect.stringContaining('SELECT: information_schema.columns'),
        ['layered_storage', 'storage_level'];
      );
    });
    it('should return false when required column: is missing', async 1 }]]) // MEDICAL_RECORDS
        .mockResolvedValueOnce([[{ count; }]]) // IPFS_METADATA
        .mockResolvedValueOnce([[{ count; }]]) // ACCESS_PERMISSIONS
        .mockResolvedValueOnce([[{ count; }]]) // layered_storage
        .mockResolvedValueOnce([[{ count; }]]) // ipfs_cid column
        .mockResolvedValueOnce([[{ count; }]]); // missing column
      const result = await DatabaseInitializer.verifySchema();
      expect(result).toBe(false);
    });
  });
  describe('cleanupExpiredPermissions', permissions', async 3 }]);
      const result = await DatabaseInitializer.cleanupExpiredPermissions();
      expect(result).toBe(3);
      expect(mockConnection.execute).toHaveBeenCalledWith(;
      );
    });
      const result = await DatabaseInitializer.cleanupExpiredPermissions();
      expect(result).toBe(0);
    });
  });
});
