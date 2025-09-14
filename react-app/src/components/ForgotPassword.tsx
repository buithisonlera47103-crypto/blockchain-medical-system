import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { PulseLoader } from 'react-spinners';
import { toast } from 'react-toastify';

import { useTheme } from '../contexts/ThemeContext';


interface ForgotPasswordFormData {
  email: string;
}

interface ResetPasswordFormData {
  code: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * 忘记密码页面组件
 * 包含发送重置邮件和重置密码功能
 */
const ForgotPassword: React.FC = () => {
  const { isDark } = useTheme();
  const [step, setStep] = useState<'email' | 'verify' | 'reset' | 'success'>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
  } = useForm<ForgotPasswordFormData>();

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: resetErrors },
    watch,
  } = useForm<ResetPasswordFormData>();

  const watchPassword = watch('newPassword');

  // 发送重置邮件
  const onSubmitEmail = async (data: ForgotPasswordFormData) => {
    try {
      setLoading(true);
      setEmail(data.email);

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success('重置邮件已发送，请检查您的邮箱');
      setStep('verify');
      startCountdown();
    } catch (error) {
      toast.error('发送失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 验证重置码并重置密码
  const onSubmitReset = async (data: ResetPasswordFormData) => {
    try {
      setLoading(true);

      // 验证重置码
      if (data.code !== '123456') {
        toast.error('验证码错误');
        return;
      }

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success('密码重置成功');
      setStep('success');
    } catch (error) {
      toast.error('重置失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 重新发送验证码
  const resendCode = async () => {
    try {
      setLoading(true);

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('验证码已重新发送');
      startCountdown();
    } catch (error) {
      toast.error('发送失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 开始倒计时
  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 密码强度检查
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, text: '', color: '' };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    score = Object.values(checks).filter(Boolean).length;

    if (score < 2) return { score, text: '弱', color: 'text-red-500' };
    if (score < 4) return { score, text: '中等', color: 'text-yellow-500' };
    return { score, text: '强', color: 'text-green-500' };
  };

  const passwordStrength = getPasswordStrength(watchPassword || '');

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-6 ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}
    >
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl p-8 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {/* 头部 */}
        <div className="text-center mb-8">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isDark ? 'bg-blue-900' : 'bg-blue-100'
            }`}
          >
            <span className={`text-2xl ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>🔑</span>
          </div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {step === 'email' && '忘记密码'}
            {step === 'verify' && '验证邮箱'}
            {step === 'reset' && '重置密码'}
            {step === 'success' && '重置成功'}
          </h1>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {step === 'email' && '请输入您的邮箱地址，我们将发送重置链接'}
            {step === 'verify' && '请输入发送到您邮箱的验证码'}
            {step === 'reset' && '请设置您的新密码'}
            {step === 'success' && '您的密码已成功重置'}
          </p>
        </div>

        {/* 发送重置邮件 */}
        {step === 'email' && (
          <form onSubmit={handleSubmitEmail(onSubmitEmail)} className="space-y-6">
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                邮箱地址
              </label>
              <div className="relative">
                <span
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                    isDark ? 'text-gray-400' : 'text-gray-400'
                  }`}
                >
                  📧
                </span>
                <input
                  type="email"
                  {...registerEmail('email', {
                    required: '邮箱地址不能为空',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: '请输入有效的邮箱地址',
                    },
                  })}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-colors ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                      : 'bg-white border-gray-300 focus:border-blue-500'
                  } ${emailErrors.email ? 'border-red-500' : ''}`}
                  placeholder="请输入您的邮箱地址"
                />
              </div>
              {emailErrors.email && (
                <p className="text-red-500 text-sm mt-1">{emailErrors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <PulseLoader color="white" size={8} />
              ) : (
                <>
                  <span>📧</span>
                  <span>发送重置邮件</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 验证码输入 */}
        {step === 'verify' && (
          <div className="space-y-6">
            <div
              className={`p-4 rounded-lg ${
                isDark
                  ? 'bg-blue-900/20 border border-blue-800'
                  : 'bg-blue-50 border border-blue-200'
              }`}
            >
              <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                验证码已发送至: <span className="font-medium">{email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmitReset(onSubmitReset)} className="space-y-6">
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  验证码
                </label>
                <input
                  type="text"
                  {...registerReset('code', {
                    required: '验证码不能为空',
                    pattern: {
                      value: /^\d{6}$/,
                      message: '请输入6位数字验证码',
                    },
                  })}
                  className={`w-full px-4 py-3 border rounded-lg text-center text-2xl tracking-widest transition-colors ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                      : 'bg-white border-gray-300 focus:border-blue-500'
                  } ${resetErrors.code ? 'border-red-500' : ''}`}
                  placeholder="123456"
                  maxLength={6}
                />
                {resetErrors.code && (
                  <p className="text-red-500 text-sm mt-1">{resetErrors.code.message}</p>
                )}
              </div>

              <div className="text-center">
                {countdown > 0 ? (
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {countdown}秒后可重新发送
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={loading}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    重新发送验证码
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <PulseLoader color="white" size={8} />
                ) : (
                  <>
                    <span className="">✅</span>
                    <span>验证并继续</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* 重置密码 */}
        {step === 'reset' && (
          <form onSubmit={handleSubmitReset(onSubmitReset)} className="space-y-6">
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                新密码
              </label>
              <div className="relative">
                <span
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                    isDark ? 'text-gray-400' : 'text-gray-400'
                  }`}
                >
                  🔑
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...registerReset('newPassword', {
                    required: '新密码不能为空',
                    minLength: {
                      value: 8,
                      message: '密码至少需要8个字符',
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/,
                      message: '密码必须包含大小写字母、数字和特殊字符',
                    },
                  })}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg transition-colors ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                      : 'bg-white border-gray-300 focus:border-blue-500'
                  } ${resetErrors.newPassword ? 'border-red-500' : ''}`}
                  placeholder="请输入新密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                    isDark
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {showPassword ? <span className="">🙈</span> : <span className="">👁️</span>}
                </button>
              </div>
              {resetErrors.newPassword && (
                <p className="text-red-500 text-sm mt-1">{resetErrors.newPassword.message}</p>
              )}

              {/* 密码强度指示器 */}
              {watchPassword && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">密码强度:</span>
                    <span className={`text-sm font-medium ${passwordStrength.color}`}>
                      {passwordStrength.text}
                    </span>
                  </div>
                  <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordStrength.score < 2
                          ? 'bg-red-500'
                          : passwordStrength.score < 4
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                确认新密码
              </label>
              <div className="relative">
                <span
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                    isDark ? 'text-gray-400' : 'text-gray-400'
                  }`}
                >
                  🔑
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...registerReset('confirmPassword', {
                    required: '请确认新密码',
                    validate: value => value === watchPassword || '两次输入的密码不一致',
                  })}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg transition-colors ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                      : 'bg-white border-gray-300 focus:border-blue-500'
                  } ${resetErrors.confirmPassword ? 'border-red-500' : ''}`}
                  placeholder="请再次输入新密码"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                    isDark
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {showConfirmPassword ? (
                    <span className="">🙈</span>
                  ) : (
                    <span className="">👁️</span>
                  )}
                </button>
              </div>
              {resetErrors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{resetErrors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <PulseLoader color="white" size={8} />
              ) : (
                <>
                  <span className="">✅</span>
                  <span>重置密码</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 成功页面 */}
        {step === 'success' && (
          <div className="text-center space-y-6">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
                isDark ? 'bg-green-900' : 'bg-green-100'
              }`}
            >
              <span className={`text-3xl ${isDark ? 'text-green-400' : 'text-green-600'}`}>✅</span>
            </div>

            <div>
              <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                密码重置成功！
              </h2>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                您现在可以使用新密码登录您的账户
              </p>
            </div>

            <Link
              to="/login"
              className="inline-block w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors text-center"
            >
              返回登录
            </Link>
          </div>
        )}

        {/* 返回登录链接 */}
        {step !== 'success' && (
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className={`inline-flex items-center space-x-2 text-sm hover:underline ${
                isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              <span>⬅️</span>
              <span>返回登录</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
