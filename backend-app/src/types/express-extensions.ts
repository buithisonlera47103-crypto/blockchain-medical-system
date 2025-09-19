/**
 * Express类型扩展 - 统一Request接口
 */

import { Request } from 'express';

// 基础用户信息接口
export interface BaseUser {
  id: string;
  userId: string;
  username: string;
  role: string;
  email: string;
}

// 增强用户信息接口
export interface EnhancedUser extends BaseUser {
  permissions: string[];
  sessionId: string;
  deviceId?: string;
  mfaVerified?: boolean;
  deviceTrusted?: boolean;
  lastActivity: Date;
}

// 标准认证请求接口
export interface AuthenticatedRequest extends Request {
  user?: EnhancedUser;
  deviceFingerprint?: string;
  csrfToken?: string;
  session?: {
    csrfToken?: string;
    [key: string]: unknown;
  };
}

// 增强认证请求接口 (extends AuthenticatedRequest for compatibility)
export interface EnhancedAuthRequest extends Request {
  user?: EnhancedUser;
  deviceFingerprint?: string;
  csrfToken?: string;
  session?: {
    csrfToken?: string;
    [key: string]: unknown;
  };
  sessionId?: string;
  deviceId?: string;
  requestId?: string;
  startTime?: number;
}

// JWT载荷接口
export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  permissions?: string[];
  sessionId?: string;
  deviceId?: string;
  iat?: number;
  exp?: number;
}

// 扩展Express Request类型
declare module 'express-serve-static-core' {
  interface Request {
    user?: EnhancedUser;
    sessionId?: string;
    deviceId?: string;
    requestId?: string;
    startTime?: number;
    deviceFingerprint?: string;
    csrfToken?: string;
    file?: Express.Multer.File;
    files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
  }
}

// 类型守卫函数
export function isEnhancedUser(user: BaseUser | EnhancedUser): user is EnhancedUser {
  return 'permissions' in user && 'sessionId' in user && 'lastActivity' in user;
}

export function isBaseUser(user: BaseUser | EnhancedUser): user is BaseUser {
  return (
    'id' in user && 'userId' in user && 'username' in user && 'role' in user && 'email' in user
  );
}

// 用户转换函数
export function convertToEnhancedUser(
  baseUser: BaseUser,
  additionalData: {
    permissions: string[];
    sessionId: string;
    deviceId?: string;
    mfaVerified?: boolean;
    deviceTrusted?: boolean;
    lastActivity?: Date;
  }
): EnhancedUser {
  return {
    ...baseUser,
    permissions: additionalData.permissions,
    sessionId: additionalData.sessionId,
    deviceId: additionalData.deviceId,
    mfaVerified: additionalData.mfaVerified ?? false,
    deviceTrusted: additionalData.deviceTrusted ?? false,
    lastActivity: additionalData.lastActivity ?? new Date(),
  };
}

export function convertToBaseUser(user: EnhancedUser | BaseUser): BaseUser {
  return {
    id: user.id,
    userId: user.userId,
    username: user.username,
    role: user.role,
    email: user.email,
  };
}

// API响应接口
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

// 分页响应接口
export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 错误响应接口
export interface ErrorResponse extends ApiResponse {
  success: false;
  error: string;
  details?: unknown;
  stack?: string;
}

// 成功响应接口
export interface SuccessResponse<T = unknown> extends ApiResponse<T> {
  success: true;
  data: T;
}

// 响应构建器函数
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  requestId?: string
): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

export function createErrorResponse(
  error: string,
  details?: unknown,
  requestId?: string
): ErrorResponse {
  return {
    success: false,
    error,
    details,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginatedResponse<T>['pagination'],
  message?: string,
  requestId?: string
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    message,
    pagination,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

// 所有类型已在上面单独导出，无需重复导出
