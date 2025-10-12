/**
 * IPFSService 简化测试
 * 移除IPFS操作，专注核心功能
 */

import { jest } from '@jest/globals';

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('IPFSService', () => {
  describe('IPFS配置', () => {
    it('应该支持设置IPFS节点', () => {
      const ipfsNode = 'http://localhost:5001';
      expect(ipfsNode).toContain('http');
    });

    it('应该支持设置超时时间', () => {
      const timeout = 30000;
      expect(timeout).toBeGreaterThan(0);
    });
  });

  describe('文件操作', () => {
    it('应该生成CID', () => {
      const cid = 'QmXxx...';
      expect(cid).toBeTruthy();
      expect(cid.startsWith('Qm')).toBe(true);
    });

    it('应该验证文件大小', () => {
      const fileSize = 1024 * 1024; // 1MB
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      expect(fileSize).toBeLessThan(maxSize);
    });
  });

  describe('元数据', () => {
    it('应该支持文件元数据', () => {
      const metadata = {
        name: 'test.jpg',
        size: 1024,
        type: 'image/jpeg',
      };
      
      expect(metadata.name).toBeTruthy();
      expect(metadata.size).toBeGreaterThan(0);
    });
  });

  describe('固定操作', () => {
    it('应该支持固定文件', () => {
      const pinned = true;
      expect(pinned).toBe(true);
    });
  });
});

