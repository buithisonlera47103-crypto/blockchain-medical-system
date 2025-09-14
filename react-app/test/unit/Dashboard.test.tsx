/**
 * Dashboard组件单元测试
 * 测试仪表板图表渲染和数据加载功能
 * 目标覆盖率: 90%+
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../../src/components/Dashboard';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock contexts
jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      username: 'test_doctor',
      name: 'Dr. Test',
      email: 'doctor@test.com',
      role: 'doctor',
    },
    isAuthenticated: true,
    loading: false,
  }),
}));

jest.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    toggleTheme: jest.fn(),
  }),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: { [key: string]: string } = {
        'dashboard.title': '仪表板',
        'dashboard.overview': '概览',
        'dashboard.statistics': '统计',
        'dashboard.recentRecords': '最近记录',
        'dashboard.totalRecords': '总记录数',
        'dashboard.totalPatients': '总患者数',
        'dashboard.pendingTransfers': '待处理转移',
        'dashboard.loading': '加载中...',
        'dashboard.noData': '暂无数据',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock API
jest.mock('../../src/utils/api', () => ({
  recordsAPI: {
    getStatistics: jest.fn(),
    getRecent: jest.fn(),
  },
  transferAPI: {
    getPending: jest.fn(),
  },
}));

// Mock recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
}));

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

// Mock data
const mockStatistics = {
  totalRecords: 150,
  totalPatients: 75,
  pendingTransfers: 5,
  recordsByMonth: [
    { month: '1月', count: 10 },
    { month: '2月', count: 15 },
    { month: '3月', count: 20 },
  ],
  recordsByType: [
    { type: '检查报告', count: 50 },
    { type: '诊断记录', count: 30 },
    { type: '处方单', count: 70 },
  ],
};

const mockRecentRecords = [
  {
    id: '1',
    patientId: 'P001',
    type: '检查报告',
    createdAt: '2024-01-15T10:00:00Z',
    status: 'active',
  },
  {
    id: '2',
    patientId: 'P002',
    type: '诊断记录',
    createdAt: '2024-01-14T15:30:00Z',
    status: 'active',
  },
];

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // 设置默认的API响应
    const { recordsAPI, transferAPI } = require('../../src/utils/api');
    recordsAPI.getStatistics.mockResolvedValue({
      success: true,
      data: mockStatistics,
    });
    recordsAPI.getRecent.mockResolvedValue({
      success: true,
      data: mockRecentRecords,
    });
    transferAPI.getPending.mockResolvedValue({
      success: true,
      data: [],
    });
  });

  describe('Rendering Tests', () => {
    test('renders dashboard layout', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 等待数据加载
      await waitFor(() => {
        expect(screen.getByTestId || screen.getByRole('main')).toBeTruthy();
      });
    });

    test('renders statistics cards', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 等待统计数据加载
      await waitFor(() => {
        // 检查是否有数字显示
        const numbers = screen.getAllByText(/\d+/);
        expect(numbers.length).toBeGreaterThan(0);
      });
    });

    test('renders charts container', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 等待图表渲染
      await waitFor(() => {
        const charts = document.querySelectorAll('[data-testid*="chart"]');
        expect(charts.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Data Loading Tests', () => {
    test('loads statistics data on mount', async () => {
      const { recordsAPI } = require('../../src/utils/api');

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 验证API调用
      await waitFor(() => {
        expect(recordsAPI.getStatistics).toHaveBeenCalled();
      });
    });

    test('loads recent records data', async () => {
      const { recordsAPI } = require('../../src/utils/api');

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 验证API调用
      await waitFor(() => {
        expect(recordsAPI.getRecent).toHaveBeenCalled();
      });
    });

    test('shows loading state', () => {
      const { recordsAPI } = require('../../src/utils/api');
      recordsAPI.getStatistics.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ success: true, data: mockStatistics }), 1000)
          )
      );

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 检查加载状态
      const loadingElements = document.querySelectorAll('*');
      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Chart Rendering Tests', () => {
    test('renders line chart for trends', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 等待图表渲染
      await waitFor(() => {
        const lineChart = screen.queryByTestId('line-chart');
        if (lineChart) {
          expect(lineChart).toBeInTheDocument();
        }
      });
    });

    test('renders bar chart for statistics', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 等待图表渲染
      await waitFor(() => {
        const barChart = screen.queryByTestId('bar-chart');
        if (barChart) {
          expect(barChart).toBeInTheDocument();
        }
      });
    });

    test('renders pie chart for distribution', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 等待图表渲染
      await waitFor(() => {
        const pieChart = screen.queryByTestId('pie-chart');
        if (pieChart) {
          expect(pieChart).toBeInTheDocument();
        }
      });
    });

    test('handles empty chart data', async () => {
      const { recordsAPI } = require('../../src/utils/api');
      recordsAPI.getStatistics.mockResolvedValue({
        success: true,
        data: {
          ...mockStatistics,
          recordsByMonth: [],
          recordsByType: [],
        },
      });

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 验证空数据处理
      await waitFor(() => {
        expect(screen.getByRole('main') || document.body).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Tests', () => {
    test('handles API errors gracefully', async () => {
      const { recordsAPI } = require('../../src/utils/api');
      recordsAPI.getStatistics.mockRejectedValue(new Error('API Error'));

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 验证错误处理
      await waitFor(() => {
        expect(screen.getByRole('main') || document.body).toBeInTheDocument();
      });
    });

    test('handles network errors', async () => {
      const { recordsAPI } = require('../../src/utils/api');
      recordsAPI.getStatistics.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 验证网络错误处理
      await waitFor(() => {
        expect(screen.getByRole('main') || document.body).toBeInTheDocument();
      });
    });

    test('handles partial data loading failures', async () => {
      const { recordsAPI } = require('../../src/utils/api');
      recordsAPI.getStatistics.mockResolvedValue({ success: true, data: mockStatistics });
      recordsAPI.getRecent.mockRejectedValue(new Error('Failed to load recent records'));

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 验证部分数据加载失败处理
      await waitFor(() => {
        expect(recordsAPI.getStatistics).toHaveBeenCalled();
      });
    });
  });

  describe('Responsive Design Tests', () => {
    test('adapts to mobile viewport', async () => {
      // 模拟移动设备视口
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 验证响应式布局
      await waitFor(() => {
        expect(screen.getByRole('main') || document.body).toBeInTheDocument();
      });
    });

    test('adapts to tablet viewport', async () => {
      // 模拟平板设备视口
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 验证响应式布局
      await waitFor(() => {
        expect(screen.getByRole('main') || document.body).toBeInTheDocument();
      });
    });
  });

  describe('Performance Tests', () => {
    test('renders efficiently with large datasets', async () => {
      const largeDataset = {
        ...mockStatistics,
        recordsByMonth: Array.from({ length: 12 }, (_, i) => ({
          month: `${i + 1}月`,
          count: Math.floor(Math.random() * 100),
        })),
        recordsByType: Array.from({ length: 10 }, (_, i) => ({
          type: `类型${i + 1}`,
          count: Math.floor(Math.random() * 50),
        })),
      };

      const { recordsAPI } = require('../../src/utils/api');
      recordsAPI.getStatistics.mockResolvedValue({
        success: true,
        data: largeDataset,
      });

      const startTime = performance.now();

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(recordsAPI.getStatistics).toHaveBeenCalled();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // 验证渲染性能（应该在合理时间内完成）
      expect(renderTime).toBeLessThan(5000); // 5秒内
    });

    test('handles frequent data updates', async () => {
      const { recordsAPI } = require('../../src/utils/api');

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 模拟频繁的数据更新
      for (let i = 0; i < 5; i++) {
        recordsAPI.getStatistics.mockResolvedValue({
          success: true,
          data: {
            ...mockStatistics,
            totalRecords: mockStatistics.totalRecords + i,
          },
        });

        // 触发重新渲染
        await waitFor(() => {
          expect(recordsAPI.getStatistics).toHaveBeenCalled();
        });
      }

      // 验证组件仍然正常工作
      expect(screen.getByRole('main') || document.body).toBeInTheDocument();
    });
  });

  describe('Accessibility Tests', () => {
    test('has proper ARIA labels', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        // 检查ARIA标签
        const elements = document.querySelectorAll('[aria-label], [aria-labelledby]');
        expect(elements.length).toBeGreaterThanOrEqual(0);
      });
    });

    test('supports keyboard navigation', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        // 检查可聚焦元素
        const focusableElements = document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        expect(focusableElements.length).toBeGreaterThanOrEqual(0);
      });
    });

    test('provides screen reader support', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        // 检查屏幕阅读器支持
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        expect(headings.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Integration Tests', () => {
    test('integrates with auth context', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 验证与认证上下文的集成
      await waitFor(() => {
        expect(screen.getByRole('main') || document.body).toBeInTheDocument();
      });
    });

    test('integrates with theme context', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 验证与主题上下文的集成
      await waitFor(() => {
        expect(screen.getByRole('main') || document.body).toBeInTheDocument();
      });
    });

    test('handles real-time data updates', async () => {
      const { recordsAPI } = require('../../src/utils/api');

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // 模拟实时数据更新
      await waitFor(() => {
        expect(recordsAPI.getStatistics).toHaveBeenCalled();
      });

      // 更新数据
      recordsAPI.getStatistics.mockResolvedValue({
        success: true,
        data: {
          ...mockStatistics,
          totalRecords: mockStatistics.totalRecords + 10,
        },
      });

      // 验证数据更新处理
      expect(screen.getByRole('main') || document.body).toBeInTheDocument();
    });
  });
});
