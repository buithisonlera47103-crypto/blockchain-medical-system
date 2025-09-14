/**
 * IPFS服务类 - 处理文件上传、下载和分片存储
 * 支持加密存储、分片上传、完整性验证等功能
 */

import * as crypto from 'crypto';

import { logger } from '../utils/logger';

// Local IPFS-related types (to decouple from missing shared types)
export interface EncryptedData {
  encryptedContent: string;
  iv: string;
  authTag: string;
}

export interface FileChunk {
  index: number;
  data: Buffer;
  hash: string;
}

export interface IPFSUploadResponse {
  cid: string;
  fileHash: string;
  fileSize: number;
}

export interface IPFSFileMetadata {
  fileName: string;
  fileHash: string;
  fileSize: number;
  chunkCount: number;
  chunkCids: string[];
  iv: string;
  authTag: string;
  timestamp: string;
  mimeType: string;
  originalName: string;
}

export interface IPFSNodeInfo {
  id: string;
  publicKey: string;
  addresses: string[];
  agentVersion: string;
  protocolVersion: string;
}

export interface PinStatus {
  cid: string;
  pinned: boolean;
  pinDate?: Date;
}

import { IPFSClusterService } from './IPFSClusterService';

// Production cluster configuration interface
export interface IPFSProductionConfig {
  enabled: boolean;
  nodes: Array<{
    host: string;
    port: number;
    protocol: 'http' | 'https';
  }>;
  clusterNodes: Array<{
    host: string;
    port: number;
    protocol: 'http' | 'https';
  }>;
  loadBalancer?: {
    host: string;
    port: number;
    protocol: 'http' | 'https';
  };
  retryAttempts: number;
  retryDelay: number;
  healthCheckInterval: number;
  connectionPoolSize: number;
  replicationFactor: number;
}

export interface IPFSClient {
  add: (input: unknown) => Promise<unknown>;
  cat: (cid: string) => AsyncIterable<Buffer>;
  id: () => Promise<unknown>;
  files: { stat: (path: string) => Promise<unknown> };
  pin: { add: (cid: string) => Promise<unknown>; rm: (cid: string) => Promise<unknown> };
  repo: { stat: () => Promise<unknown> };
  object: { stat: (cid: string) => Promise<unknown> };
}

export class IPFSService {
  private ipfs?: IPFSClient; // IPFSHTTPClient (typed minimally)
  private readonly chunkSize: number;
  private readonly defaultEncryptionKey: string;
  private readonly cluster?: IPFSClusterService;
  private productionConfig?: IPFSProductionConfig;
  private availableNodes: Array<{
    host: string;
    port: number;
    protocol: string;
    healthy: boolean;
  }> = [];
  private currentNodeIndex: number = 0;
  // private _connectionPool: Map<string, unknown> = new Map(); // Reserved for connection pooling


  constructor() {
    // 设置分片大小为256KB（read111.md要求）
    this.chunkSize = 256 * 1024; // 256KB chunks as specified in read111.md

    // 获取默认加密密钥，确保32字节长度（用于未提供数据密钥的场景）
    const envKey = process.env["ENCRYPTION_KEY"];
    const key = typeof envKey === 'string' && envKey.trim() !== '' ? envKey : 'medical-record-default-key-32b!';
    this.defaultEncryptionKey = key.padEnd(32, '0').substring(0, 32);

    // Reserved properties - intentionally unused for now

    // Initialize production configuration and IPFS connection asynchronously
    setImmediate(() => {
      this.initializeProductionConfig();
      // explicitly ignored background init
      void this.initializeIPFS();
    });

    // 可选初始化 Cluster 服务
    try {
      this.cluster = new IPFSClusterService();
    } catch (_e) {
      logger.warn('初始化 IPFS Cluster 服务失败（可忽略）', _e);
    }

    // Start health checks for production cluster
    if (this.productionConfig?.enabled) {
      this.startHealthChecks();
    }
  }

  private initializeProductionConfig(): void {
    const isProduction = process.env["NODE_ENV"] === 'production';
    const enableCluster = process.env["IPFS_CLUSTER_ENABLED"] === 'true';

    if (isProduction && enableCluster) {
      this.productionConfig = {
        enabled: true,
        nodes: [
          { host: 'localhost', port: 5001, protocol: 'http' },
          { host: 'localhost', port: 5002, protocol: 'http' },
          { host: 'localhost', port: 5003, protocol: 'http' },
        ],
        clusterNodes: [
          { host: 'localhost', port: 9094, protocol: 'http' },
          { host: 'localhost', port: 9096, protocol: 'http' },
          { host: 'localhost', port: 9098, protocol: 'http' },
        ],
        loadBalancer: {
          host: 'localhost',
          port: 8090,
          protocol: 'http',
        },
        retryAttempts: parseInt((typeof process.env["IPFS_RETRY_ATTEMPTS"] === 'string' && process.env["IPFS_RETRY_ATTEMPTS"].trim() !== '' ? process.env["IPFS_RETRY_ATTEMPTS"] : '3'), 10),
        retryDelay: parseInt((typeof process.env["IPFS_RETRY_DELAY"] === 'string' && process.env["IPFS_RETRY_DELAY"].trim() !== '' ? process.env["IPFS_RETRY_DELAY"] : '1000'), 10),
        healthCheckInterval: parseInt((typeof process.env["IPFS_HEALTH_CHECK_INTERVAL"] === 'string' && process.env["IPFS_HEALTH_CHECK_INTERVAL"].trim() !== '' ? process.env["IPFS_HEALTH_CHECK_INTERVAL"] : '30000'), 10),
        connectionPoolSize: parseInt((typeof process.env["IPFS_CONNECTION_POOL_SIZE"] === 'string' && process.env["IPFS_CONNECTION_POOL_SIZE"].trim() !== '' ? process.env["IPFS_CONNECTION_POOL_SIZE"] : '5'), 10),
        replicationFactor: parseInt((typeof process.env["IPFS_REPLICATION_FACTOR"] === 'string' && process.env["IPFS_REPLICATION_FACTOR"].trim() !== '' ? process.env["IPFS_REPLICATION_FACTOR"] : '2'), 10),
      };

      // Initialize available nodes
      this.availableNodes = this.productionConfig.nodes.map(node => ({
        ...node,
        healthy: true,
      }));

      logger.info('Production IPFS cluster configuration initialized');
    }
  }
  private async loadIPFSCreate(): Promise<((opts: unknown) => unknown) | null> {
    try {
      // Use dynamic ESM import that won't be downleveled to require by TypeScript
      const importer = new Function('m', 'return import(m)');
      const mod: any = await (importer as (m: string) => Promise<unknown>)('ipfs-http-client');
      const createFn = mod?.create ?? mod?.default;
      return typeof createFn === 'function' ? createFn : null;
    } catch (e) {
      logger.warn('Failed to ESM-import ipfs-http-client, will fallback to mock', e);
      return null;
    }
  }


  private async initializeIPFS(): Promise<void> {
    try {
      const createIPFS = await this.loadIPFSCreate();
      if (!createIPFS) throw new Error('ipfs-http-client ESM import failed');

      if (this.productionConfig?.enabled) {
        if (this.productionConfig.loadBalancer) {
          const { host, port, protocol } = this.productionConfig.loadBalancer;
          this.ipfs = createIPFS({
            url: `${protocol}://${host}:${port}`,
            timeout: 30000,
            headers: { 'User-Agent': 'medical-record-system/1.0.0' },
          }) as unknown as IPFSClient;
          logger.info(`IPFS initialized with load balancer: ${protocol}://${host}:${port}`);
        } else {
          await this.initializeWithFailover();
        }
      } else {
        this.ipfs = createIPFS({
          url: (typeof process.env["IPFS_URL"] === 'string' && process.env["IPFS_URL"].trim() !== '' ? process.env["IPFS_URL"] : 'http://localhost:5001'),
          timeout: 10000,
          headers: { 'User-Agent': 'medical-record-system/1.0.0' },
        }) as unknown as IPFSClient;
      }
    } catch (error) {
      logger.warn('IPFS连接失败，使用模拟模式:', error);
      this.ipfs = this.createMockIPFS();
    }
  }

  /**
   * 创建IPFS模拟客户端（开发/测试环境使用）
   */
  private createMockIPFS(): IPFSClient {
    return {
      add: async (_content: unknown): Promise<unknown> => {
        const mockCid = `Qm${crypto.randomBytes(20).toString('hex')}`;
        logger.info('Mock IPFS: 文件已添加，CID:', mockCid);
        return { cid: { toString: () => mockCid } };
      },
      async *cat(cid: string): AsyncIterable<Buffer> {
        logger.info('Mock IPFS: 获取文件，CID:', cid);
        yield Buffer.from(
          JSON.stringify({
            fileName: 'mock-file.pdf',
            fileHash: crypto.randomBytes(32).toString('hex'),
            fileSize: 1024,
            chunkCount: 1,
            chunkCids: [`Qm${crypto.randomBytes(20).toString('hex')}`],
            iv: crypto.randomBytes(16).toString('hex'),
            authTag: crypto.randomBytes(16).toString('hex'),
            timestamp: new Date().toISOString(),
          })
        );
      },
      id: async () => ({ id: `mock-peer-id-${crypto.randomBytes(8).toString('hex')}` }),
      files: {
        stat: async (_path: string) => ({
          size: 1024,
          type: 'file',
          blocks: 1,
          cumulativeSize: 1024,
        }),
      },
      pin: {
        add: async (_cid: string) => ({}),
        rm: async (_cid: string) => ({}),
      },
      repo: {
        stat: async () => ({
          numObjects: 100,
          repoSize: 1024 * 1024,
          storageMax: 10 * 1024 * 1024,
        }),
      },
      object: {
        stat: async (_cid: string) => ({}),
      },
    };
  }

  private async initializeWithFailover(): Promise<void> {
    if (!this.productionConfig?.enabled) return;

    for (const node of this.availableNodes) {
      if (!node.healthy) continue;

      try {
        const createIPFS = await this.loadIPFSCreate();
        if (!createIPFS) throw new Error('ipfs-http-client ESM import failed');
        const nodeUrl = `${node.protocol}://${node.host}:${node.port}`;

        const testClient = createIPFS({
          url: nodeUrl,
          timeout: 5000,
          headers: { 'User-Agent': 'medical-record-system/1.0.0' },
        });

        await (testClient as any).id();

        this.ipfs = testClient as unknown as IPFSClient;
        this.currentNodeIndex = this.availableNodes.indexOf(node);
        logger.info(`IPFS initialized with node: ${nodeUrl}`);
        return;
      } catch (error) {
        logger.warn(`Failed to connect to IPFS node ${node.host}:${node.port}:`, error);
        node.healthy = false;
      }
    }

    throw new Error('No healthy IPFS nodes available');
  }

  private startHealthChecks(): void {
    if (!this.productionConfig?.enabled) return;

    setInterval(() => {
      void this.performHealthChecks();
    }, this.productionConfig.healthCheckInterval);

    logger.info('IPFS health checks started');
  }

  private async performHealthChecks(): Promise<void> {
    if (!this.productionConfig?.enabled) return;

    for (const node of this.availableNodes) {
      try {
        const createIPFS = await this.loadIPFSCreate();
        if (!createIPFS) throw new Error('ipfs-http-client ESM import failed');
        const nodeUrl = `${node.protocol}://${node.host}:${node.port}`;

        const testClient = createIPFS({
          url: nodeUrl,
          timeout: 5000,
        });

        await (testClient as any).id();

        if (!node.healthy) {
          node.healthy = true;
          logger.info(`IPFS node ${node.host}:${node.port} is back online`);
        }
      } catch (error) {
        if (node.healthy) {
          node.healthy = false;
          logger.warn(`IPFS node ${node.host}:${node.port} is unhealthy:`, error);
        }
      }
    }

    // If current node is unhealthy, switch to a healthy one
    const currentNode = this.availableNodes[this.currentNodeIndex];
    if (currentNode && !currentNode.healthy) {
      await this.switchToHealthyNode();
    }
  }

  private async switchToHealthyNode(): Promise<void> {
    if (!this.productionConfig?.enabled) return;

    const healthyNodes = this.availableNodes.filter(node => node.healthy);

    if (healthyNodes.length === 0) {
      logger.error('No healthy IPFS nodes available');
      return;
    }

    try {
      await this.initializeWithFailover();
      logger.info('Successfully switched to healthy IPFS node');
    } catch (error) {
      logger.error('Failed to switch to healthy IPFS node:', error);
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    const maxRetries = this.productionConfig?.retryAttempts ?? 3;
    const retryDelay = this.productionConfig?.retryDelay ?? 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        logger.warn(`IPFS operation failed (attempt ${attempt}/${maxRetries}):`, error);

        if (attempt === maxRetries) {
          throw error;
        }

        // Try switching to a different node if in production
        if (this.productionConfig?.enabled && attempt < maxRetries) {
          await this.switchToHealthyNode();
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }

    throw new Error('Max retries exceeded');
  }

  private async ensureIPFSReady(): Promise<void> {
    if (!this.ipfs) {
      await this.initializeIPFS();
    }
  }

  /**
   * 上传文件到IPFS
   * @param fileBuffer 文件缓冲区
   * @param fileName 文件名
   * @param mimeType MIME类型
   * @returns 上传结果
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType?: string,
    dataKey?: Buffer
  ): Promise<IPFSUploadResponse> {
    await this.ensureIPFSReady();

    return this.executeWithRetry(async () => {
      return this.performUpload(fileBuffer, fileName, mimeType, dataKey);
    });
  }

  private async performUpload(
    fileBuffer: Buffer,
    fileName: string,
    mimeType?: string,
    dataKey?: Buffer
  ): Promise<IPFSUploadResponse> {
    try {
      logger.info(`Starting upload for file: ${fileName}, size: ${fileBuffer.length}`);
      // 生成文件SHA-256哈希
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      logger.info(`Generated file hash: ${fileHash}`);

      // 加密文件内容
      const encryptedData = this.encryptData(fileBuffer, dataKey);

      // 分片处理
      const chunks = this.chunkFile(encryptedData.encryptedContent);
      logger.info(`Generated ${chunks.length} chunks for file ${fileName}`);

      // 上传分片到IPFS（并发）
      const ipfsClient = this.ipfs;
      if (!ipfsClient) {
        throw new Error('IPFS client not initialized');
      }
      const upConc = Math.max(1, parseInt(String(process.env["IPFS_UPLOAD_CONCURRENCY"] ?? '4'), 10));
      const chunkCids: string[] = new Array(chunks.length);
      await this.mapLimit(chunks, upConc, async (chunk) => {
        const resultUnknown = await ipfsClient.add({
          path: `${fileName}_chunk_${chunk.index}`,
          content: chunk.data,
        });
        const result = resultUnknown as { cid?: { toString(): string } };
        if (!result?.cid) {
          throw new Error('IPFS add returned invalid result for chunk');
        }
        chunkCids[chunk.index] = result.cid.toString();
      });

      // 创建元数据对象
      const metadata: IPFSFileMetadata = {
        fileName,
        fileHash,
        fileSize: fileBuffer.length,
        chunkCount: chunks.length,
        chunkCids,
        iv: encryptedData.iv,
        authTag: encryptedData.authTag,
        timestamp: new Date().toISOString(),
        mimeType: mimeType ?? 'application/octet-stream',
        originalName: fileName,
      };

      // 上传元数据
      const ipfsMetadata = this.ipfs;
      if (!ipfsMetadata) {
        throw new Error('IPFS client not initialized');
      }
      const metadataResultUnknown = await ipfsMetadata.add({
        path: `${fileName}_metadata.json`,
        content: JSON.stringify(metadata),
      });

      logger.info('Metadata upload result:', metadataResultUnknown);
      const metadataResult = metadataResultUnknown as { cid?: { toString(): string } };
      if (!metadataResult?.cid) {
        throw new Error('IPFS add returned invalid result for metadata');
      }

      logger.info(`文件上传成功: ${fileName}, CID: ${metadataResult.cid.toString()}`);

      const cid = metadataResult.cid.toString();

      // 固定到本地节点（Pin Service防垃圾回收）
      try {
        await (this.ipfs as IPFSClient).pin.add(cid);
        logger.info(`本地节点固定成功: ${cid}`);
      } catch (error) {
        logger.warn('本地节点固定失败:', (error as Error)?.message);
      }

      // 调用 Cluster 进行3副本固定（符合read111.md要求）
      try {
        await this.cluster?.pin(cid, {
          replication_min: Number((typeof process.env["IPFS_CLUSTER_REPL_MIN"] === 'string' && process.env["IPFS_CLUSTER_REPL_MIN"].trim() !== '' ? process.env["IPFS_CLUSTER_REPL_MIN"] : '3')), // 确保3副本
          replication_max: Number((typeof process.env["IPFS_CLUSTER_REPL_MAX"] === 'string' && process.env["IPFS_CLUSTER_REPL_MAX"].trim() !== '' ? process.env["IPFS_CLUSTER_REPL_MAX"] : '3')),
          name: `medical-record-${fileName}-${Date.now()}`, // 防垃圾回收标识
        });
        logger.info(`Cluster 3副本固定成功: ${cid}`);
      } catch (e) {
        logger.warn('Cluster pin 跳过/失败:', (e as Error)?.message);
      }

      return { cid, fileHash, fileSize: fileBuffer.length };
    } catch (error) {
      logger.error('IPFS文件上传失败:', error);
      throw new Error(`IPFS上传失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieve file from IPFS (alias for downloadFile)
   * @param cid IPFS CID
   * @returns File buffer
   */
  async retrieveFile(cid: string): Promise<Buffer> {
    return this.downloadFile(cid);
  }

  /**
   * Upload file with simplified interface matching read111.md spec
   * @param content File buffer content
   * @returns Upload response with CID and size
   */
  async uploadFileSimple(content: Buffer): Promise<{ cid: string; size: number }> {
    if (!content || content.length === 0) {
      throw new Error('Content buffer is required and cannot be empty');
    }

    const result = await this.uploadFile(content, 'medical-record', 'application/octet-stream');
    return {
      cid: result.cid,
      size: result.fileSize,
    };
  }

  /**
   * Download file with simplified interface matching read111.md spec
   * @param cid IPFS CID
   * @returns File buffer
   */
  async downloadFileSimple(cid: string): Promise<Buffer> {
    if (!cid || typeof cid !== 'string') {
      throw new Error('Valid CID is required');
    }

    return this.downloadFile(cid);
  }

  /**
   * 从IPFS下载文件
   * @param cid IPFS CID
   * @returns 解密后的文件缓冲区
   */
  async downloadFile(cid: string): Promise<Buffer> {
    await this.ensureIPFSReady();
    try {
      // 下载元数据
      const ipfs = this.ipfs;
      if (!ipfs) {
        throw new Error('IPFS client not initialized');
      }
      const metadataChunks: Buffer[] = [];
      for await (const chunk of ipfs.cat(cid)) {
        metadataChunks.push(chunk);
      }
      const metadataBuffer = Buffer.concat(metadataChunks);
      const metadata = JSON.parse(metadataBuffer.toString()) as IPFSFileMetadata;

      // 下载所有分片（并发）
      const dlConc = Math.max(1, parseInt(String(process.env["IPFS_DOWNLOAD_CONCURRENCY"] ?? '6'), 10));
      const chunkBuffers: Buffer[] = new Array(metadata.chunkCids.length);
      await this.mapLimit(metadata.chunkCids, dlConc, async (chunkCid, idx) => {
        const chunks: Buffer[] = [];
        for await (const chunk of ipfs.cat(chunkCid)) {
          chunks.push(chunk);
        }
        chunkBuffers[idx] = Buffer.concat(chunks);
      });

      // 重组文件
      const encryptedContent = Buffer.concat(chunkBuffers).toString('base64');

      // 解密文件
      const decryptedData = this.decryptData({
        encryptedContent,
        iv: metadata.iv,
        authTag: metadata.authTag,
      });

      logger.info(`文件下载成功: CID ${cid}`);
      return decryptedData;
    } catch (error) {
      logger.error('IPFS文件下载失败:', error);
      throw new Error(`IPFS下载失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 检查IPFS节点连接状态
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.ensureIPFSReady();
      const ipfs = this.ipfs;
      if (!ipfs) {
        logger.error('IPFS节点连接失败: client not initialized');
        return false;
      }
      const idResult = await ipfs.id();
      const id = idResult as Record<string, unknown>;
      const idVal = (id as { id?: unknown }).id;
      const idStr = typeof idVal === 'string' ? idVal : '';
      logger.info(`IPFS节点连接成功: ${idStr}`);
      return true;
    } catch (error) {
      logger.error('IPFS节点连接失败:', error);
      return false;
    }
  }

  // 统一保留下方的 getFileStats 实现，避免重复定义

  /**
   * 加密数据
   * @param data 原始数据
   * @returns 加密后的数据
   */
  private encryptData(data: Buffer, explicitKey?: Buffer): EncryptedData {
    try {
      const algorithm = 'aes-256-gcm';
      const key =
        explicitKey && explicitKey.length === 32
          ? explicitKey
          : crypto.scryptSync(this.defaultEncryptionKey, 'salt', 32);
      const iv = crypto.randomBytes(12); // GCM建议12字节
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
      const authTag = cipher.getAuthTag();
      return {
        encryptedContent: encrypted.toString('base64'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      };
    } catch (error) {
      logger.error('数据加密失败:', error);
      throw new Error(`加密失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 解密数据
   * @param encryptedData 加密的数据
   * @returns 解密后的数据
   */
  private decryptData(encryptedData: EncryptedData): Buffer {
    try {
      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync(this.defaultEncryptionKey, 'salt', 32);
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedData.encryptedContent, 'base64')),
        decipher.final(),
      ]);
      return decrypted;
    } catch (error) {
      logger.error('数据解密失败:', error);
      throw new Error(`解密失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 文件分片
   * @param data 文件数据
   * @returns 文件分片数组
   */
  private chunkFile(data: string): FileChunk[] {
    const buffer = Buffer.from(data, 'base64');
    const chunks: FileChunk[] = [];

    for (let i = 0; i < buffer.length; i += this.chunkSize) {
      const chunkData = buffer.subarray(i, i + this.chunkSize);
      const chunkHash = crypto.createHash('sha256').update(chunkData).digest('hex');

      chunks.push({
        index: Math.floor(i / this.chunkSize),
        data: chunkData,
        hash: chunkHash,
      });
    }

    return chunks;
  }

  /**
   * Run async mapper with concurrency limit over an array
   */
  private async mapLimit<T, R>(items: T[], limit: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
      for (let idx = next++; idx < items.length; idx = next++) {
        const item = items[idx] as T;
        results[idx] = await mapper(item, idx);
      }
    });
    await Promise.all(workers);
    return results;
  }


  /**
   * 使用指定数据密钥解密数据
   */
  private decryptWithKey(
    params: { encryptedContent: string; iv: string; authTag: string },
    explicitKey: Buffer
  ): Buffer {
    try {
      const algorithm = 'aes-256-gcm';
      const key = explicitKey;
      const iv = Buffer.from(params.iv, 'hex');
      const authTag = Buffer.from(params.authTag, 'hex');
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(params.encryptedContent, 'base64')),
        decipher.final(),
      ]);
      return decrypted;
    } catch (error) {
      logger.error('数据解密失败:', error);
      throw new Error(`解密失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 下载并使用指定数据密钥解密文件
   */
  async downloadFileWithKey(cid: string, dataKey: Buffer): Promise<Buffer> {
    await this.ensureIPFSReady();
    try {
      const ipfs = this.ipfs;
      if (!ipfs) {
        throw new Error('IPFS client not initialized');
      }
      const metadataChunks: Buffer[] = [];
      for await (const chunk of ipfs.cat(cid)) {
        metadataChunks.push(chunk);
      }
      const metadataBuffer = Buffer.concat(metadataChunks);
      const metadata = JSON.parse(metadataBuffer.toString());

      const chunkBuffers: Buffer[] = [];
      for (const chunkCid of metadata.chunkCids) {
        const chunks: Buffer[] = [];
        for await (const chunk of ipfs.cat(chunkCid)) {
          chunks.push(chunk);
        }
        chunkBuffers.push(Buffer.concat(chunks));
      }

      const encryptedContent = Buffer.concat(chunkBuffers).toString('base64');

      const decryptedData = this.decryptWithKey(
        {
          encryptedContent,
          iv: metadata.iv,
          authTag: metadata.authTag,
        },
        dataKey
      );

      logger.info(`文件下载成功: CID ${cid}`);
      return decryptedData;
    } catch (error) {
      logger.error('IPFS文件下载失败:', error);
      throw new Error(`IPFS下载失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 验证文件完整性
   * @param fileBuffer 文件缓冲区
   * @param expectedHash 期望的哈希值
   * @returns 验证结果
   */
  verifyFileIntegrity(fileBuffer: Buffer, expectedHash: string): boolean {
    const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    return actualHash === expectedHash;
  }

  /**
   * 生成文件指纹
   * @param fileBuffer 文件缓冲区
   * @returns SHA-256哈希值
   */
  generateFileHash(fileBuffer: Buffer): string {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * 固定文件到IPFS（防止垃圾回收）
   * @param cid IPFS CID
   * @returns 固定状态
   */
  async pinFile(cid: string): Promise<PinStatus> {
    try {
      const ipfs = this.ipfs;
      if (!ipfs) {
        throw new Error('IPFS client not initialized');
      }
      await ipfs.pin.add(cid);
      logger.info(`文件已固定到IPFS: ${cid}`);
      return {
        cid,
        pinned: true,
        pinDate: new Date(),
      };
    } catch (error) {
      logger.error('固定文件失败:', error);
      return {
        cid,
        pinned: false,
      };
    }
  }

  /**
   * 取消固定文件
   * @param cid IPFS CID
   */
  async unpinFile(cid: string): Promise<void> {
    try {
      const ipfs = this.ipfs;
      if (!ipfs) {
        throw new Error('IPFS client not initialized');
      }
      await ipfs.pin.rm(cid);
      logger.info(`已取消固定: ${cid}`);
    } catch (error) {
      logger.error('取消固定失败:', error);
      throw new Error(`取消固定失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取IPFS节点信息
   * @returns 节点信息
   */
  async getNodeInfo(): Promise<IPFSNodeInfo> {
    try {
      await this.ensureIPFSReady();
      const ipfs = this.ipfs;
      if (!ipfs) {
        throw new Error('IPFS client not initialized');
      }
      const idResult = await ipfs.id();
      const id = idResult as Record<string, unknown>;
      const addresses = Array.isArray((id as { addresses?: unknown[] }).addresses)
        ? ((id as { addresses?: unknown[] }).addresses as unknown[]).map(a => String(a))
        : [];
      const idVal = (id as { id?: unknown }).id;
      const publicKeyVal = (id as { publicKey?: unknown }).publicKey;
      const agentVersionVal = (id as { agentVersion?: unknown }).agentVersion;
      const protocolVersionVal = (id as { protocolVersion?: unknown }).protocolVersion;
      return {
        id: typeof idVal === 'string' ? idVal : '',
        publicKey: typeof publicKeyVal === 'string' ? publicKeyVal : '',
        addresses,
        agentVersion: typeof agentVersionVal === 'string' ? agentVersionVal : '',
        protocolVersion: typeof protocolVersionVal === 'string' ? protocolVersionVal : '',
      };
    } catch (error) {
      logger.error('获取节点信息失败:', error);
      throw new Error(
        `获取节点信息失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if file exists in IPFS
   * @param cid IPFS CID
   * @returns True if file exists
   */
  async fileExists(cid: string): Promise<boolean> {
    try {
      await (this.ipfs as IPFSClient).object.stat(cid);
      return true;
    } catch (_error) {
      logger.warn('IPFS object.stat failed during fileExists', _error);
      return false;
    }
  }

  /**
   * 获取文件统计信息
   * @param cid IPFS CID
   * @returns 文件统计信息
   */
  async getFileStats(cid: string): Promise<Record<string, unknown>> {
    try {
      await this.ensureIPFSReady();
      const ipfs = this.ipfs;
      if (!ipfs) {
        throw new Error('IPFS client not initialized');
      }
      const statsResult = await ipfs.files.stat(`/ipfs/${cid}`);
      const stats = statsResult as Record<string, unknown>;
      return {
        size: stats.size,
        type: stats.type,
        blocks: stats.blocks,
        cumulativeSize: stats.cumulativeSize,
      };
    } catch (error) {
      logger.error('获取文件统计失败:', error);
      throw new Error(
        `获取文件统计失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 批量上传文件
   * @param files 文件列表
   * @returns 上传结果列表
   */
  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; fileName: string; mimeType?: string }>
  ): Promise<IPFSUploadResponse[]> {
    const results: IPFSUploadResponse[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file.buffer, file.fileName, file.mimeType);
        results.push(result);
      } catch (error) {
        logger.error(`上传文件失败: ${file.fileName}`, error);
        // 继续处理其他文件
      }
    }

    return results;
  }

  /**
   * 搜索IPFS内容
   * @param query 搜索查询
   * @returns 搜索结果
   */
  async searchContent(_query: string): Promise<unknown[]> {
    try {
      // 这里可以实现基于元数据的搜索
      logger.info(`搜索IPFS内容: ${_query}`);
      // 实际实现需要维护一个索引数据库
      return [];
    } catch (error) {
      logger.error('搜索内容失败:', error);
      return [];
    }
  }

  /**
   * 清理过期的IPFS内容
   * @param cids 要清理的CID列表
   */
  async cleanupExpiredContent(cids: string[]): Promise<void> {
    try {
      for (const cid of cids) {
        await this.unpinFile(cid);
        logger.info(`已清理过期内容: ${cid}`);
      }
    } catch (error) {
      logger.error('清理IPFS内容失败:', error);
    }
  }

  /**
   * 验证IPFS内容完整性
   * @param cid IPFS CID
   * @param expectedHash 期望的哈希值
   * @returns 验证结果
   */
  async verifyContentIntegrity(cid: string, expectedHash: string): Promise<boolean> {
    try {
      const content = await this.downloadFile(cid);
      const actualHash = this.generateFileHash(content);
      return actualHash === expectedHash;
    } catch (error) {
      logger.error('验证内容完整性失败:', error);
      return false;
    }
  }

  /**
   * 获取IPFS存储统计信息
   * @returns 存储统计
   */
  async getStorageStats(): Promise<Record<string, unknown>> {
    try {
      await this.ensureIPFSReady();
      const ipfs = this.ipfs;
      if (!ipfs) {
        throw new Error('IPFS client not initialized');
      }
      const statsResult = await ipfs.repo.stat();
      const stats = statsResult as Record<string, unknown>;
      const repoSize = Number((stats as { repoSize?: unknown }).repoSize ?? 0);
      const storageMax = Number((stats as { storageMax?: unknown }).storageMax ?? 0) || 1;
      return {
        numObjects: Number(stats.numObjects ?? 0),
        repoSize,
        storageMax,
        utilization: `${((repoSize / storageMax) * 100).toFixed(2)}%`,
      };
    } catch (error) {
      logger.error('获取存储统计失败:', error);
      return {
        numObjects: 0,
        repoSize: 0,
        storageMax: 0,
        utilization: '0%',
      };
    }
  }
}
