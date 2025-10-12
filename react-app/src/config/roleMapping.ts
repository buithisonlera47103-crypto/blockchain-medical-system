// 阶段4: 角色映射配置 - 代码重构
// 简化用户角色系统：从6个角色精简到3个核心角色

export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
  // 保留旧角色定义以确保兼容性
  HOSPITAL_ADMIN = 'hospital_admin',
  SYSTEM_ADMIN = 'system_admin',
  SUPER_ADMIN = 'super_admin',
  AUDITOR = 'auditor',
}

// 角色简化映射
export const ROLE_MIGRATION_MAP: Record<string, UserRole> = {
  [UserRole.HOSPITAL_ADMIN]: UserRole.ADMIN,
  [UserRole.SYSTEM_ADMIN]: UserRole.ADMIN,
  [UserRole.SUPER_ADMIN]: UserRole.ADMIN,
  [UserRole.AUDITOR]: UserRole.ADMIN, // 审计员临时映射到管理员
};

// 组件重定向映射
export const COMPONENT_REDIRECT_MAP: Record<string, string> = {
  // 已删除组件的重定向映射
  DoctorDashboard: 'OverviewContent',
  PatientDashboard: 'OverviewContent',
  AdvancedSearchContent: 'QueryContent',
  InsuranceApprovalContent: 'TransferContent',
  HealthTrackingContent: 'MedicalRecordsContent',
  SystemMaintenanceContent: 'SettingsContent',
  SecurityAuditContent: 'MonitorContent',
};

// 规范化用户角色
export const normalizeUserRole = (role: string): UserRole => {
  return (ROLE_MIGRATION_MAP[role] as UserRole) || (role as UserRole);
};

