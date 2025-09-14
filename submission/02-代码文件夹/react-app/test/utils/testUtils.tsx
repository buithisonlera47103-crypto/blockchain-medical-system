/**
 * 测试工具函数
 * 提供通用的测试辅助函数和组件
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { act } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock providers
const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mockAuthValue = {
    user: {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'doctor',
      permissions: ['read', 'write', 'delete'],
    },
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    updateProfile: jest.fn(),
  };

  return <div data-testid="mock-auth-provider">{children}</div>;
};

const MockThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mockThemeValue = {
    theme: 'light',
    toggleTheme: jest.fn(),
    isDark: false,
    colors: {
      primary: '#007bff',
      secondary: '#6c757d',
      success: '#28a745',
      danger: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8',
    },
  };

  return <div data-testid="mock-theme-provider">{children}</div>;
};

// 创建测试用的QueryClient
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

// 全局测试包装器
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <MockAuthProvider>
          <MockThemeProvider>{children}</MockThemeProvider>
        </MockAuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

// 自定义render函数
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>): RenderResult => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};

// 测试数据生成器
export const generateTestData = {
  user: (overrides = {}) => ({
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'doctor',
    firstName: 'Test',
    lastName: 'User',
    avatar: 'https://example.com/avatar.jpg',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    ...overrides,
  }),

  medicalRecord: (overrides = {}) => ({
    id: 'record-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    title: '血液检查报告',
    description: '常规血液检查结果',
    type: 'examination',
    status: 'active',
    fileUrl: 'https://example.com/record.pdf',
    fileHash: 'abc123def456',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    metadata: {
      department: '内科',
      hospital: '测试医院',
      diagnosis: '健康',
    },
    ...overrides,
  }),

  transferRecord: (overrides = {}) => ({
    id: 'transfer-1',
    recordId: 'record-1',
    fromUserId: 'doctor-1',
    toUserId: 'doctor-2',
    reason: '患者转诊',
    status: 'pending',
    requestedAt: '2023-01-01T00:00:00Z',
    approvedAt: null,
    rejectedAt: null,
    ...overrides,
  }),

  apiResponse: (data: any, overrides = {}) => ({
    success: true,
    data,
    message: 'Success',
    timestamp: new Date().toISOString(),
    ...overrides,
  }),

  apiError: (message = 'Error occurred', code = 500) => ({
    success: false,
    error: {
      message,
      code,
      details: 'Test error details',
    },
    timestamp: new Date().toISOString(),
  }),
};

// 测试辅助函数
export const testHelpers = {
  // 等待元素出现
  waitForElement: async (getByTestId: any, testId: string, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkElement = () => {
        try {
          const element = getByTestId(testId);
          if (element) {
            resolve(element);
            return;
          }
        } catch (error) {
          // Element not found yet
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Element with testId "${testId}" not found within ${timeout}ms`));
          return;
        }

        setTimeout(checkElement, 100);
      };
      checkElement();
    });
  },

  // 模拟文件上传
  createMockFile: (name = 'test.pdf', type = 'application/pdf', size = 1024) => {
    const file = new File(['test content'], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  },

  // 模拟拖拽事件
  createDragEvent: (type: string, files: File[] = []) => {
    const event = new Event(type, { bubbles: true });
    Object.defineProperty(event, 'dataTransfer', {
      value: {
        files,
        items: files.map(file => ({ kind: 'file', type: file.type, getAsFile: () => file })),
        types: ['Files'],
      },
    });
    return event;
  },

  // 模拟网络延迟
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // 生成随机字符串
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // 生成随机数字
  randomNumber: (min = 0, max = 100) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // 模拟localStorage
  mockLocalStorage: () => {
    const store: { [key: string]: string } = {};
    return {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
      length: Object.keys(store).length,
      key: jest.fn((index: number) => Object.keys(store)[index] || null),
    };
  },

  // 模拟sessionStorage
  mockSessionStorage: () => {
    const store: { [key: string]: string } = {};
    return {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
      length: Object.keys(store).length,
      key: jest.fn((index: number) => Object.keys(store)[index] || null),
    };
  },

  // 模拟IntersectionObserver
  mockIntersectionObserver: () => {
    const mockIntersectionObserver = jest.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    });
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: mockIntersectionObserver,
    });
    return mockIntersectionObserver;
  },

  // 模拟ResizeObserver
  mockResizeObserver: () => {
    const mockResizeObserver = jest.fn();
    mockResizeObserver.mockReturnValue({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    });
    Object.defineProperty(window, 'ResizeObserver', {
      writable: true,
      configurable: true,
      value: mockResizeObserver,
    });
    return mockResizeObserver;
  },

  // 模拟matchMedia
  mockMatchMedia: (matches = false) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  },

  // 清理所有mock
  cleanupMocks: () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  },
};

// 测试断言辅助函数
export const assertions = {
  // 检查元素是否可访问
  toBeAccessible: async (element: HTMLElement) => {
    const { axe } = await import('jest-axe');
    const results = await axe(element);
    expect(results).toHaveNoViolations();
  },

  // 检查API响应格式
  toMatchApiResponse: (response: any) => {
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('timestamp');
    expect(typeof response.success).toBe('boolean');
    expect(typeof response.timestamp).toBe('string');
  },

  // 检查错误响应格式
  toMatchErrorResponse: (response: any) => {
    expect(response).toHaveProperty('success', false);
    expect(response).toHaveProperty('error');
    expect(response.error).toHaveProperty('message');
    expect(response.error).toHaveProperty('code');
  },

  // 检查用户对象格式
  toMatchUserObject: (user: any) => {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('username');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('role');
    expect(typeof user.id).toBe('string');
    expect(typeof user.username).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(['doctor', 'patient', 'admin']).toContain(user.role);
  },

  // 检查医疗记录对象格式
  toMatchMedicalRecord: (record: any) => {
    expect(record).toHaveProperty('id');
    expect(record).toHaveProperty('patientId');
    expect(record).toHaveProperty('doctorId');
    expect(record).toHaveProperty('title');
    expect(record).toHaveProperty('type');
    expect(record).toHaveProperty('status');
    expect(record).toHaveProperty('createdAt');
    expect(['examination', 'diagnosis', 'treatment', 'prescription']).toContain(record.type);
    expect(['active', 'archived', 'deleted']).toContain(record.status);
  },
};

// 性能测试辅助函数
export const performanceHelpers = {
  // 测量渲染时间
  measureRenderTime: async (renderFn: () => void) => {
    const start = performance.now();
    await renderFn();
    const end = performance.now();
    return end - start;
  },

  // 测量内存使用
  measureMemoryUsage: () => {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  },

  // 模拟慢网络
  simulateSlowNetwork: (delay = 1000) => {
    return new Promise(resolve => setTimeout(resolve, delay));
  },
};

// 安全测试辅助函数
export const securityHelpers = {
  // XSS测试payload
  xssPayloads: [
    '<script>alert("XSS")</script>',
    '<img src="x" onerror="alert(1)">',
    '<svg onload="alert(1)">',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)"></iframe>',
  ],

  // SQL注入测试payload
  sqlInjectionPayloads: [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "' UNION SELECT * FROM users --",
    "admin'--",
    "' OR 1=1#",
  ],

  // 检查输入是否被正确转义
  isProperlyEscaped: (input: string, output: string) => {
    const dangerousChars = ['<', '>', '"', "'", '&'];
    return dangerousChars.every(char => {
      if (input.includes(char)) {
        return (
          !output.includes(char) ||
          output.includes(
            `&${char === '<' ? 'lt' : char === '>' ? 'gt' : char === '"' ? 'quot' : char === "'" ? 'apos' : 'amp'};`
          )
        );
      }
      return true;
    });
  },

  // 生成强密码
  generateStrongPassword: (length = 12) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  },

  // 检查密码强度
  checkPasswordStrength: (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;
    return {
      score,
      isStrong: score >= 4,
      checks,
    };
  },
};

// 导出自定义render函数
export { customRender as render };

// 重新导出testing-library的所有内容，但排除act
export {
  screen,
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
  within,
  getByRole,
  getByText,
  getByLabelText,
  getByPlaceholderText,
  getByAltText,
  getByDisplayValue,
  getByTitle,
  getByTestId,
  getAllByRole,
  getAllByText,
  getAllByLabelText,
  getAllByPlaceholderText,
  getAllByAltText,
  getAllByDisplayValue,
  getAllByTitle,
  getAllByTestId,
  queryByRole,
  queryByText,
  queryByLabelText,
  queryByPlaceholderText,
  queryByAltText,
  queryByDisplayValue,
  queryByTitle,
  queryByTestId,
  queryAllByRole,
  queryAllByText,
  queryAllByLabelText,
  queryAllByPlaceholderText,
  queryAllByAltText,
  queryAllByDisplayValue,
  queryAllByTitle,
  queryAllByTestId,
  findByRole,
  findByText,
  findByLabelText,
  findByPlaceholderText,
  findByAltText,
  findByDisplayValue,
  findByTitle,
  findByTestId,
  findAllByRole,
  findAllByText,
  findAllByLabelText,
  findAllByPlaceholderText,
  findAllByAltText,
  findAllByDisplayValue,
  findAllByTitle,
  findAllByTestId,
  prettyDOM,
  logRoles,
  configure,
  getDefaultNormalizer,
  buildQueries,
  createEvent,
} from '@testing-library/react';

// 从react导出act函数
export { act };
export { default as userEvent } from '@testing-library/user-event';
