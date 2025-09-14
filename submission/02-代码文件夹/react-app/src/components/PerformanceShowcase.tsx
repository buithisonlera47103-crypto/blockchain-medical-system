import { motion } from 'framer-motion';
import {
  Zap,
  Eye,
  Image,
  Activity,
  // RefreshCw,
  // Download,
  Monitor,
  Layers,
  Clock,
} from 'lucide-react';
import React, { useState, useMemo, useCallback } from 'react';

import ModernLayout from './ModernLayout';
import { LazyAvatar, LazyThumbnail, LazyImageGallery } from './ui/LazyImage';
import { BreadcrumbItem } from './ui/ModernBreadcrumb';
import { ModernButton } from './ui/ModernButton';
import {
  ModernCard,
  ModernCardHeader,
  ModernCardTitle,
  ModernCardDescription,
  ModernCardContent,
} from './ui/ModernCard';
import PerformanceMonitorComponent, { PerformanceIndicator } from './ui/PerformanceMonitor';
import VirtualList, { SimpleVirtualList } from './ui/VirtualList';
// import LazyImage from './ui/LazyImage'

interface ListItem {
  id: number;
  name: string;
  description: string;
  avatar: string;
  status: 'active' | 'inactive';
  lastSeen: string;
}

const PerformanceShowcase: React.FC = () => {
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const [virtualListSize, setVirtualListSize] = useState(1000);
  const [imageGallerySize, setImageGallerySize] = useState(20);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: '组件展示', href: '/showcase' },
    { label: '性能优化', current: true },
  ];

  // 生成大量测试数据
  const generateLargeDataset = useCallback((size: number): ListItem[] => {
    return Array.from({ length: size }, (_, index) => ({
      id: index + 1,
      name: `用户 ${index + 1}`,
      description: `这是用户 ${index + 1} 的详细描述信息，包含一些额外的文本内容。`,
      avatar: `https://i.pravatar.cc/64?img=${(index % 70) + 1}`,
      status: index % 3 === 0 ? 'active' : 'inactive',
      lastSeen: new Date(Date.now() - Math.random() * 86400000).toLocaleString(),
    }));
  }, []);

  // 使用 useMemo 优化数据生成
  const largeDataset = useMemo(
    () => generateLargeDataset(virtualListSize),
    [generateLargeDataset, virtualListSize]
  );

  // 图片画廊数据
  const imageGalleryData = useMemo(
    () =>
      Array.from({ length: imageGallerySize }, (_, index) => ({
        src: `https://picsum.photos/800/600?random=${index + 1}`,
        alt: `图片 ${index + 1}`,
        thumbnail: `https://picsum.photos/300/200?random=${index + 1}`,
        placeholder: `https://picsum.photos/50/50?random=${index + 1}`,
      })),
    [imageGallerySize]
  );

  // 虚拟列表项渲染器
  const renderVirtualListItem = useCallback(
    (item: ListItem, index: number, style: React.CSSProperties) => (
      <div
        style={style}
        className="flex items-center p-4 border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
      >
        <LazyAvatar src={item.avatar} alt={item.name} size="md" className="mr-4" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {item.name}
            </h3>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                item.status === 'active'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
              }`}
            >
              {item.status === 'active' ? '在线' : '离线'}
            </span>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate mt-1">
            {item.description}
          </p>
          <p className="text-xs text-neutral-500 mt-1">上次活动: {item.lastSeen}</p>
        </div>
      </div>
    ),
    []
  );

  // 简单虚拟列表项渲染器
  const renderSimpleListItem = useCallback(
    (item: ListItem, index: number) => (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: (index % 10) * 0.05 }}
        className="flex items-center p-3 bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700"
      >
        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mr-3" />
        <div className="flex-1">
          <div className="font-medium text-neutral-900 dark:text-neutral-100">{item.name}</div>
          <div className="text-sm text-neutral-500">ID: {item.id}</div>
        </div>
        <div
          className={`w-2 h-2 rounded-full ${
            item.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
      </motion.div>
    ),
    []
  );

  return (
    <ModernLayout
      title="性能优化展示"
      description="虚拟滚动、懒加载和性能监控的演示"
      breadcrumbs={breadcrumbs}
      actions={
        <div className="flex space-x-2">
          <ModernButton
            variant="outline"
            onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
            leftIcon={<Monitor className="h-4 w-4" />}
          >
            {showPerformanceMonitor ? '隐藏' : '显示'}监控
          </ModernButton>
          <ModernButton variant="medical" leftIcon={<Zap className="h-4 w-4" />}>
            性能优化
          </ModernButton>
        </div>
      }
    >
      <div className="space-y-8">
        {/* 性能指示器 */}
        <div className="fixed bottom-4 left-4 z-40">
          <PerformanceIndicator />
        </div>

        {/* 虚拟滚动展示 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>虚拟滚动列表</ModernCardTitle>
              <ModernCardDescription>
                高性能渲染大量数据项，只渲染可见区域的内容
              </ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="space-y-4">
                {/* 控制面板 */}
                <div className="flex flex-wrap items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">数据量:</label>
                    <select
                      value={virtualListSize}
                      onChange={e => setVirtualListSize(Number(e.target.value))}
                      className="px-3 py-1 border rounded-md bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600"
                    >
                      <option value={100}>100 项</option>
                      <option value={1000}>1,000 项</option>
                      <option value={10000}>10,000 项</option>
                      <option value={50000}>50,000 项</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <Layers className="h-4 w-4" />
                    <span>当前渲染: ~10-15 项 (可见区域)</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <Clock className="h-4 w-4" />
                    <span>总数据: {virtualListSize.toLocaleString()} 项</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 高级虚拟列表 */}
                  <div>
                    <h4 className="font-medium mb-2">高级虚拟列表</h4>
                    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                      <VirtualList
                        data={largeDataset}
                        itemHeight={80}
                        containerHeight={400}
                        renderItem={renderVirtualListItem}
                        overscan={5}
                        className="bg-white dark:bg-neutral-900"
                        itemKey={item => item.id}
                      />
                    </div>
                  </div>

                  {/* 简单虚拟列表 */}
                  <div>
                    <h4 className="font-medium mb-2">简单虚拟列表</h4>
                    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                      <SimpleVirtualList
                        data={largeDataset}
                        itemHeight={60}
                        containerHeight={400}
                        renderItem={renderSimpleListItem}
                        gap={8}
                        className="p-2 bg-neutral-50 dark:bg-neutral-900"
                        loading={false}
                        emptyComponent={
                          <div className="text-center text-neutral-500 py-8">暂无数据</div>
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>

        {/* 懒加载图片展示 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>懒加载图片</ModernCardTitle>
              <ModernCardDescription>
                只在图片进入视窗时才开始加载，提升页面加载性能
              </ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="space-y-6">
                {/* 控制面板 */}
                <div className="flex flex-wrap items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">图片数量:</label>
                    <select
                      value={imageGallerySize}
                      onChange={e => setImageGallerySize(Number(e.target.value))}
                      className="px-3 py-1 border rounded-md bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600"
                    >
                      <option value={10}>10 张</option>
                      <option value={20}>20 张</option>
                      <option value={50}>50 张</option>
                      <option value={100}>100 张</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <Eye className="h-4 w-4" />
                    <span>滚动查看懒加载效果</span>
                  </div>
                </div>

                {/* 头像展示 */}
                <div>
                  <h4 className="font-medium mb-3">懒加载头像</h4>
                  <div className="flex flex-wrap gap-3">
                    {Array.from({ length: 20 }, (_, index) => (
                      <LazyAvatar
                        key={index}
                        src={`https://i.pravatar.cc/64?img=${index + 1}`}
                        alt={`头像 ${index + 1}`}
                        size="lg"
                        className="border-2 border-white shadow-md hover:scale-110 transition-transform"
                      />
                    ))}
                  </div>
                </div>

                {/* 缩略图展示 */}
                <div>
                  <h4 className="font-medium mb-3">懒加载缩略图</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }, (_, index) => (
                      <LazyThumbnail
                        key={index}
                        src={`https://picsum.photos/400/300?random=${index + 100}`}
                        alt={`缩略图 ${index + 1}`}
                        placeholder={`https://picsum.photos/50/50?random=${index + 100}`}
                        className="hover:scale-105 transition-transform cursor-pointer"
                        aspectRatio="4/3"
                      />
                    ))}
                  </div>
                </div>

                {/* 图片画廊 */}
                <div>
                  <h4 className="font-medium mb-3">图片画廊</h4>
                  <LazyImageGallery
                    images={imageGalleryData}
                    columns={4}
                    gap={4}
                    onImageClick={index => console.log('点击图片:', index)}
                    className="max-h-96 overflow-y-auto"
                  />
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>

        {/* 性能对比展示 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>性能对比</ModernCardTitle>
              <ModernCardDescription>优化前后的性能对比数据</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 虚拟滚动性能 */}
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-lg">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Layers className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-green-800 dark:text-green-400 mb-2">
                    虚拟滚动
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="text-2xl font-bold text-green-600">98%</div>
                    <div className="text-green-700 dark:text-green-300">内存使用减少</div>
                    <div className="text-xs text-green-600">50,000 项 → 10-15 项渲染</div>
                  </div>
                </div>

                {/* 懒加载性能 */}
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-lg">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Image className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-400 mb-2">
                    懒加载图片
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="text-2xl font-bold text-blue-600">75%</div>
                    <div className="text-blue-700 dark:text-blue-300">初始加载时间减少</div>
                    <div className="text-xs text-blue-600">按需加载，节省带宽</div>
                  </div>
                </div>

                {/* 整体性能 */}
                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 rounded-lg">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-purple-800 dark:text-purple-400 mb-2">
                    整体优化
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="text-2xl font-bold text-purple-600">60FPS</div>
                    <div className="text-purple-700 dark:text-purple-300">流畅交互体验</div>
                    <div className="text-xs text-purple-600">优化渲染和动画性能</div>
                  </div>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>

        {/* 性能建议 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ModernCard variant="medical">
            <ModernCardHeader>
              <ModernCardTitle>性能优化建议</ModernCardTitle>
              <ModernCardDescription>在开发中应该遵循的性能优化最佳实践</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-4">
                  <h4 className="font-semibold text-medical-primary">列表优化</h4>
                  <ul className="space-y-2 text-neutral-600 dark:text-neutral-400">
                    <li className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <span>超过 100 项时使用虚拟滚动</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <span>使用 React.memo 优化列表项渲染</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <span>提供稳定的 key 值</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-medical-primary">图片优化</h4>
                  <ul className="space-y-2 text-neutral-600 dark:text-neutral-400">
                    <li className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <span>使用懒加载减少初始加载时间</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <span>提供低质量占位符</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <span>使用 WebP 格式优化文件大小</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-medical-primary">代码分割</h4>
                  <ul className="space-y-2 text-neutral-600 dark:text-neutral-400">
                    <li className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                      <span>路由级别的代码分割</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                      <span>组件级别的懒加载</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                      <span>第三方库的按需加载</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-medical-primary">监控指标</h4>
                  <ul className="space-y-2 text-neutral-600 dark:text-neutral-400">
                    <li className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                      <span>FPS 保持在 60 以上</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                      <span>内存使用率低于 80%</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                      <span>交互延迟小于 100ms</span>
                    </li>
                  </ul>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        </motion.section>
      </div>

      {/* 性能监控器 */}
      <PerformanceMonitorComponent
        visible={showPerformanceMonitor}
        position="top-right"
        compact={false}
        onMetricsUpdate={metrics => {
          // 可以在这里处理性能指标数据
          console.log('性能指标更新:', metrics);
        }}
        warningThresholds={{
          fps: 30,
          memory: 80,
          renderTime: 16,
          interactionDelay: 100,
        }}
      />
    </ModernLayout>
  );
};

export default PerformanceShowcase;
