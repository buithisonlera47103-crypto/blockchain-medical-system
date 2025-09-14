// 模块声明文件
declare module '../components/Dashboard/Dashboard' {
  import React from 'react';
  const Dashboard: React.ComponentType<any>;
  export default Dashboard;
}

declare module '../store/slices/recordsSlice' {
  export const recordsSlice: any;
}

declare module '../store/store' {
  export const store: any;
}

declare module '../services/api' {
  export const apiClient: any;
  export const authAPI: {
    login: (data: { username: string; password: string }) => Promise<any>;
    register: (data: { username: string; password: string; role: string; email?: string }) => Promise<any>;
    logout: () => Promise<any>;
    verifyToken: () => Promise<any>;
    changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<any>;
  };
  export const recordsAPI: {
    getRecords: (params?: any) => Promise<any>;
    getRecord: (id: string) => Promise<any>;
    createRecord: (data: any) => Promise<any>;
    updateRecord: (id: string, data: any) => Promise<any>;
    deleteRecord: (id: string) => Promise<any>;
    shareRecord: (id: string, data: any) => Promise<any>;
    updateAccess: (id: string, data: any) => Promise<any>;
  };
  export const analyticsAPI: any;
}

declare module '../utils/validation' {
  export const validateEmail: (email: string) => boolean;
  export const validatePassword: (password: string) => boolean;
  export const validateUsername: (username: string) => boolean;
  export const validatePhone: (phone: string) => boolean;
  export const validateFile: (file: File) => boolean;
  export const validateFileType: (file: File, allowedTypes: string[]) => boolean;
  export const validateFileSize: (file: File, maxSize: number) => boolean;
  export const sanitizeInput: (input: string) => string;
  export const formatFileSize: (bytes: number) => string;
  export const formatDate: (date: Date | string) => string;
  export const generateSecurePassword: () => string;
  export const isValidPhoneNumber: (phone: string) => boolean;
  export const isValidMedicalId: (id: string) => boolean;
}