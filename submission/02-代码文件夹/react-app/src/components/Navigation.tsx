import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { changeLanguage } from '../i18n/config';
import { Permission, hasPermission } from '../utils/permissions';

const Navigation: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh-CN' ? 'en-US' : 'zh-CN';
    changeLanguage(newLang);
  };

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  // 定义所有导航项及其权限要求
  const allNavItems = [
    {
      path: '/dashboard',
      label: t('nav.dashboard'),
      icon: '🏠',
      permission: null,
      color: 'from-blue-500 to-cyan-500',
      description: '主控面板',
    },
    {
      path: '/upload',
      label: t('nav.upload'),
      icon: '☁️⬆️',
      permission: Permission.CREATE_RECORDS,
      color: 'from-green-500 to-emerald-500',
      description: '上传数据',
    },
    {
      path: '/transfer',
      label: t('nav.transfer'),
      icon: '🔄',
      permission: Permission.TRANSFER_RECORDS,
      color: 'from-purple-500 to-violet-500',
      description: '数据传输',
    },
    {
      path: '/query',
      label: t('nav.query'),
      icon: '🔍',
      permission: Permission.VIEW_RECORDS,
      color: 'from-orange-500 to-amber-500',
      description: '数据查询',
    },
    {
      path: '/search',
      label: t('nav.search', '高级搜索'),
      icon: '🔍➕',
      permission: Permission.VIEW_RECORDS,
      color: 'from-red-500 to-pink-500',
      description: '高级搜索',
    },
    {
      path: '/history',
      label: t('nav.history'),
      icon: '🕐',
      permission: Permission.VIEW_HISTORY,
      color: 'from-indigo-500 to-blue-500',
      description: '历史记录',
    },
    {
      path: '/profile',
      label: t('nav.profile'),
      icon: '👤',
      permission: null,
      color: 'from-teal-500 to-cyan-500',
      description: '个人资料',
    },
    {
      path: '/chat',
      label: t('nav.chat', '聊天'),
      icon: '💬',
      permission: null,
      color: 'from-pink-500 to-rose-500',
      description: '智能聊天',
    },
    {
      path: '/notifications',
      label: t('nav.notifications'),
      icon: '🔔',
      permission: Permission.MANAGE_NOTIFICATIONS,
      color: 'from-yellow-500 to-orange-500',
      description: '通知中心',
    },
    {
      path: '/performance',
      label: t('nav.performance', '性能监控'),
      icon: '📈',
      permission: Permission.SYSTEM_ADMIN,
      color: 'from-emerald-500 to-teal-500',
      description: '性能监控',
    },
    {
      path: '/settings',
      label: t('nav.settings'),
      icon: '⚙️',
      permission: Permission.SYSTEM_ADMIN,
      color: 'from-gray-500 to-slate-500',
      description: '系统设置',
    },
  ];

  // 根据用户权限过滤导航项
  const navItems = allNavItems.filter(item => {
    if (!item.permission) {
      return true; // 无权限要求的项目对所有用户可见
    }
    return hasPermission(user, item.permission);
  });

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-2xl border-b border-gray-200/30 dark:border-gray-700/30'
          : 'bg-gradient-to-r from-slate-50/90 via-white/90 to-slate-50/90 dark:from-gray-900/90 dark:via-gray-800/90 dark:to-gray-900/90 backdrop-blur-lg shadow-lg'
      }`}
    >
      {/* Modern gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 hover:opacity-100 transition-opacity duration-700"></div>

      <div className="relative max-w-7xl mx-auto">
        <div className="flex justify-between items-center h-16 px-1 lg:px-2">
          {/* Logo and Brand */}
          <div className="flex items-center flex-shrink-0">
            <Link
              to="/dashboard"
              className="group flex items-center space-x-4 transform hover:scale-105 transition-all duration-300"
            >
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition-all duration-500"></div>
                <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-all duration-500">
                  <span className="text-white text-lg">🛡️</span>
                </div>
              </div>
              <div className="hidden sm:block">
                <div
                  className={`text-xl font-black tracking-tight transition-all duration-300 ${
                    scrolled ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-white'
                  }`}
                >
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    MedChain
                  </span>
                </div>
                <div
                  className={`text-xs font-medium flex items-center space-x-1 transition-colors duration-300 ${
                    scrolled
                      ? 'text-gray-500 dark:text-gray-400'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <span className="text-red-500 animate-pulse text-xs">❤️</span>
                  <span>智慧医疗 · 安全可信</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1 flex-1 justify-center">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group relative flex flex-col items-center justify-center px-3 py-2 rounded-xl text-xs font-medium transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 min-w-[75px] ${
                    isActive
                      ? `bg-gradient-to-r ${item.color} text-white shadow-lg shadow-blue-500/20`
                      : scrolled
                        ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:shadow-md'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-md backdrop-blur-sm'
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  title={item.description}
                >
                  {/* Glow effect for active item */}
                  {isActive && (
                    <div
                      className={`absolute -inset-0.5 bg-gradient-to-r ${item.color} rounded-xl blur-md opacity-25 group-hover:opacity-40 transition-opacity duration-300`}
                    ></div>
                  )}

                  <div className="relative flex flex-col items-center space-y-1">
                    <span
                      className={`text-lg transition-all duration-300 ${
                        isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span
                      className={`text-xs font-medium transition-all duration-300 leading-tight ${
                        isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>

                  {/* Subtle hover effect */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side controls */}
          <div className="flex items-center space-x-1 flex-shrink-0 ml-auto">
            {/* Control buttons */}
            <div className="hidden md:flex items-center space-x-1">
              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className={`group relative flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 min-w-[60px] ${
                  scrolled
                    ? 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:text-blue-600 backdrop-blur-sm'
                } shadow-md hover:shadow-lg`}
                title={t('common.language')}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex flex-col items-center space-y-1">
                  <span className="text-lg">🌐</span>
                  <span className="text-xs font-medium leading-tight">
                    {i18n.language === 'zh-CN' ? '中文' : 'EN'}
                  </span>
                </div>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`group relative flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 min-w-[60px] ${
                  scrolled
                    ? 'text-gray-600 dark:text-gray-400 hover:bg-yellow-50 dark:hover:bg-gray-800 hover:text-yellow-600 dark:hover:text-yellow-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:text-yellow-600 backdrop-blur-sm'
                } shadow-md hover:shadow-lg`}
                title={isDark ? t('common.lightMode') : t('common.darkMode')}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex flex-col items-center space-y-1">
                  {isDark ? (
                    <span className="text-lg animate-spin-slow">☀️</span>
                  ) : (
                    <span className="text-lg">🌙</span>
                  )}
                  <span className="text-xs font-medium leading-tight">
                    {isDark ? '浅色' : '深色'}
                  </span>
                </div>
              </button>
            </div>

            {/* User Menu */}
            <div className="hidden lg:flex items-center space-x-1">
              {/* User Avatar */}
              <div
                className={`group relative flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-300 shadow-md cursor-pointer min-w-[65px] ${
                  scrolled
                    ? 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    : 'bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700/90 backdrop-blur-sm text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">👤</span>
                  </div>
                  <span className="text-xs font-medium truncate max-w-[50px] leading-tight">
                    {user?.username || '用户'}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className={`group relative flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 min-w-[60px] ${
                  scrolled
                    ? 'text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-red-50/80 dark:hover:bg-red-900/20 hover:text-red-600 backdrop-blur-sm'
                } shadow-md hover:shadow-lg`}
                title={t('nav.logout')}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex flex-col items-center space-y-1">
                  <span className="text-lg">🚪⬅️</span>
                  <span className="text-xs font-medium leading-tight">退出</span>
                </div>
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`lg:hidden relative flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 min-w-[60px] ${
                scrolled
                  ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-white/80 dark:hover:bg-gray-800/80 backdrop-blur-sm'
              } shadow-md hover:shadow-lg`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex flex-col items-center space-y-1">
                {isMobileMenuOpen ? (
                  <span className="text-lg transform rotate-180 transition-transform duration-300">
                    ❌
                  </span>
                ) : (
                  <span className="text-lg transition-transform duration-300">☰</span>
                )}
                <span className="text-xs font-medium leading-tight">菜单</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/30 dark:border-gray-700/30 shadow-2xl">
          <div className="px-6 pt-6 pb-8 space-y-3">
            {/* Mobile control buttons */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              <button
                onClick={toggleLanguage}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300"
              >
                <span className="text-sm">🌐</span>
                <span className="text-sm font-medium">
                  {i18n.language === 'zh-CN' ? '中文' : 'English'}
                </span>
              </button>
              <button
                onClick={toggleTheme}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:text-yellow-600 dark:hover:text-yellow-400 transition-all duration-300"
              >
                {isDark ? <span className="text-sm">☀️</span> : <span className="text-sm">🌙</span>}
                <span className="text-sm font-medium">{isDark ? '浅色' : '深色'}</span>
              </button>
            </div>

            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`group relative flex items-center space-x-4 px-5 py-4 rounded-2xl text-base font-semibold transition-all duration-300 transform hover:scale-[1.02] ${
                    isActive
                      ? `bg-gradient-to-r ${item.color} text-white shadow-xl`
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:shadow-lg'
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Glow effect for active item */}
                  {isActive && (
                    <div
                      className={`absolute -inset-1 bg-gradient-to-r ${item.color} rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300`}
                    ></div>
                  )}

                  <div className="relative flex items-center space-x-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        isActive
                          ? 'bg-white/20 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                    </div>
                    <div>
                      <div className="font-semibold">{item.label}</div>
                      <div
                        className={`text-xs ${
                          isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>

                  {/* Subtle hover effect */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  )}
                </Link>
              );
            })}

            {/* Mobile User Info and Logout */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6 space-y-4">
              <div className="flex items-center space-x-4 px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">👤</span>
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-900 dark:text-white">
                    {user?.username}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>在线状态</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="group relative flex items-center space-x-4 w-full px-5 py-4 rounded-2xl text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 transform hover:scale-[1.02]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 flex items-center justify-center transition-all duration-300">
                    <span className="text-lg">🚪⬅️</span>
                  </div>
                  <span>{t('nav.logout')}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
