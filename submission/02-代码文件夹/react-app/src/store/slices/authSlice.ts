/**
 * Auth Redux Slice
 * 管理用户认证状态
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { User } from '../../types';
import { getToken, getUser, isTokenValid } from '../../utils/tokenManager';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// 在初始化时检查localStorage中的token
const getInitialAuthState = (): AuthState => {
  try {
    const token = getToken();
    const user = getUser();
    
    // 如果有token且有效，则设置为已认证状态
    if (token && user && isTokenValid()) {
      return {
        user,
        token,
        isAuthenticated: true,
        loading: false,
        error: null,
      };
    }
  } catch (error) {
    console.error('Failed to initialize auth state:', error);
  }
  
  // 默认未认证状态
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  };
};

const initialState: AuthState = getInitialAuthState();

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: state => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = action.payload;
    },
    registerStart: state => {
      state.loading = true;
      state.error = null;
    },
    registerSuccess: state => {
      state.loading = false;
      state.error = null;
    },
    registerFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: state => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    clearError: state => {
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    verifyTokenStart: state => {
      state.loading = true;
      state.error = null;
    },
    verifyTokenSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
    },
    verifyTokenFailure: state => {
      state.loading = false;
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
    updateUserProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  registerStart,
  registerSuccess,
  registerFailure,
  logout,
  clearError,
  setError,
  updateUser,
  setLoading,
  verifyTokenStart,
  verifyTokenSuccess,
  verifyTokenFailure,
  updateUserProfile,
} = authSlice.actions;

// Selectors
export const authSelectors = {
  selectIsAuthenticated: (state: { auth: AuthState }) => state.auth.isAuthenticated,
  selectUser: (state: { auth: AuthState }) => state.auth.user,
  selectToken: (state: { auth: AuthState }) => state.auth.token,
  selectLoading: (state: { auth: AuthState }) => state.auth.loading,
  selectError: (state: { auth: AuthState }) => state.auth.error,
  selectUserRole: (state: { auth: AuthState }) => state.auth.user?.role,
};

export default authSlice.reducer;
