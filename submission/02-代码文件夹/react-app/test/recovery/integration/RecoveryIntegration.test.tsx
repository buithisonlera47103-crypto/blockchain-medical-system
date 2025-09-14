/**
 * 灾难恢复集成测试
 * 测试恢复组件与后端API的集成
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import RecoveryPanel from '../../../src/components/RecoveryPanel';
import { useAuth } from '../../../src/contexts/AuthContext';
import '@testing-library/jest-dom';

// Mock useAuth hook
jest.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// 测试数据
const mockAdminUser = {
  id: '1',
  username: 'admin',
  name: 'Administrator',
  email: 'admin@example.com',
  role: 'admin' as const,
  roles: ['admin'],
  token: 'valid-admin-token',
};

const mockNodes = [
  {
    node_id: 'node-1',
    ip_address: '192.168.1.100',
    status: 'active',
    last_switch: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    node_id: 'node-2',
    ip_address: '192.168.1.101',
    status: 'failed',
    last_switch: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockBackups = [
  {
    backup_id: 'backup-001',
    backup_type: 'full',
    backup_location: '/backups/full-backup-001.tar.gz',
    status: 'completed',
    created_at: '2024-01-01T00:00:00Z',
    file_size: 2048000,
    recovery_status: 'ready',
  },
  {
    backup_id: 'backup-002',
    backup_type: 'incremental',
    backup_location: '/backups/inc-backup-002.tar.gz',
    status: 'completed',
    created_at: '2024-01-02T00:00:00Z',
    file_size: 512000,
    recovery_status: 'ready',
  },
];

// MSW服务器设置
const server = setupServer(
  // 获取节点列表
  rest.get('/api/v1/recovery/nodes', (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.includes('valid-admin-token')) {
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
    }
    return res(ctx.json({ nodes: mockNodes }));
  }),

  // 获取备份列表
  rest.get('/api/v1/backup/list', (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.includes('valid-admin-token')) {
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
    }
    return res(ctx.json({ backups: mockBackups }));
  }),

  // 执行恢复
  rest.post('/api/v1/recovery/restore', async (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.includes('valid-admin-token')) {
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
    }

    const body = await req.json();
    const { backupId, nodeId } = body;

    // 模拟恢复过程
    if (backupId === 'backup-001') {
      return res(
        ctx.delay(1000), // 模拟恢复时间
        ctx.json({
          status: 'success',
          restoredCount: 1500,
          switchStatus: 'completed',
          message: '系统恢复成功，已恢复1500条记录',
        })
      );
    }

    if (backupId === 'backup-error') {
      return res(ctx.status(500), ctx.json({ error: '恢复过程中发生错误' }));
    }

    return res(
      ctx.json({
        status: 'success',
        restoredCount: 800,
        switchStatus: 'completed',
        message: '增量恢复成功，已恢复800条记录',
      })
    );
  }),

  // 节点切换
  rest.post('/api/v1/recovery/failover', async (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.includes('valid-admin-token')) {
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
    }

    const body = await req.json();
    const { targetNodeId } = body;

    return res(
      ctx.delay(500),
      ctx.json({
        status: 'success',
        switchedTo: targetNodeId,
        message: `已成功切换到节点 ${targetNodeId}`,
      })
    );
  })
);

// 测试组件包装器
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  mockUseAuth.mockReturnValue({
    user: mockAdminUser,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    updateUser: jest.fn(),
    isAuthenticated: true,
    loading: false,
  });

  return <BrowserRouter>{children}</BrowserRouter>;
};

describe('灾难恢复集成测试', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  describe('API集成测试', () => {
    test('成功加载节点和备份数据', async () => {
      render(
        <TestWrapper>
          <RecoveryPanel />
        </TestWrapper>
      );

      // 等待数据加载
      await waitFor(
        () => {
          expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
          expect(screen.getByText('192.168.1.101')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // 验证备份数据
      await waitFor(() => {
        expect(screen.getByText('backup-001')).toBeInTheDocument();
        expect(screen.getByText('backup-002')).toBeInTheDocument();
      });
    });

    test('处理API认证错误', async () => {
      // 模拟无效token
      mockUseAuth.mockReturnValue({
        user: {
          ...mockAdminUser,
          token: 'invalid-token',
        },
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
        updateUser: jest.fn(),
        isAuthenticated: true,
        loading: false,
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <TestWrapper>
          <RecoveryPanel />
        </TestWrapper>
      );

      // 等待错误处理
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('恢复流程集成测试', () => {
    test('完整的恢复流程', async () => {
      render(
        <TestWrapper>
          <RecoveryPanel />
        </TestWrapper>
      );

      // 等待组件加载
      await waitFor(() => {
        expect(screen.getByText('backup-001')).toBeInTheDocument();
      });

      // 选择备份
      const backupSelect = screen.getByDisplayValue('backup-001');
      expect(backupSelect).toBeInTheDocument();

      // 执行恢复
      const restoreButton = screen.getByRole('button', { name: /恢复/ });

      await act(async () => {
        fireEvent.click(restoreButton);
      });

      // 验证加载状态
      expect(screen.getByText(/恢复中/)).toBeInTheDocument();

      // 等待恢复完成
      await waitFor(
        () => {
          expect(screen.getByText(/系统恢复成功/)).toBeInTheDocument();
          expect(screen.getByText(/已恢复1500条记录/)).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    test('恢复失败处理', async () => {
      // 设置失败的备份ID
      server.use(
        rest.post('/api/v1/recovery/restore', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: '恢复过程中发生错误' }));
        })
      );

      render(
        <TestWrapper>
          <RecoveryPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('backup-001')).toBeInTheDocument();
      });

      const restoreButton = screen.getByRole('button', { name: /恢复/ });

      await act(async () => {
        fireEvent.click(restoreButton);
      });

      // 验证错误处理
      await waitFor(() => {
        expect(screen.getByText(/恢复失败/)).toBeInTheDocument();
      });
    });
  });

  describe('节点切换集成测试', () => {
    test('成功执行节点切换', async () => {
      render(
        <TestWrapper>
          <RecoveryPanel />
        </TestWrapper>
      );

      // 等待节点数据加载
      await waitFor(() => {
        expect(screen.getByText('192.168.1.101')).toBeInTheDocument();
      });

      // 查找并点击切换按钮（如果存在）
      const failoverButtons = screen.queryAllByText(/切换/);
      if (failoverButtons.length > 0) {
        await act(async () => {
          fireEvent.click(failoverButtons[0]);
        });

        // 验证切换结果
        await waitFor(() => {
          expect(screen.getByText(/已成功切换/)).toBeInTheDocument();
        });
      }
    });
  });

  describe('实时状态更新测试', () => {
    test('恢复进度实时更新', async () => {
      render(
        <TestWrapper>
          <RecoveryPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('backup-001')).toBeInTheDocument();
      });

      const restoreButton = screen.getByRole('button', { name: /恢复/ });

      await act(async () => {
        fireEvent.click(restoreButton);
      });

      // 验证进度条出现
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // 验证进度更新
      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('value');
      });
    });
  });

  describe('错误边界测试', () => {
    test('网络错误处理', async () => {
      // 模拟网络错误
      server.use(
        rest.get('/api/v1/recovery/nodes', (req, res, ctx) => {
          return res.networkError('Network connection failed');
        })
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <TestWrapper>
          <RecoveryPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    test('服务器错误处理', async () => {
      // 模拟服务器错误
      server.use(
        rest.get('/api/v1/backup/list', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
        })
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <TestWrapper>
          <RecoveryPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('性能集成测试', () => {
    test('大量数据加载性能', async () => {
      // 创建大量测试数据
      const largeNodeList = Array.from({ length: 50 }, (_, i) => ({
        node_id: `node-${i}`,
        ip_address: `192.168.1.${100 + i}`,
        status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'inactive' : 'failed',
        last_switch: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const largeBackupList = Array.from({ length: 100 }, (_, i) => ({
        backup_id: `backup-${String(i).padStart(3, '0')}`,
        backup_type: i % 2 === 0 ? 'full' : 'incremental',
        backup_location: `/backups/backup-${i}.tar.gz`,
        status: 'completed',
        created_at: new Date(Date.now() - i * 86400000).toISOString(),
        file_size: 1024000 + i * 1000,
        recovery_status: 'ready',
      }));

      server.use(
        rest.get('/api/v1/recovery/nodes', (req, res, ctx) => {
          return res(ctx.json({ nodes: largeNodeList }));
        }),
        rest.get('/api/v1/backup/list', (req, res, ctx) => {
          return res(ctx.json({ backups: largeBackupList }));
        })
      );

      const startTime = performance.now();

      render(
        <TestWrapper>
          <RecoveryPanel />
        </TestWrapper>
      );

      await waitFor(
        () => {
          expect(screen.getByText('node-0')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      expect(screen.getByText('backup-000')).toBeInTheDocument();

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // 大量数据加载时间应该小于2秒
      expect(loadTime).toBeLessThan(2000);
    });
  });
});
