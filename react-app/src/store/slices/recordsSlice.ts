/**
 * Records Redux Slice
 * 管理医疗记录状态
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { MedicalRecord, PaginationParams } from '../../types';

export interface RecordsState {
  records: MedicalRecord[];
  loading: boolean;
  error: string | null;
  pagination: PaginationParams;
}

const initialState: RecordsState = {
  records: [],
  loading: false,
  error: null,
  pagination: { page: 1, limit: 10, total: 0 },
};

export const recordsSlice = createSlice({
  name: 'records',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setRecords: (state, action: PayloadAction<MedicalRecord[]>) => {
      state.records = action.payload;
      state.loading = false;
      state.error = null;
    },
    addRecord: (state, action: PayloadAction<MedicalRecord>) => {
      state.records.unshift(action.payload);
    },
    updateRecord: (state, action: PayloadAction<MedicalRecord>) => {
      const index = state.records.findIndex(record => record.recordId === action.payload.recordId);
      if (index !== -1) {
        state.records[index] = action.payload;
      }
    },
    removeRecord: (state, action: PayloadAction<string>) => {
      state.records = state.records.filter(record => record.recordId !== action.payload);
    },
    setPagination: (state, action: PayloadAction<PaginationParams>) => {
      state.pagination = action.payload;
    },
    clearRecords: state => {
      state.records = [];
      state.pagination = { page: 1, limit: 10, total: 0 };
    },
  },
});

export const {
  setLoading,
  setError,
  setRecords,
  addRecord,
  updateRecord,
  removeRecord,
  setPagination,
  clearRecords,
} = recordsSlice.actions;

// Selectors
export const recordsSelectors = {
  selectRecords: (state: { records: RecordsState }) => state.records.records,
  selectLoading: (state: { records: RecordsState }) => state.records.loading,
  selectError: (state: { records: RecordsState }) => state.records.error,
  selectPagination: (state: { records: RecordsState }) => state.records.pagination,
};

export default recordsSlice.reducer;
