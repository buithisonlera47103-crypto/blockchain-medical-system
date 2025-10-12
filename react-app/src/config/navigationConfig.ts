/**
 * 导航配置 - 信息安全竞赛专用
 * 患者端和医生端各5个核心功能
 */

import {
  FileTextOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
  UploadOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined as AuditOutlined,
  DashboardOutlined,
  UserOutlined,
  ApiOutlined,
  LockOutlined,
  BarChartOutlined,
  MedicineBoxOutlined,
  SettingOutlined,
} from '@ant-design/icons';

export interface NavigationItem {
  key: string;
  icon: any;
  label: string;
  color: string;
  badge?: string;
  description: string;
  component: string;
}

/**
 * 患者端导航 (5个核心功能)
 */
export const patientNavigation: NavigationItem[] = [
  {
    key: 'records',
    icon: FileTextOutlined,
    label: '病历记录',
    color: '#1890ff',
    badge: undefined,
    description: '查看我的病历记录',
    component: 'PatientRecordsView',
  },
  {
    key: 'permissions',
    icon: SafetyOutlined,
    label: '授权管理',
    color: '#52c41a',
    badge: '🔥',
    description: '管理谁可以访问我的病历',
    component: 'PermissionManager',
  },
  {
    key: 'verify',
    icon: CheckCircleOutlined,
    label: '区块链验证',
    color: '#722ed1',
    badge: '🔥',
    description: '验证病历真实性和完整性',
    component: 'BlockchainVerifier',
  },
  {
    key: 'logs',
    icon: HistoryOutlined,
    label: '访问日志',
    color: '#fa8c16',
    badge: '🔥',
    description: '查看谁访问了我的病历',
    component: 'AccessLogs',
  },
  {
    key: 'upload',
    icon: UploadOutlined,
    label: '上传病历',
    color: '#13c2c2',
    badge: undefined,
    description: '上传新的病历到区块链',
    component: 'UploadRecord',
  },
];

/**
 * 医生端导航 (5个核心功能)
 */
export const doctorNavigation: NavigationItem[] = [
  {
    key: 'records',
    icon: FileTextOutlined,
    label: '病历管理',
    color: '#1890ff',
    badge: undefined,
    description: '查看和管理患者病历',
    component: 'DoctorRecordsManager',
  },
  {
    key: 'create',
    icon: EditOutlined,
    label: '创建病历',
    color: '#52c41a',
    badge: undefined,
    description: '为患者创建新病历',
    component: 'CreateRecord',
  },
  {
    key: 'request',
    icon: EyeOutlined,
    label: '授权申请',
    color: '#722ed1',
    badge: '🔥',
    description: '申请访问患者病历权限',
    component: 'AuthorizationRequest',
  },
  {
    key: 'verify',
    icon: CheckCircleOutlined,
    label: '数据验证',
    color: '#fa8c16',
    badge: '🔥',
    description: '验证病历数据完整性',
    component: 'DataValidator',
  },
  {
    key: 'audit',
    icon: FileTextOutlined,
    label: '操作审计',
    color: '#eb2f96',
    badge: '🔥',
    description: '查看我的操作记录',
    component: 'OperationAudit',
  },
];

/**
 * 管理员端导航 (6个核心功能模块)
 */
export const adminNavigation: NavigationItem[] = [
  {
    key: 'system-monitor',
    icon: DashboardOutlined,
    label: '系统监控',
    color: '#1890ff',
    badge: undefined,
    description: '实时系统资源和服务状态监控',
    component: 'SystemMonitor',
  },
  {
    key: 'user-management',
    icon: UserOutlined,
    label: '用户管理',
    color: '#52c41a',
    badge: undefined,
    description: '用户和权限管理',
    component: 'UserManagement',
  },
  {
    key: 'blockchain',
    icon: ApiOutlined,
    label: '联盟链管理',
    color: '#722ed1',
    badge: '🔥',
    description: '区块链网络和智能合约管理',
    component: 'BlockchainManagement',
  },
  {
    key: 'security',
    icon: LockOutlined,
    label: '安全合规',
    color: '#fa8c16',
    badge: '🔥',
    description: '安全监控和合规性检查',
    component: 'SecurityCenter',
  },
  {
    key: 'analytics',
    icon: BarChartOutlined,
    label: '数据分析',
    color: '#13c2c2',
    badge: undefined,
    description: '医疗数据统计和趋势分析',
    component: 'DataAnalytics',
  },
  {
    key: 'institution',
    icon: MedicineBoxOutlined,
    label: '机构药品',
    color: '#eb2f96',
    badge: undefined,
    description: '医疗机构和药品管理',
    component: 'InstitutionPharma',
  },
  {
    key: 'settings',
    icon: SettingOutlined,
    label: '系统配置',
    color: '#8c8c8c',
    badge: undefined,
    description: '系统设置和配置管理',
    component: 'SystemConfig',
  },
];

/**
 * 根据用户角色获取导航配置
 */
export const getNavigationByRole = (role: string): NavigationItem[] => {
  switch (role?.toLowerCase()) {
    case 'patient':
      return patientNavigation;
    case 'doctor':
      return doctorNavigation;
    case 'admin':
    case 'system_admin':
    case 'super_admin':
    case 'hospital_admin':
      return adminNavigation;
    default:
      return patientNavigation;
  }
};

/**
 * 导航样式配置
 */
export const navigationStyles = {
  sider: {
    background: '#ffffff',
    boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
  },
  menu: {
    borderRight: 'none',
  },
  menuItem: {
    height: '56px',
    lineHeight: '56px',
    margin: '8px 12px',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
  },
};

export default {
  patientNavigation,
  doctorNavigation,
  adminNavigation,
  getNavigationByRole,
  navigationStyles,
};
