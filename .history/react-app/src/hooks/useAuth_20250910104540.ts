/**
 * useAuth Hook
 * 基于Redux的认证状态管理Hook
 */

import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { authAPI } from '../services/api';
import { RootState, AppDispatch } from '../store';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  registerStart,
  registerSuccess,
  registerFailure,
  logout as logoutAction,
  clearError,
  setError,
  updateUser as updateUserAction,
} from '../store/slices/authSlice';
import { User, UserRole } from '../types';
import { getToken, setToken, clearAuthData, isTokenValid } from '../utils/tokenManager';

interface LoginData {
  username: string;
  password: string;
}

interface RegisterData {
  username: string;
  password: string;
  role: string;
  email?: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const authState = useSelector((state: RootState) => state.auth);

  const verifyToken = useCallback(async (): Promise<void> => {
    const token = getToken();
    if (!token || !isTokenValid()) {
      clearAuthData();
      dispatch(logoutAction());
      return;
    }

    try {
      const response = await authAPI.verifyToken();

      if (response.data.valid) {
        dispatch(
          loginSuccess({
            user: response.data.user,
            token,
          })
        );
      } else {
        clearAuthData();
        dispatch(logoutAction());
      }
    } catch (error) {
      clearAuthData();
      dispatch(logoutAction());
    }
  }, [dispatch]);

  // 自动验证令牌
  useEffect(() => {
    const verifyStoredToken = async () => {
      const storedToken = getToken();
      if (storedToken && !authState.isAuthenticated) {
        try {
          await verifyToken();
        } catch (error) {
          console.error('Auto token verification failed:', error);
        }
      }
    };

    verifyStoredToken();
  }, [authState.isAuthenticated, verifyToken]);

  const login = async (loginData: LoginData): Promise<void> => {
    try {
      dispatch(loginStart());
      const response = await authAPI.login(loginData);

      if (response.data.success) {
        const { user, token } = response.data;
        setToken(token);
        dispatch(loginSuccess({ user, token }));
      } else {
        const message = response.data.message || '登录失败';
        dispatch(loginFailure(message));
        throw new Error(message);
      }
    } catch (error: any) {
      let errorMessage = '网络连接失败，请检查网络设置';

      if (error.response) {
        if (error.response.status >= 500) {
          errorMessage = '服务器错误，请稍后重试';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      }

      dispatch(loginFailure(errorMessage));
      throw new Error(errorMessage);
    }
  };

  const register = async (registerData: RegisterData): Promise<void> => {
    try {
      dispatch(registerStart());
      const response = await authAPI.register(registerData);

      if (response.data.success) {
        dispatch(registerSuccess());
      } else {
        dispatch(registerFailure(response.data.message || '注册失败'));
      }
    } catch (error: any) {
      let errorMessage = '网络连接失败，请检查网络设置';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      dispatch(registerFailure(errorMessage));
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // 无论API调用是否成功，都清除本地状态
      clearAuthData();
      dispatch(logoutAction());
    }
  };

  const changePassword = async (passwordData: ChangePasswordData): Promise<void> => {
    try {
      const response = await authAPI.changePassword(passwordData);

      if (!response.data.success) {
        dispatch(setError(response.data.message || '密码修改失败'));
      }
    } catch (error: any) {
      let errorMessage = '网络连接失败，请检查网络设置';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      dispatch(setError(errorMessage));
    }
  };

  // 权限检查方法
  const hasRole = (role: string | UserRole): boolean => {
    // 检查role属性
    return authState.user?.role === role || false;
  };

  const hasAnyRole = (roles: (string | UserRole)[]): boolean => {
    if (!authState.user) return false;
    // 检查role属性中的任一角色
    return roles.includes(authState.user.role);
  };

  const hasAllRoles = (roles: (string | UserRole)[]): boolean => {
    if (!authState.user) return false;
    // 对于单个role属性的用户，只能检查是否只有一个角色且匹配
    return roles.length === 1 && roles.includes(authState.user.role);
  };

  const updateUser = (userData: User): void => {
    dispatch(updateUserAction(userData));
  };

  return {
    // 状态
    user: authState.user,
    token: authState.token,
    isAuthenticated: authState.isAuthenticated,
    loading: authState.loading,
    error: authState.error,

    // 方法
    login,
    register,
    logout,
    verifyToken,
    changePassword,
    updateUser,
    clearError: () => dispatch(clearError()),

    // 权限检查
    hasRole,
    hasAnyRole,
    hasAllRoles,
  };
};
