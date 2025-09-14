/**
 * Redux Store Configuration
 * 配置应用的全局状态管理
 */

import { configureStore } from '@reduxjs/toolkit';

import authReducer from './slices/authSlice';
import recordsReducer from './slices/recordsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    records: recordsReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
