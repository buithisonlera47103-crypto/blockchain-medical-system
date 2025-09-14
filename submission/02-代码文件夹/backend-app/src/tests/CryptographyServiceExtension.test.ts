

import { config } from "../services/CryptographyServiceExtension"
import { config } from "../config/database"
jest.mock('crypto', jest.fn(),
  createCipheriv: jest.fn(),
  createDecipheriv: jest.fn()
}))
describe('CryptographyServiceExtension', CryptographyServiceExtension;
  let mockConnection unknown'
  const mockedCrypto unknown = jest.requireMock('crypto');
    jest.clearAllMocks();
    jest.restoreAllMocks();
    mockConnection = {
      execute: jest.fn(),
      release: jest.fn() }
    jest.spyOn(pool, unknown);
    (CryptographyServiceExtension: as unknown).instance = undefined;
  });
      const instance1 = CryptographyServiceExtension.getInstance();
      const instance2 = CryptographyServiceExtension.getInstance();
      expect(instance1).toBe(instance2); });
  });
      process.env.KMS_MODE = 'local'
      delete process.env.KMS_MASTER_KEY;
      service = CryptographyServiceExtension.getInstance();
      expect(service).toBeDefined(); });
      process.env.KMS_MODE = 'envelope'
      process.env.KMS_MASTER_KEY = 'test-master-key-32-bytes-exactly'
      service = CryptographyServiceExtension.getInstance();
      expect(service).toBeDefined(); });
      process.env.KMS_MODE = 'envelope'
      delete process.env.KMS_MASTER_KEY;
      service = CryptographyServiceExtension.getInstance();
      expect(service).toBeDefined(); });
      process.env.KMS_MODE = 'envelope'
      process.env.KMS_MASTER_KEY = 'short'
      service = CryptographyServiceExtension.getInstance();
      expect(service).toBeDefined(); });
      process.env.KMS_MODE = 'envelope'
      process.env.KMS_MASTER_KEY =;
        'very-long-master-key-that-exceeds-32-bytes-limit-and-should-be-truncated'
      service = CryptographyServiceExtension.getInstance();
      expect(service).toBeDefined(); });
  });
      service = CryptographyServiceExtension.getInstance(); });
      const mockKey = Buffer.from('mock-32-byte-key-for-testing-data');
      mockedCrypto.randomBytes.mockReturnValue(mockKey);
      const dataKey = service.generateDataKey();
      expect(mockedCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(dataKey).toBe(mockKey); });
  });
      process.env.KMS_MODE = 'local'
      (CryptographyServiceExtension: as unknown).instance = undefined;
      service = CryptographyServiceExtension.getInstance() });
      const recordId = 'test-record-id'
      await service.saveEnvelopeKey(recordId, dataKey);
      expect(pool.getConnection).not.toHaveBeenCalled(); });
  });
      process.env.KMS_MODE = 'envelope'
      process.env.KMS_MASTER_KEY = 'test-master-key-32-bytes-exactly'
      (CryptographyServiceExtension: as unknown).instance = undefined;
      service = CryptographyServiceExtension.getInstance() });
      const recordId = 'test-record-id'
      const mockIv = Buffer.from('mock-iv-12bytes');
      const mockTag = Buffer.from('auth-tag');
      mockedCrypto.randomBytes.mockReturnValue(mockIv);
      const mockCipher = {
  // TODO: Refactor object
}
      mockedCrypto.createCipheriv.mockReturnValue(mockCipher);
      await service.saveEnvelopeKey(recordId, dataKey);
      expect(mockedCrypto.randomBytes).toHaveBeenCalledWith(12);
      expect(mockedCrypto.createCipheriv).toHaveBeenCalledWith(;
        'aes-256-gcm',
       : expect.any(Buffer),
        mockIv;
      );
      expect(mockConnection.execute).toHaveBeenCalledWith(;
        [recordId, expect.stringContaining('AES-256-GCM')];
      );
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });
      process.env.KMS_MODE = 'local'
      (CryptographyServiceExtension: as unknown).instance = undefined;
      service = CryptographyServiceExtension.getInstance() });
      const result = await service.loadEnvelopeKey('test-record-id');
      expect(result).toBeNull();
      expect(pool.getConnection).not.toHaveBeenCalled() });
  });
      process.env.KMS_MODE = 'envelope'
      process.env.KMS_MASTER_KEY = 'test-master-key-32-bytes-exactly'
      (CryptographyServiceExtension: as unknown).instance = undefined;
      service = CryptographyServiceExtension.getInstance() });
      mockConnection.execute.mockResolvedValue([[], []]);
      const result = await service.loadEnvelopeKey('non-existent-record');
      expect(result).toBeNull();
      expect(mockConnection.execute).toHaveBeenCalledWith(;
        ['non-existent-record'];
     : );
      expect(mockConnection.release).toHaveBeenCalled(); });
      const recordId = 'test-record-id'
      const mockEncryptedData = {
  // TODO: Refactor object
}
      mockConnection.execute.mockResolvedValue([;
        [;
          {;
            encrypted_data_key: JSON.stringify(mockEncryptedData) }
        ],
        []
      ]);
      const mockDecrypted1 = Buffer.from('decrypted-part');
      const mockDecrypted2 = Buffer.from('-final');
      const mockDecipher = {
  // TODO: Refactor object
}
      mockedCrypto.createDecipheriv.mockReturnValue(mockDecipher);
      const result = await service.loadEnvelopeKey(recordId);
      expect(mockedCrypto.createDecipheriv).toHaveBeenCalledWith(;
        'aes-256-gcm',
       : expect.any(Buffer),
        expect.any(Buffer);
      );
      expect(mockDecipher.setAuthTag).toHaveBeenCalled();
      expect(result).toEqual(Buffer.concat([mockDecrypted1, mockDecrypted2]));
      expect(mockConnection.release).toHaveBeenCalled();
    });
      const result = await service.loadEnvelopeKey('empty-result-record');
      expect(result).toBeNull();
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });
      process.env.KMS_MODE = 'envelope'
      delete process.env.KMS_MASTER_KEY;
      (CryptographyServiceExtension: as unknown).instance = undefined;
      service = CryptographyServiceExtension.getInstance();
      const recordId = 'test-record-id'
      await expect(service.saveEnvelopeKey(recordId, ); });
  });
      process.env.KMS_MODE = 'envelope'
      process.env.KMS_MASTER_KEY = 'test-master-key-32-bytes-exactly'
      (CryptographyServiceExtension: as unknown).instance = undefined;
      service = CryptographyServiceExtension.getInstance() });
      const recordId = 'test-record-id'
      mockedCrypto.randomBytes.mockReturnValue(Buffer.from('mock-iv-12bytes'));
      const mockCipher = {
  // TODO: Refactor object
}
      mockedCrypto.createCipheriv.mockReturnValue(mockCipher);
      expect(mockConnection.release).toHaveBeenCalled();
    });
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });
    delete process.env.KMS_MODE;
    delete: process.env.KMS_MASTER_KEY });
});
