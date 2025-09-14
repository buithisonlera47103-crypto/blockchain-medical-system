import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { User, UserRole, UserStatus } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, role: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: User) => void;
  isAuthenticated: boolean;
  loading: boolean;
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

  useEffect(() => {
    // 检查本地存储中的token
    const token = localStorage.getItem('emr_token');
    const userData = localStorage.getItem('emr_user');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('emr_token');
        localStorage.removeItem('emr_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string, role: string): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('🔐 Login attempt:', { username, role });

      // 首先尝试模拟登录（跳过API调用以避免等待）
      console.log('🔄 Trying mock login first...');

      // 默认测试账户
      const defaultUsers = [
        {
          username: 'doctor_test',
          password: 'Doctor123!',
          role: 'doctor',
          id: '1',
          name: '张医生',
          email: 'doctor@example.com'
        },
        {
          username: 'patient_zhang',
          password: 'Patient123!',
          role: 'patient',
          id: '2',
          name: '张三',
          email: 'zhang@example.com'
        },
        {
          username: 'admin_user',
          password: 'Admin123!',
          role: 'admin',
          id: '3',
          name: '系统管理员',
          email: 'admin@example.com'
        },
        {
          username: 'admin',
          password: 'admin',
          role: 'admin',
          id: '4',
          name: 'Administrator',
          email: 'admin@example.com'
        }
      ];

      const foundDefaultUser = defaultUsers.find(
        (u) => u.username === username && u.password === password && u.role === role
      );

      if (foundDefaultUser) {
        console.log('✅ Found default user:', foundDefaultUser.username);
        const mockUser: User = {
          userId: foundDefaultUser.id,
          id: foundDefaultUser.id,
          username: foundDefaultUser.username,
          name: foundDefaultUser.name,
          email: foundDefaultUser.email,
          role: foundDefaultUser.role === 'admin' ? UserRole.SYSTEM_ADMIN :
                foundDefaultUser.role === 'doctor' ? UserRole.DOCTOR : UserRole.PATIENT,
          fullName: foundDefaultUser.name,
          status: UserStatus.ACTIVE,
          token: 'mock-jwt-token-' + foundDefaultUser.username,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUser(mockUser);
        localStorage.setItem('emr_token', 'mock-jwt-token-' + foundDefaultUser.username);
        localStorage.setItem('emr_user', JSON.stringify(mockUser));
        console.log('🎉 Login successful, user set:', mockUser);
        return true;
      }

      console.log('❌ No matching default user found, trying API...');

      // 如果默认用户不匹配，尝试API调用
      try {
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
          localStorage.setItem('emr_token', data.token);
          localStorage.setItem('emr_user', JSON.stringify(userData));
          console.log('🎉 API Login successful:', userData);
          return true;
        } else {
          console.log('❌ API login failed with status:', response.status);
          return false;
        }
      } catch (apiError) {
        console.error('❌ API login error:', apiError);

        // 检查本地存储中的注册用户
        const storedUsers = localStorage.getItem('emr_registered_users');
        if (storedUsers) {
          try {
            const users = JSON.parse(storedUsers);
            const foundUser = users.find(
              (u: any) => u.username === username && u.password === password && u.role === role
            );

            if (foundUser) {
              console.log('✅ Found stored user:', foundUser.username);
              const mockUser: User = {
                userId: foundUser.id,
                id: foundUser.id, // Alias for compatibility
                username: foundUser.username,
                name: foundUser.name, // Display name
                email: foundUser.email || `${foundUser.username}@example.com`,
                role: foundUser.role as UserRole,
                fullName: foundUser.name,
                status: UserStatus.ACTIVE,
                token: 'mock-jwt-token-' + foundUser.username,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              setUser(mockUser);
              localStorage.setItem('emr_token', 'mock-jwt-token-' + foundUser.username);
              localStorage.setItem('emr_user', JSON.stringify(mockUser));
              console.log('🎉 Stored user login successful:', mockUser);
              return true;
            }
          } catch (e) {
            console.error('Error parsing stored users:', e);
          }
        }
      }

      console.log('❌ No matching user found anywhere');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('emr_token');
    localStorage.removeItem('emr_user');
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('emr_user', JSON.stringify(userData));
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
        const data = await response.json();
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
        localStorage.setItem('emr_token', 'mock-jwt-token-' + username);
        localStorage.setItem('emr_user', JSON.stringify(mockUser));
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
