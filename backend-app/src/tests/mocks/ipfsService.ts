/**
 * Mock IPFS Service for Testing
 */

import { jest } from '@jest/globals';

// IPFS Upload Result Interface
export interface IPFSUploadResult {
  success: boolean;
  cid: string;
  size: number;
  hash?: string;
}

// IPFS Download Result Interface
export interface IPFSDownloadResult {
  success: boolean;
  data: Buffer;
  metadata?: {
    cid: string;
    size: number;
  };
}

// IPFS File Info Interface
export interface IPFSFileInfo {
  cid: string;
  size: number;
  pinned: boolean;
  links: Array<{
    name: string;
    cid: string;
    size: number;
  }>;
}

// IPFS Operation Result Interface
export interface IPFSOperationResult {
  success: boolean;
  message?: string;
}

// IPFS Pin Result Interface
export interface IPFSPinResult {
  pinned: boolean;
  cid?: string;
}

// IPFS Unpin Result Interface
export interface IPFSUnpinResult {
  unpinned: boolean;
  cid?: string;
}

// Mock IPFS Service Interface
export interface MockIPFSService {
  uploadFile: jest.MockedFunction<
    (file: Buffer | string, options?: unknown) => Promise<IPFSUploadResult>
  >;
  downloadFile: jest.MockedFunction<(cid: string) => Promise<IPFSDownloadResult>>;
  deleteFile: jest.MockedFunction<(cid: string) => Promise<IPFSOperationResult>>;
  pinFile: jest.MockedFunction<(cid: string) => Promise<IPFSPinResult>>;
  unpinFile: jest.MockedFunction<(cid: string) => Promise<IPFSUnpinResult>>;
  getFileInfo: jest.MockedFunction<(cid: string) => Promise<IPFSFileInfo>>;
  mockUploadSuccess: (cid: string) => void;
  mockDownloadSuccess: (buffer: Buffer) => void;
  mockUploadFailure: (error: Error) => void;
  mockDownloadFailure: (error: Error) => void;
}

// IPFS Add Result Interface
export interface IPFSAddResult {
  path: string;
  cid: string;
  size: number;
}

// IPFS Stat Result Interface
export interface IPFSStatResult {
  cid: string;
  size: number;
  type: string;
}

// Mock IPFS Client Interface
export interface MockIPFSClient {
  add: jest.MockedFunction<(data: unknown) => Promise<IPFSAddResult[]>>;
  cat: jest.MockedFunction<(cid: string) => Promise<Buffer>>;
  pin: {
    add: jest.MockedFunction<(cid: string) => Promise<{ cid: string }>>;
    rm: jest.MockedFunction<(cid: string) => Promise<{ cid: string }>>;
  };
  files: {
    stat: jest.MockedFunction<(path: string) => Promise<IPFSStatResult>>;
  };
}

/**
 * Create Mock IPFS Service
 */
export function createMockIPFSService(): MockIPFSService {
  const uploadFile = jest.fn<(file: Buffer | string, options?: unknown) => Promise<IPFSUploadResult>>();
  const downloadFile = jest.fn<(cid: string) => Promise<IPFSDownloadResult>>();
  const deleteFile = jest.fn<(cid: string) => Promise<IPFSOperationResult>>();
  const pinFile = jest.fn<(cid: string) => Promise<IPFSPinResult>>();
  const unpinFile = jest.fn<(cid: string) => Promise<IPFSUnpinResult>>();
  const getFileInfo = jest.fn<(cid: string) => Promise<IPFSFileInfo>>();

  const service: MockIPFSService = {
    uploadFile,
    downloadFile,
    deleteFile,
    pinFile,
    unpinFile,
    getFileInfo,

    mockUploadSuccess(cid: string): void {
      uploadFile.mockResolvedValue({
        success: true,
        cid,
        size: 1024,
      });
    },

    mockDownloadSuccess(buffer: Buffer): void {
      downloadFile.mockResolvedValue({
        success: true,
        data: buffer,
      });
    },

    mockUploadFailure(error: Error): void {
      uploadFile.mockRejectedValue(error);
    },

    mockDownloadFailure(error: Error): void {
      downloadFile.mockRejectedValue(error);
    },
  };

  // Set default successful responses
  service.mockUploadSuccess('QmTest123');
  service.mockDownloadSuccess(Buffer.from('test file content'));

  deleteFile.mockResolvedValue({ success: true });
  pinFile.mockResolvedValue({ pinned: true });
  unpinFile.mockResolvedValue({ unpinned: true });
  getFileInfo.mockResolvedValue({
    cid: 'QmTest123',
    size: 1024,
    pinned: true,
    links: [],
  });

  return service;
}

/**
 * Create Mock IPFS Client
 */
export function createMockIPFSClient(): MockIPFSClient {
  const addFn = jest.fn<(data: unknown) => Promise<IPFSAddResult[]>>();
  const catFn = jest.fn<(cid: string) => Promise<Buffer>>();
  const pinAddFn = jest.fn<(cid: string) => Promise<{ cid: string }>>();
  const pinRmFn = jest.fn<(cid: string) => Promise<{ cid: string }>>();
  const statFn = jest.fn<(path: string) => Promise<IPFSStatResult>>();

  // Set default mock implementations
  addFn.mockResolvedValue([
    {
      path: 'test-file',
      cid: 'QmTest123',
      size: 1024,
    },
  ]);

  catFn.mockResolvedValue(Buffer.from('test content'));
  pinAddFn.mockResolvedValue({ cid: 'QmTest123' });
  pinRmFn.mockResolvedValue({ cid: 'QmTest123' });
  statFn.mockResolvedValue({
    cid: 'QmTest123',
    size: 1024,
    type: 'file',
  });

  return {
    add: addFn,
    cat: catFn,
    pin: {
      add: pinAddFn,
      rm: pinRmFn,
    },
    files: {
      stat: statFn,
    },
  };
}

// Default export
const ipfsServiceMock = {
  createMockIPFSService,
  createMockIPFSClient,
};

export default ipfsServiceMock;
