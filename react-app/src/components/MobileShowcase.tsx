import { motion } from 'framer-motion';
import {
  Home,
  User,
  Settings,
  Bell,
  Search,
  Plus,
  Heart,
  Star,
  MessageCircle,
  // Calendar,
  Camera,
  Phone,
  Mail,
  Edit,
  Trash2,
  CheckCircle,
  Archive,
  Share,
} from 'lucide-react';
import React, { useState } from 'react';

import ModernLayout from './ModernLayout';
import MobileBottomNav, { FloatingActionButton, BottomNavItem } from './ui/MobileBottomNav';
import MobileDrawer, { MenuDrawer } from './ui/MobileDrawer';
import MobileInput, { MobileTextarea } from './ui/MobileInput';
import { BreadcrumbItem } from './ui/ModernBreadcrumb';
import { ModernButton } from './ui/ModernButton';
import {
  ModernCard,
  ModernCardHeader,
  ModernCardTitle,
  ModernCardDescription,
  ModernCardContent,
} from './ui/ModernCard';
import SwipeGesture, { SwipeCard } from './ui/SwipeGesture';
import TouchFeedback from './ui/TouchFeedback';

const MobileShowcase: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  const [bottomDrawerOpen, setBottomDrawerOpen] = useState(false);
  const [fabVisible, setFabVisible] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');

  const breadcrumbs: BreadcrumbItem[] = [
    { label: '组件展示', href: '/showcase' },
    { label: '移动端组件', current: true },
  ];

  // 底部导航项配置
  const bottomNavItems: BottomNavItem[] = [
    {
      path: '/dashboard',
      label: '首页',
      icon: <Home className="h-5 w-5" />,
      activeIcon: <Home className="h-5 w-5 fill-current" />,
    },
    {
      path: '/search',
      label: '搜索',
      icon: <Search className="h-5 w-5" />,
      badge: '新',
    },
    {
      path: '/notifications',
      label: '通知',
      icon: <Bell className="h-5 w-5" />,
      badge: 3,
    },
    {
      path: '/profile',
      label: '我的',
      icon: <User className="h-5 w-5" />,
    },
  ];

  // 菜单项配置
  const menuItems = [
    {
      label: '个人资料',
      icon: <User className="h-5 w-5" />,
      onClick: () => console.log('个人资料'),
    },
    {
      label: '通知设置',
      icon: <Bell className="h-5 w-5" />,
      onClick: () => console.log('通知设置'),
      badge: '3',
    },
    {
      label: '系统设置',
      icon: <Settings className="h-5 w-5" />,
      onClick: () => console.log('系统设置'),
    },
    {
      label: '帮助中心',
      icon: <MessageCircle className="h-5 w-5" />,
      onClick: () => console.log('帮助中心'),
    },
    {
      label: '关于我们',
      icon: <Heart className="h-5 w-5" />,
      onClick: () => console.log('关于我们'),
      disabled: true,
    },
  ];

  // 示例卡片数据
  const sampleCards = [
    {
      id: 1,
      title: '患者张三',
      description: '最近一次就诊：2024-01-15',
      status: '正常',
      avatar: '👨‍⚕️',
    },
    {
      id: 2,
      title: '患者李四',
      description: '最近一次就诊：2024-01-14',
      status: '复查',
      avatar: '👩‍⚕️',
    },
    {
      id: 3,
      title: '患者王五',
      description: '最近一次就诊：2024-01-13',
      status: '急诊',
      avatar: '🧑‍⚕️',
    },
  ];

  const handleSwipeDelete = (id: number) => {
    console.log('删除卡片:', id);
  };

  const handleSwipeComplete = (id: number) => {
    console.log('标记完成:', id);
  };

  return (
    <ModernLayout
      title="移动端组件展示"
      description="专为移动设备优化的交互组件"
      breadcrumbs={breadcrumbs}
      className="pb-20" // 为底部导航留出空间
    >
      <div className="space-y-8">
        {/* 触摸反馈展示 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>触摸反馈</ModernCardTitle>
              <ModernCardDescription>提供自然的触摸反馈和涟漪效果</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="grid grid-cols-2 gap-4">
                <TouchFeedback className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                  <div className="text-blue-600 dark:text-blue-400 font-medium">
                    点击体验涟漪效果
                  </div>
                </TouchFeedback>

                <TouchFeedback
                  className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center"
                  rippleColor="rgba(34, 197, 94, 0.6)"
                  scaleOnPress={true}
                >
                  <div className="text-green-600 dark:text-green-400 font-medium">带缩放效果</div>
                </TouchFeedback>
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>

        {/* 滑动手势展示 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>滑动手势</ModernCardTitle>
              <ModernCardDescription>支持滑动删除、完成等常见移动端操作</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="space-y-3">
                {sampleCards.map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <SwipeCard
                      onSwipeLeftAction={() => handleSwipeDelete(card.id)}
                      onSwipeRightAction={() => handleSwipeComplete(card.id)}
                      leftActionLabel="删除"
                      rightActionLabel="完成"
                      leftActionColor="bg-red-500"
                      rightActionColor="bg-green-500"
                      className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{card.avatar}</div>
                        <div className="flex-1">
                          <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                            {card.title}
                          </h3>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {card.description}
                          </p>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            card.status === '正常'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : card.status === '复查'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}
                        >
                          {card.status}
                        </div>
                      </div>
                    </SwipeCard>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
                  👈 向左滑动删除 | 向右滑动完成 👉
                </p>
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>

        {/* 抽屉组件展示 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>抽屉组件</ModernCardTitle>
              <ModernCardDescription>支持从各个方向滑出的抽屉面板</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="grid grid-cols-2 gap-4">
                <ModernButton variant="outline" onClick={() => setDrawerOpen(true)} fullWidth>
                  左侧抽屉
                </ModernButton>

                <ModernButton variant="outline" onClick={() => setMenuDrawerOpen(true)} fullWidth>
                  菜单抽屉
                </ModernButton>

                <ModernButton variant="outline" onClick={() => setBottomDrawerOpen(true)} fullWidth>
                  底部抽屉
                </ModernButton>

                <ModernButton
                  variant="outline"
                  onClick={() => setFabVisible(!fabVisible)}
                  fullWidth
                >
                  {fabVisible ? '隐藏' : '显示'} FAB
                </ModernButton>
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>

        {/* 移动端表单组件 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>移动端表单</ModernCardTitle>
              <ModernCardDescription>专为移动设备优化的表单组件</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent className="space-y-6">
              <MobileInput
                label="用户名"
                placeholder="请输入用户名"
                leftIcon={<User className="h-4 w-4" />}
                clearable
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
              />

              <MobileInput
                label="密码"
                type="password"
                placeholder="请输入密码"
                leftIcon={<User className="h-4 w-4" />}
                showPasswordToggle
                value={passwordValue}
                onChange={e => setPasswordValue(e.target.value)}
              />

              <MobileInput
                label="邮箱地址"
                type="email"
                placeholder="example@email.com"
                leftIcon={<Mail className="h-4 w-4" />}
                variant="filled"
                success="邮箱格式正确"
              />

              <MobileInput
                label="手机号码"
                placeholder="请输入手机号"
                leftIcon={<Phone className="h-4 w-4" />}
                variant="underlined"
                error="手机号格式不正确"
              />

              <MobileTextarea
                label="备注信息"
                placeholder="请输入备注..."
                value={textareaValue}
                onChange={e => setTextareaValue(e.target.value)}
                autoResize
                minRows={3}
                maxRows={6}
              />
            </ModernCardContent>
          </ModernCard>
        </motion.section>

        {/* 自由拖拽区域 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>自由拖拽</ModernCardTitle>
              <ModernCardDescription>可以自由拖拽的交互元素</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="h-64 bg-neutral-50 dark:bg-neutral-800 rounded-lg relative overflow-hidden">
                <SwipeGesture
                  className="absolute top-4 left-4"
                  onSwipe={direction => console.log('拖拽方向:', direction)}
                >
                  <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg cursor-grab">
                    <Star className="h-6 w-6" />
                  </div>
                </SwipeGesture>

                <SwipeGesture className="absolute top-4 right-4" constrainToAxis="x">
                  <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-lg cursor-grab">
                    <Heart className="h-6 w-6" />
                  </div>
                </SwipeGesture>

                <SwipeGesture
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                  constrainToAxis="y"
                >
                  <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center text-white shadow-lg cursor-grab">
                    <Settings className="h-6 w-6" />
                  </div>
                </SwipeGesture>
              </div>
              <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
                  尝试拖拽上面的图标 • 蓝色：自由拖拽 • 绿色：水平拖拽 • 紫色：垂直拖拽
                </p>
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>
      </div>

      {/* 抽屉组件实例 */}
      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="左侧抽屉"
        position="left"
      >
        <div className="space-y-4">
          <p className="text-neutral-600 dark:text-neutral-400">这是一个从左侧滑出的抽屉组件。</p>
          <div className="space-y-2">
            {['选项 1', '选项 2', '选项 3'].map((option, index) => (
              <TouchFeedback
                key={index}
                className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
              >
                <div className="font-medium">{option}</div>
              </TouchFeedback>
            ))}
          </div>
        </div>
      </MobileDrawer>

      <MenuDrawer
        isOpen={menuDrawerOpen}
        onClose={() => setMenuDrawerOpen(false)}
        title="菜单"
        position="left"
        menuItems={menuItems}
      />

      <MobileDrawer
        isOpen={bottomDrawerOpen}
        onClose={() => setBottomDrawerOpen(false)}
        title="底部抽屉"
        position="bottom"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-neutral-600 dark:text-neutral-400">
            这是一个从底部滑出的抽屉组件，支持拖拽关闭。
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[Camera, Edit, Share, Archive, Trash2, CheckCircle].map((Icon, index) => (
              <TouchFeedback
                key={index}
                className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-center"
              >
                <span className="h-6 w-6 mx-auto mb-2 text-neutral-600 dark:text-neutral-400 text-2xl flex items-center justify-center">
                  📱
                </span>
                <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  选项 {index + 1}
                </div>
              </TouchFeedback>
            ))}
          </div>
        </div>
      </MobileDrawer>

      {/* 底部导航 */}
      <MobileBottomNav items={bottomNavItems} showLabels={true} hapticFeedback={true} />

      {/* 浮动操作按钮 */}
      {fabVisible && (
        <FloatingActionButton
          onClick={() => console.log('FAB clicked')}
          icon={<Plus className="h-6 w-6" />}
          position="bottom-right"
          size="md"
          badge={5}
        />
      )}
    </ModernLayout>
  );
};

export default MobileShowcase;
