/**
 * 主题配置 - 亮色专业医疗主题
 * 为信息安全竞赛定制
 */

export const theme = {
  // 主色调
  colors: {
    primary: '#1890ff',      // 蓝色 - 专业可信
    success: '#52c41a',      // 绿色 - 健康安全
    warning: '#faad14',      // 橙色 - 提示警告
    danger: '#f5222d',       // 红色 - 危险错误
    purple: '#722ed1',       // 紫色 - 区块链科技感
    cyan: '#13c2c2',         // 青色 - 特殊标识
    orange: '#fa8c16',       // 橙色 - 审计
    pink: '#eb2f96',         // 粉色 - 强调
  },

  // 背景色
  background: {
    primary: '#ffffff',      // 纯白
    secondary: '#f0f2f5',    // 浅灰背景
    tertiary: '#fafafa',     // 更浅灰
    hover: '#e6f7ff',        // 悬停背景
    active: '#bae7ff',       // 激活背景
  },

  // 文字色
  text: {
    primary: '#262626',      // 主文字
    secondary: '#595959',    // 次要文字
    disabled: '#bfbfbf',     // 禁用文字
    light: '#8c8c8c',        // 浅色文字
  },

  // 边框色
  border: {
    default: '#d9d9d9',      // 默认边框
    light: '#f0f0f0',        // 浅色边框
    dark: '#434343',         // 深色边框
  },

  // 阴影
  shadow: {
    sm: '0 2px 8px rgba(0,0,0,0.06)',
    md: '0 4px 12px rgba(0,0,0,0.08)',
    lg: '0 8px 24px rgba(0,0,0,0.12)',
    xl: '0 12px 32px rgba(0,0,0,0.16)',
  },

  // 动画时间
  transition: {
    fast: '0.2s',
    base: '0.3s',
    slow: '0.5s',
  },

  // 圆角
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    round: '50%',
  },

  // 间距
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  // 字体大小
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    xxl: '24px',
    xxxl: '32px',
  },

  // 布局尺寸
  layout: {
    siderWidth: 180,
    siderCollapsedWidth: 64,
    headerHeight: 64,
  },

  // 功能色标识（用于导航和标签）
  featureColors: {
    records: '#1890ff',      // 病历记录
    permissions: '#52c41a',  // 授权管理
    verify: '#722ed1',       // 区块链验证
    logs: '#fa8c16',         // 日志审计
    upload: '#13c2c2',       // 上传功能
    create: '#52c41a',       // 创建功能
    request: '#722ed1',      // 授权申请
    audit: '#eb2f96',        // 操作审计
  },
};

export type Theme = typeof theme;

export default theme;

