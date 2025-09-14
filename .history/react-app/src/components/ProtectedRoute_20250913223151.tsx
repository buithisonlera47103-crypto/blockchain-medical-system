import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { canAccess, hasPermission, hasRole, Permission, UserRole } from '../utils/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: Permission;
  role?: UserRole;
  roles?: UserRole[];
  requireAuth?: boolean;
  fallbackPath?: string;
}

/**
 * 增强的路由保护组件
 * 支持基于权限、角色的访问控制
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permission,
  role,
  roles,
  requireAuth = true,
  fallbackPath = '/login',
}) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // 显示加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 检查是否需要认证
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // 检查特定权限
  if (permission && !hasPermission(user, permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  // 检查特定角色
  if (role && !hasRole(user, role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // 检查多个角色（任一匹配）
  if (roles && roles.length > 0) {
    const hasAnyRole = roles.some(r => hasRole(user, r));
    if (!hasAnyRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // 检查路径访问权限
  if (!canAccess(user, location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

// 便捷的路由保护组件
export const RequireAuth: React.FC<{
  children: React.ReactNode;
  fallbackPath?: string;
}> = ({ children, fallbackPath = '/login' }) => (
  <ProtectedRoute requireAuth={true} fallbackPath={fallbackPath}>
    {children}
  </ProtectedRoute>
);

export const RequirePermission: React.FC<{
  permission: Permission;
  children: React.ReactNode;
  fallbackPath?: string;
}> = ({ permission, children, fallbackPath = '/dashboard' }) => (
  <ProtectedRoute permission={permission} fallbackPath={fallbackPath}>
    {children}
  </ProtectedRoute>
);

export const RequireRole: React.FC<{
  role: UserRole;
  children: React.ReactNode;
  fallbackPath?: string;
}> = ({ role, children, fallbackPath = '/dashboard' }) => (
  <ProtectedRoute role={role} fallbackPath={fallbackPath}>
    {children}
  </ProtectedRoute>
);

export const RequireAnyRole: React.FC<{
  roles: UserRole[];
  children: React.ReactNode;
  fallbackPath?: string;
}> = ({ roles, children, fallbackPath = '/dashboard' }) => (
  <ProtectedRoute roles={roles} fallbackPath={fallbackPath}>
    {children}
  </ProtectedRoute>
);

export const AdminRoute: React.FC<{
  children: React.ReactNode;
  fallbackPath?: string;
}> = ({ children, fallbackPath = '/dashboard' }) => (
  <RequireRole role={UserRole.SYSTEM_ADMIN} fallbackPath={fallbackPath}>
    {children}
  </RequireRole>
);

export const DoctorRoute: React.FC<{
  children: React.ReactNode;
  fallbackPath?: string;
}> = ({ children, fallbackPath = '/dashboard' }) => (
  <RequireRole role={UserRole.DOCTOR} fallbackPath={fallbackPath}>
    {children}
  </RequireRole>
);

export const DoctorOrAdminRoute: React.FC<{
  children: React.ReactNode;
  fallbackPath?: string;
}> = ({ children, fallbackPath = '/dashboard' }) => (
  <RequireAnyRole roles={[UserRole.DOCTOR, UserRole.SYSTEM_ADMIN]} fallbackPath={fallbackPath}>
    {children}
  </RequireAnyRole>
);
