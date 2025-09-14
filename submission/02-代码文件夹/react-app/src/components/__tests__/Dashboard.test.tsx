import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock hooks that Dashboard actually uses
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      username: 'testuser',
      name: 'Dr. Test',
      role: 'doctor',
      email: 'test@example.com',
    },
    isAuthenticated: true,
    loading: false,
  }),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    toggleTheme: jest.fn(),
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: { [key: string]: string } = {
        'nav.upload': '上传医疗记录',
        'nav.transfer': '转移所有权',
        'nav.query': '查询记录',
        'nav.history': '操作历史',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock recharts components
jest.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

// Mock API calls using utils/api which Dashboard actually imports
jest.mock('../../utils/api', () => ({
  recordsAPI: {
    getAllRecords: jest.fn(),
  },
}));

// Mock child components that Dashboard imports
jest.mock('../AnalyticsPanel', () => {
  return function MockAnalyticsPanel() {
    return <div data-testid="analytics-panel">Analytics Panel</div>;
  };
});

jest.mock('../BridgePanel', () => {
  return function MockBridgePanel() {
    return <div data-testid="bridge-panel">Bridge Panel</div>;
  };
});

jest.mock('../BridgeOptimizationPanel', () => {
  return function MockBridgeOptimizationPanel() {
    return <div data-testid="bridge-optimization-panel">Bridge Optimization Panel</div>;
  };
});

jest.mock('../MonitoringDashboard', () => {
  return function MockMonitoringDashboard() {
    return <div data-testid="monitoring-dashboard">Monitoring Dashboard</div>;
  };
});

jest.mock('../AlertConfig', () => {
  return function MockAlertConfig() {
    return <div data-testid="alert-config">Alert Config</div>;
  };
});

jest.mock('../LogDashboard', () => {
  return function MockLogDashboard() {
    return <div data-testid="log-dashboard">Log Dashboard</div>;
  };
});

jest.mock('../BackupPanel', () => {
  return function MockBackupPanel() {
    return <div data-testid="backup-panel">Backup Panel</div>;
  };
});

jest.mock('../BackupStatus', () => {
  return function MockBackupStatus() {
    return <div data-testid="backup-status">Backup Status</div>;
  };
});

jest.mock('../RecoveryPanel', () => {
  return function MockRecoveryPanel() {
    return <div data-testid="recovery-panel">Recovery Panel</div>;
  };
});

jest.mock('../RecoveryStatus', () => {
  return function MockRecoveryStatus() {
    return <div data-testid="recovery-status">Recovery Status</div>;
  };
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Create a simple store for Redux Provider
const mockStore = configureStore({
  reducer: {
    auth: (state = { user: null, isAuthenticated: false }, action) => state,
    records: (state = { records: [], loading: false }, action) => state,
  },
});

const renderDashboard = () => {
  return render(
    <Provider store={mockStore}>
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    </Provider>
  );
};

describe('Dashboard Component', () => {
  const mockMedicalRecords = [
    {
      id: '1',
      patientName: '张三',
      diagnosis: '高血压',
      date: '2024-01-15',
      status: 'active',
      owner: 'doctor1',
      appraisedValue: 1000,
    },
    {
      id: '2',
      patientName: '李四',
      diagnosis: '糖尿病',
      date: '2024-01-14',
      status: 'completed',
      owner: 'doctor2',
      appraisedValue: 1500,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    const { recordsAPI } = require('../../utils/api');
    recordsAPI.getAllRecords.mockClear();
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        id: '1',
        username: 'testuser',
        role: 'doctor',
        email: 'test@example.com',
      })
    );
  });

  it('renders dashboard correctly for authenticated user', async () => {
    const { recordsAPI } = require('../../utils/api');
    recordsAPI.getAllRecords.mockResolvedValueOnce({
      success: true,
      data: mockMedicalRecords,
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/欢迎回来/i)).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    const { recordsAPI } = require('../../utils/api');
    recordsAPI.getAllRecords.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    renderDashboard();

    expect(screen.getByText(/加载中.../i)).toBeInTheDocument();
  });

  it('handles error state when fetching records fails', async () => {
    const { recordsAPI } = require('../../utils/api');
    recordsAPI.getAllRecords.mockRejectedValueOnce(new Error('API Error'));

    renderDashboard();

    await waitFor(() => {
      // Component should still render with fallback data
      expect(screen.getByText(/欢迎回来/i)).toBeInTheDocument();
    });
  });

  it('displays statistics correctly', async () => {
    const { recordsAPI } = require('../../utils/api');
    recordsAPI.getAllRecords.mockResolvedValueOnce({
      success: true,
      data: mockMedicalRecords,
    });

    renderDashboard();

    await waitFor(() => {
      // Should show stats section elements
      expect(screen.getByText('病例管理')).toBeInTheDocument();
    });

    expect(screen.getByText('总病例数')).toBeInTheDocument();
  });

  it('renders quick action buttons', async () => {
    const { recordsAPI } = require('../../utils/api');
    recordsAPI.getAllRecords.mockResolvedValueOnce({
      success: true,
      data: mockMedicalRecords,
    });

    renderDashboard();

    await waitFor(() => {
      // Check for actual text rendered in doctor dashboard
      expect(screen.getByText('搜索患者/病历')).toBeInTheDocument();
    });

    expect(screen.getByText('提交访问申请')).toBeInTheDocument();
    expect(screen.getByText('权限管理')).toBeInTheDocument();
  });

  it('displays chart components', async () => {
    const { recordsAPI } = require('../../utils/api');
    recordsAPI.getAllRecords.mockResolvedValueOnce({
      success: true,
      data: mockMedicalRecords,
    });

    renderDashboard();

    await waitFor(() => {
      // Verify panels that are actually rendered in doctor dashboard
      expect(screen.getByTestId('bridge-panel')).toBeInTheDocument();
    });

    expect(screen.getByTestId('bridge-optimization-panel')).toBeInTheDocument();
  });

  it('renders role-specific content for doctor', async () => {
    const { recordsAPI } = require('../../utils/api');
    recordsAPI.getAllRecords.mockResolvedValueOnce({
      success: true,
      data: mockMedicalRecords,
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Dr\. Test 医生/i)).toBeInTheDocument();
    });
  });

  it('handles data loading and displays fallback when API fails', async () => {
    const { recordsAPI } = require('../../utils/api');
    recordsAPI.getAllRecords.mockResolvedValueOnce({
      success: false,
      error: 'Failed to load',
    });

    renderDashboard();

    await waitFor(() => {
      // Component should use fallback mock data
      expect(screen.getByText(/欢迎回来/i)).toBeInTheDocument();
    });
  });
});
