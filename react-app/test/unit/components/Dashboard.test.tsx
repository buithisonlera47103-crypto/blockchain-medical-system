/**
 * Dashboard组件单元测试
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

import Dashboard from '../../../src/components/Dashboard';
import { authSlice } from '../../../src/store/slices/authSlice';
import { recordsSlice } from '../../../src/store/slices/recordsSlice';

// Mock API调用
const mockAPI = {
  getDashboardStats: jest.fn(),
  getRecentRecords: jest.fn(),
  getSystemHealth: jest.fn(),
};

jest.mock('../../../src/services/api', () => mockAPI);

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  BarElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}));

// const api = require('../../../src/services/api'); // 已改用mockAPI

describe('Dashboard组件', () => {
  let store: any;

  const mockUser = {
    id: '1',
    username: 'testuser',
    roles: ['doctor'],
  };

  const mockDashboardStats = {
    totalRecords: 1250,
    todayRecords: 45,
    activeUsers: 123,
    systemHealth: 95,
  };

  const mockRecentRecords = [
    {
      id: 'record1',
      title: '体检报告',
      patientName: '张三',
      createdAt: '2024-01-15T10:30:00Z',
      recordType: 'examination',
    },
    {
      id: 'record2',
      title: '诊断报告',
      patientName: '李四',
      createdAt: '2024-01-15T09:15:00Z',
      recordType: 'diagnosis',
    },
  ];

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice.reducer,
        records: recordsSlice.reducer,
      },
      preloadedState: {
        auth: {
          user: mockUser,
          token: 'test-token',
          isAuthenticated: true,
          loading: false,
          error: null,
        },
        records: {
          records: [],
          loading: false,
          error: null,
          pagination: { page: 1, limit: 10, total: 0 },
        },
      },
    });

    // 设置API模拟
    mockAPI.getDashboardStats.mockResolvedValue({ data: mockDashboardStats });
    mockAPI.getRecentRecords.mockResolvedValue({ data: mockRecentRecords });
    mockAPI.getSystemHealth.mockResolvedValue({ data: { status: 'healthy', uptime: '99.9%' } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderDashboard = () => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </Provider>
    );
  };

  describe('渲染测试', () => {
    it('应该正确渲染仪表板', async () => {
      renderDashboard();

      expect(screen.getByText('仪表板')).toBeInTheDocument();
      expect(screen.getByText('欢迎回来，testuser')).toBeInTheDocument();

      // 等待数据加载
      await waitFor(() => {
        expect(screen.getByText('总记录数')).toBeInTheDocument();
      });
    });

    it('应该显示统计卡片', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument(); // 总记录数
        expect(screen.getByText('45')).toBeInTheDocument(); // 今日记录
        expect(screen.getByText('123')).toBeInTheDocument(); // 活跃用户
        expect(screen.getByText('95%')).toBeInTheDocument(); // 系统健康度
      });
    });

    it('应该显示最近记录列表', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('最近记录')).toBeInTheDocument();
        expect(screen.getByText('体检报告')).toBeInTheDocument();
        expect(screen.getByText('诊断报告')).toBeInTheDocument();
        expect(screen.getByText('张三')).toBeInTheDocument();
        expect(screen.getByText('李四')).toBeInTheDocument();
      });
    });

    it('应该显示系统状态', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('系统状态')).toBeInTheDocument();
        expect(screen.getByText('健康')).toBeInTheDocument();
        expect(screen.getByText('运行时间: 99.9%')).toBeInTheDocument();
      });
    });
  });

  describe('数据加载', () => {
    it('应该在组件挂载时加载数据', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(mockAPI.getDashboardStats).toHaveBeenCalledTimes(1);
        expect(mockAPI.getRecentRecords).toHaveBeenCalledWith({ limit: 5 });
        expect(mockAPI.getSystemHealth).toHaveBeenCalledTimes(1);
      });
    });

    it('应该显示加载状态', () => {
      mockAPI.getDashboardStats.mockReturnValue(new Promise(() => {})); // 永不解决的Promise

      renderDashboard();

      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    });

    it('应该处理数据加载错误', async () => {
      mockAPI.getDashboardStats.mockRejectedValue(new Error('加载失败'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('数据加载失败')).toBeInTheDocument();
      });
    });
  });

  describe('用户角色适配', () => {
    it('医生角色应该看到所有功能', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('创建记录')).toBeInTheDocument();
        expect(screen.getByText('患者管理')).toBeInTheDocument();
        expect(screen.getByText('统计分析')).toBeInTheDocument();
      });
    });

    it('护士角色应该看到限制功能', async () => {
      store = configureStore({
        reducer: {
          auth: authSlice.reducer,
          records: recordsSlice.reducer,
        },
        preloadedState: {
          auth: {
            user: { ...mockUser, roles: ['nurse'] },
            token: 'test-token',
            isAuthenticated: true,
            loading: false,
            error: null,
          },
          records: {
            records: [],
            loading: false,
            error: null,
            pagination: { page: 1, limit: 10, total: 0 },
          },
        },
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByText('创建记录')).not.toBeInTheDocument();
        expect(screen.getByText('查看记录')).toBeInTheDocument();
      });
    });

    it('患者角色应该看到个人视图', async () => {
      store = configureStore({
        reducer: {
          auth: authSlice.reducer,
          records: recordsSlice.reducer,
        },
        preloadedState: {
          auth: {
            user: { ...mockUser, roles: ['patient'] },
            token: 'test-token',
            isAuthenticated: true,
            loading: false,
            error: null,
          },
          records: {
            records: [],
            loading: false,
            error: null,
            pagination: { page: 1, limit: 10, total: 0 },
          },
        },
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('我的记录')).toBeInTheDocument();
      });

      expect(screen.queryByText('患者管理')).not.toBeInTheDocument();
    });
  });

  describe('交互测试', () => {
    it('应该能够刷新数据', async () => {
      renderDashboard();

      const refreshButton = await screen.findByLabelText('刷新数据');
      refreshButton.click();

      await waitFor(() => {
        expect(mockAPI.getDashboardStats).toHaveBeenCalledTimes(2);
      });
    });

    it('应该能够导航到记录详情', async () => {
      renderDashboard();

      await waitFor(() => {
        const recordLink = screen.getByText('体检报告');
        expect(recordLink).toHaveAttribute('href', '/records/record1');
      });
    });

    it('应该能够切换图表视图', async () => {
      renderDashboard();

      await waitFor(() => {
        const chartToggle = screen.getByText('月视图');
        chartToggle.click();
        expect(screen.getByText('周视图')).toBeInTheDocument();
      });
    });
  });

  describe('响应式设计', () => {
    it('应该在移动设备上正确显示', () => {
      // 模拟移动设备视口
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderDashboard();

      expect(screen.getByTestId('mobile-dashboard')).toBeInTheDocument();
    });

    it('应该在桌面设备上显示完整布局', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      renderDashboard();

      expect(screen.getByTestId('desktop-dashboard')).toBeInTheDocument();
    });
  });

  describe('实时更新', () => {
    it('应该支持WebSocket实时更新', async () => {
      renderDashboard();

      // 模拟WebSocket消息
      const wsMessage = {
        type: 'STATS_UPDATE',
        data: { ...mockDashboardStats, totalRecords: 1251 },
      };

      // 触发WebSocket消息
      window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(wsMessage) }));

      await waitFor(() => {
        expect(screen.getByText('1,251')).toBeInTheDocument();
      });
    });

    it('应该处理WebSocket连接错误', async () => {
      renderDashboard();

      // 模拟WebSocket错误
      window.dispatchEvent(new Event('error'));

      await waitFor(() => {
        expect(screen.getByText('实时更新已断开')).toBeInTheDocument();
      });
    });
  });

  describe('性能优化', () => {
    it('应该正确使用React.memo优化渲染', () => {
      const { rerender } = renderDashboard();

      // 重新渲染相同的props
      rerender(
        <Provider store={store}>
          <BrowserRouter>
            <Dashboard />
          </BrowserRouter>
        </Provider>
      );

      // 验证组件没有不必要的重新渲染
      expect(mockAPI.getDashboardStats).toHaveBeenCalledTimes(1);
    });

    it('应该正确实现虚拟滚动', async () => {
      // 模拟大量记录
      const manyRecords = Array.from({ length: 1000 }, (_, i) => ({
        id: `record${i}`,
        title: `记录 ${i}`,
        patientName: `患者 ${i}`,
        createdAt: new Date().toISOString(),
        recordType: 'examination',
      }));

      mockAPI.getRecentRecords.mockResolvedValue({ data: manyRecords });

      renderDashboard();

      await waitFor(() => {
        // 应该只渲染可见的记录项
        const renderedItems = screen.getAllByTestId(/record-item-/);
        expect(renderedItems.length).toBeLessThan(50); // 只渲染可见项
      });
    });
  });
});
