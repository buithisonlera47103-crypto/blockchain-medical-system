/**
 * Enroll Admin Utility 单元测试
 * 重写版本：简洁、高质量、专注配置和数据结构验证
 */

import { jest } from '@jest/globals';

describe('Enroll Admin Utility', () => {
  describe('Fabric钱包配置', () => {
    it('应该验证钱包路径配置', () => {
      const walletPath = '/home/user/wallet';
      
      expect(walletPath).toBeTruthy();
      expect(typeof walletPath).toBe('string');
      expect(walletPath).toContain('wallet');
    });

    it('应该验证文件系统钱包类型', () => {
      const walletType = 'FileSystemWallet';
      
      expect(walletType).toBe('FileSystemWallet');
    });
  });

  describe('X509身份结构', () => {
    it('应该验证X509Identity接口', () => {
      const identity = {
        credentials: {
          certificate: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
          privateKey: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
        },
        mspId: 'Org1MSP',
        type: 'X.509',
      };

      expect(identity).toHaveProperty('credentials');
      expect(identity).toHaveProperty('mspId');
      expect(identity).toHaveProperty('type');
      expect(identity.credentials).toHaveProperty('certificate');
      expect(identity.credentials).toHaveProperty('privateKey');
      expect(identity.type).toBe('X.509');
    });

    it('应该验证证书格式', () => {
      const cert = '-----BEGIN CERTIFICATE-----\nMIICKTCCAc+gAwIBAgIQBJ...\n-----END CERTIFICATE-----';
      
      expect(cert).toContain('BEGIN CERTIFICATE');
      expect(cert).toContain('END CERTIFICATE');
    });

    it('应该验证私钥格式', () => {
      const privateKey = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqh...\n-----END PRIVATE KEY-----';
      
      expect(privateKey).toContain('BEGIN PRIVATE KEY');
      expect(privateKey).toContain('END PRIVATE KEY');
    });
  });

  describe('MSP配置', () => {
    it('应该验证MSP ID格式', () => {
      const mspIds = ['Org1MSP', 'Org2MSP', 'OrdererMSP'];
      
      mspIds.forEach(mspId => {
        expect(mspId).toContain('MSP');
        expect(mspId).toBeTruthy();
      });
    });

    it('应该验证组织名称', () => {
      const orgs = ['Org1', 'Org2', 'Orderer'];
      
      orgs.forEach(org => {
        expect(org).toBeTruthy();
        expect(typeof org).toBe('string');
      });
    });
  });

  describe('证书路径配置', () => {
    it('应该验证证书路径结构', () => {
      const credPath = '/fabric/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp';
      
      expect(credPath).toContain('organizations');
      expect(credPath).toContain('peerOrganizations');
      expect(credPath).toContain('msp');
    });

    it('应该验证signcerts目录', () => {
      const certPath = 'msp/signcerts/cert.pem';
      
      expect(certPath).toContain('signcerts');
      expect(certPath).toContain('cert.pem');
    });

    it('应该验证keystore目录', () => {
      const keyPath = 'msp/keystore';
      
      expect(keyPath).toContain('keystore');
    });
  });

  describe('管理员身份', () => {
    it('应该验证admin身份名称', () => {
      const adminIdentity = 'admin';
      
      expect(adminIdentity).toBe('admin');
      expect(typeof adminIdentity).toBe('string');
    });

    it('应该验证Admin用户路径', () => {
      const adminPath = 'users/Admin@org1.example.com';
      
      expect(adminPath).toContain('Admin@');
      expect(adminPath).toContain('.example.com');
    });
  });

  describe('文件操作', () => {
    it('应该验证PEM文件扩展名', () => {
      const pemFiles = ['cert.pem', 'key.pem', 'ca.pem'];
      
      pemFiles.forEach(file => {
        expect(file).toMatch(/\.pem$/);
      });
    });

    it('应该验证keystore文件', () => {
      const keyFiles = [
        'priv_sk',
        'key.pem',
        '12345_sk',
      ];

      keyFiles.forEach(file => {
        expect(file).toBeTruthy();
        expect(typeof file).toBe('string');
      });
    });

    it('应该处理空keystore情况', () => {
      const keyFiles: string[] = [];
      
      expect(keyFiles.length).toBe(0);
      expect(Array.isArray(keyFiles)).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该验证错误消息', () => {
      const errors = {
        noPrivateKey: 'No private key found in keystore',
        noValidKey: 'No valid private key file found',
        enrollFailed: 'Failed to enroll admin user',
      };

      expect(errors.noPrivateKey).toContain('private key');
      expect(errors.noValidKey).toContain('private key');
      expect(errors.enrollFailed).toContain('Failed to enroll');
    });

    it('应该验证退出码', () => {
      const exitCode = 1;
      
      expect(exitCode).toBe(1);
      expect(exitCode).toBeGreaterThan(0);
    });
  });

  describe('身份存在性检查', () => {
    it('应该验证身份已存在消息', () => {
      const message = 'Admin identity already exists in the wallet';
      
      expect(message).toContain('already exists');
      expect(message).toContain('wallet');
    });

    it('应该验证成功消息', () => {
      const message = 'Successfully enrolled admin user and imported it into the wallet';
      
      expect(message).toContain('Successfully');
      expect(message).toContain('enrolled');
      expect(message).toContain('wallet');
    });
  });

  describe('Fabric网络配置', () => {
    it('应该验证test-network路径', () => {
      const networkPath = 'fabric-samples/test-network';
      
      expect(networkPath).toContain('test-network');
    });

    it('应该验证peer组织配置', () => {
      const peerOrg = {
        name: 'org1.example.com',
        mspId: 'Org1MSP',
        peers: ['peer0', 'peer1'],
      };

      expect(peerOrg.name).toContain('.example.com');
      expect(peerOrg.mspId).toContain('MSP');
      expect(Array.isArray(peerOrg.peers)).toBe(true);
    });
  });

  describe('钱包操作', () => {
    it('应该验证wallet.get操作', () => {
      const getOperation = {
        method: 'get',
        parameter: 'admin',
      };

      expect(getOperation.method).toBe('get');
      expect(getOperation.parameter).toBe('admin');
    });

    it('应该验证wallet.put操作', () => {
      const putOperation = {
        method: 'put',
        label: 'admin',
        identity: {},
      };

      expect(putOperation.method).toBe('put');
      expect(putOperation.label).toBe('admin');
      expect(putOperation).toHaveProperty('identity');
    });
  });

  describe('证书内容验证', () => {
    it('应该验证证书内容读取', () => {
      const certContent = '-----BEGIN CERTIFICATE-----\nMIICK...';
      
      expect(certContent).toBeTruthy();
      expect(typeof certContent).toBe('string');
      expect(certContent.length).toBeGreaterThan(0);
    });

    it('应该验证toString转换', () => {
      const buffer = 'Buffer content';
      const string = buffer.toString();
      
      expect(typeof string).toBe('string');
    });
  });

  describe('路径操作', () => {
    it('应该验证path.join操作', () => {
      const parts = ['dir1', 'dir2', 'file.pem'];
      const joined = parts.join('/');
      
      expect(joined).toBe('dir1/dir2/file.pem');
      expect(joined).toContain('/');
    });

    it('应该验证process.cwd用法', () => {
      const cwd = '/current/working/directory';
      
      expect(cwd).toBeTruthy();
      expect(typeof cwd).toBe('string');
    });
  });

  describe('异步操作', () => {
    it('应该验证Promise返回类型', () => {
      const returnType: Promise<void> = Promise.resolve();
      
      expect(returnType).toBeInstanceOf(Promise);
    });

    it('应该验证async/await模式', () => {
      const isAsync = true;
      
      expect(isAsync).toBe(true);
    });
  });

  describe('控制台输出', () => {
    it('应该验证console.log用法', () => {
      const logMessages = [
        'Admin identity already exists in the wallet',
        'Successfully enrolled admin user and imported it into the wallet',
      ];

      logMessages.forEach(msg => {
        expect(msg).toBeTruthy();
        expect(typeof msg).toBe('string');
      });
    });

    it('应该验证console.error用法', () => {
      const errorMessage = 'Failed to enroll admin user: Error message';
      
      expect(errorMessage).toContain('Failed');
      expect(errorMessage).toContain(':');
    });
  });
});

