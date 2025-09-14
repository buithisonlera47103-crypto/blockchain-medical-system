import { motion } from 'framer-motion';
import {
  // Eye,
  Keyboard,
  Volume2,
  // MousePointer,
  Accessibility,
  ShieldCheck,
  Palette,
  Settings,
  // Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import React, { useState, useRef } from 'react';

import {
  useKeyboardNavigation,
  useModalAccessibility,
  useFormAccessibility,
  useTooltipAccessibility,
} from '../hooks/useAccessibility';
import { ColorContrast } from '../utils/accessibility';

import ModernLayout from './ModernLayout';
import {
  AccessibilityProvider,
  useAccessibility,
  SkipLink,
  ScreenReaderOnly,
  AccessibleIcon,
  AccessibleDivider,
  AccessibilityIndicator,
} from './ui/AccessibilityProvider';
import { BreadcrumbItem } from './ui/ModernBreadcrumb';
import { ModernButton } from './ui/ModernButton';
import {
  ModernCard,
  ModernCardHeader,
  ModernCardTitle,
  ModernCardDescription,
  ModernCardContent,
} from './ui/ModernCard';

const AccessibilityShowcaseContent: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { announce, preferences, runAccessibilityAudit } = useAccessibility();

  const breadcrumbs: BreadcrumbItem[] = [
    { label: '组件展示', href: '/showcase' },
    { label: '可访问性', current: true },
  ];

  // 键盘导航示例
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { keyHandlers } = useKeyboardNavigation(
    buttonRefs.current.filter(Boolean) as HTMLButtonElement[],
    { loop: true, vertical: false, horizontal: true }
  );

  // 模态框可访问性
  const { containerRef: modalRef, modalProps } = useModalAccessibility(modalOpen);
  const divModalRef = modalRef as React.RefObject<HTMLDivElement>;

  // 表单可访问性
  const { setFieldError, clearFieldError } = useFormAccessibility();

  // 工具提示可访问性
  const {
    triggerRef: tooltipTriggerRef,
    tooltipRef,
    isVisible: tooltipVisible,
    triggerProps: tooltipTriggerProps,
    tooltipProps,
  } = useTooltipAccessibility();

  // 类型转换用于按钮ref
  const buttonTooltipRef = tooltipTriggerRef as React.RefObject<HTMLButtonElement>;
  const divTooltipRef = tooltipRef as React.RefObject<HTMLDivElement>;

  // 颜色对比度测试数据
  const colorTests = [
    { bg: '#FFFFFF', fg: '#000000', label: '黑色文字 / 白色背景' },
    { bg: '#0066CC', fg: '#FFFFFF', label: '白色文字 / 蓝色背景' },
    { bg: '#28A745', fg: '#FFFFFF', label: '白色文字 / 绿色背景' },
    { bg: '#DC3545', fg: '#FFFFFF', label: '白色文字 / 红色背景' },
    { bg: '#F8F9FA', fg: '#6C757D', label: '灰色文字 / 浅灰背景' },
  ];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 清除之前的错误
    Object.keys(formErrors).forEach(field => {
      const input = document.getElementById(field) as HTMLInputElement;
      if (input) clearFieldError(input);
    });
    setFormErrors({});

    // 简单验证
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = '姓名是必填项';
    if (!formData.email.trim()) errors.email = '邮箱是必填项';
    if (!formData.message.trim()) errors.message = '消息是必填项';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);

      // 设置表单错误并宣布
      Object.entries(errors).forEach(([field, message]) => {
        const input = document.getElementById(field) as HTMLInputElement;
        if (input) setFieldError(input, message);
      });

      announce(`表单包含 ${Object.keys(errors).length} 个错误，请检查并修正`, 'assertive');

      // 聚焦到第一个错误字段
      const firstErrorField = Object.keys(errors)[0];
      document.getElementById(firstErrorField)?.focus();
    } else {
      announce('表单提交成功！', 'polite');
    }
  };

  const runAudit = () => {
    const results = runAccessibilityAudit();
    const totalIssues = results.issues.length + results.warnings.length;

    if (totalIssues === 0) {
      announce('可访问性检查通过，未发现问题', 'polite');
    } else {
      announce(`发现 ${totalIssues} 个可访问性问题，请查看控制台了解详情`, 'assertive');
    }
  };

  return (
    <ModernLayout
      title="可访问性展示"
      description="无障碍访问功能和最佳实践演示"
      breadcrumbs={breadcrumbs}
      actions={
        <div className="flex space-x-2">
          <ModernButton
            variant="outline"
            onClick={runAudit}
            leftIcon={<ShieldCheck className="h-4 w-4" />}
          >
            运行审计
          </ModernButton>
          <ModernButton variant="medical" leftIcon={<Accessibility className="h-4 w-4" />}>
            可访问性
          </ModernButton>
        </div>
      }
    >
      {/* 跳转链接 */}
      <div className="sr-only">
        <SkipLink href="#main-content">跳转到主要内容</SkipLink>
        <SkipLink href="#navigation">跳转到导航</SkipLink>
        <SkipLink href="#accessibility-features">跳转到可访问性功能</SkipLink>
      </div>

      <div id="main-content" className="space-y-8">
        {/* 可访问性状态指示器 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>用户偏好和状态</ModernCardTitle>
              <ModernCardDescription>
                显示当前用户的可访问性偏好设置和系统状态
              </ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AccessibilityIndicator showDetails={true} />

                <div className="space-y-4">
                  <h4 className="font-semibold">系统适配</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-800 rounded">
                      <span>动画效果:</span>
                      <span
                        className={preferences.reducedMotion ? 'text-orange-600' : 'text-green-600'}
                      >
                        {preferences.reducedMotion ? '已减少' : '正常'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-800 rounded">
                      <span>对比度:</span>
                      <span
                        className={preferences.highContrast ? 'text-green-600' : 'text-neutral-600'}
                      >
                        {preferences.highContrast ? '高对比度' : '标准'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-800 rounded">
                      <span>主题:</span>
                      <span className="text-neutral-600">
                        {preferences.darkMode ? '暗色' : '亮色'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>

        {/* 键盘导航演示 */}
        <motion.section
          id="keyboard-navigation"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>
                <AccessibleIcon icon={<Keyboard className="h-5 w-5" />} label="键盘导航" />
                键盘导航
              </ModernCardTitle>
              <ModernCardDescription>
                使用键盘进行导航和操作的演示
                <ScreenReaderOnly>
                  使用 Tab 键在元素间导航，使用 Space 或 Enter 键激活按钮
                </ScreenReaderOnly>
              </ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">水平按钮组（使用方向键导航）</h4>
                  <div
                    className="flex space-x-2"
                    onKeyDown={e => {
                      const handler = keyHandlers[e.key as keyof typeof keyHandlers];
                      if (handler) handler(e.nativeEvent);
                    }}
                  >
                    {['第一个', '第二个', '第三个', '第四个'].map((text, index) => (
                      <ModernButton
                        key={text}
                        ref={el => {
                          buttonRefs.current[index] = el;
                        }}
                        variant={index === 0 ? 'medical' : 'outline'}
                        onClick={() => announce(`点击了${text}按钮`, 'polite')}
                      >
                        {text}按钮
                      </ModernButton>
                    ))}
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                    💡 聚焦后使用 ← → 方向键在按钮间导航
                  </p>
                </div>

                <AccessibleDivider label="按钮组分隔符" />

                <div>
                  <h4 className="font-medium mb-3">工具提示演示</h4>
                  <ModernButton
                    ref={buttonTooltipRef}
                    variant="outline"
                    {...tooltipTriggerProps}
                    className="relative"
                  >
                    悬停或聚焦显示提示
                    {tooltipVisible && (
                      <div
                        ref={divTooltipRef}
                        {...tooltipProps}
                        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-900 text-white text-sm rounded shadow-lg z-10"
                      >
                        这是一个可访问的工具提示
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-neutral-900"></div>
                      </div>
                    )}
                  </ModernButton>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>

        {/* 表单可访问性 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>
                <AccessibleIcon icon={<Settings className="h-5 w-5" />} label="表单可访问性" />
                表单可访问性
              </ModernCardTitle>
              <ModernCardDescription>正确关联标签、错误处理和表单验证的演示</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    姓名{' '}
                    <span className="text-red-500" aria-label="必填字段">
                      *
                    </span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary ${
                      formErrors.name
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-neutral-300 dark:border-neutral-600'
                    } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100`}
                    aria-required="true"
                    aria-invalid={!!formErrors.name}
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    邮箱{' '}
                    <span className="text-red-500" aria-label="必填字段">
                      *
                    </span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary ${
                      formErrors.email
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-neutral-300 dark:border-neutral-600'
                    } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100`}
                    aria-required="true"
                    aria-invalid={!!formErrors.email}
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    消息{' '}
                    <span className="text-red-500" aria-label="必填字段">
                      *
                    </span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary resize-none ${
                      formErrors.message
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-neutral-300 dark:border-neutral-600'
                    } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100`}
                    aria-required="true"
                    aria-invalid={!!formErrors.message}
                  />
                </div>

                <ModernButton type="submit" variant="medical" className="w-full">
                  提交表单
                </ModernButton>
              </form>
            </ModernCardContent>
          </ModernCard>
        </motion.section>

        {/* 颜色对比度测试 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>
                <AccessibleIcon icon={<Palette className="h-5 w-5" />} label="颜色对比度" />
                颜色对比度测试
              </ModernCardTitle>
              <ModernCardDescription>WCAG 2.1 颜色对比度标准合规性检查</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="space-y-4">
                {colorTests.map((test, index) => {
                  const contrastTest = ColorContrast.checkWCAG(test.bg, test.fg);

                  return (
                    <div
                      key={index}
                      className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{test.label}</h4>
                        <div className="flex items-center space-x-2">
                          {contrastTest.normal ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : contrastTest.large ? (
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <span className="text-sm font-mono">
                            {contrastTest.ratio.toFixed(2)}:1
                          </span>
                        </div>
                      </div>

                      <div
                        className="p-4 rounded-md mb-2"
                        style={{ backgroundColor: test.bg, color: test.fg }}
                      >
                        这是示例文本 - The quick brown fox jumps over the lazy dog
                      </div>

                      <div className="flex space-x-4 text-xs">
                        <span
                          className={`flex items-center space-x-1 ${
                            contrastTest.normal ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {contrastTest.normal ? '✓' : '✗'}
                          <span>正常文本 (AA: 4.5:1)</span>
                        </span>
                        <span
                          className={`flex items-center space-x-1 ${
                            contrastTest.large ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {contrastTest.large ? '✓' : '✗'}
                          <span>大号文本 (AA: 3:1)</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>

        {/* 屏幕阅读器测试 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>
                <AccessibleIcon icon={<Volume2 className="h-5 w-5" />} label="屏幕阅读器" />
                屏幕阅读器优化
              </ModernCardTitle>
              <ModernCardDescription>语义化标记和ARIA标签的正确使用演示</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">实时通知测试</h4>
                  <div className="flex flex-wrap gap-2">
                    <ModernButton
                      variant="outline"
                      onClick={() => announce('这是一个礼貌的通知', 'polite')}
                    >
                      礼貌通知
                    </ModernButton>
                    <ModernButton
                      variant="outline"
                      onClick={() => announce('这是一个重要的通知！', 'assertive')}
                    >
                      重要通知
                    </ModernButton>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                    💡 使用屏幕阅读器时可以听到这些通知
                  </p>
                </div>

                <AccessibleDivider label="通知测试分隔符" />

                <div>
                  <h4 className="font-medium mb-3">语义化结构示例</h4>
                  <article className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-lg">
                    <header>
                      <h5 className="font-semibold mb-2">文章标题</h5>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                        <time dateTime="2024-01-15">2024年1月15日</time>
                        <span aria-hidden="true"> | </span>
                        <span>作者：张三</span>
                      </div>
                    </header>

                    <main>
                      <p className="text-neutral-700 dark:text-neutral-300 mb-3">
                        这是一个使用正确语义化标记的文章示例。屏幕阅读器可以准确理解内容结构。
                      </p>

                      <aside className="border-l-4 border-blue-500 pl-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                        <h6 className="font-medium text-blue-800 dark:text-blue-400 mb-1">提示</h6>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          这是一个侧边栏内容，提供额外的信息。
                        </p>
                      </aside>
                    </main>

                    <footer className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center space-x-4 text-sm text-neutral-600 dark:text-neutral-400">
                        <span>标签: 可访问性, React, 前端</span>
                        <span aria-hidden="true">•</span>
                        <span>阅读时间: 3分钟</span>
                      </div>
                    </footer>
                  </article>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>

        {/* 可访问性最佳实践 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <ModernCard variant="medical">
            <ModernCardHeader>
              <ModernCardTitle>可访问性最佳实践</ModernCardTitle>
              <ModernCardDescription>
                在设计和开发中应该遵循的可访问性指导原则
              </ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-medical-primary">感知性 (Perceivable)</h4>
                  <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>为图片提供有意义的替代文本</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>确保足够的颜色对比度 (4.5:1)</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>不仅依靠颜色传达信息</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>提供视频字幕和音频转录</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-medical-primary">可操作性 (Operable)</h4>
                  <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>所有功能可通过键盘访问</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>提供跳转链接</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>避免闪烁内容</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>提供充足的操作时间</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-medical-primary">可理解性 (Understandable)</h4>
                  <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>使用清晰简单的语言</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>确保页面功能可预测</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>提供输入错误提示和建议</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>帮助用户避免和纠正错误</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-medical-primary">健壮性 (Robust)</h4>
                  <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>使用有效的HTML标记</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>正确使用ARIA标签</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>兼容辅助技术</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>定期测试和更新</span>
                    </li>
                  </ul>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>
      </div>

      {/* 可访问的模态框示例 */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            ref={divModalRef}
            {...modalProps}
            aria-modal={true}
            className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md mx-4"
          >
            <h2 className="text-xl font-semibold mb-4">可访问的模态框</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              这个模态框实现了完整的可访问性支持，包括焦点管理、键盘导航和屏幕阅读器优化。
            </p>
            <div className="flex justify-end space-x-2">
              <ModernButton variant="outline" onClick={() => setModalOpen(false)}>
                取消
              </ModernButton>
              <ModernButton
                variant="medical"
                onClick={() => {
                  setModalOpen(false);
                  announce('模态框已确认并关闭', 'polite');
                }}
              >
                确认
              </ModernButton>
            </div>
          </div>
        </div>
      )}
    </ModernLayout>
  );
};

// 主组件，包含可访问性提供者
const AccessibilityShowcase: React.FC = () => {
  return (
    <AccessibilityProvider enableAudit={true}>
      <AccessibilityShowcaseContent />
    </AccessibilityProvider>
  );
};

export default AccessibilityShowcase;
