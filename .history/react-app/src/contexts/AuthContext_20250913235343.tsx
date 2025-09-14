import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';

import { User, UserRole, UserStatus } from '../types';

// 认证上下文类型
interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, role: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: User) => void;
  isAuthenticated: boolean;
  loading: boolean;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider Props
interface AuthProviderProps {
  children: ReactNode;
}

// 默认测试用户
const DEFAULT_USERS = [
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

// 角色映射函数
const mapRole = (role: string): UserRole => {
  switch (role) {
    case 'admin':
    case 'system_admin':
      return UserRole.SYSTEM_ADMIN;
    case 'doctor':
      return UserRole.DOCTOR;
    case 'patient':
      return UserRole.PATIENT;
    case 'hospital_admin':
      return UserRole.HOSPITAL_ADMIN;
    case 'super_admin':
      return UserRole.SUPER_ADMIN;
    case 'auditor':
      return UserRole.AUDITOR;
    default:
      return UserRole.PATIENT;
  }
};

// AuthProvider组件
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化认证状态
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = localStorage.getItem('emr_token');
        const userData = localStorage.getItem('emr_user');
        
        if (token && userData) {
          const parsedUser = JSON.parse(userData);
          console.log('🔄 Restoring user session:', parsedUser.username);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('emr_token');
        localStorage.removeItem('emr_user');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 登录函数
  const login = async (username: string, password: string, role: string): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('🔐 Login attempt:', { username, role });

      // 查找默认用户
      const foundUser = DEFAULT_USERS.find(
        (u) => u.username === username && u.password === password && u.role === role
      );

      if (foundUser) {
        console.log('✅ Found default user:', foundUser.username);
        const mockUser: User = {
          userId: foundUser.id,
          id: foundUser.id,
          username: foundUser.username,
          name: foundUser.name,
          email: foundUser.email,
          role: mapRole(foundUser.role),
          fullName: foundUser.name,
          status: UserStatus.ACTIVE,
          token: 'mock-jwt-token-' + foundUser.username,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        setUser(mockUser);
        localStorage.setItem('emr_token', mockUser.token || '');
        localStorage.setItem('emr_user', JSON.stringify(mockUser));
        console.log('🎉 Login successful:', mockUser);
        return true;
      }

      // 检查localStorage中的注册用户
      const storedUsers = localStorage.getItem('emr_registered_users');
      if (storedUsers) {
        try {
          const users = JSON.parse(storedUsers);
          const registeredUser = users.find(
            (u: any) => u.username === username && u.password === password && u.role === role
          );

          if (registeredUser) {
            console.log('✅ Found registered user:', registeredUser.username);
            const mockUser: User = {
              userId: registeredUser.id,
              id: registeredUser.id,
              username: registeredUser.username,
              name: registeredUser.name,
              email: registeredUser.email,
              role: mapRole(registeredUser.role),
              fullName: registeredUser.name,
              status: UserStatus.ACTIVE,
              token: 'mock-jwt-token-' + registeredUser.username,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            setUser(mockUser);
            localStorage.setItem('emr_token', mockUser.token || '');
            localStorage.setItem('emr_user', JSON.stringify(mockUser));
            console.log('🎉 Registered user login successful:', mockUser);
            return true;
          }
        } catch (e) {
          console.error('Error parsing stored users:', e);
        }
      }

      console.log('❌ No matching user found');
      return false;
    } catch (error) {
      console.error('❌ Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 注册函数
  const register = async (
    username: string,
    email: string,
    password: string,
    role: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('📝 Register attempt:', { username, email, role });

      // 生成新用户ID
      const newUserId = Date.now().toString();
      const newUser = {
        id: newUserId,
        username,
        email,
        password,
        role,
        name: username,
        createdAt: new Date().toISOString(),
      };

      // 保存到localStorage
      const existingUsers = JSON.parse(localStorage.getItem('emr_registered_users') || '[]');
      existingUsers.push(newUser);
      localStorage.setItem('emr_registered_users', JSON.stringify(existingUsers));

      console.log('✅ User registered successfully:', username);
      
      // 注册成功后自动登录
      return await login(username, password, role);
    } catch (error) {
      console.error('❌ Register error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 登出函数
  const logout = () => {
    console.log('🚪 User logging out');
    setUser(null);
    localStorage.removeItem('emr_token');
    localStorage.removeItem('emr_user');
  };

  // 更新用户信息
  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('emr_user', JSON.stringify(userData));
  };

  const value: AuthContextType = useMemo(() => ({
    user,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    loading,
  }), [user, loading, login, register, logout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// useAuth Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
