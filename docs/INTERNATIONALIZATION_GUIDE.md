# 国际化使用指南 (Internationalization Guide)

## 概述 (Overview)

本项目已实现完整的国际化(i18n)支持，支持多语言界面和本地化功能。目前支持的语言包括：

- 中文简体 (zh-CN)
- 英语 (en-US)
- 日语 (ja-JP)

## 技术架构 (Technical Architecture)

### 核心技术栈

- **i18next**: 主要的国际化框架
- **react-i18next**: React集成库
- **i18next-browser-languagedetector**: 语言检测插件

### 文件结构

```
react-app/src/i18n/
├── config.ts                 # i18n配置文件
├── locales/
│   ├── zh-CN.json           # 中文翻译
│   ├── en-US.json           # 英文翻译
│   └── ja-JP.json           # 日文翻译
└── components/
    └── LanguageSwitcher/    # 语言切换组件
```

## 使用方法 (Usage)

### 1. 在组件中使用翻译

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('common.title')}</h1>
      <p>{t('common.description')}</p>
    </div>
  );
};
```

### 2. 带参数的翻译

```tsx
// 翻译文件中: "welcome": "欢迎 {{name}}!"
const message = t('welcome', { name: 'John' });
```

### 3. 复数形式

```tsx
// 翻译文件中: "items": "{{count}} 个项目"
const itemCount = t('items', { count: 5 });
```

### 4. 嵌套翻译键

```tsx
// 支持深层嵌套访问
const loginTitle = t('auth.login.title');
const errorMessage = t('errors.validation.required');
```

## 语言切换 (Language Switching)

### 自动语言检测

系统会自动检测用户的浏览器语言并设置为默认语言。检测优先级：

1. localStorage中保存的语言偏好
2. 浏览器语言设置
3. 默认语言(zh-CN)

### 手动切换语言

使用`LanguageSwitcher`组件提供语言切换功能：

```tsx
import LanguageSwitcher from './components/LanguageSwitcher/LanguageSwitcher';

// 在应用中使用
<LanguageSwitcher />;
```

## 翻译文件结构 (Translation File Structure)

### 标准分类

```json
{
  "common": {
    "loading": "加载中...",
    "save": "保存",
    "cancel": "取消"
  },
  "auth": {
    "login": {
      "title": "登录",
      "subtitle": "欢迎回来"
    }
  },
  "navigation": {
    "dashboard": "仪表板",
    "profile": "个人资料"
  }
}
```

### 命名规范

- 使用小驼峰命名法
- 按功能模块分组
- 保持键名简洁明了
- 避免深层嵌套(建议不超过3层)

## 添加新语言 (Adding New Languages)

### 1. 创建翻译文件

在`src/i18n/locales/`目录下创建新的语言文件，如`fr-FR.json`

### 2. 更新配置

在`src/i18n/config.ts`中添加新语言：

```typescript
const resources = {
  'zh-CN': { translation: zhCN },
  'en-US': { translation: enUS },
  'ja-JP': { translation: jaJP },
  'fr-FR': { translation: frFR }, // 新添加
};
```

### 3. 更新语言切换器

在`LanguageSwitcher`组件中添加新语言选项：

```tsx
const languages = [
  { code: 'zh-CN', name: '中文' },
  { code: 'en-US', name: 'English' },
  { code: 'ja-JP', name: '日本語' },
  { code: 'fr-FR', name: 'Français' }, // 新添加
];
```

## 最佳实践 (Best Practices)

### 1. 翻译键设计

- **模块化**: 按功能模块组织翻译键
- **一致性**: 保持命名风格统一
- **简洁性**: 避免过长的键名
- **语义化**: 键名应表达含义而非位置

### 2. 翻译内容

- **准确性**: 确保翻译准确无误
- **一致性**: 术语翻译保持一致
- **本地化**: 考虑文化差异和习惯用法
- **长度适配**: 考虑不同语言的文本长度差异

### 3. 代码规范

- 统一使用`useTranslation` Hook
- 避免硬编码文本
- 及时更新翻译文件
- 为动态内容提供翻译支持

## 测试 (Testing)

### 语言切换测试

1. 验证语言切换功能正常
2. 检查翻译文件完整性
3. 确认界面布局适配
4. 测试浏览器语言检测

### 翻译质量检查

1. 翻译准确性验证
2. 术语一致性检查
3. 文本长度适配测试
4. 特殊字符显示测试

## 性能优化 (Performance Optimization)

### 1. 懒加载

目前采用静态导入，可考虑实现动态加载：

```typescript
// 动态加载翻译文件
const loadTranslation = async (language: string) => {
  const translation = await import(`./locales/${language}.json`);
  return translation.default;
};
```

### 2. 缓存策略

- 翻译文件自动缓存在localStorage
- 支持版本控制和增量更新
- 实现翻译内容预加载

## 故障排除 (Troubleshooting)

### 常见问题

1. **翻译不显示**: 检查翻译键是否存在
2. **语言切换无效**: 确认语言代码正确
3. **特殊字符乱码**: 检查文件编码格式
4. **布局错乱**: 调整CSS适配不同语言文本长度

### 调试技巧

- 使用浏览器开发者工具检查翻译键
- 启用i18next调试模式查看详细日志
- 检查网络请求确认翻译文件加载
- 验证localStorage中的语言设置

## 更新记录 (Update Log)

### v1.0.0 (2024-01-XX)

- ✅ 实现基础国际化框架
- ✅ 支持中文、英文、日文三种语言
- ✅ 集成语言自动检测
- ✅ 提供语言切换界面
- ✅ 完成核心组件翻译
- ✅ 建立翻译文件管理规范

### 待实现功能

- [ ] 右到左(RTL)语言支持
- [ ] 数字和日期格式本地化
- [ ] 货币格式本地化
- [ ] 翻译内容管理后台
- [ ] 自动翻译质量检查工具

---

## English Summary

This project implements comprehensive internationalization (i18n) support with
the following features:

- **Multi-language Support**: Chinese (zh-CN), English (en-US), Japanese (ja-JP)
- **Automatic Language Detection**: Based on browser settings and user
  preferences
- **Dynamic Language Switching**: Real-time language switching without page
  reload
- **Organized Translation Structure**: Modular and maintainable translation
  files
- **React Integration**: Seamless integration with React components using hooks
- **Performance Optimized**: Efficient loading and caching strategies

The system provides a solid foundation for global application deployment with
proper localization support.
