export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  pagination?: {
    page: number;
    limit: number;
  };
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface SearchFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  recordType?: string[];
  status?: string[];
  tags?: string[];
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
