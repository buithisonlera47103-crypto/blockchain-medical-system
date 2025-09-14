/**
 * Comprehensive API Type Definitions
 * Provides strict typing for API requests, responses, and data structures
 */

// Base API Response Structure
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  version?: string;
  pagination?: PaginationMeta;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Request/Response wrapper types
export interface ListResponse<T> extends ApiResponse<T[]> {
  meta: ResponseMeta & {
    pagination: PaginationMeta;
  };
}

export interface CreateResponse<T> extends ApiResponse<T> {
  data: T & { id: string };
}

export interface UpdateResponse<T> extends ApiResponse<T> {
  data: T;
}

export interface DeleteResponse extends ApiResponse<null> {
  data: null;
}
