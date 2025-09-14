/**
 * IPFS客户端服务
 * 处理文件的IPFS存储、检索和管理
 */

// import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { CryptographyUtils } from '../utils/cryptography';
import { logger } from '../utils/logger';

export interface IPFSConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  apiPath?: string;
}

export interface FileMetadata {
  cid: string;
  name: string;
  size: number;
  type: string;
  hash: string;
  uploadedAt: string;
  isEncrypted: boolean;
}

export interface IPFSUploadResult {
  cid: string;
  hash: string;
  size: number;
  encryptionKey?: string;
  metadata: FileMetadata;
}

export interface IPFSDownloadResult {
  content: Blob;
  metadata: FileMetadata;
}

export class IPFSService {
  private static instance: IPFSService;
  private client: any | null = null; // IPFSHTTPClient | null = null;
  private config: IPFSConfig;
  private isConnected = false;

  private constructor(config?: IPFSConfig) {
    this.config = config || {
      host: process.env.REACT_APP_IPFS_HOST || 'localhost',
      port: parseInt(process.env.REACT_APP_IPFS_PORT || '5001'),
      protocol: (process.env.REACT_APP_IPFS_PROTOCOL as 'http' | 'https') || 'http',
      apiPath: '/api/v0',
    };
  }

  public static getInstance(config?: IPFSConfig): IPFSService {
    if (!IPFSService.instance) {
      IPFSService.instance = new IPFSService(config);
    }
    return IPFSService.instance;
  }

  /**
   * 初始化IPFS连接
   */
  async initialize(): Promise<boolean> {
    try {
      // 动态加载 ipfs-http-client，避免在未安装依赖时打包失败
      const mod = await import(/* webpackChunkName: "ipfs-http-client" */ 'ipfs-http-client');
      const create = (mod as any).create ?? (mod as any).default;

      const url = `${this.config.protocol}://${this.config.host}:${this.config.port}${this.config.apiPath ?? '/api/v0'}`;
      this.client = create({ url });

      // 校验连接
      await this.client.version();
      this.isConnected = true;
      logger.info('IPFS连接成功', { url });
      return true;
    } catch (error: any) {
      logger.error('IPFS连接失败', error);
      this.isConnected = false;
      // 抛出更友好的提示
      if (String(error?.message || '').includes('Cannot find module') || String(error?.code) === 'MODULE_NOT_FOUND') {
        throw new Error('未安装 ipfs-http-client 依赖，请先安装后再使用前端IPFS功能');
      }
      return false;
    }
  }

  /**
   * 检查IPFS连接状态
   */
  async checkConnection(): Promise<boolean> {
    if (!this.client) {
      return await this.initialize();
    }

    try {
      await this.client.version();
      this.isConnected = true;
      return true;
    } catch (error) {
      this.isConnected = false;
      logger.warn('IPFS连接断开，尝试重连...');
      return await this.initialize();
    }
  }

  /**
   * 上传文件到IPFS（支持加密）
   */
  async uploadFile(
    file: File,
    options: {
      encrypt?: boolean;
      pin?: boolean;
      progress?: (bytesUploaded: number, totalBytes: number) => void;
    } = {}
  ): Promise<IPFSUploadResult> {
    if (!this.client || !this.isConnected) {
      await this.checkConnection();
    }

    if (!this.client) {
      throw new Error('IPFS客户端未初始化');
    }

    try {
      logger.info('开始上传文件到IPFS', {
        fileName: file.name,
        fileSize: file.size,
        encrypt: options.encrypt,
      });

      let fileBuffer: ArrayBuffer;
      let encryptionKey: string | undefined;

      if (options.encrypt) {
        // 生成加密密钥并加密文件
        encryptionKey = CryptographyUtils.generateAESKey();
        const encryptedData = await CryptographyUtils.encryptFile(file, encryptionKey);
        fileBuffer = encryptedData.encryptedData.buffer as ArrayBuffer;
        logger.info('文件加密完成');
      } else {
        fileBuffer = await file.arrayBuffer();
      }

      // 计算文件哈希
      const hash = await CryptographyUtils.hashBuffer(new Uint8Array(fileBuffer));

      // 上传到IPFS
      const uploadResult = await this.client.add(
        {
          path: file.name,
          content: new Uint8Array(fileBuffer),
        },
        {
          pin: options.pin !== false,
          progress: options.progress
            ? (bytes: any) => {
                options.progress!(bytes, fileBuffer.byteLength);
              }
            : undefined,
        }
      );

      const metadata: FileMetadata = {
        cid: uploadResult.cid.toString(),
        name: file.name,
        size: fileBuffer.byteLength,
        type: file.type,
        hash,
        uploadedAt: new Date().toISOString(),
        isEncrypted: !!options.encrypt,
      };

      const result: IPFSUploadResult = {
        cid: uploadResult.cid.toString(),
        hash,
        size: fileBuffer.byteLength,
        encryptionKey,
        metadata,
      };

      logger.info('文件上传成功', { cid: result.cid, hash: result.hash });
      return result;
    } catch (error: any) {
      logger.error('文件上传失败', error);
      throw new Error(`IPFS上传失败: ${error.message}`);
    }
  }

  /**
   * 从IPFS下载文件（支持解密）
   */
  async downloadFile(
    cid: string,
    options: {
      decrypt?: boolean;
      encryptionKey?: string;
      progress?: (bytesDownloaded: number, totalBytes?: number) => void;
    } = {}
  ): Promise<IPFSDownloadResult> {
    if (!this.client || !this.isConnected) {
      await this.checkConnection();
    }

    if (!this.client) {
      throw new Error('IPFS客户端未初始化');
    }

    try {
      logger.info('开始从IPFS下载文件', { cid, decrypt: options.decrypt });

      const chunks: Uint8Array[] = [];
      let totalSize = 0;

      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk);
        totalSize += chunk.length;

        if (options.progress) {
          options.progress(totalSize);
        }
      }

      // 合并所有chunk
      const fileData = new Uint8Array(totalSize);
      let offset = 0;
      for (const chunk of chunks) {
        fileData.set(chunk, offset);
        offset += chunk.length;
      }

      let content: Blob;

      if (options.decrypt && options.encryptionKey) {
        // 解密文件
        logger.info('开始解密文件');
        content = await CryptographyUtils.decryptFile(fileData, options.encryptionKey);
        logger.info('文件解密完成');
      } else {
        content = new Blob([fileData]);
      }

      // 获取文件信息
      const stat = await this.client.files.stat(`/ipfs/${cid}`);

      const metadata: FileMetadata = {
        cid,
        name: '', // IPFS stat不包含原始文件名
        size: stat.size,
        type: '', // 需要从其他地方获取
        hash: stat.cid.toString(),
        uploadedAt: '', // IPFS不存储上传时间
        isEncrypted: !!options.decrypt,
      };

      logger.info('文件下载成功', { cid, size: content.size });

      return {
        content,
        metadata,
      };
    } catch (error: any) {
      logger.error('文件下载失败', error);
      throw new Error(`IPFS下载失败: ${error.message}`);
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(cid: string): Promise<FileMetadata> {
    if (!this.client || !this.isConnected) {
      await this.checkConnection();
    }

    if (!this.client) {
      throw new Error('IPFS客户端未初始化');
    }

    try {
      const stat = await this.client.files.stat(`/ipfs/${cid}`);

      return {
        cid,
        name: '',
        size: stat.size,
        type: '',
        hash: stat.cid.toString(),
        uploadedAt: '',
        isEncrypted: false, // 无法从IPFS直接确定
      };
    } catch (error: any) {
      logger.error('获取文件信息失败', error);
      throw new Error(`获取文件信息失败: ${error.message}`);
    }
  }

  /**
   * 固定文件（防止垃圾回收）
   */
  async pinFile(cid: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      await this.checkConnection();
    }

    if (!this.client) {
      throw new Error('IPFS客户端未初始化');
    }

    try {
      await this.client.pin.add(cid);
      logger.info('文件固定成功', { cid });
      return true;
    } catch (error: any) {
      logger.error('文件固定失败', error);
      return false;
    }
  }

  /**
   * 取消固定文件
   */
  async unpinFile(cid: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      await this.checkConnection();
    }

    if (!this.client) {
      throw new Error('IPFS客户端未初始化');
    }

    try {
      await this.client.pin.rm(cid);
      logger.info('取消文件固定成功', { cid });
      return true;
    } catch (error: any) {
      logger.error('取消文件固定失败', error);
      return false;
    }
  }

  /**
   * 获取已固定的文件列表
   */
  async getPinnedFiles(): Promise<string[]> {
    if (!this.client || !this.isConnected) {
      await this.checkConnection();
    }

    if (!this.client) {
      throw new Error('IPFS客户端未初始化');
    }

    try {
      const pinnedFiles: string[] = [];
      for await (const { cid } of this.client.pin.ls()) {
        pinnedFiles.push(cid.toString());
      }
      return pinnedFiles;
    } catch (error: any) {
      logger.error('获取固定文件列表失败', error);
      return [];
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(cid: string): Promise<boolean> {
    try {
      await this.getFileInfo(cid);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取网络状态
   */
  async getNetworkStatus(): Promise<{
    isOnline: boolean;
    peersCount: number;
    version: string;
  }> {
    if (!this.client || !this.isConnected) {
      await this.checkConnection();
    }

    if (!this.client) {
      throw new Error('IPFS客户端未初始化');
    }

    try {
      const [swarmPeers, version] = await Promise.all([
        this.client.swarm.peers(),
        this.client.version(),
      ]);

      return {
        isOnline: this.isConnected,
        peersCount: swarmPeers.length,
        version: version.version,
      };
    } catch (error: any) {
      logger.error('获取网络状态失败', error);
      return {
        isOnline: false,
        peersCount: 0,
        version: 'unknown',
      };
    }
  }

  /**
   * 批量上传文件
   */
  async uploadFiles(
    files: File[],
    options: {
      encrypt?: boolean;
      pin?: boolean;
      progress?: (completedFiles: number, totalFiles: number) => void;
    } = {}
  ): Promise<IPFSUploadResult[]> {
    const results: IPFSUploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.uploadFile(files[i], {
          encrypt: options.encrypt,
          pin: options.pin,
        });
        results.push(result);

        if (options.progress) {
          options.progress(i + 1, files.length);
        }
      } catch (error) {
        logger.error(`文件 ${files[i].name} 上传失败`, error);
        // 继续处理其他文件
      }
    }

    return results;
  }

  /**
   * 清理资源
   */
  async dispose(): Promise<void> {
    if (this.client) {
      // IPFS HTTP客户端通常不需要显式关闭
      this.client = null;
      this.isConnected = false;
      logger.info('IPFS客户端已释放');
    }
  }
}

// 导出单例实例
export const ipfsService = IPFSService.getInstance();
export default ipfsService;
