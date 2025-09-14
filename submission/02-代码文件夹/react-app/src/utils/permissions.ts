import { User, UserRole } from '../types';

// Re-export UserRole for convenience
export { UserRole } from '../types';

// 权限枚举
export enum Permission {
  VIEW_RECORDS = 'view_records',
  CREATE_RECORDS = 'create_records',
  EDIT_RECORDS = 'edit_records',
  DELETE_RECORDS = 'delete_records',
  TRANSFER_RECORDS = 'transfer_records',
  APPROVE_RECORDS = 'approve_records',
  MANAGE_USERS = 'manage_users',
  SYSTEM_ADMIN = 'system_admin',
  VIEW_HISTORY = 'view_history',
  MANAGE_NOTIFICATIONS = 'manage_notifications',
}

// 角色权限映射
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.PATIENT]: [Permission.VIEW_RECORDS, Permission.VIEW_HISTORY],
  [UserRole.DOCTOR]: [
    Permission.VIEW_RECORDS,
    Permission.CREATE_RECORDS,
    Permission.EDIT_RECORDS,
    Permission.TRANSFER_RECORDS,
    Permission.APPROVE_RECORDS,
    Permission.VIEW_HISTORY,
    Permission.MANAGE_NOTIFICATIONS,
  ],
  [UserRole.HOSPITAL_ADMIN]: [
    Permission.VIEW_RECORDS,
    Permission.CREATE_RECORDS,
    Permission.EDIT_RECORDS,
    Permission.TRANSFER_RECORDS,
    Permission.APPROVE_RECORDS,
    Permission.MANAGE_USERS,
    Permission.VIEW_HISTORY,
    Permission.MANAGE_NOTIFICATIONS,
  ],
  [UserRole.SYSTEM_ADMIN]: [
    Permission.VIEW_RECORDS,
    Permission.CREATE_RECORDS,
    Permission.EDIT_RECORDS,
    Permission.DELETE_RECORDS,
    Permission.TRANSFER_RECORDS,
    Permission.APPROVE_RECORDS,
    Permission.MANAGE_USERS,
    Permission.SYSTEM_ADMIN,
    Permission.VIEW_HISTORY,
    Permission.MANAGE_NOTIFICATIONS,
  ],
  [UserRole.SUPER_ADMIN]: [
    Permission.VIEW_RECORDS,
    Permission.CREATE_RECORDS,
    Permission.EDIT_RECORDS,
    Permission.DELETE_RECORDS,
    Permission.TRANSFER_RECORDS,
    Permission.APPROVE_RECORDS,
    Permission.MANAGE_USERS,
    Permission.SYSTEM_ADMIN,
    Permission.VIEW_HISTORY,
    Permission.MANAGE_NOTIFICATIONS,
  ],
  [UserRole.AUDITOR]: [Permission.VIEW_RECORDS, Permission.VIEW_HISTORY, Permission.SYSTEM_ADMIN],
};

/**
 * 检查用户是否具有指定权限
 * @param user 用户对象
 * @param permission 权限
 * @returns 是否具有权限
 */
export const hasPermission = (user: User | null, permission: Permission): boolean => {
  if (!user || !user.role) {
    return false;
  }

  const userRole = user.role as UserRole;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
};

/**
 * 检查用户是否可以访问指定路径
 * @param user 用户对象
 * @param path 路径
 * @returns 是否可以访问
 */
export const canAccess = (user: User | null, path: string): boolean => {
  if (!user) {
    return false;
  }

  // 路径权限映射
  const pathPermissions: Record<string, Permission[]> = {
    '/upload': [Permission.CREATE_RECORDS],
    '/transfer': [Permission.TRANSFER_RECORDS],
    '/query': [Permission.VIEW_RECORDS],
    '/history': [Permission.VIEW_HISTORY],
    '/settings': [Permission.SYSTEM_ADMIN],
    '/notifications': [Permission.MANAGE_NOTIFICATIONS],
  };

  const requiredPermissions = pathPermissions[path];
  if (!requiredPermissions) {
    return true; // 默认允许访问未定义的路径
  }

  return requiredPermissions.some(permission => hasPermission(user, permission));
};

/**
 * 检查用户是否具有指定角色
 * @param user 用户对象
 * @param role 角色
 * @returns 是否具有角色
 */
export const hasRole = (user: User | null, role: UserRole): boolean => {
  if (!user || !user.role) {
    return false;
  }
  return user.role === role;
};

/**
 * 检查用户是否具有任一指定角色
 * @param user 用户对象
 * @param roles 角色数组
 * @returns 是否具有任一角色
 */
export const hasAnyRole = (user: User | null, roles: UserRole[]): boolean => {
  if (!user || !user.role) {
    return false;
  }
  return roles.includes(user.role as UserRole);
};

/**
 * 获取用户的所有权限
 * @param user 用户对象
 * @returns 权限数组
 */
export const getUserPermissions = (user: User | null): Permission[] => {
  if (!user || !user.role) {
    return [];
  }

  const userRole = user.role as UserRole;
  return ROLE_PERMISSIONS[userRole] || [];
};

/**
 * 检查用户是否为管理员
 * @param user 用户对象
 * @returns 是否为管理员
 */
export const isAdmin = (user: User | null): boolean => {
  return hasRole(user, UserRole.SYSTEM_ADMIN);
};

/**
 * 检查用户是否为医生
 * @param user 用户对象
 * @returns 是否为医生
 */
export const isDoctor = (user: User | null): boolean => {
  return hasRole(user, UserRole.DOCTOR);
};

/**
 * 检查用户是否为患者
 * @param user 用户对象
 * @returns 是否为患者
 */
export const isPatient = (user: User | null): boolean => {
  return hasRole(user, UserRole.PATIENT);
};

/**
 * 检查用户是否可以管理其他用户
 * @param user 用户对象
 * @returns 是否可以管理用户
 */
export const canManageUsers = (user: User | null): boolean => {
  return hasPermission(user, Permission.MANAGE_USERS);
};

/**
 * 检查用户是否可以创建记录
 * @param user 用户对象
 * @returns 是否可以创建记录
 */
export const canCreateRecords = (user: User | null): boolean => {
  return hasPermission(user, Permission.CREATE_RECORDS);
};

/**
 * 检查用户是否可以转移记录
 * @param user 用户对象
 * @returns 是否可以转移记录
 */
export const canTransferRecords = (user: User | null): boolean => {
  return hasPermission(user, Permission.TRANSFER_RECORDS);
};

/**
 * 检查用户是否可以批准记录
 * @param user 用户对象
 * @returns 是否可以批准记录
 */
export const canApproveRecords = (user: User | null): boolean => {
  return hasPermission(user, Permission.APPROVE_RECORDS);
};
