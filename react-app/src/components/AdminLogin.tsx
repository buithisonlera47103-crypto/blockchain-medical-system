import { Eye, EyeOff, Shield, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { toast, Toaster } from 'sonner';

import { useAuth } from '../hooks/useAuth';

interface AdminLoginForm {
  username: string;
  password: string;
  rememberMe: boolean;
}

const AdminLogin: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<AdminLoginForm>();

  const onSubmit = async (data: AdminLoginForm) => {
    setIsLoading(true);
    try {
      await login({
        username: data.username,
        password: data.password,
      });

      toast.success('管理员登录成功！');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.message || '登录失败，请检查用户名和密码';
      setError('root', {
        type: 'manual',
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 flex items-center justify-center p-4">
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-500"></div>
        </div>

        <div className="relative w-full max-w-md">
          {/* 主登录卡片 */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-blue-200/30 p-8">
            {/* 头部 */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-full mb-4 shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-blue-800 mb-2">管理员登录</h1>
              <p className="text-blue-600">系统管理控制台</p>
            </div>

            {/* 登录表单 */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* 用户名输入 */}
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">管理员账号</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('username', {
                      required: '请输入管理员账号',
                      minLength: {
                        value: 3,
                        message: '账号长度至少3个字符',
                      },
                    })}
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white/60 border border-blue-200 rounded-lg text-blue-800 placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="请输入管理员账号"
                    autoComplete="username"
                  />
                </div>
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* 密码输入 */}
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">管理员密码</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('password', {
                      required: '请输入密码',
                      minLength: {
                        value: 6,
                        message: '密码长度至少6个字符',
                      },
                    })}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full pl-10 pr-12 py-3 bg-white/60 border border-blue-200 rounded-lg text-blue-800 placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="请输入管理员密码"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* 记住我 */}
              <div className="flex items-center">
                <input
                  {...register('rememberMe')}
                  id="rememberMe"
                  type="checkbox"
                  className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-blue-600">
                  记住登录状态
                </label>
              </div>

              {/* 错误信息 */}
              {errors.root && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {errors.root.message}
                  </p>
                </div>
              )}

              {/* 登录按钮 */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white py-3 px-4 rounded-lg font-medium hover:from-sky-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    登录中...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Shield className="w-5 h-5 mr-2" />
                    管理员登录
                  </div>
                )}
              </button>
            </form>

            {/* 测试账号信息 */}
            <div className="mt-6 p-4 bg-gradient-to-r from-sky-50/10 to-cyan-50/10 rounded-xl border border-sky-200/20 shadow-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-sky-400" />
                <span className="text-sm font-bold text-blue-800">测试账户</span>
              </div>
              <p className="text-sm text-blue-800 text-center font-medium leading-relaxed">
                <span className="bg-sky-100/20 text-sky-300 px-2 py-1 rounded">用户名: admin</span>
                <span className="mx-2">•</span>
                <span className="bg-cyan-100/20 text-cyan-300 px-2 py-1 rounded">
                  密码: admin123
                </span>
              </p>
            </div>

            {/* 底部链接 */}
            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
              >
                返回普通用户登录
              </Link>
            </div>
          </div>

          {/* 安全提示 */}
          <div className="mt-6 bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-blue-200/30">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">安全提示</h3>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• 管理员账号具有系统最高权限</li>
                  <li>• 请确保在安全环境下登录</li>
                  <li>• 登录后请及时退出系统</li>
                  <li>• 如发现异常请立即联系技术支持</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminLogin;
