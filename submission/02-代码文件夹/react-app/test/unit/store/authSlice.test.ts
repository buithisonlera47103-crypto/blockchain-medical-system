/**
 * Auth Redux Slice 单元测试
 * 测试认证状态管理的actions和reducers
 */

import { configureStore } from '@reduxjs/toolkit';
import { authSlice, AuthState, authSelectors } from '../../../src/store/slices/authSlice';

describe('authSlice', () => {
  let store: any;

  const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  };

  const mockUser = {
    id: '1',
    username: 'testuser',
    name: 'Test User',
    email: 'testuser@example.com',
    role: 'patient' as const,
    roles: ['patient'],
  };

  const mockToken = 'jwt-token-123';

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice.reducer,
      },
    });
  });

  describe('初始状态', () => {
    it('应该返回正确的初始状态', () => {
      const state = store.getState().auth;
      expect(state).toEqual(initialState);
    });
  });

  describe('登录相关actions', () => {
    it('loginStart应该设置loading状态', () => {
      store.dispatch(authSlice.actions.loginStart());

      const state = store.getState().auth;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('loginSuccess应该设置用户和token', () => {
      store.dispatch(
        authSlice.actions.loginSuccess({
          user: mockUser,
          token: mockToken,
        })
      );

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(mockToken);
      expect(state.error).toBeNull();
    });

    it('loginFailure应该设置错误信息', () => {
      const errorMessage = '登录失败';

      store.dispatch(authSlice.actions.loginFailure(errorMessage));

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('注册相关actions', () => {
    it('registerStart应该设置loading状态', () => {
      store.dispatch(authSlice.actions.registerStart());

      const state = store.getState().auth;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('registerSuccess应该设置成功状态', () => {
      store.dispatch(authSlice.actions.registerSuccess());

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('registerFailure应该设置错误信息', () => {
      const errorMessage = '注册失败';

      store.dispatch(authSlice.actions.registerFailure(errorMessage));

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('注销action', () => {
    beforeEach(() => {
      // 设置已登录状态
      store.dispatch(
        authSlice.actions.loginSuccess({
          user: mockUser,
          token: mockToken,
        })
      );
    });

    it('logout应该清除所有认证信息', () => {
      store.dispatch(authSlice.actions.logout());

      const state = store.getState().auth;
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('令牌验证actions', () => {
    it('verifyTokenStart应该设置loading状态', () => {
      store.dispatch(authSlice.actions.verifyTokenStart());

      const state = store.getState().auth;
      expect(state.loading).toBe(true);
    });

    it('verifyTokenSuccess应该设置用户信息', () => {
      store.dispatch(
        authSlice.actions.verifyTokenSuccess({
          user: mockUser,
          token: mockToken,
        })
      );

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(mockToken);
    });

    it('verifyTokenFailure应该清除认证信息', () => {
      // 先设置登录状态
      store.dispatch(
        authSlice.actions.loginSuccess({
          user: mockUser,
          token: mockToken,
        })
      );

      store.dispatch(authSlice.actions.verifyTokenFailure());

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });
  });

  describe('用户信息更新', () => {
    beforeEach(() => {
      store.dispatch(
        authSlice.actions.loginSuccess({
          user: mockUser,
          token: mockToken,
        })
      );
    });

    it('updateUser应该更新用户信息', () => {
      const updatedUser = {
        ...mockUser,
        username: 'updateduser',
        roles: ['doctor'],
      };

      store.dispatch(authSlice.actions.updateUser(updatedUser));

      const state = store.getState().auth;
      expect(state.user).toEqual(updatedUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe(mockToken);
    });

    it('updateUserProfile应该部分更新用户信息', () => {
      const profileUpdate = {
        username: 'newusername',
      };

      store.dispatch(authSlice.actions.updateUserProfile(profileUpdate));

      const state = store.getState().auth;
      expect(state.user).toEqual({
        ...mockUser,
        username: 'newusername',
      });
    });
  });

  describe('错误处理', () => {
    it('setError应该设置错误信息', () => {
      const errorMessage = '测试错误';

      store.dispatch(authSlice.actions.setError(errorMessage));

      const state = store.getState().auth;
      expect(state.error).toBe(errorMessage);
    });

    it('clearError应该清除错误信息', () => {
      // 先设置错误
      store.dispatch(authSlice.actions.setError('测试错误'));

      store.dispatch(authSlice.actions.clearError());

      const state = store.getState().auth;
      expect(state.error).toBeNull();
    });
  });

  describe('loading状态管理', () => {
    it('setLoading应该设置loading状态', () => {
      store.dispatch(authSlice.actions.setLoading(true));

      let state = store.getState().auth;
      expect(state.loading).toBe(true);

      store.dispatch(authSlice.actions.setLoading(false));

      state = store.getState().auth;
      expect(state.loading).toBe(false);
    });
  });

  describe('组合actions测试', () => {
    it('应该正确处理登录-注销-重新登录流程', () => {
      // 1. 开始登录
      store.dispatch(authSlice.actions.loginStart());
      expect(store.getState().auth.loading).toBe(true);

      // 2. 登录成功
      store.dispatch(
        authSlice.actions.loginSuccess({
          user: mockUser,
          token: mockToken,
        })
      );
      expect(store.getState().auth.isAuthenticated).toBe(true);

      // 3. 注销
      store.dispatch(authSlice.actions.logout());
      expect(store.getState().auth.isAuthenticated).toBe(false);

      // 4. 重新登录
      store.dispatch(
        authSlice.actions.loginSuccess({
          user: { ...mockUser, id: '2' },
          token: 'new-token',
        })
      );
      const finalState = store.getState().auth;
      expect(finalState.isAuthenticated).toBe(true);
      expect(finalState.user?.id).toBe('2');
      expect(finalState.token).toBe('new-token');
    });

    it('应该正确处理登录失败后重试成功的流程', () => {
      // 1. 登录失败
      store.dispatch(authSlice.actions.loginFailure('密码错误'));
      expect(store.getState().auth.error).toBe('密码错误');

      // 2. 清除错误重试
      store.dispatch(authSlice.actions.clearError());
      store.dispatch(authSlice.actions.loginStart());
      expect(store.getState().auth.error).toBeNull();

      // 3. 重试成功
      store.dispatch(
        authSlice.actions.loginSuccess({
          user: mockUser,
          token: mockToken,
        })
      );
      const finalState = store.getState().auth;
      expect(finalState.isAuthenticated).toBe(true);
      expect(finalState.error).toBeNull();
    });
  });

  describe('状态不变性测试', () => {
    it('actions应该返回新的状态对象', () => {
      const initialState = store.getState().auth;

      store.dispatch(authSlice.actions.loginStart());
      const newState = store.getState().auth;

      expect(newState).not.toBe(initialState);
      expect(newState.loading).not.toBe(initialState.loading);
    });

    it('嵌套对象应该正确更新', () => {
      store.dispatch(
        authSlice.actions.loginSuccess({
          user: mockUser,
          token: mockToken,
        })
      );

      const stateBefore = store.getState().auth;

      store.dispatch(
        authSlice.actions.updateUserProfile({
          username: 'newusername',
        })
      );

      const stateAfter = store.getState().auth;

      expect(stateAfter.user).not.toBe(stateBefore.user);
      expect(stateAfter.user?.username).toBe('newusername');
      expect(stateAfter.user?.roles).toEqual(mockUser.roles);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空用户对象', () => {
      store.dispatch(
        authSlice.actions.loginSuccess({
          user: null as any,
          token: mockToken,
        })
      );

      const state = store.getState().auth;
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('应该处理空token', () => {
      store.dispatch(
        authSlice.actions.loginSuccess({
          user: mockUser,
          token: '',
        })
      );

      const state = store.getState().auth;
      expect(state.token).toBe('');
      expect(state.isAuthenticated).toBe(false);
    });

    it('应该处理undefined错误消息', () => {
      store.dispatch(authSlice.actions.loginFailure(undefined as any));

      const state = store.getState().auth;
      expect(state.error).toBeNull();
    });
  });

  describe('选择器测试', () => {
    beforeEach(() => {
      store.dispatch(
        authSlice.actions.loginSuccess({
          user: mockUser,
          token: mockToken,
        })
      );
    });

    it('应该正确选择认证状态', () => {
      const state = store.getState();

      expect(authSelectors.selectIsAuthenticated(state)).toBe(true);
      expect(authSelectors.selectUser(state)).toEqual(mockUser);
      expect(authSelectors.selectToken(state)).toBe(mockToken);
      expect(authSelectors.selectLoading(state)).toBe(false);
      expect(authSelectors.selectError(state)).toBeNull();
    });

    it('应该正确选择用户角色', () => {
      const state = store.getState();

      expect(authSelectors.selectUserRoles(state)).toEqual(['patient']);
    });

    it('应该处理未登录状态的选择器', () => {
      store.dispatch(authSlice.actions.logout());
      const state = store.getState();

      expect(authSelectors.selectIsAuthenticated(state)).toBe(false);
      expect(authSelectors.selectUser(state)).toBeNull();
      expect(authSelectors.selectUserRoles(state)).toEqual([]);
    });
  });
});
