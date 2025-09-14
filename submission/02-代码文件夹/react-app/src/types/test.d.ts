// 测试文件类型声明
declare module '*.test.*' {
  const content: any;
  export default content;
}

declare module 'axios-mock-adapter' {
  import { AxiosInstance } from 'axios';
  
  class MockAdapter {
    constructor(axiosInstance: AxiosInstance);
    onGet(url: string | RegExp): any;
    onPost(url: string | RegExp): any;
    onPut(url: string | RegExp): any;
    onDelete(url: string | RegExp): any;
    reply(status: number, data?: any): any;
    replyOnce(status: number, data?: any): any;
    restore(): void;
    reset(): void;
  }
  
  export default MockAdapter;
}

// MSW (Mock Service Worker) 类型
declare module 'msw' {
  export const rest: {
    get: (url: string, handler: (req: any, res: any, ctx: any) => any) => any;
    post: (url: string, handler: (req: any, res: any, ctx: any) => any) => any;
    put: (url: string, handler: (req: any, res: any, ctx: any) => any) => any;
    delete: (url: string, handler: (req: any, res: any, ctx: any) => any) => any;
  };
  
  export const setupServer: (...handlers: any[]) => {
    listen: () => void;
    close: () => void;
    use: (...handlers: any[]) => void;
    restoreHandlers: () => void;
  };
}

// Jest mock 函数类型扩展
declare namespace jest {
  interface Mock<T = any> {
    mockResolvedValue: (value: T) => this;
    mockRejectedValue: (error: any) => this;
    mockReturnValue: (value: T) => this;
  }
}

// User 类型定义
export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  roles?: string[];
}

// Auth API 类型
export interface AuthAPI {
  login: jest.Mock;
  register: jest.Mock;
  logout: jest.Mock;
  verifyToken: jest.Mock;
  changePassword: jest.Mock;
}

// 全局测试工具类型
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'test' | 'development' | 'production';
      REACT_APP_API_URL?: string;
      REACT_APP_WS_URL?: string;
    }
  }
}