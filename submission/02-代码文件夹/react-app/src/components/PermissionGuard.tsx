import React from 'react';

import { useAuth } from '../hooks/useAuth';
import { hasPermission, hasRole, canAccess, Permission, UserRole } from '../utils/permissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: Permission;
  role?: UserRole;
  roles?: UserRole[];
  path?: string;
  fallback?: React.ReactNode;
  requireAll?: boolean; // 是否需要满足所有条件
}

/**
 * 权限守卫组件
 * 根据用户权限、角色或路径访问权限来条件渲染子组件
 */
const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  role,
  roles,
  path,
  fallback = null,
  requireAll = false,
}) => {
  const { user } = useAuth();

  // 检查权限
  const checkPermission = (): boolean => {
    const checks: boolean[] = [];

    // 检查特定权限
    if (permission) {
      checks.push(hasPermission(user, permission));
    }

    // 检查特定角色
    if (role) {
      checks.push(hasRole(user, role));
    }

    // 检查多个角色（任一匹配）
    if (roles && roles.length > 0) {
      checks.push(roles.some(r => hasRole(user, r)));
    }

    // 检查路径访问权限
    if (path) {
      checks.push(canAccess(user, path));
    }

    // 如果没有设置任何检查条件，默认允许
    if (checks.length === 0) {
      return true;
    }

    // 根据requireAll决定是否需要满足所有条件
    return requireAll ? checks.every(check => check) : checks.some(check => check);
  };

  const hasAccess = checkPermission();

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGuard;

// 便捷的权限检查组件
export const RequirePermission: React.FC<{
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ permission, children, fallback }) => (
  <PermissionGuard permission={permission} fallback={fallback}>
    {children}
  </PermissionGuard>
);

export const RequireRole: React.FC<{
  role: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ role, children, fallback }) => (
  <PermissionGuard role={role} fallback={fallback}>
    {children}
  </PermissionGuard>
);

export const RequireAnyRole: React.FC<{
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ roles, children, fallback }) => (
  <PermissionGuard roles={roles} fallback={fallback}>
    {children}
  </PermissionGuard>
);

export const DoctorOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequireRole role={UserRole.DOCTOR} fallback={fallback}>
    {children}
  </RequireRole>
);

export const AdminOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequireRole role={UserRole.SYSTEM_ADMIN} fallback={fallback}>
    {children}
  </RequireRole>
);

export const PatientOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequireRole role={UserRole.PATIENT} fallback={fallback}>
    {children}
  </RequireRole>
);

export const DoctorOrAdmin: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequireAnyRole roles={[UserRole.DOCTOR, UserRole.SYSTEM_ADMIN]} fallback={fallback}>
    {children}
  </RequireAnyRole>
);
