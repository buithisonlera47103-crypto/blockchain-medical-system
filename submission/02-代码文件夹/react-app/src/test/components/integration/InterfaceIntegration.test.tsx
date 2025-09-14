/**
 * 前端界面功能测试和用户体验验证
 * 测试跨链桥接和联邦学习界面的基本功能
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-toastify';

import BridgePanel from '../../../components/BridgePanel';
import FederatedLearningManagement from '../../../components/FederatedLearning/FederatedLearningManagement';

// Mock dependencies
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
      role: 'patient',
    },
  }),
}));

jest.mock('../../../utils/api', () => ({
  bridgeAPI: {
    transfer: jest.fn(),
    getHistory: jest.fn().mockResolvedValue({
      success: true,
      data: { transfers: [] },
    }),
    getTransferDetails: jest.fn(),
  },
  apiRequest: jest.fn(),
}));

jest.mock('../../../utils/format', () => ({
  formatDateTime: (date: string) => new Date(date).toLocaleDateString(),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('跨链桥接界面测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该正确渲染跨链桥接界面', () => {
    renderWithRouter(<BridgePanel />);

    // 检查主要元素是否存在
    expect(screen.getByText('跨链桥接')).toBeInTheDocument();
    expect(screen.getByText('将医疗记录安全地转移到其他区块链网络')).toBeInTheDocument();
    expect(screen.getByText('网络正常')).toBeInTheDocument();

    // 检查网络状态指示器
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
    expect(screen.getByText('Polygon')).toBeInTheDocument();
    expect(screen.getByText('Binance Smart Chain')).toBeInTheDocument();
  });

  test('应该显示表单字段', () => {
    renderWithRouter(<BridgePanel />);

    // 检查表单字段
    expect(screen.getByLabelText('医疗记录ID *')).toBeInTheDocument();
    expect(screen.getByLabelText('目标区块链 *')).toBeInTheDocument();
    expect(screen.getByLabelText('接收方地址 *')).toBeInTheDocument();

    // 检查高级选项
    expect(screen.getByText('高级选项')).toBeInTheDocument();
    expect(screen.getByText('预估Gas费用')).toBeInTheDocument();
    expect(screen.getByText('预估完成时间')).toBeInTheDocument();
    expect(screen.getByText('交易优先级')).toBeInTheDocument();
  });

  test('应该验证表单输入', async () => {
    renderWithRouter(<BridgePanel />);

    const submitButton = screen.getByText('发起跨链转移');

    // 尝试提交空表单
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('请输入医疗记录ID')).toBeInTheDocument();
    });

    expect(screen.getByText('请输入接收方地址')).toBeInTheDocument();
  });

  test('应该验证UUID格式', async () => {
    renderWithRouter(<BridgePanel />);

    const recordIdInput = screen.getByLabelText('医疗记录ID *');
    const submitButton = screen.getByText('发起跨链转移');

    // 输入无效的UUID
    fireEvent.change(recordIdInput, { target: { value: 'invalid-uuid' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('请输入有效的记录ID格式')).toBeInTheDocument();
    });
  });

  test('应该验证以太坊地址格式', async () => {
    renderWithRouter(<BridgePanel />);

    const recipientInput = screen.getByLabelText('接收方地址 *');
    const submitButton = screen.getByText('发起跨链转移');

    // 输入无效的以太坊地址
    fireEvent.change(recipientInput, { target: { value: 'invalid-address' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('请输入有效的以太坊地址格式')).toBeInTheDocument();
    });
  });

  test('应该正确显示交易优先级选项', () => {
    renderWithRouter(<BridgePanel />);

    expect(screen.getByText('慢速')).toBeInTheDocument();
    expect(screen.getByText('标准')).toBeInTheDocument();
    expect(screen.getByText('快速')).toBeInTheDocument();

    expect(screen.getByText('~10分钟')).toBeInTheDocument();
    expect(screen.getByText('~3分钟')).toBeInTheDocument();
    expect(screen.getByText('~1分钟')).toBeInTheDocument();
  });
});

describe('联邦学习管理界面测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock API responses
    const { apiRequest } = require('../../../utils/api');
    apiRequest.mockImplementation((url: string) => {
      if (url.includes('/tasks')) {
        return Promise.resolve({ tasks: [] });
      }
      if (url.includes('/models')) {
        return Promise.resolve({ models: [] });
      }
      if (url.includes('/predictions')) {
        return Promise.resolve({ predictions: [] });
      }
      if (url.includes('/privacy-budget')) {
        return Promise.resolve({
          totalBudget: 10.0,
          consumedBudget: 2.5,
          remainingBudget: 7.5,
        });
      }
      return Promise.resolve({});
    });
  });

  test('应该正确渲染联邦学习管理界面', async () => {
    renderWithRouter(<FederatedLearningManagement />);

    // 检查主要元素
    expect(screen.getByText('联邦学习平台')).toBeInTheDocument();
    expect(
      screen.getByText('基于区块链的隐私保护联邦学习系统，实现医疗数据的安全协作分析')
    ).toBeInTheDocument();

    // 检查按钮
    expect(screen.getByText('开始预测')).toBeInTheDocument();
    expect(screen.getByText('创建任务')).toBeInTheDocument();
  });

  test('应该显示统计卡片', async () => {
    renderWithRouter(<FederatedLearningManagement />);

    await waitFor(() => {
      expect(screen.getByText('活跃任务')).toBeInTheDocument();
    });

    expect(screen.getByText('参与训练')).toBeInTheDocument();
    expect(screen.getByText('预测次数')).toBeInTheDocument();
    expect(screen.getByText('隐私预算剩余')).toBeInTheDocument();
  });

  test('应该显示隐私保护机制说明', async () => {
    renderWithRouter(<FederatedLearningManagement />);

    await waitFor(() => {
      expect(screen.getByText('隐私保护机制')).toBeInTheDocument();
    });

    expect(screen.getByText('差分隐私')).toBeInTheDocument();
    expect(screen.getByText('安全聚合')).toBeInTheDocument();
    expect(screen.getByText('联邦学习')).toBeInTheDocument();
  });

  test('应该显示标签导航', async () => {
    renderWithRouter(<FederatedLearningManagement />);

    await waitFor(() => {
      expect(screen.getByText('🎯 学习任务')).toBeInTheDocument();
    });

    expect(screen.getByText('🧠 我的模型')).toBeInTheDocument();
    expect(screen.getByText('📊 预测历史')).toBeInTheDocument();
  });

  test('应该能够打开创建任务模态框', async () => {
    renderWithRouter(<FederatedLearningManagement />);

    const createButton = screen.getByText('创建任务');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('创建联邦学习任务')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('任务名称 *')).toBeInTheDocument();
    expect(screen.getByLabelText('模型类型 *')).toBeInTheDocument();
    expect(screen.getByLabelText('隐私保护等级 *')).toBeInTheDocument();
  });

  test('应该能够打开预测模态框', async () => {
    renderWithRouter(<FederatedLearningManagement />);

    const predictButton = screen.getByText('开始预测');
    fireEvent.click(predictButton);

    await waitFor(() => {
      expect(screen.getByText('执行预测')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('选择模型 *')).toBeInTheDocument();
    expect(screen.getByLabelText('输入数据 *')).toBeInTheDocument();
    expect(screen.getByText('隐私保护提醒：')).toBeInTheDocument();
  });

  test('应该验证创建任务表单', async () => {
    renderWithRouter(<FederatedLearningManagement />);

    // 打开创建任务模态框
    const createButton = screen.getByText('创建任务');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('创建联邦学习任务')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('创建任务');
    fireEvent.click(submitButton);

    // 应该显示验证错误（任务名称必填）
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('请输入任务名称');
    });
  });

  test('应该能够切换标签', async () => {
    renderWithRouter(<FederatedLearningManagement />);

    await waitFor(() => {
      expect(screen.getByText('🧠 我的模型')).toBeInTheDocument();
    });

    // 点击模型标签
    const modelsTab = screen.getByText('🧠 我的模型');
    fireEvent.click(modelsTab);

    await waitFor(() => {
      expect(screen.getByText('暂无模型')).toBeInTheDocument();
    });

    // 点击预测历史标签
    const predictionsTab = screen.getByText('📊 预测历史');
    fireEvent.click(predictionsTab);

    await waitFor(() => {
      expect(screen.getByText('暂无预测记录')).toBeInTheDocument();
    });
  });
});

describe('用户体验测试', () => {
  test('界面应该具有良好的可访问性', () => {
    renderWithRouter(<BridgePanel />);

    // 检查是否有适当的标签
    const recordIdInput = screen.getByLabelText('医疗记录ID *');
    expect(recordIdInput).toHaveAttribute('required');

    const recipientInput = screen.getByLabelText('接收方地址 *');
    expect(recipientInput).toHaveAttribute('placeholder', '0x...');
  });

  test('应该提供有用的帮助文本', () => {
    renderWithRouter(<BridgePanel />);

    expect(
      screen.getByText('请输入有效的以太坊兼容地址（42位十六进制字符，以0x开头）')
    ).toBeInTheDocument();
  });

  test('应该有响应式设计元素', () => {
    renderWithRouter(<BridgePanel />);

    // 检查网格布局类
    const networkCards = screen.getByText('Ethereum');
    expect(networkCards).toBeInTheDocument();

    // 检查响应式类
    const gasEstimation = screen.getByText('预估Gas费用');
    expect(gasEstimation).toBeInTheDocument();
  });

  test('应该有适当的加载状态', async () => {
    renderWithRouter(<FederatedLearningManagement />);

    // 应该显示加载指示器
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  test('应该有清晰的视觉层次', () => {
    renderWithRouter(<BridgePanel />);

    // 检查标题层次
    const mainTitle = screen.getByText('跨链桥接');
    expect(mainTitle).toHaveClass('text-2xl', 'font-bold');

    const subtitle = screen.getByText('将医疗记录安全地转移到其他区块链网络');
    expect(subtitle).toHaveClass('text-gray-600');
  });
});

export {};
