// @ts-nocheck
/**
 * IPFS路由测试
 * 测试文件上传、下载等IPFS相关API
 */

import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import ipfsRouter from '../../src/routes/ipfs';
import { IPFSService } from '../../src/services/IPFSService';

// Mock IPFSService
jest.mock('../../src/services/IPFSService');
const MockedIPFSService = IPFSService as jest.MockedClass<typeof IPFSService>;

describe('IPFS路由测试', () => {
  let app: express.Application;
  let mockIPFSService: jest.Mocked<IPFSService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // 创建Express应用
    app = express();
    app.use(express.json());
    app.use('/api/v1/ipfs', ipfsRouter);

    // 设置测试环境
    process.env["NODE_ENV"] = 'test';

    // 创建IPFSService的模拟实例
    mockIPFSService = new MockedIPFSService() as jest.Mocked<IPFSService>;
    MockedIPFSService.mockImplementation(() => mockIPFSService);
  });

  afterEach(() => {
    delete process.env["NODE_ENV"];
  });

  describe('POST /api/v1/ipfs/upload', () => {
    it('应该成功上传文件到IPFS', async () => {
      const expectedResponse = {
        hash: 'QmTestHash123',
        size: 1024,
        url: 'https://ipfs.io/ipfs/QmTestHash123',
        encryptionKey: 'encryption-key-123',
      };

      mockIPFSService.uploadFile = jest.fn().mockResolvedValue(expectedResponse);

      const response = await request(app)
        .post('/api/v1/ipfs/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('test file content'), 'test.txt')
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockIPFSService.uploadFile).toHaveBeenCalled();
    });

    it('应该拒绝未认证的请求', async () => {
      const response = await request(app)
        .post('/api/v1/ipfs/upload')
        .attach('file', Buffer.from('test content'), 'test.txt')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('应该拒绝没有文件的请求', async () => {
      const response = await request(app)
        .post('/api/v1/ipfs/upload')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('文件');
    });

    it('应该处理上传错误', async () => {
      mockIPFSService.uploadFile = jest.fn().mockRejectedValue(new Error('IPFS网络不可用'));

      const response = await request(app)
        .post('/api/v1/ipfs/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('test content'), 'test.txt')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('应该验证文件大小限制', async () => {
      // 模拟文件过大的情况
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB

      const response = await request(app)
        .post('/api/v1/ipfs/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', largeBuffer, 'large.txt')
        .expect(413);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/ipfs/download/:hash', () => {
    it('应该成功下载文件', async () => {
      const fileContent = Buffer.from('测试文件内容');
      const fileMetadata = {
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: fileContent.length,
      };

      mockIPFSService.downloadFile = jest.fn().mockResolvedValue({
        content: fileContent,
        metadata: fileMetadata,
      });

      const response = await request(app)
        .get('/api/v1/ipfs/download/QmTestHash123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.header['content-type']).toBe('text/plain');
      expect(response.header['content-disposition']).toContain('test.txt');
      expect(mockIPFSService.downloadFile).toHaveBeenCalledWith('QmTestHash123');
    });

    it('应该返回404当文件不存在', async () => {
      mockIPFSService.downloadFile = jest.fn().mockRejectedValue(new Error('文件不存在'));

      const response = await request(app)
        .get('/api/v1/ipfs/download/QmNonExistentHash')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('应该拒绝无效的IPFS哈希', async () => {
      const response = await request(app)
        .get('/api/v1/ipfs/download/invalid-hash')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/ipfs/metadata/:hash', () => {
    it('应该获取文件元数据', async () => {
      const expectedMetadata = {
        hash: 'QmTestHash123',
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        uploadedBy: 'user123',
        uploadedAt: '2023-01-01T10:00:00Z',
        encrypted: true,
      };

      mockIPFSService.getFileMetadata = jest.fn().mockResolvedValue(expectedMetadata);

      const response = await request(app)
        .get('/api/v1/ipfs/metadata/QmTestHash123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(expectedMetadata);
      expect(mockIPFSService.getFileMetadata).toHaveBeenCalledWith('QmTestHash123');
    });

    it('应该返回404当元数据不存在', async () => {
      mockIPFSService.getFileMetadata = jest.fn().mockRejectedValue(new Error('元数据不存在'));

      const response = await request(app)
        .get('/api/v1/ipfs/metadata/QmNonExistentHash')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/ipfs/:hash', () => {
    it('应该成功删除文件引用', async () => {
      mockIPFSService.deleteFileReference = jest.fn().mockResolvedValue({
        message: '文件引用删除成功',
        hash: 'QmTestHash123',
      });

      const response = await request(app)
        .delete('/api/v1/ipfs/QmTestHash123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(mockIPFSService.deleteFileReference).toHaveBeenCalledWith(
        'QmTestHash123',
        'test-user'
      );
    });

    it('应该拒绝删除不属于用户的文件', async () => {
      mockIPFSService.deleteFileReference = jest.fn().mockRejectedValue(new Error('权限不足'));

      const response = await request(app)
        .delete('/api/v1/ipfs/QmTestHash123')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/ipfs/user/files', () => {
    it('应该获取用户上传的文件列表', async () => {
      const expectedFiles = [
        {
          hash: 'QmHash1',
          originalName: 'doc1.pdf',
          size: 1024,
          uploadedAt: '2023-01-01T10:00:00Z',
        },
        {
          hash: 'QmHash2',
          originalName: 'image1.jpg',
          size: 2048,
          uploadedAt: '2023-01-02T11:00:00Z',
        },
      ];

      mockIPFSService.getUserFiles = jest.fn().mockResolvedValue(expectedFiles);

      const response = await request(app)
        .get('/api/v1/ipfs/user/files')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(expectedFiles);
      expect(mockIPFSService.getUserFiles).toHaveBeenCalledWith('test-user');
    });

    it('应该支持分页查询', async () => {
      const paginatedFiles = {
        files: [],
        totalCount: 0,
        page: 1,
        pageSize: 10,
      };

      mockIPFSService.getUserFiles = jest.fn().mockResolvedValue(paginatedFiles);

      const response = await request(app)
        .get('/api/v1/ipfs/user/files?page=1&limit=10')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(paginatedFiles);
    });
  });

  describe('POST /api/v1/ipfs/share', () => {
    it('应该成功分享文件', async () => {
      const shareData = {
        hash: 'QmTestHash123',
        shareWith: 'doctor123',
        permissions: ['read'],
        expiresAt: '2023-12-31T23:59:59Z',
      };

      const expectedResponse = {
        shareId: 'share123',
        ...shareData,
        sharedBy: 'test-user',
        createdAt: '2023-01-01T10:00:00Z',
      };

      mockIPFSService.shareFile = jest.fn().mockResolvedValue(expectedResponse);

      const response = await request(app)
        .post('/api/v1/ipfs/share')
        .set('Authorization', 'Bearer valid-token')
        .send(shareData)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockIPFSService.shareFile).toHaveBeenCalledWith(shareData, 'test-user');
    });

    it('应该拒绝无效的分享数据', async () => {
      const invalidShareData = {
        // 缺少必需字段
        permissions: ['read'],
      };

      const response = await request(app)
        .post('/api/v1/ipfs/share')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidShareData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/ipfs/shared/with-me', () => {
    it('应该获取分享给我的文件列表', async () => {
      const sharedFiles = [
        {
          shareId: 'share1',
          hash: 'QmHash1',
          originalName: 'shared-doc.pdf',
          sharedBy: 'doctor123',
          permissions: ['read'],
          sharedAt: '2023-01-01T10:00:00Z',
        },
      ];

      mockIPFSService.getSharedFiles = jest.fn().mockResolvedValue(sharedFiles);

      const response = await request(app)
        .get('/api/v1/ipfs/shared/with-me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(sharedFiles);
      expect(mockIPFSService.getSharedFiles).toHaveBeenCalledWith('test-user');
    });
  });

  describe('POST /api/v1/ipfs/pin/:hash', () => {
    it('应该成功固定文件', async () => {
      mockIPFSService.pinFile = jest.fn().mockResolvedValue({
        hash: 'QmTestHash123',
        pinned: true,
        message: '文件已固定',
      });

      const response = await request(app)
        .post('/api/v1/ipfs/pin/QmTestHash123')
        .set('Authorization', 'Bearer doctor-token') // 需要医生权限
        .expect(200);

      expect(response.body).toHaveProperty('pinned', true);
      expect(mockIPFSService.pinFile).toHaveBeenCalledWith('QmTestHash123');
    });

    it('应该拒绝非医生用户的固定请求', async () => {
      const response = await request(app)
        .post('/api/v1/ipfs/pin/QmTestHash123')
        .set('Authorization', 'Bearer valid-token') // 患者权限
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/ipfs/pin/:hash', () => {
    it('应该成功取消固定文件', async () => {
      mockIPFSService.unpinFile = jest.fn().mockResolvedValue({
        hash: 'QmTestHash123',
        pinned: false,
        message: '文件固定已取消',
      });

      const response = await request(app)
        .delete('/api/v1/ipfs/pin/QmTestHash123')
        .set('Authorization', 'Bearer doctor-token')
        .expect(200);

      expect(response.body).toHaveProperty('pinned', false);
      expect(mockIPFSService.unpinFile).toHaveBeenCalledWith('QmTestHash123');
    });
  });

  describe('GET /api/v1/ipfs/stats', () => {
    it('应该获取IPFS存储统计信息', async () => {
      const stats = {
        totalFiles: 150,
        totalSize: 1024 * 1024 * 100, // 100MB
        userFileCount: 25,
        userStorageUsed: 1024 * 1024 * 10, // 10MB
        pinnedFiles: 5,
      };

      mockIPFSService.getStorageStats = jest.fn().mockResolvedValue(stats);

      const response = await request(app)
        .get('/api/v1/ipfs/stats')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(stats);
      expect(mockIPFSService.getStorageStats).toHaveBeenCalledWith('test-user');
    });
  });

  describe('错误处理测试', () => {
    it('应该处理IPFS网络连接错误', async () => {
      mockIPFSService.uploadFile = jest.fn().mockRejectedValue(new Error('IPFS节点连接失败'));

      const response = await request(app)
        .post('/api/v1/ipfs/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('test'), 'test.txt')
        .expect(503);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('IPFS');
    });

    it('应该处理加密错误', async () => {
      mockIPFSService.uploadFile = jest.fn().mockRejectedValue(new Error('文件加密失败'));

      const response = await request(app)
        .post('/api/v1/ipfs/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('test'), 'test.txt')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});
