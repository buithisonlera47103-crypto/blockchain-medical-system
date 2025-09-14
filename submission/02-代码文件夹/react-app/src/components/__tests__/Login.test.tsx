import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-toastify';

import authSlice from '../../store/slices/authSlice';
// Import Login after all mocks
import Login from '../Login';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock useAuth hook
const mockLogin = jest.fn();
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    clearError: jest.fn(),
    error: null,
    loading: false,
  }),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'login.title': '登录',
        'login.subtitle': '安全访问基于区块链的医疗记录',
        loginSuccess: '登录成功！',
        loginError: '用户名或密码错误',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'zh',
      changeLanguage: jest.fn(),
    },
  }),
}));

// Mock ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    toggleTheme: jest.fn(),
  }),
}));

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Create mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        ...initialState,
      },
    },
  });
};

const renderLogin = (preloadedAuth = {}) => {
  const store = createMockStore(preloadedAuth);
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    </Provider>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogin.mockResolvedValue(undefined);
  });

  it('renders login form correctly', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: /登录/i })).toBeInTheDocument();
    expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    // Button has aria-label="登录" and visible text "安全登录"
    expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup();
    renderLogin();

    const loginButton = screen.getByRole('button', { name: /登录/i });
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/请输入用户名/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/请输入密码/i)).toBeInTheDocument();
  });

  it('submits form with valid credentials', async () => {
    const user = userEvent.setup();
    renderLogin();

    const usernameInput = screen.getByLabelText('用户名');
    const passwordInput = screen.getByLabelText('密码');
    const loginButton = screen.getByRole('button', { name: /登录/i });

    await user.type(usernameInput, 'john_doe');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('john_doe', 'password123', false);
    });
    expect(toast.success).toHaveBeenCalledWith('登录成功！');
  });

  it('shows error message for invalid credentials', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error('用户名或密码错误'));

    renderLogin();

    const usernameInput = screen.getByLabelText('用户名');
    const passwordInput = screen.getByLabelText('密码');
    const loginButton = screen.getByRole('button', { name: /登录/i });

    await user.type(usernameInput, 'wronguser');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/用户名或密码错误/i)).toBeInTheDocument();
    });
    expect(toast.error).toHaveBeenCalledWith('用户名或密码错误');
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error('网络错误，请稍后重试'));

    renderLogin();

    const usernameInput = screen.getByLabelText('用户名');
    const passwordInput = screen.getByLabelText('密码');
    const loginButton = screen.getByRole('button', { name: /登录/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/网络错误，请稍后重试/i)).toBeInTheDocument();
    });
    expect(toast.error).toHaveBeenCalledWith('网络错误，请稍后重试');
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderLogin();

    const passwordInput = screen.getByPlaceholderText<HTMLInputElement>(/请输入您的密码/i);
    const toggleButton = screen.getByRole('button', { name: /显示密码/i });

    // Initially password should be hidden
    expect(passwordInput.type).toBe('password');

    // Click toggle button to show password
    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    // Click again to hide password
    const hideBtn = screen.getByRole('button', { name: /隐藏密码/i });
    await user.click(hideBtn);
    expect(passwordInput.type).toBe('password');
  });

  it('navigates to register page when register link is clicked', async () => {
    const user = userEvent.setup();
    renderLogin();

    const registerLink = screen.getByRole('link', { name: /立即注册/i });
    await user.click(registerLink);

    expect(mockNavigate).toHaveBeenCalledWith('/register');
  });

  it('handles remember me functionality', async () => {
    const user = userEvent.setup();
    renderLogin();

    const rememberBtn = screen.getByText(/记住我/i);
    expect(rememberBtn).toBeInTheDocument();

    await user.click(rememberBtn);
    expect(rememberBtn).toBeInTheDocument();
  });

  it('allows form inputs to be cleared', async () => {
    const user = userEvent.setup();
    renderLogin();

    const usernameInput = screen.getByPlaceholderText<HTMLInputElement>(/请输入您的用户名/i);
    const passwordInput = screen.getByPlaceholderText<HTMLInputElement>(/请输入您的密码/i);

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');

    expect(usernameInput.value).toBe('testuser');
    expect(passwordInput.value).toBe('password123');

    await user.clear(usernameInput);
    await user.clear(passwordInput);

    expect(usernameInput.value).toBe('');
    expect(passwordInput.value).toBe('');
  });
});
