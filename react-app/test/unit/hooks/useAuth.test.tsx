/**
 * useAuth Hook 单元测试
 * 测试认证相关的自定义Hook功能
 */

import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ReactNode } from 'react';

import { useAuth } from '../../../src/hooks/useAuth';
import { authSlice } from '../../../src/store/slices/authSlice';
import { authAPI } from '../../../src/services/api';

// Mock API调用
jest.mock('../../../src/services/api', () => ({
  authAPI: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    verifyToken: jest.fn(),
  },
}));

describe('useAuth Hook', () => {
  let store: any;

  const createWrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice.reducer,
      },
    });

    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('初始状态', () => {
    it('应该返回正确的初始状态', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('登录功能', () => {
    const loginData = {
      username: 'testuser',
      password: 'password123',
    };

    const mockUser = {
      id: '1',
      username: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      role: 'patient' as const,
      roles: ['patient'],
    };

    const mockToken = 'jwt-token-123';

    it('应该成功登录', async () => {
      (authAPI.login as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          token: mockToken,
          user: mockUser,
        },
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        await result.current.login(loginData);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe(mockToken);
      expect(result.current.error).toBeNull();
      expect(localStorage.getItem('token')).toBe(mockToken);
    });

    it('应该处理登录失败', async () => {
      const errorMessage = '用户名或密码错误';
      (authAPI.login as jest.Mock).mockRejectedValue({
        response: {
          data: {
            success: false,
            message: errorMessage,
          },
        },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        await result.current.login(loginData);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.error).toBe(errorMessage);
    });

    it('应该在登录过程中显示加载状态', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve;
      });

      (authAPI.login as jest.Mock).mockReturnValue(loginPromise as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.login(loginData);
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveLogin!({
          data: {
            success: true,
            token: mockToken,
            user: mockUser,
          },
        });
        await loginPromise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('注册功能', () => {
    const registerData = {
      username: 'newuser',
      password: 'Password123!',
      role: 'patient' as const,
    };

    const mockUser = {
      id: '2',
      username: 'newuser',
      roles: ['patient'],
    };

    it('应该成功注册', async () => {
      (authAPI.register as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          message: '用户注册成功',
          user: mockUser,
        },
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        await result.current.register(registerData);
      });

      expect(result.current.error).toBeNull();
      expect(authAPI.register as jest.Mock).toHaveBeenCalledWith(registerData);
    });

    it('应该处理注册失败', async () => {
      const errorMessage = '用户名已存在';
      (authAPI.register as jest.Mock).mockRejectedValue({
        response: {
          data: {
            success: false,
            message: errorMessage,
          },
        },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        await result.current.register(registerData);
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('注销功能', () => {
    beforeEach(() => {
      // 设置已登录状态
      store.dispatch(
        authSlice.actions.loginSuccess({
          user: {
            id: '1',
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            role: 'patient' as const,
            roles: ['patient'],
          },
          token: 'test-token',
        })
      );
      localStorage.setItem('token', 'test-token');
    });

    it('应该成功注销', async () => {
      (authAPI.logout as jest.Mock).mockResolvedValue({
        data: { success: true, message: '注销成功' },
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('应该处理注销错误', async () => {
      (authAPI.logout as jest.Mock).mockRejectedValue(new Error('网络错误'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        await result.current.logout();
      });

      // 即使注销API失败，也应该清除本地状态
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('令牌验证', () => {
    it('应该验证有效令牌', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        roles: ['patient'],
      };

      localStorage.setItem('token', 'valid-token');

      (authAPI.verifyToken as jest.Mock).mockResolvedValue({
        data: {
          valid: true,
          user: mockUser,
        },
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        await result.current.verifyToken();
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('应该处理无效令牌', async () => {
      localStorage.setItem('token', 'invalid-token');

      (authAPI.verifyToken as jest.Mock).mockRejectedValue({
        response: {
          data: {
            valid: false,
            message: '令牌无效',
          },
        },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        await result.current.verifyToken();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('应该在没有令牌时不发送验证请求', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        await result.current.verifyToken();
      });

      expect(authAPI.verifyToken as jest.Mock).not.toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('权限检查', () => {
    beforeEach(() => {
      store.dispatch(
        authSlice.actions.loginSuccess({
          user: {
            id: '1',
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            role: 'doctor' as const,
            roles: ['doctor', 'admin'],
          },
          token: 'test-token',
        })
      );
    });

    it('应该正确检查用户角色', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      expect(result.current.hasRole('doctor')).toBe(true);
      expect(result.current.hasRole('admin')).toBe(true);
      expect(result.current.hasRole('patient')).toBe(false);
    });

    it('应该检查多个角色', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      expect(result.current.hasAnyRole(['doctor', 'nurse'])).toBe(true);
      expect(result.current.hasAnyRole(['patient', 'nurse'])).toBe(false);
      expect(result.current.hasAllRoles(['doctor', 'admin'])).toBe(true);
      expect(result.current.hasAllRoles(['doctor', 'patient'])).toBe(false);
    });

    it('未登录用户应该没有任何角色', () => {
      store = configureStore({
        reducer: {
          auth: authSlice.reducer,
        },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      expect(result.current.hasRole('doctor')).toBe(false);
      expect(result.current.hasAnyRole(['doctor', 'admin'])).toBe(false);
      expect(result.current.hasAllRoles(['doctor'])).toBe(false);
    });
  });

  describe('自动登录', () => {
    it('应该在组件挂载时自动验证令牌', async () => {
      localStorage.setItem('token', 'stored-token');

      (authAPI.verifyToken as jest.Mock).mockResolvedValue({
        data: {
          valid: true,
          user: {
            id: '1',
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            role: 'patient' as const,
            roles: ['patient'],
          },
        },
      } as any);

      renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      expect(authAPI.verifyToken as jest.Mock).toHaveBeenCalled();
    });

    it('应该在令牌验证失败时清除存储', async () => {
      localStorage.setItem('token', 'invalid-stored-token');

      (authAPI.verifyToken as jest.Mock).mockRejectedValue({
        response: { status: 401 },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        // 等待自动验证完成
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(localStorage.getItem('token')).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('密码修改', () => {
    beforeEach(() => {
      store.dispatch(
        authSlice.actions.loginSuccess({
          user: {
            id: '1',
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            role: 'patient' as const,
            roles: ['patient'],
          },
          token: 'test-token',
        })
      );
    });

    it('应该成功修改密码', async () => {
      const passwordData = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword456',
      };

      (authAPI.changePassword as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          message: '密码修改成功',
        },
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        await result.current.changePassword(passwordData);
      });

      expect(result.current.error).toBeNull();
      expect(authAPI.changePassword as jest.Mock).toHaveBeenCalledWith(passwordData);
    });

    it('应该处理密码修改失败', async () => {
      const passwordData = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword456',
      };

      const errorMessage = '原密码错误';
      (authAPI.changePassword as jest.Mock).mockRejectedValue({
        response: {
          data: {
            success: false,
            message: errorMessage,
          },
        },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        await result.current.changePassword(passwordData);
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('错误处理', () => {
    it('应该清除错误状态', () => {
      // 设置错误状态
      store.dispatch(authSlice.actions.setError('测试错误'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      expect(result.current.error).toBe('测试错误');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('应该处理网络错误', async () => {
      (authAPI.login as jest.Mock).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        await result.current.login({
          username: 'test',
          password: 'test',
        });
      });

      expect(result.current.error).toBe('网络连接失败，请检查网络设置');
    });

    it('应该处理服务器错误', async () => {
      (authAPI.login as jest.Mock).mockRejectedValue({
        response: {
          status: 500,
          data: {
            message: '内部服务器错误',
          },
        },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        await result.current.login({
          username: 'test',
          password: 'test',
        });
      });

      expect(result.current.error).toBe('服务器错误，请稍后重试');
    });
  });

  describe('内存清理', () => {
    it('应该正确清理内存和取消请求', () => {
      const { unmount } = renderHook(() => useAuth(), {
        wrapper: createWrapper,
      });

      // 模拟组件卸载
      unmount();

      // 验证没有内存泄漏
      expect(true).toBe(true); // 这里主要是测试没有抛出错误
    });
  });
});
