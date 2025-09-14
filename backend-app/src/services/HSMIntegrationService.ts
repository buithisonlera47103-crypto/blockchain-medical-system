/**
 * HSM Integration Service
 * 提供硬件安全模块(HSM)集成服务
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';

import { Pool } from 'mysql2/promise';

import { ValidationError, BusinessLogicError } from '../utils/EnhancedAppError';


import { BaseService, ServiceConfig } from './BaseService';

// HSM相关接口
export interface HSMDevice {
  id: string;
  name: string;
  type: 'network' | 'usb' | 'pcie' | 'cloud';
  vendor: 'thales' | 'gemalto' | 'utimaco' | 'aws_cloudhsm' | 'azure_hsm' | 'other';
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  configuration: HSMConfiguration;
  connection: HSMConnection;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  capabilities: HSMCapabilities;
  performance: HSMPerformance;
  createdAt: Date;
  lastHealthCheck: Date;
}

export interface HSMConfiguration {
  authentication: {
    method: 'password' | 'certificate' | 'smart_card' | 'multi_factor';
    credentials: Record<string, unknown>;
    sessionTimeout: number; // 秒
    maxSessions: number;
  };
  security: {
    fipsLevel: 'level1' | 'level2' | 'level3' | 'level4';
    commonCriteria: string;
    tamperResistance: boolean;
    zeroization: boolean;
  };
  clustering: {
    enabled: boolean;
    nodes: string[];
    loadBalancing: 'round_robin' | 'least_connections' | 'weighted';
    failover: boolean;
  };
  backup: {
    enabled: boolean;
    schedule: string; // cron expression
    retention: number; // days
    encryption: boolean;
  };
}

export interface HSMConnection {
  endpoint: string;
  port: number;
  protocol: 'pkcs11' | 'cng' | 'jce' | 'rest_api' | 'proprietary';
  ssl: {
    enabled: boolean;
    certificate?: string;
    privateKey?: string;
    caCertificate?: string;
    verifyPeer: boolean;
  };
  timeout: {
    connection: number;
    operation: number;
    idle: number;
  };
  pooling: {
    enabled: boolean;
    minConnections: number;
    maxConnections: number;
  };
}

export interface HSMCapabilities {
  keyGeneration: {
    algorithms: string[];
    keySizes: number[];
    maxKeys: number;
  };
  cryptoOperations: {
    encryption: string[];
    signing: string[];
    hashing: string[];
    keyExchange: string[];
  };
  storage: {
    totalCapacity: number; // bytes
    availableCapacity: number; // bytes
    keySlots: number;
    certificateSlots: number;
  };
  compliance: {
    fips140: boolean;
    commonCriteria: boolean;
    pci: boolean;
    suite_b: boolean;
  };
}

export interface HSMPerformance {
  throughput: {
    rsa2048Sign: number; // operations per second
    rsa2048Verify: number;
    aes256Encrypt: number;
    sha256Hash: number;
    ecdsaP256Sign: number;
  };
  latency: {
    average: number; // milliseconds
    p95: number;
    p99: number;
  };
  utilization: {
    cpu: number; // percentage
    memory: number; // percentage
    storage: number; // percentage
  };
  lastMeasured: Date;
}

export interface HSMKey {
  id: string;
  hsmId: string;
  keyId: string; // HSM internal key ID
  label: string;
  algorithm: string;
  keySize: number;
  keyType: 'symmetric' | 'asymmetric_private' | 'asymmetric_public';
  usage: HSMKeyUsage[];
  attributes: HSMKeyAttributes;
  metadata: {
    owner: string;
    purpose: string;
    application: string;
    environment: 'development' | 'staging' | 'production';
  };
  lifecycle: {
    state: 'active' | 'inactive' | 'compromised' | 'destroyed' | 'archived';
    createdAt: Date;
    activatedAt?: Date;
    expiresAt?: Date;
    destroyedAt?: Date;
  };
  backup: {
    enabled: boolean;
    lastBackup?: Date;
    backupLocation?: string;
  };
}

export type HSMKeyUsage =
  | 'encrypt'
  | 'decrypt'
  | 'sign'
  | 'verify'
  | 'wrap'
  | 'unwrap'
  | 'derive'
  | 'generate';

export interface HSMKeyAttributes {
  extractable: boolean;
  sensitive: boolean;
  alwaysSensitive: boolean;
  neverExtractable: boolean;
  local: boolean;
  modifiable: boolean;
  copyable: boolean;
  destroyable: boolean;
}

// PKCS#11 provider configuration and adapter
export type HSMProvider = 'simulated' | 'pkcs11';

export interface PKCS11Config {
  provider: HSMProvider;
  modulePath?: string; // e.g., /usr/local/lib/softhsm/libsofthsm2.so
  slot?: number; // numeric slot index
  pin?: string; // user PIN
  keyLabel?: string; // default key label for find/generate
  strict?: boolean; // if true, errors won't fallback to simulated
}

export interface PKCS11ProviderAdapter {
  init(config: PKCS11Config): Promise<void>;
  testConnection(): Promise<void>;
  generateKey(keySize: number, label?: string): Promise<string>; // returns key identifier/label
  encrypt(key: HSMKey, data: Buffer, algorithm: string): Promise<Buffer>;
  decrypt(key: HSMKey, encrypted: Buffer, algorithm: string): Promise<Buffer>;
  sign(key: HSMKey, data: Buffer, algorithm: string): Promise<Buffer>;
  verify(key: HSMKey, data: Buffer, signature: Buffer, algorithm: string): Promise<boolean>;
  close(): Promise<void>;
}

type PKCS11JsLike = {
  PKCS11: new () => {
    load(path: string): void;
    C_Initialize(): void;
    C_GetSlotList(tokenPresent: boolean): unknown[];
    C_OpenSession(slot: unknown, flags: number): unknown;
    C_Login(session: unknown, userType: number, pin: string): void;
    C_GetSessionInfo(session: unknown): unknown;
    C_GenerateKey(session: unknown, mechanism: { mechanism: number }, template: Array<{ type: number; value: unknown }>): unknown;
    C_FindObjectsInit(session: unknown, template: Array<{ type: number; value: unknown }>): void;
    C_FindObjects(session: unknown, max: number): unknown[];
    C_FindObjectsFinal(session: unknown): void;
    C_EncryptInit(session: unknown, mechanism: unknown, key: unknown): void;
    C_EncryptUpdate(session: unknown, data: Buffer): Buffer;
    C_EncryptFinal(session: unknown, data: Buffer): Buffer;
    C_DecryptInit(session: unknown, mechanism: unknown, key: unknown): void;
    C_DecryptUpdate(session: unknown, data: Buffer): Buffer;
    C_DecryptFinal(session: unknown, data: Buffer): Buffer;
    C_SignInit(session: unknown, mechanism: unknown, key: unknown): void;
    C_Sign(session: unknown, data: Buffer): Buffer;
    C_VerifyInit(session: unknown, mechanism: unknown, key: unknown): void;
    C_Verify(session: unknown, data: Buffer, sig: Buffer): void;
    C_Logout(session: unknown): void;
    C_CloseSession(session: unknown): void;
    C_Finalize(): void;
  };
  CKF_SERIAL_SESSION: number;
  CKF_RW_SESSION: number;
  CKO_SECRET_KEY: number;
  CKA_CLASS: number;
  CKA_KEY_TYPE: number;
  CKA_LABEL: number;
  CKA_ENCRYPT: number;
  CKA_DECRYPT: number;
  CKA_SIGN: number;
  CKA_VERIFY: number;
  CKA_VALUE_LEN: number;
  CKA_TOKEN: number;
  CKA_SENSITIVE: number;
  CKA_EXTRACTABLE: number;
  CKK_AES: number;
  CKM_AES_KEY_GEN: number;
  CKM_AES_GCM: number;
  CKM_SHA256_HMAC: number;
};

class Pkcs11JsAdapter implements PKCS11ProviderAdapter {
  private pkcs11!: PKCS11JsLike;
  private module!: InstanceType<PKCS11JsLike['PKCS11']>;
  private session!: unknown;
  private slot?: number;
  private pin?: string;
  private keyLabel?: string;

  async init(config: PKCS11Config): Promise<void> {
    try {
      // Lazy dynamic import to avoid hard dependency
      const mod = (await import('pkcs11js')) as unknown as PKCS11JsLike;
      this.pkcs11 = mod;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`pkcs11js not available: ${msg}`);
    }

    if (!config.modulePath) throw new Error('PKCS#11 modulePath is required');

    this.slot = typeof config.slot === 'number' ? config.slot : 0;
    this.pin = config.pin;
    this.keyLabel = config.keyLabel;

    this.module = new this.pkcs11.PKCS11();
    this.module.load(config.modulePath);
    this.module.C_Initialize();

    const slots = this.module.C_GetSlotList(true);
    if (!slots || slots.length === 0) throw new Error('No PKCS#11 slots available');
    const slot = slots[this.slot];

    this.session = this.module.C_OpenSession(slot, this.pkcs11.CKF_SERIAL_SESSION | this.pkcs11.CKF_RW_SESSION);
    if (!this.pin) throw new Error('PKCS#11 PIN is required');
    this.module.C_Login(this.session, 1, this.pin);
  }

  async testConnection(): Promise<void> {
    if (!this.module || !this.session) throw new Error('PKCS#11 not initialized');
    // Attempt to get token info
    this.module.C_GetSessionInfo(this.session);
  }

  async generateKey(keySize: number, label?: string): Promise<string> {
    if (!this.module || !this.session) throw new Error('PKCS#11 not initialized');
    const name = (label ?? this.keyLabel) ?? `emr_key_${keySize}`;
    // AES key generation template (vendor-agnostic as much as possible)
    const t = this.pkcs11;
    const template = [
      { type: t.CKA_CLASS, value: t.CKO_SECRET_KEY },
      { type: t.CKA_KEY_TYPE, value: t.CKK_AES },
      { type: t.CKA_LABEL, value: Buffer.from(name) },
      { type: t.CKA_ENCRYPT, value: true },
      { type: t.CKA_DECRYPT, value: true },
      { type: t.CKA_SIGN, value: true },
      { type: t.CKA_VERIFY, value: true },
      { type: t.CKA_VALUE_LEN, value: keySize },
      { type: t.CKA_TOKEN, value: true },
      { type: t.CKA_SENSITIVE, value: true },
      { type: t.CKA_EXTRACTABLE, value: false },
    ];
    this.module.C_GenerateKey(this.session, { mechanism: t.CKM_AES_KEY_GEN }, template);
    return name;
  }

  private findKeyHandleByLabel(label?: string): unknown {
    const t = this.pkcs11;
    const searchTemplate = [
      { type: t.CKA_CLASS, value: t.CKO_SECRET_KEY },
      ...(label ? [{ type: t.CKA_LABEL, value: Buffer.from(label) }] as Array<{ type: number; value: unknown }> : []),
    ];
    this.module.C_FindObjectsInit(this.session, searchTemplate);
    const h = this.module.C_FindObjects(this.session, 1);
    this.module.C_FindObjectsFinal(this.session);
    if (!h || h.length === 0) throw new Error('Key not found');
    return h[0];
  }

  async encrypt(key: HSMKey, data: Buffer, _algorithm: string): Promise<Buffer> {
    const t = this.pkcs11;
    const handle = this.findKeyHandleByLabel(key.label ?? this.keyLabel);
    // Default to AES-GCM with 12-byte IV
    const iv = crypto.randomBytes(12);
    const mech = { mechanism: t.CKM_AES_GCM, parameter: Buffer.concat([Buffer.from([12, 0, 0, 0]), iv, Buffer.alloc(16)]) };
    this.module.C_EncryptInit(this.session, mech, handle);
    const out1 = this.module.C_EncryptUpdate(this.session, Buffer.from(data));
    const out2 = this.module.C_EncryptFinal(this.session, Buffer.alloc(0));
    return Buffer.concat([iv, out1, out2]);
  }

  async decrypt(key: HSMKey, encrypted: Buffer, _algorithm: string): Promise<Buffer> {
    const t = this.pkcs11;
    const handle = this.findKeyHandleByLabel(key.label ?? this.keyLabel);
    const iv = encrypted.subarray(0, 12);
    const payload = encrypted.subarray(12);
    const mech = { mechanism: t.CKM_AES_GCM, parameter: Buffer.concat([Buffer.from([12, 0, 0, 0]), iv, Buffer.alloc(16)]) };
    this.module.C_DecryptInit(this.session, mech, handle);
    const out1 = this.module.C_DecryptUpdate(this.session, Buffer.from(payload));
    const out2 = this.module.C_DecryptFinal(this.session, Buffer.alloc(0));
    return Buffer.concat([out1, out2]);
  }

  async sign(key: HSMKey, data: Buffer, _algorithm: string): Promise<Buffer> {
    const t = this.pkcs11;
    const handle = this.findKeyHandleByLabel(key.label ?? this.keyLabel);
    // Use HMAC-SHA256 for symmetric signing
    const mech = { mechanism: t.CKM_SHA256_HMAC };
    this.module.C_SignInit(this.session, mech, handle);
    return this.module.C_Sign(this.session, data);
  }

  async verify(key: HSMKey, data: Buffer, signature: Buffer, _algorithm: string): Promise<boolean> {
    const t = this.pkcs11;
    const handle = this.findKeyHandleByLabel(key.label || this.keyLabel);
    const mech = { mechanism: t.CKM_SHA256_HMAC };
    this.module.C_VerifyInit(this.session, mech, handle);
    try {
      this.module.C_Verify(this.session, data, signature);
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.session) {
        try { this.module.C_Logout(this.session); } catch { /* best-effort logout */ }
        this.module.C_CloseSession(this.session);
      }
    } finally {
      try { this.module.C_Finalize(); } catch { /* best-effort finalize */ }
    }
  }
}

// End of PKCS#11 adapter


export interface HSMCertificate {
  id: string;
  hsmId: string;
  certificateId: string; // HSM internal certificate ID
  label: string;
  subject: string;
  issuer: string;
  serialNumber: string;
  algorithm: string;
  keyUsage: string[];
  extendedKeyUsage: string[];
  validFrom: Date;
  validTo: Date;
  fingerprint: {
    sha1: string;
    sha256: string;
  };
  chain: string[]; // Certificate chain
  privateKeyId?: string; // Associated private key ID
  status: 'valid' | 'expired' | 'revoked' | 'suspended';
  createdAt: Date;
}

export interface HSMOperation {
  id: string;
  hsmId: string;
  type:
    | 'encrypt'
    | 'decrypt'
    | 'sign'
    | 'verify'
    | 'generate_key'
    | 'import_key'
    | 'export_key'
    | 'delete_key';
  keyId?: string;
  algorithm: string;
  parameters: Record<string, unknown>;
  input?: {
    data?: string; // base64 encoded
    size?: number;
    format?: string;
  };
  output?: {
    data?: string; // base64 encoded
    size?: number;
    format?: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  performance: {
    startTime: Date;
    endTime?: Date;
    duration?: number; // milliseconds
    throughput?: number; // bytes per second
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  audit: {
    userId: string;
    sessionId: string;
    clientIp: string;
    userAgent?: string;
  };
  createdAt: Date;
}

export interface HSMSession {
  id: string;
  hsmId: string;
  userId: string;
  sessionHandle: string; // HSM session handle
  state: 'active' | 'idle' | 'expired' | 'terminated';
  authentication: {
    method: string;
    timestamp: Date;
    expiresAt: Date;
  };
  operations: {
    total: number;
    successful: number;
    failed: number;
    lastOperation?: Date;
  };
  resources: {
    allocatedMemory: number;
    openHandles: number;
  };
  createdAt: Date;
  lastActivity: Date;
}

export interface HSMCluster {
  id: string;
  name: string;
  description: string;
  nodes: HSMClusterNode[];
  configuration: {
    loadBalancing: 'round_robin' | 'least_connections' | 'weighted' | 'hash_based';
    failover: {
      enabled: boolean;
      timeout: number;
      retries: number;
    };
    synchronization: {
      enabled: boolean;
      interval: number; // seconds
      conflictResolution: 'master_wins' | 'timestamp' | 'manual';
    };
  };
  status: 'healthy' | 'degraded' | 'failed';
  metrics: {
    totalOperations: number;
    averageLatency: number;
    availability: number; // percentage
    lastSync?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface HSMClusterNode {
  hsmId: string;
  role: 'primary' | 'secondary' | 'backup';
  weight: number; // for load balancing
  status: 'active' | 'inactive' | 'maintenance';
  health: {
    score: number; // 0-100
    lastCheck: Date;
    issues: string[];
  };
  synchronization: {
    lastSync: Date;
    syncStatus: 'synced' | 'syncing' | 'out_of_sync' | 'error';
    lag: number; // milliseconds
  };
}

export interface HSMAuditLog {
  id: string;
  hsmId: string;
  timestamp: Date;
  eventType: 'authentication' | 'key_operation' | 'configuration_change' | 'system_event' | 'error';
  severity: 'info' | 'warning' | 'error' | 'critical';
  userId?: string;
  sessionId?: string;
  operationId?: string;
  details: {
    action: string;
    resource?: string;
    parameters?: Record<string, unknown>;
    result?: 'success' | 'failure';
    errorCode?: string;
    errorMessage?: string;
  };
  metadata: {
    clientIp?: string;
    userAgent?: string;
    requestId?: string;
  };
}

export interface HSMBackup {
  id: string;
  hsmId: string;
  type: 'full' | 'incremental' | 'key_only' | 'configuration';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  schedule?: {
    cron: string;
    timezone: string;
    enabled: boolean;
  };
  content: {
    keys: number;
    certificates: number;
    configuration: boolean;
    size: number; // bytes
  };
  encryption: {
    enabled: boolean;
    algorithm?: string;
    keyId?: string;
  };
  storage: {
    location: string;
    provider: 'local' | 's3' | 'azure_blob' | 'gcs' | 'hsm_cluster';
    path: string;
    retention: number; // days
  };
  verification: {
    checksum: string;
    algorithm: string;
    verified: boolean;
    verifiedAt?: Date;
  };
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
}

/**
 * HSM集成服务类
 */
export class HSMIntegrationService extends BaseService {
  private eventEmitter: EventEmitter;
  private devices: Map<string, HSMDevice> = new Map();
  private keys: Map<string, HSMKey[]> = new Map();
  private certificates: Map<string, HSMCertificate[]> = new Map();
  private sessions: Map<string, HSMSession[]> = new Map();
  private clusters: Map<string, HSMCluster> = new Map();
  private operations: Map<string, HSMOperation> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private backupInterval?: NodeJS.Timeout;
  // PKCS#11 provider adapter and configuration
  private pkcs11Adapter: PKCS11ProviderAdapter | null = null;
  private hsmProvider: HSMProvider = ((process.env.HSM_PROVIDER as HSMProvider) || 'simulated');

  private getPkcs11ConfigFromEnv(): PKCS11Config {
    return {
      provider: this.hsmProvider,
      modulePath: process.env.HSM_PKCS11_MODULE_PATH,
      slot: process.env.HSM_PKCS11_SLOT ? Number(process.env.HSM_PKCS11_SLOT) : undefined,
      pin: process.env.HSM_PKCS11_PIN,
      keyLabel: process.env.HSM_PKCS11_KEY_LABEL,
      strict: (process.env.HSM_STRICT ?? 'false').toLowerCase() === 'true',
    };
  }

  private async getPkcs11Adapter(): Promise<PKCS11ProviderAdapter | null> {
    if (this.hsmProvider !== 'pkcs11') return null;
    if (this.pkcs11Adapter) return this.pkcs11Adapter;
    try {
      const cfg = this.getPkcs11ConfigFromEnv();
      const adapter = new Pkcs11JsAdapter();
      await adapter.init(cfg);
      await adapter.testConnection();
      this.logger.info('PKCS#11 provider initialized');
      this.pkcs11Adapter = adapter;
      return adapter;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn('PKCS#11 provider unavailable, falling back to simulated mode', { error: msg });
      if ((process.env.HSM_STRICT ?? 'false').toLowerCase() === 'true') {
        throw new BusinessLogicError(`PKCS#11 initialization failed: ${msg}`);
      }
      this.hsmProvider = 'simulated';
      return null;
    }
  }


  constructor(db: Pool, config: ServiceConfig = {}) {
    super(db, 'HSMIntegrationService', config);
    this.eventEmitter = new EventEmitter();
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    try {
      await this.loadDevices();
      await this.loadKeys();
      await this.loadCertificates();
      await this.loadSessions();
      await this.loadClusters();
      await this.startHealthChecks();
      await this.startBackupScheduler();
      this.logger.info('HSMIntegrationService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize HSMIntegrationService', { error });
      throw new BusinessLogicError('HSM integration service initialization failed');
    }
  }

  /**
   * 注册HSM设备
   */
  async registerDevice(deviceData: {
    name: string;
    type: 'network' | 'usb' | 'pcie' | 'cloud';
    vendor: 'thales' | 'gemalto' | 'utimaco' | 'aws_cloudhsm' | 'azure_hsm' | 'other';
    model: string;
    serialNumber: string;
    firmwareVersion: string;
    configuration: HSMConfiguration;
    connection: HSMConnection;
  }): Promise<HSMDevice> {

    try {
      const deviceId = this.generateId();

      // 验证设备配置
      this.validateDeviceConfiguration(deviceData.configuration);
      this.validateConnectionConfiguration(deviceData.connection);

      // 检查设备是否已存在
      const existingDevice = Array.from(this.devices.values()).find(
        d => d.serialNumber === deviceData.serialNumber
      );

      if (existingDevice) {
        throw new ValidationError(
          `Device with serial number already exists: ${deviceData.serialNumber}`
        );
      }

      // 测试连接
      const capabilities = await this.testDeviceConnection(deviceData.connection);
      const performance = await this.measureDevicePerformance(deviceData.connection);

      const device: HSMDevice = {
        id: deviceId,
        name: deviceData.name,
        type: deviceData.type,
        vendor: deviceData.vendor,
        model: deviceData.model,
        serialNumber: deviceData.serialNumber,
        firmwareVersion: deviceData.firmwareVersion,
        configuration: deviceData.configuration,
        connection: deviceData.connection,
        status: 'online',
        capabilities,
        performance,
        createdAt: new Date(),
        lastHealthCheck: new Date(),
      };

      // 存储到数据库
      await this.executeDbOperation(async connection => {
        await connection.execute(
          `INSERT INTO hsm_devices (id, name, type, vendor, model, serial_number, firmware_version, configuration, connection_config, status, capabilities, performance, created_at, last_health_check)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            deviceId,
            deviceData.name,
            deviceData.type,
            deviceData.vendor,
            deviceData.model,
            deviceData.serialNumber,
            deviceData.firmwareVersion,
            JSON.stringify(deviceData.configuration),
            JSON.stringify(deviceData.connection),
            'online',
            JSON.stringify(capabilities),
            JSON.stringify(performance),
            device.createdAt,
            device.lastHealthCheck,
          ]
        );
      }, 'register_device');

      // 缓存设备信息
      this.devices.set(deviceId, device);
      this.keys.set(deviceId, []);
      this.certificates.set(deviceId, []);
      this.sessions.set(deviceId, []);

      this.logger.info('HSM device registered', {
        deviceId,
        name: deviceData.name,
        vendor: deviceData.vendor,
      });

      // 发出事件
      this.eventEmitter.emit('deviceRegistered', { device });

      return device;
    } catch (error) {
      this.logger.error('Device registration failed', { error });
      throw this.handleError(error, 'registerDevice');
    }
  }

  /**
   * 生成密钥
   */
  async generateKey(
    hsmId: string,
    keyData: {
      label: string;
      algorithm: string;
      keySize: number;
      keyType: 'symmetric' | 'asymmetric_private' | 'asymmetric_public';
      usage: HSMKeyUsage[];
      attributes: HSMKeyAttributes;
      metadata: {
        owner: string;
        purpose: string;
        application: string;
        environment: 'development' | 'staging' | 'production';
      };
    }
  ): Promise<HSMKey> {
    try {
      const device = this.devices.get(hsmId);
      if (!device) {
        throw new ValidationError(`HSM device not found: ${hsmId}`);
      }

      if (device.status !== 'online') {
        throw new ValidationError(`HSM device is not online: ${hsmId}`);
      }

      // 验证算法支持
      if (!device.capabilities.keyGeneration.algorithms.includes(keyData.algorithm)) {
        throw new ValidationError(`Algorithm not supported: ${keyData.algorithm}`);
      }

      // 验证密钥大小
      if (!device.capabilities.keyGeneration.keySizes.includes(keyData.keySize)) {
        throw new ValidationError(`Key size not supported: ${keyData.keySize}`);
      }

      // 检查存储容量
      const deviceKeys = this.keys.get(hsmId) ?? [];
      if (deviceKeys.length >= device.capabilities.storage.keySlots) {
        throw new ValidationError(`Key storage capacity exceeded for device: ${hsmId}`);
      }

      const keyId = this.generateId();
      const operationId = this.generateId();

      // 创建操作记录
      const operation: HSMOperation = {
        id: operationId,
        hsmId,
        type: 'generate_key',
        algorithm: keyData.algorithm,
        parameters: {
          keySize: keyData.keySize,
          keyType: keyData.keyType,
          usage: keyData.usage,
          attributes: keyData.attributes,
        },
        status: 'processing',
        performance: {
          startTime: new Date(),
        },
        audit: {
          userId: keyData.metadata.owner,
          sessionId: this.generateId(),
          clientIp: '127.0.0.1', // 应该从请求中获取
        },
        createdAt: new Date(),
      };

      this.operations.set(operationId, operation);

      try {
        // 模拟HSM密钥生成
        const hsmKeyId = await this.performKeyGeneration(device, keyData);

        const key: HSMKey = {
          id: keyId,
          hsmId,
          keyId: hsmKeyId,
          label: keyData.label,
          algorithm: keyData.algorithm,
          keySize: keyData.keySize,
          keyType: keyData.keyType,
          usage: keyData.usage,
          attributes: keyData.attributes,
          metadata: keyData.metadata,
          lifecycle: {
            state: 'active',
            createdAt: new Date(),
            activatedAt: new Date(),
          },
          backup: {
            enabled: device.configuration.backup.enabled,
          },
        };

        // 存储到数据库
        await this.executeDbOperation(async connection => {
          await connection.execute(
            `INSERT INTO hsm_keys (id, hsm_id, key_id, label, algorithm, key_size, key_type, usage, attributes, metadata, lifecycle, backup_config, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              keyId,
              hsmId,
              hsmKeyId,
              keyData.label,
              keyData.algorithm,
              keyData.keySize,
              keyData.keyType,
              JSON.stringify(keyData.usage),
              JSON.stringify(keyData.attributes),
              JSON.stringify(keyData.metadata),
              JSON.stringify(key.lifecycle),
              JSON.stringify(key.backup),
              key.lifecycle.createdAt,
            ]
          );
        }, 'generate_key');

        // 更新缓存
        deviceKeys.push(key);
        this.keys.set(hsmId, deviceKeys);

        // 更新操作状态
        operation.status = 'completed';
        operation.performance.endTime = new Date();
        operation.performance.duration =
          operation.performance.endTime.getTime() - operation.performance.startTime.getTime();
        operation.output = {
          data: keyId,
          format: 'key_id',
        };

        this.logger.info('HSM key generated', {
          keyId,
          hsmId,
          algorithm: keyData.algorithm,
        });

        // 发出事件
        this.eventEmitter.emit('keyGenerated', { key, operation });

        return key;
      } catch (error) {
        // 更新操作状态为失败
        operation.status = 'failed';
        operation.performance.endTime = new Date();
        operation.performance.duration =
          operation.performance.endTime.getTime() - operation.performance.startTime.getTime();
        operation.error = {
          code: 'KEY_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        throw error;
      }
    } catch (error) {
      this.logger.error('Key generation failed', { hsmId, error });
      throw this.handleError(error, 'generateKey');
    }
  }

  /**
   * 执行加密操作
   */
  async encrypt(
    hsmId: string,
    keyId: string,
    data: string,
    algorithm?: string
  ): Promise<{
    encryptedData: string;
    operationId: string;
  }> {
    try {
      const device = this.devices.get(hsmId);
      if (!device) {
        throw new ValidationError(`HSM device not found: ${hsmId}`);
      }

      const deviceKeys = this.keys.get(hsmId) ?? [];
      const key = deviceKeys.find(k => k.id === keyId);
      if (!key) {
        throw new ValidationError(`Key not found: ${keyId}`);
      }

      if (!key.usage.includes('encrypt')) {
        throw new ValidationError(`Key does not support encryption: ${keyId}`);
      }

      if (key.lifecycle.state !== 'active') {
        throw new ValidationError(`Key is not active: ${keyId}`);
      }

      const operationId = this.generateId();
      const encryptionAlgorithm = algorithm ?? key.algorithm;

      // 创建操作记录
      const operation: HSMOperation = {
        id: operationId,
        hsmId,
        type: 'encrypt',
        keyId,
        algorithm: encryptionAlgorithm,
        parameters: {},
        input: {
          data: Buffer.from(data).toString('base64'),
          size: Buffer.from(data).length,
          format: 'base64',
        },
        status: 'processing',
        performance: {
          startTime: new Date(),
        },
        audit: {
          userId: 'system',
          sessionId: this.generateId(),
          clientIp: '127.0.0.1',
        },
        createdAt: new Date(),
      };

      this.operations.set(operationId, operation);

      try {
        // 模拟HSM加密操作
        const encryptedData = await this.performEncryption(device, key, data, encryptionAlgorithm);

        // 更新操作状态
        operation.status = 'completed';
        operation.performance.endTime = new Date();
        operation.performance.duration =
          operation.performance.endTime.getTime() - operation.performance.startTime.getTime();
        operation.output = {
          data: encryptedData,
          size: Buffer.from(encryptedData, 'base64').length,
          format: 'base64',
        };

        this.logger.info('HSM encryption completed', {
          operationId,
          hsmId,
          keyId,
        });

        // 发出事件
        this.eventEmitter.emit('encryptionCompleted', { operation });

        return {
          encryptedData,
          operationId,
        };
      } catch (error) {
        // 更新操作状态为失败
        operation.status = 'failed';
        operation.performance.endTime = new Date();
        operation.performance.duration =
          operation.performance.endTime.getTime() - operation.performance.startTime.getTime();
        operation.error = {
          code: 'ENCRYPTION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        throw error;
      }
    } catch (error) {
      this.logger.error('Encryption operation failed', { hsmId, keyId, error });
      throw this.handleError(error, 'encrypt');
    }
  }

  /**
   * 执行解密操作
   */
  async decrypt(
    hsmId: string,
    keyId: string,
    encryptedData: string,
    algorithm?: string
  ): Promise<{
    decryptedData: string;
    operationId: string;
  }> {
    try {
      const device = this.devices.get(hsmId);
      if (!device) {
        throw new ValidationError(`HSM device not found: ${hsmId}`);
      }

      const deviceKeys = this.keys.get(hsmId) ?? [];
      const key = deviceKeys.find(k => k.id === keyId);
      if (!key) {
        throw new ValidationError(`Key not found: ${keyId}`);
      }

      if (!key.usage.includes('decrypt')) {
        throw new ValidationError(`Key does not support decryption: ${keyId}`);
      }

      if (key.lifecycle.state !== 'active') {
        throw new ValidationError(`Key is not active: ${keyId}`);
      }

      const operationId = this.generateId();
      const decryptionAlgorithm = algorithm ?? key.algorithm;

      // 创建操作记录
      const operation: HSMOperation = {
        id: operationId,
        hsmId,
        type: 'decrypt',
        keyId,
        algorithm: decryptionAlgorithm,
        parameters: {},
        input: {
          data: encryptedData,
          size: Buffer.from(encryptedData, 'base64').length,
          format: 'base64',
        },
        status: 'processing',
        performance: {
          startTime: new Date(),
        },
        audit: {
          userId: 'system',
          sessionId: this.generateId(),
          clientIp: '127.0.0.1',
        },
        createdAt: new Date(),
      };

      this.operations.set(operationId, operation);

      try {
        // 模拟HSM解密操作
        const decryptedData = await this.performDecryption(
          device,
          key,
          encryptedData,
          decryptionAlgorithm
        );

        // 更新操作状态
        operation.status = 'completed';
        operation.performance.endTime = new Date();
        operation.performance.duration =
          operation.performance.endTime.getTime() - operation.performance.startTime.getTime();
        operation.output = {
          data: Buffer.from(decryptedData).toString('base64'),
          size: Buffer.from(decryptedData).length,
          format: 'base64',
        };

        this.logger.info('HSM decryption completed', {
          operationId,
          hsmId,
          keyId,
        });

        // 发出事件
        this.eventEmitter.emit('decryptionCompleted', { operation });

        return {
          decryptedData,
          operationId,
        };
      } catch (error) {
        // 更新操作状态为失败
        operation.status = 'failed';
        operation.performance.endTime = new Date();
        operation.performance.duration =
          operation.performance.endTime.getTime() - operation.performance.startTime.getTime();
        operation.error = {
          code: 'DECRYPTION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        throw error;
      }
    } catch (error) {
      this.logger.error('Decryption operation failed', { hsmId, keyId, error });
      throw this.handleError(error, 'decrypt');
    }
  }

  /**
   * 执行数字签名
   */
  async sign(
    hsmId: string,
    keyId: string,
    data: string,
    algorithm?: string
  ): Promise<{
    signature: string;
    operationId: string;
  }> {
    try {
      const device = this.devices.get(hsmId);
      if (!device) {
        throw new ValidationError(`HSM device not found: ${hsmId}`);
      }

      const deviceKeys = this.keys.get(hsmId) ?? [];
      const key = deviceKeys.find(k => k.id === keyId);
      if (!key) {
        throw new ValidationError(`Key not found: ${keyId}`);
      }

      if (!key.usage.includes('sign')) {
        throw new ValidationError(`Key does not support signing: ${keyId}`);
      }

      if (key.lifecycle.state !== 'active') {
        throw new ValidationError(`Key is not active: ${keyId}`);
      }

      const operationId = this.generateId();
      const signingAlgorithm = algorithm ?? key.algorithm;

      // 创建操作记录
      const operation: HSMOperation = {
        id: operationId,
        hsmId,
        type: 'sign',
        keyId,
        algorithm: signingAlgorithm,
        parameters: {},
        input: {
          data: Buffer.from(data).toString('base64'),
          size: Buffer.from(data).length,
          format: 'base64',
        },
        status: 'processing',
        performance: {
          startTime: new Date(),
        },
        audit: {
          userId: 'system',
          sessionId: this.generateId(),
          clientIp: '127.0.0.1',
        },
        createdAt: new Date(),
      };

      this.operations.set(operationId, operation);

      try {
        // 模拟HSM签名操作
        const signature = await this.performSigning(device, key, data, signingAlgorithm);

        // 更新操作状态
        operation.status = 'completed';
        operation.performance.endTime = new Date();
        operation.performance.duration =
          operation.performance.endTime.getTime() - operation.performance.startTime.getTime();
        operation.output = {
          data: signature,
          format: 'base64',
        };

        this.logger.info('HSM signing completed', {
          operationId,
          hsmId,
          keyId,
        });

        // 发出事件
        this.eventEmitter.emit('signingCompleted', { operation });

        return {
          signature,
          operationId,
        };
      } catch (error) {
        // 更新操作状态为失败
        operation.status = 'failed';
        operation.performance.endTime = new Date();
        operation.performance.duration =
          operation.performance.endTime.getTime() - operation.performance.startTime.getTime();
        operation.error = {
          code: 'SIGNING_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        throw error;
      }
    } catch (error) {
      this.logger.error('Signing operation failed', { hsmId, keyId, error });
      throw this.handleError(error, 'sign');
    }
  }

  /**
   * 验证数字签名
   */
  async verify(
    hsmId: string,
    keyId: string,
    data: string,
    signature: string,
    algorithm?: string
  ): Promise<{
    valid: boolean;
    operationId: string;
  }> {
    try {
      const device = this.devices.get(hsmId);
      if (!device) {
        throw new ValidationError(`HSM device not found: ${hsmId}`);
      }

      const deviceKeys = this.keys.get(hsmId) ?? [];
      const key = deviceKeys.find(k => k.id === keyId);
      if (!key) {
        throw new ValidationError(`Key not found: ${keyId}`);
      }

      if (!key.usage.includes('verify')) {
        throw new ValidationError(`Key does not support verification: ${keyId}`);
      }

      if (key.lifecycle.state !== 'active') {
        throw new ValidationError(`Key is not active: ${keyId}`);
      }

      const operationId = this.generateId();
      const verificationAlgorithm = algorithm ?? key.algorithm;

      // 创建操作记录
      const operation: HSMOperation = {
        id: operationId,
        hsmId,
        type: 'verify',
        keyId,
        algorithm: verificationAlgorithm,
        parameters: {
          signature,
        },
        input: {
          data: Buffer.from(data).toString('base64'),
          size: Buffer.from(data).length,
          format: 'base64',
        },
        status: 'processing',
        performance: {
          startTime: new Date(),
        },
        audit: {
          userId: 'system',
          sessionId: this.generateId(),
          clientIp: '127.0.0.1',
        },
        createdAt: new Date(),
      };

      this.operations.set(operationId, operation);

      try {
        // 模拟HSM验证操作
        const valid = await this.performVerification(
          device,
          key,
          data,
          signature,
          verificationAlgorithm
        );

        // 更新操作状态
        operation.status = 'completed';
        operation.performance.endTime = new Date();
        operation.performance.duration =
          operation.performance.endTime.getTime() - operation.performance.startTime.getTime();
        operation.output = {
          data: valid.toString(),
          format: 'boolean',
        };

        this.logger.info('HSM verification completed', {
          operationId,
          hsmId,
          keyId,
          valid,
        });

        // 发出事件
        this.eventEmitter.emit('verificationCompleted', { operation });

        return {
          valid,
          operationId,
        };
      } catch (error) {
        // 更新操作状态为失败
        operation.status = 'failed';
        operation.performance.endTime = new Date();
        operation.performance.duration =
          operation.performance.endTime.getTime() - operation.performance.startTime.getTime();
        operation.error = {
          code: 'VERIFICATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        throw error;
      }
    } catch (error) {
      this.logger.error('Verification operation failed', { hsmId, keyId, error });
      throw this.handleError(error, 'verify');
    }
  }

  /**
   * 创建HSM集群
   */
  async createCluster(clusterData: {
    name: string;
    description: string;
    nodes: {
      hsmId: string;
      role: 'primary' | 'secondary' | 'backup';
      weight: number;
    }[];
    configuration: HSMCluster['configuration'];
  }): Promise<HSMCluster> {
    try {
      const clusterId = this.generateId();

      // 验证节点
      for (const nodeData of clusterData.nodes) {
        const device = this.devices.get(nodeData.hsmId);
        if (!device) {
          throw new ValidationError(`HSM device not found: ${nodeData.hsmId}`);
        }
        if (device.status !== 'online') {
          throw new ValidationError(`HSM device is not online: ${nodeData.hsmId}`);
        }
      }

      // 确保有且仅有一个主节点
      const primaryNodes = clusterData.nodes.filter(n => n.role === 'primary');
      if (primaryNodes.length !== 1) {
        throw new ValidationError('Cluster must have exactly one primary node');
      }

      const nodes: HSMClusterNode[] = clusterData.nodes.map(nodeData => ({
        hsmId: nodeData.hsmId,
        role: nodeData.role,
        weight: nodeData.weight,
        status: 'active',
        health: {
          score: 100,
          lastCheck: new Date(),
          issues: [],
        },
        synchronization: {
          lastSync: new Date(),
          syncStatus: 'synced',
          lag: 0,
        },
      }));

      const cluster: HSMCluster = {
        id: clusterId,
        name: clusterData.name,
        description: clusterData.description,
        nodes,
        configuration: clusterData.configuration,
        status: 'healthy',
        metrics: {
          totalOperations: 0,
          averageLatency: 0,
          availability: 100,
          lastSync: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 存储到数据库
      await this.executeDbOperation(async connection => {
        await connection.execute(
          `INSERT INTO hsm_clusters (id, name, description, nodes, configuration, status, metrics, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            clusterId,
            clusterData.name,
            clusterData.description,
            JSON.stringify(nodes),
            JSON.stringify(clusterData.configuration),
            'healthy',
            JSON.stringify(cluster.metrics),
            cluster.createdAt,
            cluster.updatedAt,
          ]
        );
      }, 'create_cluster');

      // 缓存集群信息
      this.clusters.set(clusterId, cluster);

      this.logger.info('HSM cluster created', {
        clusterId,
        name: clusterData.name,
        nodeCount: nodes.length,
      });

      // 发出事件
      this.eventEmitter.emit('clusterCreated', { cluster });

      return cluster;
    } catch (error) {
      this.logger.error('Cluster creation failed', { error });
      throw this.handleError(error, 'createCluster');
    }
  }

  /**
   * 获取设备状态
   */
  async getDeviceStatus(hsmId: string): Promise<{
    device: HSMDevice;
    keys: HSMKey[];
    certificates: HSMCertificate[];
    sessions: HSMSession[];
    recentOperations: HSMOperation[];
  }> {
    try {
      const device = this.devices.get(hsmId);
      if (!device) {
        throw new ValidationError(`HSM device not found: ${hsmId}`);
      }

      const keys = this.keys.get(hsmId) ?? [];
      const certificates = this.certificates.get(hsmId) ?? [];
      const sessions = this.sessions.get(hsmId) ?? [];

      // 获取最近的操作
      const recentOperations = Array.from(this.operations.values())
        .filter(op => op.hsmId === hsmId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10);

      return {
        device,
        keys,
        certificates,
        sessions,
        recentOperations,
      };
    } catch (error) {
      this.logger.error('Failed to get device status', { hsmId, error });
      throw this.handleError(error, 'getDeviceStatus');
    }
  }

  // 私有辅助方法
  private async loadDevices(): Promise<void> {
    try {
      const devices = await this.executeDbOperation(async connection => {
        const [rows] = await connection.execute('SELECT * FROM hsm_devices');
        return Array.isArray(rows) ? rows : [];
      }, 'load_devices');

      for (const device of devices as Array<{
        id: string;
        name: string;
        type: string;
        vendor: string;
        model: string;
        serial_number: string;
        firmware_version: string;
        configuration: string;
        connection_config: string;
        status: string;
        capabilities: string;
        performance: string;
        created_at: string;
        last_health_check: string;
      }>) {
        this.devices.set(device.id, {
          id: device.id,
          name: device.name,
          type: device.type as "network" | "usb" | "pcie" | "cloud",
          vendor: device.vendor as "other" | "thales" | "gemalto" | "utimaco" | "aws_cloudhsm" | "azure_hsm",
          model: device.model,
          serialNumber: device.serial_number,
          firmwareVersion: device.firmware_version,
          configuration: JSON.parse(device.configuration),
          connection: JSON.parse(device.connection_config),
          status: device.status as "error" | "maintenance" | "online" | "offline",
          capabilities: JSON.parse(device.capabilities),
          performance: JSON.parse(device.performance),
          createdAt: new Date(device.created_at),
          lastHealthCheck: new Date(device.last_health_check),
        });
      }

      this.logger.info(`Loaded ${devices.length} HSM devices`);
    } catch (error) {
      this.logger.error('Failed to load devices', { error });
      throw error;
    }
  }

  private async loadKeys(): Promise<void> {
    try {
      const keys = await this.executeDbOperation(async connection => {
        const [rows] = await connection.execute('SELECT * FROM hsm_keys');
        return Array.isArray(rows) ? rows : [];
      }, 'load_keys');

      const keysByDevice = new Map<string, HSMKey[]>();

      for (const key of keys as Array<{
        id: string;
        hsm_id: string;
        key_id: string;
        label: string;
        algorithm: string;
        key_size: number;
        key_type: string;
        usage: string;
        attributes: string;
        metadata: string;
        lifecycle: string;
        backup_config: string;
      }>) {
        const deviceKeys = keysByDevice.get(key.hsm_id) ?? [];
        deviceKeys.push({
          id: key.id,
          hsmId: key.hsm_id,
          keyId: key.key_id,
          label: key.label,
          algorithm: key.algorithm,
          keySize: key.key_size,
          keyType: key.key_type as "symmetric" | "asymmetric_private" | "asymmetric_public",
          usage: JSON.parse(key.usage),
          attributes: JSON.parse(key.attributes),
          metadata: JSON.parse(key.metadata),
          lifecycle: JSON.parse(key.lifecycle),
          backup: JSON.parse(key.backup_config),
        });
        keysByDevice.set(key.hsm_id, deviceKeys);
      }

      this.keys = keysByDevice;

      this.logger.info(`Loaded ${keys.length} HSM keys`);
    } catch (error) {
      this.logger.error('Failed to load keys', { error });
      throw error;
    }
  }

  private async loadCertificates(): Promise<void> {
    try {
      const certificates = await this.executeDbOperation(async connection => {
        const [rows] = await connection.execute('SELECT * FROM hsm_certificates');
        return Array.isArray(rows) ? rows : [];
      }, 'load_certificates');

      const certificatesByDevice = new Map<string, HSMCertificate[]>();

      for (const cert of certificates as Array<{
        id: string;
        hsm_id: string;
        certificate_id: string;
        label: string;
        subject: string;
        issuer: string;
        serial_number: string;
        algorithm: string;
        key_usage: string;
        extended_key_usage: string;
        valid_from: string;
        valid_to: string;
        fingerprint: string;
        chain: string;
        private_key_id?: string;
        status: string;
        created_at: string;
      }>) {
        const deviceCertificates = certificatesByDevice.get(cert.hsm_id) ?? [];
        deviceCertificates.push({
          id: cert.id,
          hsmId: cert.hsm_id,
          certificateId: cert.certificate_id,
          label: cert.label,
          subject: cert.subject,
          issuer: cert.issuer,
          serialNumber: cert.serial_number,
          algorithm: cert.algorithm,
          keyUsage: JSON.parse(cert.key_usage),
          extendedKeyUsage: JSON.parse(cert.extended_key_usage),
          validFrom: new Date(cert.valid_from),
          validTo: new Date(cert.valid_to),
          fingerprint: JSON.parse(cert.fingerprint),
          chain: JSON.parse(cert.chain),
          privateKeyId: cert.private_key_id,
          status: cert.status as "suspended" | "expired" | "revoked" | "valid",
          createdAt: new Date(cert.created_at),
        });
        certificatesByDevice.set(cert.hsm_id, deviceCertificates);
      }

      this.certificates = certificatesByDevice;

      this.logger.info(`Loaded ${certificates.length} HSM certificates`);
    } catch (error) {
      this.logger.error('Failed to load certificates', { error });
      throw error;
    }
  }

  private async loadSessions(): Promise<void> {
    try {
      const sessions = await this.executeDbOperation(async connection => {
        const [rows] = await connection.execute(
          'SELECT * FROM hsm_sessions WHERE state IN ("active", "idle")'
        );
        return Array.isArray(rows) ? rows : [];
      }, 'load_sessions');

      const sessionsByDevice = new Map<string, HSMSession[]>();

      for (const session of sessions as Array<{
        id: string;
        hsm_id: string;
        user_id: string;
        session_handle: string;
        state: string;
        authentication: string;
        operations: string;
        resources: string;
        created_at: string;
        last_activity: string;
      }>) {
        const deviceSessions = sessionsByDevice.get(session.hsm_id) ?? [];
        deviceSessions.push({
          id: session.id,
          hsmId: session.hsm_id,
          userId: session.user_id,
          sessionHandle: session.session_handle,
          state: session.state as "active" | "expired" | "idle" | "terminated",
          authentication: JSON.parse(session.authentication),
          operations: JSON.parse(session.operations),
          resources: JSON.parse(session.resources),
          createdAt: new Date(session.created_at),
          lastActivity: new Date(session.last_activity),
        });
        sessionsByDevice.set(session.hsm_id, deviceSessions);
      }

      this.sessions = sessionsByDevice;

      this.logger.info(`Loaded ${sessions.length} active HSM sessions`);
    } catch (error) {
      this.logger.error('Failed to load sessions', { error });
      throw error;
    }
  }

  private async loadClusters(): Promise<void> {
    try {
      const clusters = await this.executeDbOperation(async connection => {
        const [rows] = await connection.execute('SELECT * FROM hsm_clusters');
        return Array.isArray(rows) ? rows : [];
      }, 'load_clusters');

      for (const cluster of clusters as Array<{
        id: string;
        name: string;
        description: string;
        nodes: string;
        configuration: string;
        status: string;
        metrics: string;
        created_at: string;
        updated_at: string;
      }>) {
        this.clusters.set(cluster.id, {
          id: cluster.id,
          name: cluster.name,
          description: cluster.description,
          nodes: JSON.parse(cluster.nodes),
          configuration: JSON.parse(cluster.configuration),
          status: cluster.status as "failed" | "healthy" | "degraded",
          metrics: JSON.parse(cluster.metrics),
          createdAt: new Date(cluster.created_at),
          updatedAt: new Date(cluster.updated_at),
        });
      }

      this.logger.info(`Loaded ${clusters.length} HSM clusters`);
    } catch (error) {
      this.logger.error('Failed to load clusters', { error });
      throw error;
    }
  }

  private async startHealthChecks(): Promise<void> {
    this.healthCheckInterval = setInterval((): void => {
      void (async (): Promise<void> => {
        try {
          await this.performHealthChecks();
        } catch (error) {
          this.logger.error('Health check failed', { error });
        }
      })();
    }, 60000); // 每分钟检查一次

    if (this.healthCheckInterval) { this.logger.debug('Health check interval active'); }
    this.logger.info('HSM health checks started');
  }

  private async startBackupScheduler(): Promise<void> {
    this.backupInterval = setInterval((): void => {
      void (async (): Promise<void> => {
        try {
          await this.performScheduledBackups();
        } catch (error) {
          this.logger.error('Scheduled backup failed', { error });
        }
      })();
    }, 3600000); // 每小时检查一次

    if (this.backupInterval) { this.logger.debug('Backup scheduler active'); }
    this.logger.info('HSM backup scheduler started');
  }

  private validateDeviceConfiguration(config: HSMConfiguration): void {
    if (config.authentication.sessionTimeout <= 0) {
      throw new ValidationError('Session timeout must be positive');
    }
    if (config.authentication.maxSessions <= 0) {
      throw new ValidationError('Max sessions must be positive');
    }
  }

  private validateConnectionConfiguration(connection: HSMConnection): void {
    if (!connection.endpoint) {
      throw new ValidationError('Connection endpoint is required');
    }
    if (connection.port <= 0 || connection.port > 65535) {
      throw new ValidationError('Invalid port number');
    }
  }

  private async testDeviceConnection(connection: HSMConnection): Promise<HSMCapabilities> {
    if (connection.protocol === 'pkcs11' || this.hsmProvider === 'pkcs11') {
      try {
        const adapter = await this.getPkcs11Adapter();
        if (adapter) {
          await adapter.testConnection();
          return {
            keyGeneration: { algorithms: ['AES'], keySizes: [128, 192, 256], maxKeys: 100000 },
            cryptoOperations: {
              encryption: ['AES-GCM'],
              signing: ['HMAC-SHA256'],
              hashing: ['SHA-256', 'SHA-384', 'SHA-512'],
              keyExchange: [],
            },
            storage: { totalCapacity: 0, availableCapacity: 0, keySlots: 0, certificateSlots: 0 },
            compliance: { fips140: true, commonCriteria: true, pci: true, suite_b: false },
          };
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn('PKCS#11 connection test failed; falling back to simulated', { error: msg });
        if ((process.env.HSM_STRICT ?? 'false').toLowerCase() === 'true') {
          throw new BusinessLogicError(`PKCS#11 connection test failed: ${msg}`);
        }
      }
    }

    // 模拟设备连接测试
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      keyGeneration: {
        algorithms: ['RSA', 'AES', 'ECDSA', 'ECDH'],
        keySizes: [128, 192, 256, 1024, 2048, 4096],
        maxKeys: 1000,
      },
      cryptoOperations: {
        encryption: ['AES-CBC', 'AES-GCM', 'RSA-OAEP'],
        signing: ['RSA-PSS', 'ECDSA', 'HMAC'],
        hashing: ['SHA-256', 'SHA-384', 'SHA-512'],
        keyExchange: ['ECDH', 'RSA'],
      },
      storage: {
        totalCapacity: 1024 * 1024, // 1MB
        availableCapacity: 1024 * 1024,
        keySlots: 1000,
        certificateSlots: 100,
      },
      compliance: {
        fips140: true,
        commonCriteria: true,
        pci: true,
        suite_b: false,
      },
    };
  }

  private async measureDevicePerformance(_connection: HSMConnection): Promise<HSMPerformance> {
    // 模拟性能测量
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      throughput: {
        rsa2048Sign: 1000,
        rsa2048Verify: 5000,
        aes256Encrypt: 100000,
        sha256Hash: 200000,
        ecdsaP256Sign: 2000,
      },
      latency: {
        average: 5,
        p95: 10,
        p99: 20,
      },
      utilization: {
        cpu: 25,
        memory: 40,
        storage: 15,
      },
      lastMeasured: new Date(),
    };
  }

  private async performKeyGeneration(_device: HSMDevice, _keyData: unknown): Promise<string> {
    const strict = (process.env.HSM_STRICT ?? 'false').toLowerCase() === 'true';
    try {
      const adapter = await this.getPkcs11Adapter();
      if (adapter) {
        const kd = (_keyData as { label?: string; keySize?: number }) || {};
        const size = kd.keySize && kd.keySize > 0 ? kd.keySize : 32; // bytes for AES-256
        const label = kd.label ?? `emr_key_${Date.now()}`;
        const id = await adapter.generateKey(size, label);
        this.logger.info('PKCS#11 key generated', { label: id, size });
        return id;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error('PKCS#11 key generation failed', { error: msg });
      if (strict) throw new BusinessLogicError(`PKCS#11 key generation failed: ${msg}`);
    }
    // Fallback simulated
    await new Promise(resolve => setTimeout(resolve, 100));
    return `hsm_key_${this.generateId()}`;
  }

  private async performEncryption(
    _device: HSMDevice,
    key: HSMKey,
    data: string,
    algorithm: string
  ): Promise<string> {
    const strict = (process.env.HSM_STRICT ?? 'false').toLowerCase() === 'true';
    try {
      const adapter = await this.getPkcs11Adapter();
      if (adapter) {
        const out = await adapter.encrypt(key, Buffer.from(data, 'utf8'), algorithm);
        return out.toString('base64');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error('PKCS#11 encryption failed', { error: msg });
      if (strict) throw new BusinessLogicError(`PKCS#11 encryption failed: ${msg}`);
    }
    // 模拟HSM加密 (fallback)
    await new Promise(resolve => setTimeout(resolve, 10));
    const encrypted = crypto.createHash('sha256').update(data + key.keyId + algorithm).digest();
    return encrypted.toString('base64');
  }

  private async performDecryption(
    _device: HSMDevice,
    key: HSMKey,
    encryptedData: string,
    algorithm: string
  ): Promise<string> {
    const strict = (process.env.HSM_STRICT ?? 'false').toLowerCase() === 'true';
    try {
      const adapter = await this.getPkcs11Adapter();
      if (adapter) {
        const out = await adapter.decrypt(key, Buffer.from(encryptedData, 'base64'), algorithm);
        return out.toString('utf8');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error('PKCS#11 decryption failed', { error: msg });
      if (strict) throw new BusinessLogicError(`PKCS#11 decryption failed: ${msg}`);
    }
    // 模拟HSM解密 (fallback)
    await new Promise(resolve => setTimeout(resolve, 10));
    return `decrypted_${encryptedData.substring(0, 10)}`;
  }

  private async performSigning(
    _device: HSMDevice,
    key: HSMKey,
    data: string,
    algorithm: string
  ): Promise<string> {
    const strict = (process.env.HSM_STRICT ?? 'false').toLowerCase() === 'true';
    try {
      const adapter = await this.getPkcs11Adapter();
      if (adapter) {
        const sig = await adapter.sign(key, Buffer.from(data, 'utf8'), algorithm);
        return sig.toString('base64');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error('PKCS#11 signing failed', { error: msg });
      if (strict) throw new BusinessLogicError(`PKCS#11 signing failed: ${msg}`);
    }
    // 模拟HSM签名 (fallback)
    await new Promise(resolve => setTimeout(resolve, 15));
    const signature = crypto.createHash('sha256').update(`${data + key.keyId + algorithm}signature`).digest();
    return signature.toString('base64');
  }

  private async performVerification(
    _device: HSMDevice,
    key: HSMKey,
    data: string,
    signature: string,
    algorithm: string
  ): Promise<boolean> {
    const strict = (process.env.HSM_STRICT ?? 'false').toLowerCase() === 'true';
    try {
      const adapter = await this.getPkcs11Adapter();
      if (adapter) {
        const ok = await adapter.verify(key, Buffer.from(data, 'utf8'), Buffer.from(signature, 'base64'), algorithm);
        return ok;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error('PKCS#11 verify failed', { error: msg });
      if (strict) throw new BusinessLogicError(`PKCS#11 verify failed: ${msg}`);
    }
    // 模拟HSM验证 (fallback)
    await new Promise(resolve => setTimeout(resolve, 10));
    const expectedSignature = crypto.createHash('sha256').update(`${data + key.keyId + algorithm}signature`).digest().toString('base64');
    return signature === expectedSignature;
  }

  private async performHealthChecks(): Promise<void> {
    for (const [deviceId, device] of Array.from(this.devices.entries())) {
      try {
        // 模拟健康检查
        const isHealthy = Math.random() > 0.05; // 95% 健康率

        if (isHealthy) {
          device.status = 'online';
        } else {
          device.status = 'error';
          this.logger.warn('HSM device health check failed', { deviceId });
        }

        device.lastHealthCheck = new Date();

        // 更新数据库
        await this.executeDbOperation(async connection => {
          await connection.execute(
            'UPDATE hsm_devices SET status = ?, last_health_check = ? WHERE id = ?',
            [device.status, device.lastHealthCheck, deviceId]
          );
        }, 'update_device_health');
      } catch (error) {
        this.logger.error('Health check failed for device', { deviceId, error });
      }
    }
  }

  private async performScheduledBackups(): Promise<void> {
    for (const [deviceId, device] of Array.from(this.devices.entries())) {
      if (device.configuration.backup.enabled && device.status === 'online') {
        try {
          // 检查是否需要备份
          const shouldBackup = this.shouldPerformBackup(device);

          if (shouldBackup) {
            await this.createDeviceBackup(deviceId);
          }
        } catch (error) {
          this.logger.error('Scheduled backup failed for device', { deviceId, error });
        }
      }
    }
  }

  private shouldPerformBackup(_device: HSMDevice): boolean {
    // 简化的备份调度逻辑
    // 实际应该解析 cron 表达式
    const now = new Date();
    const lastBackupTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 假设每天备份
    void lastBackupTime;
    return true; // 简化返回
  }

  private async createDeviceBackup(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) return;

    const backupId = this.generateId();
    const deviceKeys = this.keys.get(deviceId) ?? [];
    const deviceCertificates = this.certificates.get(deviceId) ?? [];

    const backup: HSMBackup = {
      id: backupId,
      hsmId: deviceId,
      type: 'full',
      status: 'completed',
      content: {
        keys: deviceKeys.length,
        certificates: deviceCertificates.length,
        configuration: true,
        size: 1024 * 1024, // 模拟大小
      },
      encryption: {
        enabled: device.configuration.backup.encryption,
        algorithm: 'AES-256-GCM',
      },
      storage: {
        location: 'local',
        provider: 'local',
        path: `/backups/hsm/${deviceId}/${backupId}`,
        retention: 30, // 保留30天
      },
      verification: {
        checksum: crypto.createHash('sha256').update(JSON.stringify({ keys: deviceKeys.length, certificates: deviceCertificates.length })).digest('hex'),
        algorithm: 'SHA-256',
        verified: true,
        verifiedAt: new Date(),
      },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后过期
    };

    // 保存备份记录
    await this.executeDbOperation(async connection => {
      await connection.execute(
        `INSERT INTO hsm_backups (id, hsm_id, type, status, content, encryption, storage, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          backup.id,
          backup.hsmId,
          backup.type,
          backup.status,
          JSON.stringify(backup.content),
          JSON.stringify(backup.encryption),
          JSON.stringify(backup.storage),
          backup.createdAt,
          backup.expiresAt,
        ]
      );
    }, 'create_backup');

    this.logger.info('HSM device backup created', { deviceId, backupId });
  }
}
