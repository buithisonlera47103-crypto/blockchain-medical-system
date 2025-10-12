/**
 * 管理员界面类型定义
 * MedChain Admin Panel - 信息安全竞赛专用
 */

// 用户角色枚举
export enum AdminRole {
  SYSTEM_ADMIN = 'system_admin',
  HOSPITAL_ADMIN = 'hospital_admin',
  SUPER_ADMIN = 'super_admin',
  AUDITOR = 'auditor',
}

// 用户状态枚举
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

// 管理员用户接口
export interface AdminUser {
  id: string;
  userId: string;
  username: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: Permission[];
  avatar?: string;
  lastLogin: Date;
  loginCount: number;
  status: UserStatus;
  department?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 权限接口
export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'system' | 'user' | 'blockchain' | 'security' | 'data' | 'config';
}

// 系统指标接口
export interface SystemMetrics {
  cpu: number;
  memory: number;
  network: number;
  storage: number;
  load: number;
  timestamp: Date;
}

// 服务状态接口
export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  uptime: number;
  lastCheck: Date;
  message?: string;
}

// 告警接口
export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  source: string;
}

// 区块链节点接口
export interface BlockchainNode {
  id: string;
  name: string;
  type: 'orderer' | 'peer';
  organization: string;
  status: 'online' | 'offline' | 'syncing';
  health: number; // 0-100
  blockHeight: number;
  lastBlock: Date;
  peers?: string[];
}

// 智能合约接口
export interface SmartContract {
  id: string;
  name: string;
  version: string;
  status: 'active' | 'inactive' | 'upgrading';
  deployedAt: Date;
  transactionCount: number;
  successRate: number;
  functions: ContractFunction[];
}

// 合约函数接口
export interface ContractFunction {
  name: string;
  parameters: string[];
  returns: string;
  description: string;
}

// 交易接口
export interface BlockchainTransaction {
  id: string;
  transactionId: string;
  blockNumber: number;
  timestamp: Date;
  type: string;
  initiator: string;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed?: number;
}

// 审计日志接口
export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  result: 'success' | 'failed' | 'blocked';
  timestamp: Date;
}

// 合规检查接口
export interface ComplianceCheck {
  id: string;
  type: 'HIPAA' | 'GDPR' | 'ISO27001';
  name: string;
  score: number; // 0-100
  status: 'passed' | 'failed' | 'warning';
  details: string;
  lastCheck: Date;
  nextCheck: Date;
}

// 威胁情报接口
export interface ThreatIntelligence {
  id: string;
  type: 'sql_injection' | 'xss' | 'brute_force' | 'social_engineering' | 'ddos';
  severity: 'low' | 'medium' | 'high' | 'critical';
  sourceIP: string;
  targetResource: string;
  description: string;
  timestamp: Date;
  status: 'detected' | 'blocked' | 'investigating' | 'resolved';
}

// 医疗机构接口
export interface MedicalInstitution {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'community_health';
  level: '三级甲等' | '三级乙等' | '二级甲等' | '二级乙等' | '一级';
  beds: number;
  departments: Department[];
  status: 'active' | 'inactive' | 'maintenance';
  address: string;
  contact: string;
  createdAt: Date;
}

// 科室接口
export interface Department {
  id: string;
  name: string;
  description: string;
  head: string;
  doctorCount: number;
}

// 药品接口
export interface Pharmaceutical {
  id: string;
  name: string;
  genericName: string;
  manufacturer: string;
  batchNumber: string;
  productionDate: Date;
  expiryDate: Date;
  stock: number;
  status: 'abundant' | 'low' | 'critical' | 'expired';
  price: number;
  category: string;
}

// 供应商接口
export interface Supplier {
  id: string;
  name: string;
  type: 'pharmaceutical' | 'medical_device' | 'supplies';
  orderCount: number;
  onTimeRate: number; // 准时率
  qualityRate: number; // 质量合格率
  rating: number; // 1-5星
  status: 'active' | 'suspended' | 'terminated';
  contact: string;
}

// 导航项接口
export interface NavigationItem {
  key: string;
  icon: any;
  label: string;
  color: string;
  component: string;
  children?: NavigationSubItem[];
  permission?: string;
}

// 导航子项接口
export interface NavigationSubItem {
  key: string;
  label: string;
  component: string;
  permission?: string;
}

// 统计数据接口
export interface StatisticsData {
  totalUsers: number;
  activeUsers: number;
  totalRecords: number;
  todayRecords: number;
  blockchainTPS: number;
  systemUptime: number;
  storageUsed: number;
  storageTotal: number;
}

// 趋势数据接口
export interface TrendData {
  date: string;
  value: number;
  label?: string;
}

// 通知接口
export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  action?: {
    label: string;
    url: string;
  };
}

// WebSocket消息接口
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  userId?: string;
}

