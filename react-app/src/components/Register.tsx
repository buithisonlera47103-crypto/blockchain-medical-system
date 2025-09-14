import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { PulseLoader } from 'react-spinners';
import { toast } from 'react-toastify';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
type RegisterFormData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'doctor' | 'patient';
  rememberMe: boolean;
};

type PasswordStrength = {
  score: number;
  label: string;
};

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score - 1] || 'Very Weak' };
}

const Register: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { register: authRegister } = useAuth(); // 假设AuthContext有register方法
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: '',
  });
  const [formError, setFormError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<RegisterFormData>({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'patient',
      rememberMe: false,
    },
  });

  const watchedPassword = watch('password', '');

  useEffect(() => {
    if (watchedPassword) {
      setPasswordStrength(getPasswordStrength(watchedPassword));
    } else {
      setPasswordStrength({ score: 0, label: '' });
    }
  }, [watchedPassword]);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'zh' : 'en');
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setFormError('');
    setIsShaking(false);

    if (data.password !== data.confirmPassword) {
      setFormError('Passwords do not match');
      setIsShaking(true);
      setIsLoading(false);
      return;
    }

    try {
      await authRegister({
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role,
      });
      toast.success(t('registerSuccess'));
      reset();
      navigate('/dashboard');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('registerError'));
      setIsShaking(true);
      toast.error(error instanceof Error ? error.message : t('registerError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-primary-50 to-medical-secondary-50 dark:from-gray-900 dark:to-medical-primary-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Medical theme background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <span className="absolute top-10 left-10 text-medical-error-200 dark:text-medical-error-800 text-9xl animate-pulse">
          ❤️
        </span>
        <span className="absolute bottom-20 right-20 text-medical-primary-200 dark:text-medical-primary-800 text-9xl rotate-45 animate-float">
          🩺
        </span>
        <span
          className="absolute top-1/2 left-1/4 text-medical-success-200 dark:text-medical-success-800 text-6xl animate-pulse"
          style={{ animationDelay: '2s' }}
        >
          🏥
        </span>
        <span
          className="absolute bottom-1/3 right-1/3 text-medical-info-200 dark:text-medical-info-800 text-7xl animate-float"
          style={{ animationDelay: '4s' }}
        >
          📋
        </span>
      </div>
      {/* Language and Theme Toggle */}
      <div className="absolute top-4 right-4 flex space-x-2 z-20">
        <button
          onClick={toggleLanguage}
          className="p-2 rounded-xl bg-gradient-to-r from-yellow-300 to-orange-300 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-yellow-400 transform hover:scale-105"
          aria-label={t('toggleLanguage')}
        >
          <span className="h-5 w-5 text-gray-800">🌐</span>
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-gradient-to-r from-pink-300 to-purple-300 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-pink-400 transform hover:scale-105"
          aria-label={t('toggleTheme')}
        >
          {isDark ? (
            <span className="h-5 w-5 text-gray-800">☀️</span>
          ) : (
            <span className="h-5 w-5 text-gray-800">🌙</span>
          )}
        </button>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen items-stretch">
          {/* Left Information Panel */}
          <div className="hidden md:flex flex-col justify-center p-8 relative">
            {/* Decorative border elements for left panel */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-20 h-20 border-l-4 border-t-4 border-cyan-400 rounded-tl-3xl"></div>
              <div className="absolute top-0 right-0 w-20 h-20 border-r-4 border-t-4 border-blue-400 rounded-tr-3xl"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 border-l-4 border-b-4 border-green-400 rounded-bl-3xl"></div>
              <div className="absolute bottom-0 right-0 w-20 h-20 border-r-4 border-b-4 border-purple-400 rounded-br-3xl"></div>

              {/* Floating decorative elements */}
              <div className="absolute top-16 left-16 w-24 h-24 bg-gradient-to-r from-cyan-200 to-blue-200 rounded-full opacity-30 animate-pulse"></div>
              <div className="absolute bottom-32 right-20 w-16 h-16 bg-gradient-to-r from-purple-200 to-pink-200 rounded-lg opacity-25 transform rotate-12"></div>

              {/* Medical themed floating icons */}
              <span
                className="absolute top-20 right-8 text-blue-300 opacity-20 text-3xl animate-bounce"
                style={{ animationDelay: '0s' }}
              >
                🩺
              </span>
              <span
                className="absolute bottom-20 left-8 text-red-300 opacity-25 text-2xl animate-pulse"
                style={{ animationDelay: '1s' }}
              >
                ❤️
              </span>
              <span
                className="absolute top-1/3 left-4 text-green-300 opacity-15 text-4xl animate-float"
                style={{ animationDelay: '2s' }}
              >
                🏥
              </span>
              <span
                className="absolute top-2/3 right-4 text-purple-300 opacity-20 text-2xl animate-bounce"
                style={{ animationDelay: '3s' }}
              >
                📋
              </span>
              <span
                className="absolute bottom-1/3 right-12 text-cyan-300 opacity-15 text-3xl animate-pulse"
                style={{ animationDelay: '4s' }}
              >
                🛡️
              </span>
              <span
                className="absolute top-40 left-12 text-yellow-300 opacity-20 text-2xl animate-float"
                style={{ animationDelay: '5s' }}
              >
                🔑
              </span>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-xl p-8 h-full flex flex-col justify-center hover:scale-105 transition-transform duration-300 relative z-10 border-2 border-medical-primary-200 backdrop-blur-sm">
              {/* Title */}
              <h3 className="text-2xl font-bold text-medical-primary-700 dark:text-medical-primary-300 text-center mb-6">
                <span className="inline-block mr-2 text-medical-success-500">🩺</span>
                Create Your Secure Account
              </h3>

              {/* System Introduction */}
              <p className="text-gray-600 dark:text-gray-400 text-center mb-8 font-medium">
                Join our platform to manage your health records with cutting-edge security.
              </p>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 gap-6 mb-8">
                <div className="bg-gradient-to-r from-medical-primary-100 to-medical-info-100 dark:from-medical-primary-900 dark:to-medical-info-900 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-center mb-2">
                    <span className="h-8 w-8 text-medical-primary-500 animate-pulse">🛡️</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    Blockchain Security
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Your data is protected by a decentralized and immutable ledger.
                  </div>
                </div>
                <div className="bg-gradient-to-r from-medical-success-100 to-medical-secondary-100 dark:from-medical-success-900 dark:to-medical-secondary-900 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-center mb-2">
                    <span
                      className="h-8 w-8 text-medical-success-500 animate-bounce"
                      style={{ animationDelay: '1s' }}
                    >
                      🔑
                    </span>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    Full Data Ownership
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    You have complete control over your personal health information.
                  </div>
                </div>
                <div className="bg-gradient-to-r from-medical-secondary-100 to-medical-primary-100 dark:from-medical-secondary-900 dark:to-medical-primary-900 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-center mb-2">
                    <span
                      className="h-8 w-8 text-medical-secondary-500 animate-pulse"
                      style={{ animationDelay: '2s' }}
                    >
                      🎧
                    </span>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    Seamless Access
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Access your records anytime, anywhere, on any device.
                  </div>
                </div>
              </div>

              {/* Platform Statistics */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 text-center">
                  Platform Statistics
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">10K+</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Active Users</div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      99.9%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Uptime</div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      24/7
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Support</div>
                  </div>
                </div>
              </div>

              {/* User Testimonial */}
              <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-center mb-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Dr. Sarah Chen
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                  "This platform has revolutionized how I manage patient records. The security and
                  ease of use are unmatched."
                </p>
              </div>

              {/* Security Badges */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">
                  Security Certifications
                </h4>
                <div className="flex justify-center space-x-4">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800 dark:to-green-700 rounded-full flex items-center justify-center mb-1">
                      <span className="text-green-600 dark:text-green-300 text-lg">🛡️</span>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">ISO 27001</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-700 rounded-full flex items-center justify-center mb-1">
                      <span className="text-blue-600 dark:text-blue-300 text-lg">🔑</span>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">HIPAA</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-700 rounded-full flex items-center justify-center mb-1">
                      <span className="text-purple-600 dark:text-purple-300 text-lg">📋</span>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">GDPR</span>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="mt-auto bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 shadow-md">
                <div className="flex justify-around mb-4">
                  <a
                    href="/terms"
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
                  >
                    <span className="h-4 w-4">📋</span>
                    Terms of Service
                  </a>
                  <a
                    href="/privacy"
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
                  >
                    <span className="h-4 w-4">🛡️</span>
                    Privacy Policy
                  </a>
                </div>
                <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white p-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl">
                  <span className="h-5 w-5">ℹ️</span>
                  Learn More
                </button>
              </div>
            </div>
          </div>

          {/* Right Register Form */}
          <div className="flex flex-col justify-center p-8 relative">
            {/* Decorative border elements for right panel */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-20 h-20 border-l-4 border-t-4 border-cyan-400 rounded-tl-3xl"></div>
              <div className="absolute top-0 right-0 w-20 h-20 border-r-4 border-t-4 border-blue-400 rounded-tr-3xl"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 border-l-4 border-b-4 border-green-400 rounded-bl-3xl"></div>
              <div className="absolute bottom-0 right-0 w-20 h-20 border-r-4 border-b-4 border-purple-400 rounded-br-3xl"></div>

              {/* Floating decorative elements */}
              <div className="absolute top-16 left-16 w-24 h-24 bg-gradient-to-r from-cyan-200 to-blue-200 rounded-full opacity-30 animate-pulse"></div>
              <div className="absolute bottom-32 right-20 w-16 h-16 bg-gradient-to-r from-purple-200 to-pink-200 rounded-lg opacity-25 transform rotate-12"></div>
            </div>
            <div className="w-full h-full relative z-10">
              <div
                className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-2xl rounded-xl p-8 h-full flex flex-col justify-center transition-all duration-200 border-2 border-medical-primary-200 hover:scale-105 transition-transform duration-300 ${isShaking ? 'animate-shake' : ''}`}
              >
                <div className="text-center mb-8">
                  <div className="mx-auto h-20 w-20 bg-gradient-to-r from-medical-primary-500 to-medical-secondary-600 rounded-full flex items-center justify-center mb-6 shadow-xl animate-pulse">
                    <span className="h-10 w-10 text-white">🛡️</span>
                  </div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-medical-primary-600 to-medical-secondary-700 bg-clip-text text-transparent mb-3">
                    Secure EMR Register
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2 font-medium">
                    <span className="h-5 w-5">🛡️</span>
                    {t('dataProtected')}
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex-1">
                  {/* Username Field */}
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                    >
                      {t('username')}
                    </label>
                    <div className="relative">
                      <input
                        {...register('username', {
                          required: t('usernameRequired'),
                          minLength: { value: 3, message: t('usernameMinLength') },
                        })}
                        type="text"
                        id="username"
                        className="block w-full px-3 py-4 border-2 border-medical-primary-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-medical-primary-50 to-medical-secondary-50 dark:bg-gray-700 text-medical-text-primary dark:text-medical-text-primary-dark placeholder-medical-text-secondary dark:placeholder-medical-text-secondary-dark focus:outline-none focus:ring-2 focus:ring-medical-primary-500 focus:border-medical-primary-500 transition-all duration-200 font-medium"
                        placeholder={t('usernamePlaceholder')}
                        aria-label={t('username')}
                      />
                    </div>
                    {errors.username && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-medium">
                        {errors.username.message}
                      </p>
                    )}
                  </div>

                  {/* Email Field */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                    >
                      {t('email')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="h-5 w-5 text-medical-info-500">📧</span>
                      </div>
                      <input
                        {...register('email', {
                          required: t('emailRequired'),
                          pattern: { value: /^\S+@\S+$/i, message: t('invalidEmail') },
                        })}
                        type="email"
                        id="email"
                        className="block w-full pl-10 pr-3 py-4 border-2 border-medical-info-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-medical-info-50 to-medical-primary-50 dark:bg-gray-700 text-medical-text-primary dark:text-medical-text-primary-dark placeholder-medical-text-secondary dark:placeholder-medical-text-secondary-dark focus:outline-none focus:ring-2 focus:ring-medical-info-500 focus:border-medical-info-500 transition-all duration-200 font-medium"
                        placeholder={t('emailPlaceholder')}
                        aria-label={t('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-medium">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                    >
                      {t('password')}
                    </label>
                    <div className="relative">
                      <input
                        {...register('password', {
                          required: t('passwordRequired'),
                          minLength: { value: 6, message: t('passwordMinLength') },
                        })}
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        className="block w-full pl-3 pr-10 py-4 border-2 border-medical-secondary-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-medical-secondary-50 to-medical-primary-50 dark:bg-gray-700 text-medical-text-primary dark:text-medical-text-primary-dark placeholder-medical-text-secondary dark:placeholder-medical-text-secondary-dark focus:outline-none focus:ring-2 focus:ring-medical-secondary-500 focus:border-medical-secondary-500 transition-all duration-200 font-medium"
                        placeholder={t('passwordPlaceholder')}
                        aria-label={t('password')}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-medical-secondary-700 dark:hover:text-gray-300 transition-colors duration-200"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                      >
                        {showPassword ? (
                          <span className="h-5 w-5 text-medical-secondary-500">🙈</span>
                        ) : (
                          <span className="h-5 w-5 text-medical-secondary-500">👁️</span>
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-medium">
                        {errors.password.message}
                      </p>
                    )}

                    {/* Password Strength Indicator */}
                    {passwordStrength.score > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                passwordStrength.score === 1
                                  ? 'bg-medical-error-500 w-1/4'
                                  : passwordStrength.score === 2
                                    ? 'bg-medical-warning-500 w-2/4'
                                    : passwordStrength.score === 3
                                      ? 'bg-medical-info-500 w-3/4'
                                      : 'bg-medical-success-500 w-full'
                              }`}
                            />
                          </div>
                          <span
                            className={`text-xs font-medium ${
                              passwordStrength.score === 1
                                ? 'text-medical-error-500'
                                : passwordStrength.score === 2
                                  ? 'text-medical-warning-500'
                                  : passwordStrength.score === 3
                                    ? 'text-medical-info-500'
                                    : 'text-medical-success-500'
                            }`}
                          >
                            {passwordStrength.label}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                    >
                      {t('confirmPassword')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="h-5 w-5 text-medical-secondary-500">🔒</span>
                      </div>
                      <input
                        {...register('confirmPassword', { required: t('confirmPasswordRequired') })}
                        type={showPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        className="block w-full pl-10 pr-10 py-4 border-2 border-medical-secondary-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-medical-secondary-50 to-medical-primary-50 dark:bg-gray-700 text-medical-text-primary dark:text-medical-text-primary-dark placeholder-medical-text-secondary dark:placeholder-medical-text-secondary-dark focus:outline-none focus:ring-2 focus:ring-medical-secondary-500 focus:border-medical-secondary-500 transition-all duration-200 font-medium"
                        placeholder={t('confirmPasswordPlaceholder')}
                        aria-label={t('confirmPassword')}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-purple-700 dark:hover:text-gray-300 transition-colors duration-200"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                      >
                        {showPassword ? (
                          <span className="h-5 w-5 text-medical-secondary-500">🙈</span>
                        ) : (
                          <span className="h-5 w-5 text-medical-secondary-500">👁️</span>
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-medium">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label
                      htmlFor="role"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                    >
                      选择角色 / Select Role
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="relative cursor-pointer">
                        <input
                          {...register('role')}
                          type="radio"
                          value="patient"
                          className="sr-only peer"
                        />
                        <div className="relative flex items-center p-4 border-2 border-medical-primary-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-medical-primary-50 to-medical-info-50 dark:bg-gray-700 hover:border-medical-primary-400 hover:shadow-md transition-all duration-300 peer-checked:border-medical-primary-600 peer-checked:bg-gradient-to-r peer-checked:from-medical-primary-100 peer-checked:to-medical-info-100 dark:peer-checked:from-medical-primary-900/40 dark:peer-checked:to-medical-info-900/40 peer-checked:shadow-lg peer-checked:scale-105 peer-checked:border-4">
                          {/* 选中状态指示器 */}
                          <div className="absolute top-2 right-2 opacity-0 peer-checked:opacity-100 transition-opacity duration-300">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-medical-primary-500 text-white rounded-full text-xs font-bold">
                              ✓
                            </span>
                          </div>
                          <span className="h-8 w-8 text-medical-primary-500 mr-3 peer-checked:text-medical-primary-600 peer-checked:scale-110 transition-all duration-300">
                            👤
                          </span>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white peer-checked:text-medical-primary-700 dark:peer-checked:text-medical-primary-300 transition-colors duration-300">
                              患者
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 peer-checked:text-medical-primary-600 dark:peer-checked:text-medical-primary-400 transition-colors duration-300">
                              Patient
                            </div>
                          </div>
                        </div>
                      </label>
                      <label className="relative cursor-pointer">
                        <input
                          {...register('role')}
                          type="radio"
                          value="doctor"
                          className="sr-only peer"
                        />
                        <div className="relative flex items-center p-4 border-2 border-medical-success-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-medical-success-50 to-medical-secondary-50 dark:bg-gray-700 hover:border-medical-success-400 hover:shadow-md transition-all duration-300 peer-checked:border-medical-success-600 peer-checked:bg-gradient-to-r peer-checked:from-medical-success-100 peer-checked:to-medical-secondary-100 dark:peer-checked:from-medical-success-900/40 dark:peer-checked:to-medical-secondary-900/40 peer-checked:shadow-lg peer-checked:scale-105 peer-checked:border-4">
                          {/* 选中状态指示器 */}
                          <div className="absolute top-2 right-2 opacity-0 peer-checked:opacity-100 transition-opacity duration-300">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-medical-success-500 text-white rounded-full text-xs font-bold">
                              ✓
                            </span>
                          </div>
                          <span className="h-8 w-8 text-medical-success-500 mr-3 peer-checked:text-medical-success-600 peer-checked:scale-110 transition-all duration-300">
                            🏥
                          </span>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white peer-checked:text-medical-success-700 dark:peer-checked:text-medical-success-300 transition-colors duration-300">
                              医生
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 peer-checked:text-medical-success-600 dark:peer-checked:text-medical-success-400 transition-colors duration-300">
                              Doctor
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                    {errors.role && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-medium">
                        {errors.role.message}
                      </p>
                    )}
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setRememberMe(!rememberMe)}
                        className="h-5 w-5 rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-medical-primary-500 transition-colors duration-200"
                        aria-label={t('rememberMe')}
                      >
                        {rememberMe ? (
                          <span className="h-5 w-5 text-medical-primary-500">☑️</span>
                        ) : (
                          <span className="h-5 w-5 text-gray-300 dark:text-gray-600">☐</span>
                        )}
                      </button>
                      <label
                        htmlFor="rememberMe"
                        className="ml-2 block text-sm text-gray-700 dark:text-gray-300 font-medium"
                      >
                        {t('rememberMe')}
                      </label>
                    </div>
                    <div className="text-sm">
                      <Link
                        to="/forgot-password"
                        className="font-bold text-medical-text-secondary dark:text-medical-text-secondary-dark hover:text-medical-primary-600 dark:hover:text-medical-primary-300 transition-colors duration-200"
                      >
                        {t('forgotPassword')}
                      </Link>
                    </div>
                  </div>

                  {formError && (
                    <div className="flex items-center gap-2 p-4 bg-medical-error-100 dark:bg-medical-error-900/30 rounded-xl border-2 border-medical-error-200 dark:border-medical-error-800 text-medical-error-700 dark:text-medical-error-300 font-medium">
                      <span className="h-5 w-5 flex-shrink-0">⚠️</span>
                      <p>{formError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center gap-2 py-4 px-6 border border-transparent text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-medical-primary-500 to-medical-secondary-600 hover:from-medical-primary-600 hover:to-medical-secondary-700 active:from-medical-primary-700 active:to-medical-secondary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-primary-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                    aria-label={t('register')}
                  >
                    {isLoading ? (
                      <>
                        <PulseLoader size={10} color="#ffffff" />
                        <span>{t('registering')}</span>
                      </>
                    ) : (
                      <>
                        <span className="h-5 w-5">🚪</span>
                        <span>{t('secureRegister')}</span>
                      </>
                    )}
                  </button>

                  {/* Login Link */}
                  <div className="text-center mt-6">
                    <span className="text-sm text-gray-700 dark:text-gray-400 font-medium mr-2">
                      {t('haveAccount')}
                    </span>
                    <Link
                      to="/login"
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-medical-primary-500 hover:bg-medical-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-primary-500 transition-colors duration-200 shadow-sm"
                    >
                      <span className="mr-2 h-4 w-4">🚪</span>
                      {t('login')}
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
