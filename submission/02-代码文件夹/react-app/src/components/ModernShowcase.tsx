import { motion } from 'framer-motion';
import {
  Heart,
  Star,
  Download,
  Share,
  Settings,
  User,
  Mail,
  Phone,
  // Calendar,
  // MapPin,
  Award,
  TrendingUp,
  Users,
  Activity,
  Clock,
  FileText,
  Database,
} from 'lucide-react';
import React, { useState } from 'react';

import ModernLayout from './ModernLayout';
import { BreadcrumbItem } from './ui/ModernBreadcrumb';
import { ModernButton } from './ui/ModernButton';
import {
  ModernCard,
  ModernCardHeader,
  ModernCardTitle,
  ModernCardDescription,
  ModernCardContent,
  ModernCardFooter,
} from './ui/ModernCard';
import ModernModal, { ConfirmModal } from './ui/ModernModal';

const ModernShowcase: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const breadcrumbs: BreadcrumbItem[] = [{ label: '组件展示', current: true }];

  const handleAsyncAction = async () => {
    setLoading(true);
    // 模拟异步操作
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
  };

  const stats = [
    {
      label: '总患者数',
      value: '12,345',
      change: '+12%',
      trend: 'up',
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: '今日病历',
      value: '89',
      change: '+5%',
      trend: 'up',
      icon: FileText,
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: '系统响应时间',
      value: '0.2s',
      change: '-8%',
      trend: 'down',
      icon: Activity,
      color: 'from-orange-500 to-amber-500',
    },
    {
      label: '数据同步率',
      value: '99.9%',
      change: '+0.1%',
      trend: 'up',
      icon: Database,
      color: 'from-purple-500 to-violet-500',
    },
  ];

  const teamMembers = [
    {
      name: '张医生',
      role: '主治医师',
      avatar: '👨‍⚕️',
      status: 'online',
      department: '心内科',
    },
    {
      name: '李护士',
      role: '护士长',
      avatar: '👩‍⚕️',
      status: 'away',
      department: '急诊科',
    },
    {
      name: '王管理员',
      role: '系统管理员',
      avatar: '👨‍💼',
      status: 'offline',
      department: 'IT部门',
    },
  ];

  return (
    <ModernLayout
      title="现代化组件展示"
      description="展示新的设计系统和UI组件"
      breadcrumbs={breadcrumbs}
      actions={
        <div className="flex space-x-2">
          <ModernButton variant="outline" leftIcon={<Download className="h-4 w-4" />}>
            导出数据
          </ModernButton>
          <ModernButton
            variant="outline"
            onClick={() => (window.location.href = '/mobile-showcase')}
            leftIcon={<Phone className="h-4 w-4" />}
          >
            移动端组件
          </ModernButton>
          <ModernButton
            variant="outline"
            onClick={() => (window.location.href = '/performance-showcase')}
            leftIcon={<TrendingUp className="h-4 w-4" />}
          >
            性能优化
          </ModernButton>
          <ModernButton
            variant="outline"
            onClick={() => (window.location.href = '/accessibility-showcase')}
            leftIcon={<Activity className="h-4 w-4" />}
          >
            可访问性
          </ModernButton>
          <ModernButton variant="medical" leftIcon={<Settings className="h-4 w-4" />}>
            系统设置
          </ModernButton>
        </div>
      }
    >
      <div className="space-y-8">
        {/* 按钮展示区 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>按钮组件</ModernCardTitle>
              <ModernCardDescription>不同变体和尺寸的现代化按钮组件</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent className="space-y-6">
              {/* 按钮变体 */}
              <div>
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  按钮变体
                </h4>
                <div className="flex flex-wrap gap-3">
                  <ModernButton variant="default">默认按钮</ModernButton>
                  <ModernButton variant="medical">医疗主题</ModernButton>
                  <ModernButton variant="success">成功</ModernButton>
                  <ModernButton variant="warning">警告</ModernButton>
                  <ModernButton variant="destructive">危险</ModernButton>
                  <ModernButton variant="outline">轮廓</ModernButton>
                  <ModernButton variant="ghost">幽灵</ModernButton>
                  <ModernButton variant="link">链接</ModernButton>
                </div>
              </div>

              {/* 按钮尺寸 */}
              <div>
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  按钮尺寸
                </h4>
                <div className="flex flex-wrap items-center gap-3">
                  <ModernButton size="sm">小号</ModernButton>
                  <ModernButton size="default">默认</ModernButton>
                  <ModernButton size="lg">大号</ModernButton>
                  <ModernButton size="xl">超大</ModernButton>
                </div>
              </div>

              {/* 带图标的按钮 */}
              <div>
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  图标按钮
                </h4>
                <div className="flex flex-wrap gap-3">
                  <ModernButton leftIcon={<Heart className="h-4 w-4" />} variant="medical">
                    收藏
                  </ModernButton>
                  <ModernButton rightIcon={<Share className="h-4 w-4" />} variant="outline">
                    分享
                  </ModernButton>
                  <ModernButton variant="ghost" size="icon">
                    <Star className="h-4 w-4" />
                  </ModernButton>
                  <ModernButton loading={loading} onClick={handleAsyncAction} variant="medical">
                    异步操作
                  </ModernButton>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>

        {/* 卡片展示区 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>卡片组件</ModernCardTitle>
              <ModernCardDescription>不同样式和交互效果的卡片组件</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 统计卡片 */}
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <ModernCard
                      variant="elevated"
                      hover="lift"
                      animated
                      className="relative overflow-hidden"
                    >
                      {/* 背景渐变 */}
                      <div
                        className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.color} opacity-10 rounded-bl-full`}
                      />

                      <ModernCardContent>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                              {stat.label}
                            </p>
                            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                              {stat.value}
                            </p>
                            <div className="flex items-center mt-2">
                              <span
                                className={`text-xs font-medium ${
                                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {stat.change}
                              </span>
                              <span className="text-xs text-neutral-500 ml-1">vs 上月</span>
                            </div>
                          </div>
                          <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color}`}>
                            <span className="h-6 w-6 text-white text-2xl flex items-center justify-center">
                              <stat.icon size={24} />
                            </span>
                          </div>
                        </div>
                      </ModernCardContent>
                    </ModernCard>
                  </motion.div>
                ))}
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>

        {/* 团队成员卡片 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>团队成员</ModernCardTitle>
              <ModernCardDescription>医疗团队成员信息展示</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {teamMembers.map((member, index) => (
                  <motion.div
                    key={member.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <ModernCard
                      variant="outlined"
                      hover="scale"
                      clickable
                      animated
                      className="text-center"
                    >
                      <ModernCardContent>
                        <div className="relative inline-block mb-4">
                          <div className="text-4xl">{member.avatar}</div>
                          <div
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                              member.status === 'online'
                                ? 'bg-green-500'
                                : member.status === 'away'
                                  ? 'bg-yellow-500'
                                  : 'bg-gray-400'
                            }`}
                          />
                        </div>
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {member.name}
                        </h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {member.role}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">{member.department}</p>
                      </ModernCardContent>
                      <ModernCardFooter className="justify-center">
                        <div className="flex space-x-2">
                          <ModernButton size="sm" variant="ghost">
                            <Mail className="h-4 w-4" />
                          </ModernButton>
                          <ModernButton size="sm" variant="ghost">
                            <Phone className="h-4 w-4" />
                          </ModernButton>
                        </div>
                      </ModernCardFooter>
                    </ModernCard>
                  </motion.div>
                ))}
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>

        {/* 模态框展示 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>模态框组件</ModernCardTitle>
              <ModernCardDescription>现代化的模态框和对话框组件</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="flex flex-wrap gap-4">
                <ModernButton onClick={() => setModalOpen(true)} variant="medical">
                  打开模态框
                </ModernButton>
                <ModernButton onClick={() => setConfirmModalOpen(true)} variant="destructive">
                  确认对话框
                </ModernButton>
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>

        {/* 近期活动 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ModernCard variant="glass">
            <ModernCardHeader>
              <ModernCardTitle>近期活动</ModernCardTitle>
              <ModernCardDescription>系统操作和重要事件记录</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="space-y-4">
                {[
                  {
                    icon: User,
                    title: '新用户注册',
                    desc: '张三医生加入系统',
                    time: '2分钟前',
                    color: 'text-blue-500',
                  },
                  {
                    icon: FileText,
                    title: '病历上传',
                    desc: '患者李四的检查报告已上传',
                    time: '5分钟前',
                    color: 'text-green-500',
                  },
                  {
                    icon: Award,
                    title: '系统更新',
                    desc: '区块链模块已更新到v2.1',
                    time: '1小时前',
                    color: 'text-purple-500',
                  },
                  {
                    icon: Clock,
                    title: '定期备份',
                    desc: '数据备份任务已完成',
                    time: '2小时前',
                    color: 'text-orange-500',
                  },
                ].map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-center space-x-4 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <div
                      className={`p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 ${activity.color}`}
                    >
                      <activity.icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {activity.title}
                      </p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                        {activity.desc}
                      </p>
                    </div>
                    <span className="text-xs text-neutral-500">{activity.time}</span>
                  </motion.div>
                ))}
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>
      </div>

      {/* 模态框 */}
      <ModernModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="示例模态框"
        description="这是一个现代化的模态框组件演示"
        size="md"
        footer={
          <>
            <ModernButton variant="outline" onClick={() => setModalOpen(false)}>
              取消
            </ModernButton>
            <ModernButton variant="medical" onClick={() => setModalOpen(false)}>
              确认
            </ModernButton>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-neutral-600 dark:text-neutral-400">
            这个模态框展示了现代化的设计风格，包括：
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            <li>流畅的动画效果</li>
            <li>可访问性支持（键盘导航、焦点管理）</li>
            <li>响应式设计</li>
            <li>暗色模式支持</li>
            <li>自定义大小和样式</li>
          </ul>
        </div>
      </ModernModal>

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => {
          console.log('确认操作');
          setConfirmModalOpen(false);
        }}
        title="删除确认"
        description="您确定要删除这个项目吗？"
        confirmText="删除"
        cancelText="取消"
        confirmVariant="destructive"
      />
    </ModernLayout>
  );
};

export default ModernShowcase;
