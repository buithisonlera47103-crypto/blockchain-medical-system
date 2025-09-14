/**
 * 前端类型定义
 */

import * as moment from 'moment';

// 基础API响应类型
export interface ApiResponse<T = any> {
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

// 用户相关类型
export interface User {
  userId: string;
  id: string; // Alias for userId for compatibility
  username: string;
  name: string; // Display name
  email: string;
  role: UserRole;
  fullName?: string;
  department?: string;
  licenseNumber?: string;
  status: UserStatus;
  token?: string; // JWT token for authenticated user
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  HOSPITAL_ADMIN = 'hospital_admin',
  SYSTEM_ADMIN = 'system_admin',
  SUPER_ADMIN = 'super_admin',
  AUDITOR = 'auditor',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

// 登录相关类型
export interface LoginRequest {
  username: string;
  password: string;
  mfaCode?: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  fullName?: string;
  department?: string;
  licenseNumber?: string;
}

// 病历相关类型
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
  blockchainTxHash?: string; // Alias for blockchainTxId
  fileSize: number;
  fileHash: string;
  fileType?: string; // File MIME type alias
  mimeType: string;
  isEncrypted: boolean;
  encryptionKeyId?: string;
  createdAt: string;
  updatedAt: string;
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

// 文件上传相关类型
export interface UploadFile {
  uid: string;
  name: string;
  status: 'uploading' | 'done' | 'error' | 'removed';
  url?: string;
  thumbUrl?: string;
  response?: any;
  error?: any;
  originFileObj?: File;
  percent?: number;
}

export interface UploadFormData {
  patientId: string;
  title: string;
  description?: string;
  recordType: RecordType;
  department?: string;
}

// 权限相关类型
export interface Permission {
  permissionId: string;
  recordId: string;
  granteeId: string;
  grantorId: string;
  permissionType: PermissionType;
  status: PermissionStatus;
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  updatedAt: string;
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

export interface PermissionRequest {
  recordId: string;
  requestedPermissions: PermissionType[];
  purpose: string;
  urgency: 'low' | 'normal' | 'high' | 'emergency';
}

export interface PermissionCheckRequest {
  recordId: string;
  action: PermissionType;
}

export interface PermissionCheckResponse {
  hasAccess: boolean;
  permissions: PermissionType[];
  expiresAt?: string;
  reason?: string;
}

// 分页参数类型
export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
}

// 搜索和过滤类型
export interface SearchParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  recordType?: RecordType;
  type?: RecordType; // Alias for recordType
  status?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
}

// 组件Props类型
export interface FormProps {
  onSubmit: (values: any) => void;
  loading?: boolean;
  initialValues?: any;
}

export interface TableProps<T> {
  dataSource: T[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize?: number) => void;
  };
  onRowClick?: (record: T) => void;
}

// 日期范围类型
export type DateRange = [Moment | null, Moment | null] | null;

// 表单字段类型
export interface FormField {
  name: string;
  label: string;
  type: 'input' | 'select' | 'textarea' | 'date' | 'upload';
  required?: boolean;
  options?: { label: string; value: any }[];
  rules?: any[];
}

// 菜单项类型
export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
  path?: string;
}

// 主题类型
export type Theme = 'light' | 'dark';

// 通知类型
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

// 仪表板数据类型
export interface DashboardStats {
  totalRecords: number;
  totalUsers: number;
  activePermissions: number;
  recentActivity: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}

// 系统配置类型
export interface SystemConfig {
  general: {
    siteName: string;
    maxFileSize: number;
    allowedFileTypes: string[];
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
  };
  blockchain: {
    networkName: string;
    contractAddress: string;
    gasLimit: number;
  };
  ipfs: {
    gateway: string;
    pinning: boolean;
    clustering: boolean;
  };
}

// 错误处理类型
export interface ErrorInfo {
  message: string;
  code?: string | number;
  details?: any;
  timestamp?: string;
}

// 加载状态类型
export interface LoadingState {
  [key: string]: boolean;
}

// 区块链相关类型
export interface BlockchainTransaction {
  transactionId: string;
  blockNumber: number;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface BlockchainResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  transactionId?: string;
  blockNumber?: number;
  timestamp?: string;
}

// IPFS相关类型
export interface IPFSUploadResponse {
  cid: string;
  size: number;
  gateway: string;
}

export interface IPFSMetadata {
  cid: string;
  recordId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  encryptionKeyId?: string;
  createdAt: string;
}

// 审计相关类型
export interface AuditLog {
  logId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// 健康检查类型
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
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

// 路由相关类型
export interface RouteConfig {
  path: string;
  component: React.ComponentType;
  exact?: boolean;
  private?: boolean;
  roles?: UserRole[];
}

// 主题相关类型
export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  mode: 'light' | 'dark';
}

// WebSocket消息类型
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  userId?: string;
}

// 历史记录类型
export interface HistoryRecord {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
  details?: string;
}

// 导出Moment类型
export type Moment = moment.Moment;
