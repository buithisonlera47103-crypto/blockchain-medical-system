/**
 * 搜索功能相关的类型定义
 */

export interface SearchFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  patientId?: string;
  creatorId?: string;
}

export interface SearchQuery {
  query: string;
  filters: SearchFilters;
  page?: number;
  limit?: number;
}

export interface SearchRecord {
  record_id: string;
  patient_id: string;
  creator_id: string;
  blockchain_tx_hash: string;
  created_at: string;
  status: string;
  file_size?: number;
  file_hash?: string;
}

export interface SearchResult {
  records: SearchRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SearchStats {
  totalRecords: number;
  recordsByStatus: StatusCount[];
  recordsByDate: DateCount[];
  recordsByCreator: CreatorCount[];
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface DateCount {
  date: string;
  count: number;
}

export interface CreatorCount {
  creator_id: string;
  count: number;
}

export interface SearchRequest {
  query: string;
  filters: SearchFilters;
}

export interface SearchResponse {
  records: SearchRecord[];
  total: number;
}

export interface SearchError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResult | null;
  stats: SearchStats | null;
  loading: boolean;
  error: string | null;
  page: number;
  limit: number;
}
