import { ChevronDownIcon, GlobeAltIcon, CheckIcon } from '@heroicons/react/24/outline';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  SUPPORTED_LANGUAGES,
  changeLanguage,
  getCurrentLanguageConfig,
  type SupportedLanguage,
} from '../../i18n/config';

interface LanguageSwitcherProps {
  compact?: boolean;
  showFlag?: boolean;
  showNativeName?: boolean;
  className?: string;
}

/**
 * 语言切换组件
 * 支持下拉菜单和紧凑模式显示
 */
export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  compact = false,
  showFlag = true,
  showNativeName = true,
  className = '',
}) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = getCurrentLanguageConfig();

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 语言切换处理
  const handleLanguageChange = async (languageCode: SupportedLanguage) => {
    if (languageCode === i18n.language) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    try {
      await changeLanguage(languageCode);

      // 显示切换成功消息
      const newLangConfig = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);
      if (newLangConfig) {
        // 可以在这里添加成功提示
        console.log(`Language changed to ${newLangConfig.nativeName}`);
      }
    } catch (error) {
      console.error('Failed to change language:', error);
      // 可以在这里添加错误提示
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  // 紧凑模式渲染
  if (compact) {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md transition-colors disabled:opacity-50"
          title={t('common.language')}
        >
          {showFlag && (
            <span className="text-base" role="img" aria-label={currentLanguage.nativeName}>
              {currentLanguage.flag}
            </span>
          )}
          <span className="text-xs font-medium">
            {currentLanguage.code.split('-')[0].toUpperCase()}
          </span>
          <ChevronDownIcon
            className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
            <div className="py-1" role="menu">
              {SUPPORTED_LANGUAGES.map(language => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`
                    flex items-center space-x-3 w-full px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors
                    ${language.code === i18n.language ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                  `}
                  role="menuitem"
                >
                  <span className="text-base" role="img" aria-label={language.nativeName}>
                    {language.flag}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">{language.nativeName}</div>
                    <div className="text-xs text-gray-500">{language.name}</div>
                  </div>
                  {language.code === i18n.language && (
                    <CheckIcon className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 完整模式渲染
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
      >
        <GlobeAltIcon className="h-4 w-4" />
        {showFlag && (
          <span className="text-base" role="img" aria-label={currentLanguage.nativeName}>
            {currentLanguage.flag}
          </span>
        )}
        <span>{showNativeName ? currentLanguage.nativeName : currentLanguage.name}</span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1" role="menu">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              {t('common.language')}
            </div>
            {SUPPORTED_LANGUAGES.map(language => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                disabled={isLoading}
                className={`
                  flex items-center space-x-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-50 transition-colors disabled:opacity-50
                  ${language.code === i18n.language ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-gray-700'}
                `}
                role="menuitem"
              >
                <span className="text-lg" role="img" aria-label={language.nativeName}>
                  {language.flag}
                </span>
                <div className="flex-1">
                  <div className="font-medium">{language.nativeName}</div>
                  <div className="text-xs text-gray-500">{language.name}</div>
                </div>
                {language.code === i18n.language && <CheckIcon className="h-5 w-5 text-blue-600" />}
              </button>
            ))}
          </div>

          {/* 语言设置提示 */}
          <div className="border-t border-gray-100 px-4 py-2">
            <p className="text-xs text-gray-500">
              {t('settings.language')} • {SUPPORTED_LANGUAGES.length}{' '}
              {t('common.language').toLowerCase()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 语言选择器组件 (用于设置页面)
 */
export const LanguageSelector: React.FC<{
  value: SupportedLanguage;
  onChange: (language: SupportedLanguage) => void;
  className?: string;
}> = ({ value, onChange, className = '' }) => {
  const { t } = useTranslation();

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">{t('settings.language')}</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SUPPORTED_LANGUAGES.map(language => (
          <button
            key={language.code}
            onClick={() => onChange(language.code)}
            className={`
              flex items-center space-x-3 p-3 text-left rounded-lg border-2 transition-all
              ${
                value === language.code
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <span className="text-xl" role="img" aria-label={language.nativeName}>
              {language.flag}
            </span>
            <div className="flex-1">
              <div className="font-medium">{language.nativeName}</div>
              <div className="text-sm text-gray-500">{language.name}</div>
            </div>
            {value === language.code && <CheckIcon className="h-5 w-5 text-blue-600" />}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * 内联语言切换组件 (用于导航栏)
 */
export const InlineLanguageSwitcher: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const currentLanguage = getCurrentLanguageConfig();
  const otherLanguages = SUPPORTED_LANGUAGES.filter(lang => lang.code !== i18n.language).slice(
    0,
    2
  );

  const handleQuickSwitch = async (languageCode: SupportedLanguage) => {
    setIsLoading(true);
    try {
      await changeLanguage(languageCode);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <span
        className="text-sm font-medium text-gray-700 px-2 py-1 rounded"
        title={currentLanguage.nativeName}
      >
        {currentLanguage.flag} {currentLanguage.code.split('-')[0].toUpperCase()}
      </span>
      <span className="text-gray-400">|</span>
      {otherLanguages.map(language => (
        <button
          key={language.code}
          onClick={() => handleQuickSwitch(language.code)}
          disabled={isLoading}
          className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
          title={language.nativeName}
        >
          {language.flag} {language.code.split('-')[0].toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
