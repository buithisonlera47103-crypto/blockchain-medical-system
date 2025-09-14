import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type NavigationMode = 'fixed-top' | 'sidebar' | 'tabs';

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  description?: string;
}

interface EnhancedNavigationProps {
  mode?: NavigationMode;
  onModeChange?: (mode: NavigationMode) => void;
}

const EnhancedNavigation: React.FC<EnhancedNavigationProps> = ({
  mode = 'fixed-top',
  onModeChange,
}) => {
  // const { t } = useTranslation(); // 暂时不使用国际化
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  const navigationItems: NavigationItem[] = [
    {
      id: 'overview',
      label: '核心功能概述',
      href: '#overview',
      icon: '🏠',
      description: '平台核心功能与优势',
    },
    {
      id: 'architecture',
      label: '技术架构',
      href: '#architecture',
      icon: '🏗️',
      description: '系统架构与技术栈',
    },
    {
      id: 'features',
      label: '特性说明',
      href: '#features',
      icon: '⚡',
      description: '性能、兼容性、扩展性',
    },
    {
      id: 'use-cases',
      label: '应用场景',
      href: '#use-cases',
      icon: '🎯',
      description: '实际应用案例展示',
    },
    {
      id: 'demo',
      label: '在线演示',
      href: '#demo',
      icon: '🚀',
      description: '交互式功能演示',
    },
    {
      id: 'about',
      label: '关于我们',
      href: '#about',
      icon: '👥',
      description: '团队介绍与企业愿景',
    },
  ];

  const sectionToPath = useMemo(
    () => ({
      overview: '/',
      architecture: '/architecture',
      features: '/features',
      'use-cases': '/use-cases',
      demo: '/demo',
      about: '/about',
    }),
    []
  );

  useEffect(() => {
    // 根据当前路由设置激活项
    const path = location.pathname;
    const matched = Object.entries(sectionToPath).find(([, p]) => p === path);
    if (matched) {
      setActiveSection(matched[0]);
    } else {
      setActiveSection('overview');
    }
  }, [location.pathname, sectionToPath]);

  const goToSection = (sectionId: string) => {
    if (sectionId in sectionToPath) {
      navigate(sectionToPath[sectionId as keyof typeof sectionToPath]);
      setIsOpen(false);
      return;
    }
    // 兜底：如果没有路由映射，尝试站内滚动（如 demo）
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
      setIsOpen(false);
    }
  };

  // 固定顶部导航模式
  const FixedTopNavigation = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-r from-medical-primary to-medical-accent rounded-lg mr-3 shadow-lg">
                <span className="h-6 w-6 text-white">🏥</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">MedChain</span>
            </div>
            <div className="hidden md:flex space-x-1">
              {navigationItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => goToSection(item.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                    activeSection === item.id
                      ? 'bg-medical-primary text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-medical-primary/10 hover:text-medical-primary'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex space-x-2">
              <button
                onClick={() => onModeChange?.('sidebar')}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="侧边栏模式"
              >
                📋
              </button>
              <button
                onClick={() => onModeChange?.('tabs')}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="标签页模式"
              >
                📑
              </button>
            </div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {isOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
        {/* 移动端菜单 */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
            {navigationItems.map(item => (
              <button
                key={item.id}
                onClick={() => goToSection(item.id)}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 flex items-center space-x-3 mb-2 ${
                  activeSection === item.id
                    ? 'bg-medical-primary text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-medical-primary/10 hover:text-medical-primary'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div>{item.label}</div>
                  <div className="text-xs opacity-70">{item.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );

  // 侧边栏导航模式
  const SidebarNavigation = () => (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors mr-4"
              >
                ☰
              </button>
              <div className="flex items-center">
                <div className="p-2 bg-gradient-to-r from-medical-primary to-medical-accent rounded-lg mr-3 shadow-lg">
                  <span className="h-6 w-6 text-white">🏥</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">MedChain</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onModeChange?.('fixed-top')}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="顶部固定模式"
              >
                📌
              </button>
              <button
                onClick={() => onModeChange?.('tabs')}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="标签页模式"
              >
                📑
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 侧边栏 */}
      <div
        className={`fixed top-16 left-0 h-full w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-r border-gray-200/50 dark:border-gray-700/50 shadow-xl transform transition-transform duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">导航菜单</h3>
          <div className="space-y-2">
            {navigationItems.map(item => (
              <button
                key={item.id}
                onClick={() => goToSection(item.id)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-300 group ${
                  activeSection === item.id
                    ? 'bg-gradient-to-r from-medical-primary to-medical-accent text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-medical-primary/10 hover:text-medical-primary'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </span>
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-sm opacity-70 mt-1">{item.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 top-16"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );

  // 标签页导航模式
  const TabsNavigation = () => (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="p-2 bg-gradient-to-r from-medical-primary to-medical-accent rounded-lg mr-3 shadow-lg">
              <span className="h-6 w-6 text-white">🏥</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">MedChain</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onModeChange?.('fixed-top')}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="顶部固定模式"
            >
              📌
            </button>
            <button
              onClick={() => onModeChange?.('sidebar')}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="侧边栏模式"
            >
              📋
            </button>
          </div>
        </div>
        <div className="flex space-x-1 overflow-x-auto pb-2">
          {navigationItems.map(item => (
            <button
              key={item.id}
              onClick={() => goToSection(item.id)}
              className={`flex-shrink-0 px-6 py-3 rounded-t-lg text-sm font-medium transition-all duration-300 flex items-center space-x-2 border-b-2 ${
                activeSection === item.id
                  ? 'bg-medical-primary/10 text-medical-primary border-medical-primary'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent hover:border-medical-primary/50'
              }`}
            >
              <span>{item.icon}</span>
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (mode === 'sidebar') return <SidebarNavigation />;
  if (mode === 'tabs') return <TabsNavigation />;
  return <FixedTopNavigation />;
};

export default EnhancedNavigation;
