import React, { createContext, useContext, useEffect, useState } from 'react';

import { useUserPreferences, useScreenReader, useLiveRegion } from '../../hooks/useAccessibility';
import { AccessibilityTester } from '../../utils/accessibility';

interface AccessibilityContextType {
  preferences: {
    reducedMotion: boolean;
    highContrast: boolean;
    darkMode: boolean;
  };
  isScreenReaderActive: boolean | null;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  runAccessibilityAudit: () => {
    issues: string[];
    warnings: string[];
    passed: string[];
  };
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

interface AccessibilityProviderProps {
  children: React.ReactNode;
  enableAudit?: boolean;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
  children,
  enableAudit = process.env.NODE_ENV === 'development',
}) => {
  const preferences = useUserPreferences();
  const isScreenReaderActive = useScreenReader();
  const { announce } = useLiveRegion();

  // 设置CSS变量来响应用户偏好
  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty('--prefers-reduced-motion', preferences.reducedMotion ? '1' : '0');
    root.style.setProperty('--prefers-high-contrast', preferences.highContrast ? '1' : '0');

    // 添加CSS类来帮助样式处理
    document.body.classList.toggle('reduce-motion', preferences.reducedMotion);
    document.body.classList.toggle('high-contrast', preferences.highContrast);
    document.body.classList.toggle('screen-reader-active', isScreenReaderActive === true);
  }, [preferences, isScreenReaderActive]);

  // 开发环境下的可访问性审计
  useEffect(() => {
    if (enableAudit && process.env.NODE_ENV === 'development') {
      const timer = setTimeout(() => {
        const audit = AccessibilityTester.auditPage();

        if (audit.issues.length > 0) {
          console.group('🚨 可访问性问题');
          audit.issues.forEach(issue => console.error('❌', issue));
          console.groupEnd();
        }

        if (audit.warnings.length > 0) {
          console.group('⚠️ 可访问性警告');
          audit.warnings.forEach(warning => console.warn('⚠️', warning));
          console.groupEnd();
        }

        if (audit.passed.length > 0) {
          console.group('✅ 可访问性通过项');
          audit.passed.forEach(passed => console.log('✅', passed));
          console.groupEnd();
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [enableAudit]);

  const runAccessibilityAudit = () => {
    return AccessibilityTester.auditPage();
  };

  const contextValue: AccessibilityContextType = {
    preferences,
    isScreenReaderActive,
    announce,
    runAccessibilityAudit,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>{children}</AccessibilityContext.Provider>
  );
};

// 跳转链接组件
export interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ href, children, className = '' }) => {
  return (
    <a
      href={href}
      className={`
        sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 
        bg-blue-600 text-white px-4 py-2 z-50 font-medium
        focus:z-50 transition-all duration-200
        ${className}
      `}
      onClick={e => {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
          if (target instanceof HTMLElement) {
            target.focus();
          }
        }
      }}
    >
      {children}
    </a>
  );
};

// 屏幕阅读器专用内容组件
export interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}

export const ScreenReaderOnly: React.FC<ScreenReaderOnlyProps> = ({
  children,
  as: Component = 'span',
  className = '',
}) => {
  return <Component className={`sr-only ${className}`}>{children}</Component>;
};

// 可访问的图标组件
export interface AccessibleIconProps {
  icon: React.ReactNode;
  label: string;
  decorative?: boolean;
  className?: string;
}

export const AccessibleIcon: React.FC<AccessibleIconProps> = ({
  icon,
  label,
  decorative = false,
  className = '',
}) => {
  if (decorative) {
    return (
      <span aria-hidden="true" className={className}>
        {icon}
      </span>
    );
  }

  return (
    <span role="img" aria-label={label} className={className}>
      {icon}
      <ScreenReaderOnly>{label}</ScreenReaderOnly>
    </span>
  );
};

// 可访问的分隔符组件
export interface AccessibleDividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  label?: string;
}

export const AccessibleDivider: React.FC<AccessibleDividerProps> = ({
  orientation = 'horizontal',
  className = '',
  label,
}) => {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      className={`
        ${orientation === 'horizontal' ? 'w-full h-px' : 'h-full w-px'}
        bg-neutral-300 dark:bg-neutral-600
        ${className}
      `}
    />
  );
};

// 可访问性状态指示器
export interface AccessibilityIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const AccessibilityIndicator: React.FC<AccessibilityIndicatorProps> = ({
  className = '',
  showDetails = false,
}) => {
  const { preferences, isScreenReaderActive, runAccessibilityAudit } = useAccessibility();
  const [auditResults, setAuditResults] = useState<ReturnType<typeof runAccessibilityAudit> | null>(
    null
  );

  const handleAudit = () => {
    const results = runAccessibilityAudit();
    setAuditResults(results);
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-2 text-xs ${className}`}>
        {preferences.reducedMotion && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">减少动画</span>
        )}
        {preferences.highContrast && (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full">高对比度</span>
        )}
        {isScreenReaderActive && (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">屏幕阅读器</span>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg ${className}`}>
      <h3 className="font-semibold mb-3">可访问性状态</h3>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span>减少动画:</span>
          <span className={preferences.reducedMotion ? 'text-green-600' : 'text-gray-500'}>
            {preferences.reducedMotion ? '已启用' : '未启用'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span>高对比度:</span>
          <span className={preferences.highContrast ? 'text-green-600' : 'text-gray-500'}>
            {preferences.highContrast ? '已启用' : '未启用'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span>暗色模式:</span>
          <span className={preferences.darkMode ? 'text-green-600' : 'text-gray-500'}>
            {preferences.darkMode ? '已启用' : '未启用'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span>屏幕阅读器:</span>
          <span className={isScreenReaderActive ? 'text-green-600' : 'text-gray-500'}>
            {isScreenReaderActive === null
              ? '检测中...'
              : isScreenReaderActive
                ? '已检测到'
                : '未检测到'}
          </span>
        </div>
      </div>

      <button
        onClick={handleAudit}
        className="mt-4 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
      >
        运行可访问性审计
      </button>

      {auditResults && (
        <div className="mt-4 space-y-2">
          {auditResults.issues.length > 0 && (
            <div>
              <h4 className="font-medium text-red-600">问题 ({auditResults.issues.length})</h4>
              <ul className="text-xs text-red-600 ml-4 list-disc">
                {auditResults.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {auditResults.warnings.length > 0 && (
            <div>
              <h4 className="font-medium text-yellow-600">警告 ({auditResults.warnings.length})</h4>
              <ul className="text-xs text-yellow-600 ml-4 list-disc">
                {auditResults.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {auditResults.passed.length > 0 && (
            <div>
              <h4 className="font-medium text-green-600">通过 ({auditResults.passed.length})</h4>
              <ul className="text-xs text-green-600 ml-4 list-disc">
                {auditResults.passed.slice(0, 3).map((passed, index) => (
                  <li key={index}>{passed}</li>
                ))}
                {auditResults.passed.length > 3 && (
                  <li>...和其他 {auditResults.passed.length - 3} 项</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
