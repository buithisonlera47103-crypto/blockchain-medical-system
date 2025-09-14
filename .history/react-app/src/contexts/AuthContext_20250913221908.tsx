import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';

import { User, UserRole, UserStatus } from '../types';
import { getToken, setToken, getUser, setUser as setStoredUser, clearAuthData, isTokenValid } from '../utils/tokenManager';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, role: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: User) => void;
  isAuthenticated: boolean;
  loading: boolean;
  verifyToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Token verification function
  const verifyToken = async (): Promise<boolean> => {
    const token = getToken();
    const userData = getUser();

    if (!token || !userData) {
      clearAuthData();
      setUser(null);
      return false;
    }

    // Check if token is valid (not expired)
    if (!isTokenValid()) {
      clearAuthData();
      setUser(null);
      return false;
    }

    try {
      // Verify token with backend
      const response = await fetch('http://localhost:3001/api/v1/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid && data.user) {
          // Update user data from server
          const updatedUser: User = {
            ...userData,
            ...data.user,
            token: token,
          };
          setUser(updatedUser);
          setStoredUser(updatedUser);
          return true;
        }
      }
    } catch (error) {
      console.error('Token verification failed:', error);
    }

    // If verification fails, clear auth data
    clearAuthData();
    setUser(null);
    return false;
  };

  // Initialize authentication state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);

      const token = getToken();
      const userData = getUser();

      if (token && userData) {
        try {
          // First check if token format is valid
          if (isTokenValid()) {
            // Set user immediately for better UX
            setUser(userData);

            // Then verify with backend in background
            const isValid = await verifyToken();
            if (!isValid) {
              setUser(null);
            }
          } else {
            // Token is expired or invalid
            clearAuthData();
            setUser(null);
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
          clearAuthData();
          setUser(null);
        }
      }

      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Periodic token validation (every 5 minutes)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      const token = getToken();
      if (token && !isTokenValid()) {
        // Token has expired, logout user
        logout();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user]);

  const login = async (username: string, password: string, role: string): Promise<boolean> => {
    try {
      setLoading(true);

      // 模拟API调用
      const response = await fetch('http://localhost:3001/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const userData: User = {
          userId: data.user.id,
          id: data.user.id, // Alias for compatibility
          username: data.user.username,
          name: data.user.firstName && data.user.lastName ? `${data.user.firstName} ${data.user.lastName}` : data.user.username,
          email: data.user.email || `${data.user.username}@example.com`,
          role: data.user.role as UserRole,
          fullName: data.user.firstName && data.user.lastName ? `${data.user.firstName} ${data.user.lastName}` : data.user.username,
          status: UserStatus.ACTIVE,
          token: data.token,
          createdAt: data.user.createdAt || new Date().toISOString(),
          updatedAt: data.user.updatedAt || new Date().toISOString(),
        };

        setUser(userData);
        setToken(data.token);
        setStoredUser(userData);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      // 开发环境下的模拟登录
      // 检查本地存储中是否有匹配的用户
      const storedUsers = localStorage.getItem('emr_registered_users');
      if (storedUsers) {
        try {
          const users = JSON.parse(storedUsers);
          const foundUser = users.find(
            (u: any) => u.username === username && u.password === password && u.role === role
          );

          if (foundUser) {
            const mockUser: User = {
              userId: foundUser.id,
              id: foundUser.id, // Alias for compatibility
              username: foundUser.username,
              name: foundUser.name, // Display name
              email: foundUser.email || `${foundUser.username}@example.com`,
              role: foundUser.role as UserRole,
              fullName: foundUser.name,
              status: UserStatus.ACTIVE,
              token: 'mock-jwt-token',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setUser(mockUser);
            setToken('mock-jwt-token-' + foundUser.username);
            setStoredUser(mockUser);
            return true;
          }
        } catch (e) {
          console.error('Error parsing stored users:', e);
        }
      }

      // 默认管理员账户
      if (username === 'admin' && password === 'admin' && role === 'admin') {
        const mockUser: User = {
          userId: '1',
          id: '1', // Alias for compatibility
          username: 'admin',
          name: 'Administrator', // Display name
          email: 'admin@example.com',
          role: UserRole.SYSTEM_ADMIN,
          fullName: 'Administrator',
          status: UserStatus.ACTIVE,
          token: 'mock-jwt-token',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUser(mockUser);
        setToken('mock-jwt-token');
        setStoredUser(mockUser);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    clearAuthData();
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    setStoredUser(userData);
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    role: string
  ): Promise<boolean> => {
    try {
      setLoading(true);

      // 模拟API调用
      const response = await fetch('http://localhost:3001/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
          role,
          firstName: '测试',
          lastName: '用户'
        }),
      });

      if (response.ok) {
        // 注册成功后自动登录
        return await login(username, password, role);
      } else {
        return false;
      }
    } catch (error) {
      console.error('Register error:', error);
      // 开发环境下的模拟注册
      if (username !== 'admin') {
        // 检查用户名是否已存在
        const storedUsers = localStorage.getItem('emr_registered_users');
        let users = [];
        if (storedUsers) {
          try {
            users = JSON.parse(storedUsers);
            const existingUser = users.find((u: any) => u.username === username);
            if (existingUser) {
              return false; // 用户名已存在
            }
          } catch (e) {
            console.error('Error parsing stored users:', e);
            users = [];
          }
        }

        const mockUser: User = {
          userId: Date.now().toString(),
          id: Date.now().toString(), // Alias for compatibility
          username: username,
          name: username, // Display name
          email: email,
          role: role as UserRole,
          fullName: username,
          status: UserStatus.ACTIVE,
          token: 'mock-jwt-token',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // 将用户信息存储到注册用户列表中
        const userToStore = {
          id: mockUser.userId,
          username: username,
          name: username,
          email: email,
          password: password,
          role: role,
        };
        users.push(userToStore);
        localStorage.setItem('emr_registered_users', JSON.stringify(users));

        // 设置当前登录用户
        setUser(mockUser);
        setToken('mock-jwt-token-' + username);
        setStoredUser(mockUser);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = useMemo(() => ({
    user,
    login,
    register,
    logout,
    updateUser,
    verifyToken,
    isAuthenticated: !!user,
    loading,
  }), [user, loading, login, register, logout, updateUser, verifyToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
