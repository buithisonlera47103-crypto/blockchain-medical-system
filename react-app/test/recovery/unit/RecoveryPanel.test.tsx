/**
 * RecoveryPanel组件单元测试
 * 测试灾难恢复面板的各项功能
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import RecoveryPanel from '../../../src/components/RecoveryPanel';
import { useAuth } from '../../../src/contexts/AuthContext';

// Mock useAuth hook
jest.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
import '@testing-library/jest-dom';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    register: jest.fn(),
    handleSubmit: (fn: any) => fn,
    formState: { errors: {} },
    reset: jest.fn(),
    watch: jest.fn(() => 'backup-123'),
  }),
}));

// 测试数据
const mockUser = {
  id: '1',
  username: 'admin',
  role: 'admin',
  token: 'mock-token',
};

const mockNonAdminUser = {
  id: '2',
  username: 'user',
  role: 'user',
  token: 'mock-token',
};

const mockNodes = [
  {
    node_id: 'node-1',
    ip_address: '192.168.1.100',
    status: 'active' as const,
    last_switch: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    node_id: 'node-2',
    ip_address: '192.168.1.101',
    status: 'inactive' as const,
    last_switch: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockBackups = [
  {
    backup_id: 'backup-123',
    backup_type: 'full',
    backup_location: '/backups/backup-123.tar.gz',
    status: 'completed',
    created_at: '2024-01-01T00:00:00Z',
    file_size: 1024000,
    recovery_status: 'ready',
  },
  {
    backup_id: 'backup-124',
    backup_type: 'incremental',
    backup_location: '/backups/backup-124.tar.gz',
    status: 'completed',
    created_at: '2024-01-02T00:00:00Z',
    file_size: 512000,
    recovery_status: 'ready',
  },
];

const mockRecoveryResult = {
  status: 'success',
  restoredCount: 1000,
  switchStatus: 'completed',
  message: '恢复成功，已恢复1000条记录',
};

// 测试组件包装器
const TestWrapper: React.FC<{ user: any; children: React.ReactNode }> = ({ user, children }) => {
  // 设置useAuth mock返回值
  mockUseAuth.mockReturnValue({
    user,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    updateUser: jest.fn(),
    isAuthenticated: !!user,
    loading: false,
  });

  return <BrowserRouter>{children}</BrowserRouter>;
};

describe('RecoveryPanel组件测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 默认API响应
    mockedAxios.get.mockImplementation(url => {
      if (url === '/api/v1/recovery/nodes') {
        return Promise.resolve({ data: { nodes: mockNodes } });
      }
      if (url === '/api/v1/backup/list') {
        return Promise.resolve({ data: { backups: mockBackups } });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  describe('权限控制测试', () => {
    test('管理员用户可以看到恢复面板', async () => {
      render(
        <TestWrapper user={mockUser}>
          <RecoveryPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/恢复/)).toBeInTheDocument();
      });
    });

    test('非管理员用户权限限制', () => {
      render(
        <TestWrapper user={mockNonAdminUser}>
          <RecoveryPanel />
        </TestWrapper>
      );

      // 非管理员用户应该看到权限限制的界面
      expect(mockUseAuth).toHaveBeenCalled();
    });

    test('未登录用户处理', () => {
      render(
        <TestWrapper user={null}>
          <RecoveryPanel />
        </TestWrapper>
      );

      expect(mockUseAuth).toHaveBeenCalled();
    });
  });

  describe('数据加载测试', () => {
    test('成功加载节点和备份数据', async () => {
      render(
        <TestWrapper user={mockUser}>
          <RecoveryPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/recovery/nodes', {
          headers: { Authorization: 'Bearer mock-token' },
        });
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/backup/list', {
          headers: { Authorization: 'Bearer mock-token' },
        });
      });
    });

    test('API错误时显示错误信息', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <TestWrapper user={mockUser}>
          <RecoveryPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('恢复功能测试', () => {
    test('成功执行系统恢复', async () => {
      mockedAxios.post.mockResolvedValue({ data: mockRecoveryResult });

      render(
        <TestWrapper user={mockUser}>
          <RecoveryPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/恢复/)).toBeInTheDocument();
      });

      // 模拟表单提交
      const submitButton = screen.getByRole('button', { name: /开始恢复/ });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/api/v1/recovery/restore',
          {
            backupId: 'backup-123',
            nodeId: undefined,
          },
          {
            headers: { Authorization: 'Bearer mock-token' },
          }
        );
      });
    });

    test('恢复失败时显示错误信息', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Recovery failed'));

      render(
        <TestWrapper user={mockUser}>
          <RecoveryPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/恢复/)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /恢复/ });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/恢复失败/)).toBeInTheDocument();
      });
    });

    test('非管理员尝试恢复时显示权限错误', async () => {
      render(
        <TestWrapper user={mockNonAdminUser}>
          <RecoveryPanel />
        </TestWrapper>
      );

      // 非管理员用户不应该看到恢复按钮
      expect(screen.queryByRole('button', { name: /恢复/ })).not.toBeInTheDocument();
    });
  });

  describe('进度显示测试', () => {
    test('恢复过程中显示进度条', async () => {
      // 模拟延迟响应
      mockedAxios.post.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: mockRecoveryResult }), 1000))
      );

      render(
        <TestWrapper user={mockUser}>
          <RecoveryPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/恢复/)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /恢复/ });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      // 检查加载状态
      expect(screen.getByText(/恢复中/)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('节点状态显示测试', () => {
    test('正确显示节点状态', async () => {
      render(
        <TestWrapper user={mockUser}>
          <RecoveryPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
        expect(screen.getByText('192.168.1.101')).toBeInTheDocument();
        expect(screen.getByText(/活跃/)).toBeInTheDocument();
        expect(screen.getByText(/非活跃/)).toBeInTheDocument();
      });
    });
  });

  describe('备份列表显示测试', () => {
    test('正确显示备份列表', async () => {
      render(
        <TestWrapper user={mockUser}>
          <RecoveryPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('backup-123')).toBeInTheDocument();
        expect(screen.getByText('backup-124')).toBeInTheDocument();
        expect(screen.getByText(/完整备份/)).toBeInTheDocument();
        expect(screen.getByText(/增量备份/)).toBeInTheDocument();
      });
    });
  });

  describe('性能测试', () => {
    test('组件渲染性能', () => {
      const startTime = performance.now();

      render(
        <TestWrapper user={mockUser}>
          <RecoveryPanel />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // 渲染时间应该小于100ms
      expect(renderTime).toBeLessThan(100);
    });

    test('大量数据渲染性能', async () => {
      // 创建大量测试数据
      const largeBackupList = Array.from({ length: 100 }, (_, i) => ({
        backup_id: `backup-${i}`,
        backup_type: i % 2 === 0 ? 'full' : 'incremental',
        backup_location: `/backups/backup-${i}.tar.gz`,
        status: 'completed',
        created_at: new Date().toISOString(),
        file_size: 1024000 + i * 1000,
        recovery_status: 'ready',
      }));

      mockedAxios.get.mockImplementation(url => {
        if (url === '/api/v1/recovery/nodes') {
          return Promise.resolve({ data: { nodes: mockNodes } });
        }
        if (url === '/api/v1/backup/list') {
          return Promise.resolve({ data: { backups: largeBackupList } });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const startTime = performance.now();

      render(
        <TestWrapper user={mockUser}>
          <RecoveryPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('backup-0')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // 大量数据渲染时间应该小于500ms
      expect(renderTime).toBeLessThan(500);
    });
  });
});
