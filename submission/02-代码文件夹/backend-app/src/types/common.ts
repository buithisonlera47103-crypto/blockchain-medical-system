/**
 * 通用类型定义
 */

// 基础响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
  timestamp?: string;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 用户类型
export interface User {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  fullName?: string;
  department?: string;
  licenseNumber?: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  HOSPITAL_ADMIN = 'hospital_admin',
  SYSTEM_ADMIN = 'system_admin',
  AUDITOR = 'auditor',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

// 病历类型
export interface MedicalRecord {
  recordId: string;
  patientId: string;
  creatorId: string;
  title: string;
  description?: string;
  recordType: RecordType;
  department?: string;
  ipfsCid: string;
  blockchainTxId: string;
  fileSize: number;
  fileHash: string;
  mimeType: string;
  isEncrypted: boolean;
  encryptionKeyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum RecordType {
  CT = 'CT',
  MRI = 'MRI',
  X_RAY = 'X_RAY',
  ECG = 'ECG',
  BLOOD_TEST = 'BLOOD_TEST',
  PATHOLOGY = 'PATHOLOGY',
  PRESCRIPTION = 'PRESCRIPTION',
  CONSULTATION = 'CONSULTATION',
  OTHER = 'OTHER',
}

// 权限类型
export interface Permission {
  permissionId: string;
  recordId: string;
  granteeId: string;
  grantorId: string;
  permissionType: PermissionType;
  status: PermissionStatus;
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  updatedAt: Date;
}

export enum PermissionType {
  READ = 'read',
  WRITE = 'write',
  SHARE = 'share',
  AUDIT = 'audit',
}

export enum PermissionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

// 审计日志类型
export interface AuditLog {
  logId: string;
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  SHARE = 'share',
  DOWNLOAD = 'download',
  LOGIN = 'login',
  LOGOUT = 'logout',
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke',
}

// 区块链相关类型
export interface BlockchainTransaction {
  transactionId: string;
  blockNumber: number;
  timestamp: Date;
  status: TransactionStatus;
}

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

// IPFS相关类型
export interface IPFSMetadata {
  cid: string;
  recordId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  encryptionKeyId?: string;
  createdAt: Date;
}

// 文件上传类型
export interface FileUploadData {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

// 加密相关类型
export interface EncryptionResult {
  encryptedData: Buffer;
  iv: Buffer;
  tag: Buffer;
  keyId: string;
}

export interface DecryptionParams {
  encryptedData: Buffer;
  iv: Buffer;
  tag: Buffer;
  keyId: string;
}

// 请求扩展类型
// AuthenticatedRequest is now defined in express-extensions.ts
export {
  AuthenticatedRequest,
  EnhancedAuthRequest,
  BaseUser,
  EnhancedUser,
} from './express-extensions';

// 环境变量类型
export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  IPFS_HOST: string;
  IPFS_PORT: number;
  MASTER_KEY: string;
  KMS_MODE: 'local' | 'envelope' | 'aws_kms' | 'azure_kv';
}

// 错误类型
export interface AppErrorOptions {
  message: string;
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  details?: Record<string, unknown>;
}

// 验证相关类型
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

// 分页查询参数
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 搜索过滤参数
export interface SearchParams extends PaginationParams {
  search?: string;
  recordType?: RecordType;
  department?: string;
  startDate?: Date;
  endDate?: Date;
}

// 权限检查结果
export interface PermissionCheckResult {
  hasAccess: boolean;
  permissions: PermissionType[];
  expiresAt?: Date;
  reason?: string;
}

// 健康检查结果
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    ipfs: ServiceStatus;
    blockchain: ServiceStatus;
  };
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
}

// JWT Token payload
export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
  email: string;
  iat: number;
  exp: number;
}

// 密钥管理类型
export interface EnvelopeKey {
  recordId: string;
  encryptedDataKey: string;
  keyVersion: number;
  encryptionAlgorithm: string;
  createdAt: Date;
  expiresAt?: Date;
}

// 监控指标类型
export interface MetricData {
  timestamp: Date;
  metric: string;
  value: number;
  labels?: Record<string, string>;
}

// WebSocket消息类型
export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: Date;
  userId?: string;
}

// 导出所有类型
export * as ApiTypes from './api';
