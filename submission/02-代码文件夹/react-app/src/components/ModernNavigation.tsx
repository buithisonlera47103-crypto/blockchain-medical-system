import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Upload,
  ArrowRightLeft,
  Search,
  History,
  Bell,
  Settings,
  MessageCircle,
  TrendingUp,
  User,
  LogOut,
  Moon,
  Sun,
  Globe,
  Menu,
  X,
  Shield,
  Heart,
  // Clock,
  // Activity,
  // Database
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { changeLanguage } from '../i18n/config';
import { cn } from '../lib/utils';
import { Permission, hasPermission } from '../utils/permissions';

import { ModernButton } from './ui/ModernButton';
import { ModernQuickSearch, SearchResult } from './ui/ModernQuickSearch';

const ModernNavigation: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications] = useState(3); // 示例通知数量
  // const setNotifications = useState(3)

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

  // 导航项配置
  const navItems = [
    {
      path: '/dashboard',
      label: t('nav.dashboard', '仪表板'),
      icon: Home,
      permission: null,
      gradient: 'from-blue-500 to-cyan-500',
      description: '主控面板',
    },
    {
      path: '/upload',
      label: t('nav.upload', '上传'),
      icon: Upload,
      permission: Permission.CREATE_RECORDS,
      gradient: 'from-green-500 to-emerald-500',
      description: '上传病历',
    },
    {
      path: '/transfer',
      label: t('nav.transfer', '转移'),
      icon: ArrowRightLeft,
      permission: Permission.TRANSFER_RECORDS,
      gradient: 'from-purple-500 to-violet-500',
      description: '病历转移',
    },
    {
      path: '/query',
      label: t('nav.query', '查询'),
      icon: Search,
      permission: Permission.VIEW_RECORDS,
      gradient: 'from-orange-500 to-amber-500',
      description: '病历查询',
    },
    {
      path: '/history',
      label: t('nav.history', '历史'),
      icon: History,
      permission: Permission.VIEW_HISTORY,
      gradient: 'from-indigo-500 to-blue-500',
      description: '操作历史',
    },
    {
      path: '/chat',
      label: t('nav.chat', '聊天'),
      icon: MessageCircle,
      permission: null,
      gradient: 'from-pink-500 to-rose-500',
      description: '实时聊天',
    },
    {
      path: '/performance',
      label: t('nav.performance', '性能'),
      icon: TrendingUp,
      permission: Permission.SYSTEM_ADMIN,
      gradient: 'from-teal-500 to-cyan-500',
      description: '性能监控',
    },
    {
      path: '/settings',
      label: t('nav.settings', '设置'),
      icon: Settings,
      permission: Permission.SYSTEM_ADMIN,
      gradient: 'from-gray-500 to-slate-500',
      description: '系统设置',
    },
  ];

  // 过滤用户有权限的导航项
  const filteredNavItems = navItems.filter(
    item => !item.permission || (user && hasPermission(user, item.permission))
  );

  // 搜索功能
  const handleSearch = async (query: string): Promise<SearchResult[]> => {
    // 这里实现实际的搜索逻辑
    // 示例数据
    const mockResults: SearchResult[] = [
      {
        id: '1',
        title: `病历 - ${query}`,
        description: '患者张三的医疗记录',
        category: 'record',
        url: '/records/1',
        metadata: '2024-01-15',
      },
      {
        id: '2',
        title: `患者 - ${query}`,
        description: '患者基本信息',
        category: 'patient',
        url: '/patients/1',
        metadata: 'ID: P001',
      },
    ];

    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockResults.filter(result => result.title.toLowerCase().includes(query.toLowerCase()));
  };

  const getRoleIcon = () => {
    if (!user) return Shield;
    switch (user.role) {
      case 'super_admin':
        return Shield;
      case 'hospital_admin':
        return Settings;
      case 'doctor':
        return Heart;
      case 'patient':
        return User;
      default:
        return User;
    }
  };

  const getRoleColor = () => {
    if (!user) return 'text-neutral-500';
    switch (user.role) {
      case 'super_admin':
        return 'text-red-500';
      case 'hospital_admin':
        return 'text-blue-500';
      case 'doctor':
        return 'text-green-500';
      case 'patient':
        return 'text-orange-500';
      default:
        return 'text-neutral-500';
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <motion.nav
      id="navigation"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-lg border-b border-neutral-200 dark:border-neutral-800'
          : 'bg-white dark:bg-neutral-900 shadow-sm'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo 和品牌 */}
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-medical-primary to-medical-secondary rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-200">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-medical-primary to-medical-secondary bg-clip-text text-transparent">
                  EMR区块链
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">电子病历管理系统</p>
              </div>
            </Link>
          </div>

          {/* 快速搜索 - 桌面版 */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <ModernQuickSearch
              onSearch={handleSearch}
              recentSearches={['病历查询', '患者管理']}
              className="w-full"
            />
          </div>

          {/* 右侧操作区 */}
          <div className="flex items-center space-x-2">
            {/* 通知 */}
            <div className="relative">
              <ModernButton
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => {
                  /* 处理通知点击 */
                }}
              >
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
                  >
                    {notifications > 9 ? '9+' : notifications}
                  </motion.span>
                )}
              </ModernButton>
            </div>

            {/* 主题切换 */}
            <ModernButton
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="transition-transform hover:scale-110"
            >
              <AnimatePresence mode="wait">
                {isDark ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </ModernButton>

            {/* 语言切换 */}
            <ModernButton
              variant="ghost"
              size="icon"
              onClick={toggleLanguage}
              className="transition-transform hover:scale-110"
            >
              <Globe className="h-5 w-5" />
            </ModernButton>

            {/* 用户菜单 */}
            <div className="hidden md:flex items-center space-x-3 px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800">
              <div className={cn('p-1 rounded-full', getRoleColor())}>
                {React.createElement(getRoleIcon(), { className: 'h-4 w-4' })}
              </div>
              <div className="text-sm">
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  {user?.username || '用户'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {user?.role === 'super_admin' && '超级管理员'}
                  {user?.role === 'hospital_admin' && '医院管理员'}
                  {user?.role === 'doctor' && '医生'}
                  {user?.role === 'patient' && '患者'}
                </p>
              </div>
            </div>

            {/* 登出按钮 */}
            <ModernButton
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-red-500 hover:text-red-600"
            >
              <LogOut className="h-5 w-5" />
            </ModernButton>

            {/* 移动端菜单按钮 */}
            <ModernButton
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </ModernButton>
          </div>
        </div>

        {/* 导航链接 - 桌面版 */}
        <div className="hidden md:flex items-center space-x-1 pb-2">
          {filteredNavItems.map(item => {
            // const Icon = item.icon
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'relative flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  active
                    ? 'text-medical-primary bg-medical-primary/10'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                )}
              >
                <span className="h-4 w-4 text-lg flex items-center justify-center">📱</span>
                <span>{item.label}</span>
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-medical-primary rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 移动端菜单 */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800"
          >
            <div className="px-4 py-4 space-y-2">
              {/* 移动端搜索 */}
              <div className="mb-4">
                <ModernQuickSearch
                  onSearch={handleSearch}
                  recentSearches={['病历查询', '患者管理']}
                  className="w-full"
                />
              </div>

              {/* 移动端导航链接 */}
              {filteredNavItems.map(item => {
                // const Icon = item.icon
                const active = isActive(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200',
                      active
                        ? 'bg-medical-primary text-white'
                        : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                    )}
                  >
                    <span className="h-5 w-5 text-xl flex items-center justify-center">📱</span>
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-75">{item.description}</div>
                    </div>
                  </Link>
                );
              })}

              {/* 移动端用户信息 */}
              <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center space-x-3 px-4 py-2">
                  <div className={cn('p-2 rounded-full', getRoleColor())}>
                    {React.createElement(getRoleIcon(), { className: 'h-5 w-5' })}
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {user?.username || '用户'}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {user?.role === 'super_admin' && '超级管理员'}
                      {user?.role === 'hospital_admin' && '医院管理员'}
                      {user?.role === 'doctor' && '医生'}
                      {user?.role === 'patient' && '患者'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default ModernNavigation;
