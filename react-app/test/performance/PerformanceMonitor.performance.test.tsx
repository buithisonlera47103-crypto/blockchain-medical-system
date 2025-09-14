/**
 * PerformanceMonitor组件性能测试
 * 测试性能监控组件的渲染性能和功能
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import PerformanceMonitor from '../../src/components/PerformanceMonitor';
import { AuthProvider } from '../../src/contexts/AuthContext';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock AuthContext
const mockAuthContext = {
  user: {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    permissions: ['admin'],
  },
  isAuthenticated: true,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  updateUser: jest.fn(),
  loading: false,
};

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => 'mock-token'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// 测试组件包装器
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('PerformanceMonitor 性能测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API响应
    mockedAxios.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          queryTime: {
            average: 45.5,
            min: 20.1,
            max: 89.3,
            count: 150,
          },
          cacheHitRate: 85.2,
          activeConnections: 25,
          memoryUsage: {
            used: 512 * 1024 * 1024, // 512MB
            total: 1024 * 1024 * 1024, // 1GB
            percentage: 50.0,
          },
        },
      },
    });
    
    mockedAxios.post.mockResolvedValue({
      data: {
        success: true,
        details: '优化完成',
      },
    });
  });

  describe('组件渲染性能', () => {
    test('初始渲染时间应在阈值内', async () => {
      const renderTime = await (global as any).measurePerformance(async () => {
        render(
          <TestWrapper>
            <PerformanceMonitor />
          </TestWrapper>
        );
        
        // 等待组件完全加载
        await waitFor(() => {
          expect(screen.getByText('性能监控面板')).toBeInTheDocument();
        });
      });

      (global as any).expectPerformance.toBeWithinThreshold(renderTime, 'COMPONENT_RENDER_TIME');
    });

    test('数据加载后重新渲染性能', async () => {
      const { rerender } = render(
        <TestWrapper>
          <PerformanceMonitor />
        </TestWrapper>
      );

      // 等待初始加载
      await waitFor(() => {
        expect(screen.getByText('性能监控面板')).toBeInTheDocument();
      });

      // 测量重新渲染时间
      const rerenderTime = await (global as any).measurePerformance(() => {
        rerender(
          <TestWrapper>
            <PerformanceMonitor />
          </TestWrapper>
        );
      });

      (global as any).expectPerformance.toBeFasterThan(rerenderTime, 10); // 重新渲染应该更快
    });
  });

  describe('API调用性能', () => {
    test('获取性能指标API响应时间', async () => {
      render(
        <TestWrapper>
          <PerformanceMonitor />
        </TestWrapper>
      );

      const apiCallTime = await (global as any).measurePerformance(async () => {
        await waitFor(() => {
          expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/performance/metrics', {
            headers: {
              Authorization: 'Bearer mock-token',
            },
          });
        });
      });

      (global as any).expectPerformance.toBeWithinThreshold(apiCallTime, 'API_RESPONSE_TIME');
    });

    test('优化操作API响应时间', async () => {
      render(
        <TestWrapper>
          <PerformanceMonitor />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('性能监控面板')).toBeInTheDocument();
      });

      const optimizeButton = screen.getByText('优化病历索引');
      
      const optimizeTime = await (global as any).measurePerformance(async () => {
        fireEvent.click(optimizeButton);
        
        await waitFor(() => {
          expect(mockedAxios.post).toHaveBeenCalledWith('/api/v1/performance/optimize', {
            action: 'index',
            target: 'records',
          }, {
            headers: {
              Authorization: 'Bearer mock-token',
            },
          });
        });
      });

      (global as any).expectPerformance.toBeWithinThreshold(optimizeTime, 'API_RESPONSE_TIME');
    });
  });

  describe('内存使用性能', () => {
    test('组件挂载后内存使用情况', async () => {
      const initialMemory = (global as any).measureMemory();
      
      render(
        <TestWrapper>
          <PerformanceMonitor />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('性能监控面板')).toBeInTheDocument();
      });

      const finalMemory = (global as any).measureMemory();
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        
        // 内存增长应该在合理范围内（小于5MB）
        expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
      }
    });
  });

  describe('用户交互性能', () => {
    test('按钮点击响应时间', async () => {
      render(
        <TestWrapper>
          <PerformanceMonitor />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('性能监控面板')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      
      for (const button of buttons) {
        if (!(button as HTMLButtonElement).disabled) {
          const clickTime = await (global as any).measurePerformance(() => {
            fireEvent.click(button);
          });
          
          // 点击响应时间应该很快（小于5ms）
          (global as any).expectPerformance.toBeFasterThan(clickTime, 5);
        }
      }
    });

    test('滚动性能', async () => {
      render(
        <TestWrapper>
          <PerformanceMonitor />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('性能监控面板')).toBeInTheDocument();
      });

      const container = screen.getByText('性能监控面板').closest('div');
      
      if (container) {
        const scrollTime = await (global as any).measurePerformance(() => {
          fireEvent.scroll(container, { target: { scrollY: 100 } });
        });
        
        // 滚动响应时间应该很快
        (global as any).expectPerformance.toBeFasterThan(scrollTime, 16); // 60fps
      }
    });
  });

  describe('数据更新性能', () => {
    test('定时刷新性能', async () => {
      jest.useFakeTimers();
      
      render(
        <TestWrapper>
          <PerformanceMonitor />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('性能监控面板')).toBeInTheDocument();
      });

      // 清除初始API调用
      mockedAxios.get.mockClear();

      const refreshTime = await (global as any).measurePerformance(async () => {
        // 快进30秒触发定时刷新
        jest.advanceTimersByTime(30000);
        
        await waitFor(() => {
          expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        });
      });

      (global as any).expectPerformance.toBeWithinThreshold(refreshTime, 'API_RESPONSE_TIME');
      
      jest.useRealTimers();
    });
  });

  describe('错误处理性能', () => {
    test('API错误处理不应影响性能', async () => {
      // Mock API错误
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));
      
      const errorHandlingTime = await (global as any).measurePerformance(async () => {
        render(
          <TestWrapper>
            <PerformanceMonitor />
          </TestWrapper>
        );
        
        await waitFor(() => {
          expect(screen.getByText('获取后端性能指标失败')).toBeInTheDocument();
        });
      });

      // 错误处理时间应该在合理范围内
      (global as any).expectPerformance.toBeWithinThreshold(errorHandlingTime, 'COMPONENT_RENDER_TIME');
    });
  });

  describe('组件卸载性能', () => {
    test('组件卸载应该清理资源', async () => {
      const { unmount } = render(
        <TestWrapper>
          <PerformanceMonitor />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('性能监控面板')).toBeInTheDocument();
      });

      const unmountTime = await (global as any).measurePerformance(() => {
        unmount();
      });

      // 卸载时间应该很快
      (global as any).expectPerformance.toBeFasterThan(unmountTime, 10);
    });
  });
});

// 性能基准测试
describe('PerformanceMonitor 基准测试', () => {
  test('大量数据渲染性能', async () => {
    // Mock大量数据
    const largeDataResponse = {
      data: {
        success: true,
        data: {
          queryTime: {
            average: 45.5,
            min: 20.1,
            max: 89.3,
            count: 10000, // 大量查询
          },
          cacheHitRate: 85.2,
          activeConnections: 500, // 大量连接
          memoryUsage: {
            used: 800 * 1024 * 1024, // 800MB
            total: 1024 * 1024 * 1024, // 1GB
            percentage: 78.1,
          },
        },
      },
    };
    
    mockedAxios.get.mockResolvedValue(largeDataResponse);
    
    const renderTime = await (global as any).measurePerformance(async () => {
      render(
        <TestWrapper>
          <PerformanceMonitor />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText('10000')).toBeInTheDocument(); // 查询次数
        expect(screen.getByText('500')).toBeInTheDocument(); // 连接数
      });
    });

    // 即使是大量数据，渲染时间也应该在阈值内
    (global as any).expectPerformance.toBeWithinThreshold(renderTime, 'COMPONENT_RENDER_TIME');
  });

  test('并发操作性能', async () => {
    render(
      <TestWrapper>
        <PerformanceMonitor />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('性能监控面板')).toBeInTheDocument();
    });

    const buttons = [
      screen.getByText('优化病历索引'),
      screen.getByText('优化用户索引'),
      screen.getByText('优化病历缓存'),
      screen.getByText('优化用户缓存'),
    ];

    const concurrentTime = await (global as any).measurePerformance(async () => {
      // 并发点击多个按钮
      const promises = buttons.map(button => {
        fireEvent.click(button);
        return waitFor(() => {
          expect(mockedAxios.post).toHaveBeenCalled();
        });
      });
      
      await Promise.all(promises);
    });

    // 并发操作时间应该在合理范围内
    (global as any).expectPerformance.toBeWithinThreshold(concurrentTime, 'API_RESPONSE_TIME');
  });
});