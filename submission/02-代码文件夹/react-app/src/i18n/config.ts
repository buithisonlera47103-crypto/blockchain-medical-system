import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// 导入翻译文件
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

// 支持的语言列表
export const SUPPORTED_LANGUAGES = [
  {
    code: 'zh-CN',
    name: '简体中文',
    nativeName: '简体中文',
    flag: '🇨🇳',
    rtl: false,
  },
  {
    code: 'en-US',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    rtl: false,
  },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

// 默认语言
export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh-CN';

// 语言资源
const resources = {
  'zh-CN': {
    translation: zhCN,
    common: zhCN.common,
    auth: zhCN.auth,
    dashboard: (zhCN as any).dashboard || {},
    records: (zhCN as any).records || {},
    users: (zhCN as any).users || {},
    settings: (zhCN as any).settings || {},
    errors: (zhCN as any).errors || {},
  },
  'en-US': {
    translation: enUS,
    common: enUS.common,
    auth: enUS.auth,
    dashboard: (enUS as any).dashboard || {},
    records: (enUS as any).records || {},
    users: (enUS as any).users || {},
    settings: (enUS as any).settings || {},
    errors: (enUS as any).errors || {},
  },
};

// 语言检测选项
const detectionOptions = {
  // 检测顺序
  order: ['localStorage', 'sessionStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],

  // 缓存选项
  caches: ['localStorage', 'sessionStorage'],

  // 从path检测语言的配置
  lookupFromPathIndex: 0,
  lookupFromSubdomainIndex: 0,

  // 检查白名单
  checkWhitelist: true,

  // 本地存储键名
  lookupLocalStorage: 'emr-language',
  lookupSessionStorage: 'emr-language',
};

// i18n配置
i18n
  .use(LanguageDetector) // 自动检测用户语言
  .use(initReactI18next) // 绑定React
  .init({
    // 语言资源
    resources,

    // 默认语言
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,

    // 支持的语言列表
    supportedLngs: SUPPORTED_LANGUAGES.map(lang => lang.code),

    // 语言检测配置
    detection: detectionOptions,

    // 命名空间
    defaultNS: 'translation',
    ns: ['translation', 'common', 'auth', 'dashboard', 'records', 'users', 'settings', 'errors'],

    // 调试模式 (仅开发环境)
    debug: process.env.NODE_ENV === 'development',

    // 插值配置
    interpolation: {
      escapeValue: false, // React已经处理了XSS防护
      format: function (value: any, format: any, lng: any) {
        // 自定义格式化函数
        if (format === 'uppercase') return value.toUpperCase();
        if (format === 'lowercase') return value.toLowerCase();
        if (format === 'capitalize') return value.charAt(0).toUpperCase() + value.slice(1);

        // 数字格式化
        if (format === 'number') {
          return new Intl.NumberFormat(lng).format(value);
        }

        // 货币格式化
        if (format && format.startsWith('currency')) {
          const currency = format.split(':')[1] || 'CNY';
          return new Intl.NumberFormat(lng, {
            style: 'currency',
            currency: currency,
          }).format(value);
        }

        // 日期格式化
        if (format === 'date') {
          return new Intl.DateTimeFormat(lng).format(new Date(value));
        }

        if (format === 'datetime') {
          return new Intl.DateTimeFormat(lng, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(value));
        }

        // 相对时间格式化
        if (format === 'relative') {
          const rtf = new Intl.RelativeTimeFormat(lng, { numeric: 'auto' });
          const now = new Date();
          const target = new Date(value);
          const diffInMs = target.getTime() - now.getTime();
          const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

          if (Math.abs(diffInDays) < 1) {
            const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
            return rtf.format(diffInHours, 'hour');
          }

          return rtf.format(diffInDays, 'day');
        }

        return value;
      },
    },

    // 复数规则
    pluralSeparator: '_',
    contextSeparator: '_',

    // React配置
    react: {
      // 禁用Suspense，使用同步加载
      useSuspense: false,

      // 绑定事件
      bindI18n: 'languageChanged',
      bindI18nStore: '',

      // 处理默认值
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em', 'span'],

      // 使用键作为默认值
      unescape: true,
    },

    // 缺失翻译处理
    saveMissing: process.env.NODE_ENV === 'development',
    missingKeyHandler: (lng: any, ns: any, key: any, fallbackValue: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Missing translation: ${lng}.${ns}.${key}`);
      }
    },

    // 键分隔符
    keySeparator: '.',
    nsSeparator: ':',

    // 后处理器
    postProcess: ['interval', 'plural'],
  } as any);

// 语言切换函数
export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  await i18n.changeLanguage(language);

  // 更新HTML lang属性
  document.documentElement.lang = language;

  // 更新HTML dir属性 (RTL支持)
  const langConfig = SUPPORTED_LANGUAGES.find(lang => lang.code === language);
  document.documentElement.dir = langConfig?.rtl ? 'rtl' : 'ltr';

  // 保存到本地存储
  localStorage.setItem('emr-language', language);

  // 触发自定义事件
  window.dispatchEvent(
    new CustomEvent('languageChanged', {
      detail: { language, config: langConfig },
    })
  );
};

// 获取当前语言配置
export const getCurrentLanguageConfig = () => {
  const currentLang = i18n.language as SupportedLanguage;
  return SUPPORTED_LANGUAGES.find(lang => lang.code === currentLang) || SUPPORTED_LANGUAGES[0];
};

// 获取浏览器首选语言
export const getBrowserLanguage = (): SupportedLanguage => {
  const browserLang = navigator.language || navigator.languages?.[0] || DEFAULT_LANGUAGE;

  // 精确匹配
  const exactMatch = SUPPORTED_LANGUAGES.find(lang => lang.code === browserLang);
  if (exactMatch) return exactMatch.code;

  // 语言前缀匹配
  const langPrefix = browserLang.split('-')[0];
  const prefixMatch = SUPPORTED_LANGUAGES.find(lang => lang.code.startsWith(langPrefix));
  if (prefixMatch) return prefixMatch.code;

  return DEFAULT_LANGUAGE;
};

// 初始化语言设置
export const initializeLanguage = (): void => {
  const savedLanguage = localStorage.getItem('emr-language') as SupportedLanguage;
  const browserLanguage = getBrowserLanguage();
  const initialLanguage = savedLanguage || browserLanguage;

  if (SUPPORTED_LANGUAGES.some(lang => lang.code === initialLanguage)) {
    changeLanguage(initialLanguage);
  } else {
    changeLanguage(DEFAULT_LANGUAGE);
  }
};

// 导出i18n实例
export default i18n;
