import React, { useState } from 'react';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  badge?: number;
}

interface ContactInfo {
  type: string;
  value: string;
  icon: string;
}

const MedicalFooter: React.FC = () => {
  const [activeTab, setActiveTab] = useState('quick');
  const [isExpanded, setIsExpanded] = useState(false);

  const quickActions: QuickAction[] = [
    {
      id: 'emergency',
      label: '紧急呼叫',
      icon: '🚨',
      action: () => console.log('Emergency call'),
      badge: 3,
    },
    {
      id: 'consultation',
      label: '在线咨询',
      icon: '💬',
      action: () => console.log('Online consultation'),
    },
    {
      id: 'appointment',
      label: '预约挂号',
      icon: '📅',
      action: () => console.log('Book appointment'),
    },
    {
      id: 'records',
      label: '病历查询',
      icon: '📋',
      action: () => console.log('View records'),
    },
    {
      id: 'pharmacy',
      label: '药品配送',
      icon: '💊',
      action: () => console.log('Pharmacy delivery'),
    },
  ];

  const contactInfo: ContactInfo[] = [
    {
      type: '24小时急救热线',
      value: '120',
      icon: '🚑',
    },
    {
      type: '医疗咨询热线',
      value: '400-8888-120',
      icon: '☎️',
    },
    {
      type: '技术支持',
      value: 'support@medchain.com',
      icon: '🛠️',
    },
    {
      type: '投诉建议',
      value: 'feedback@medchain.com',
      icon: '📧',
    },
  ];

  const certifications = [
    { name: 'ISO 27001', desc: '信息安全管理', icon: '🔒' },
    { name: 'HIPAA', desc: '医疗隐私保护', icon: '🛡️' },
    { name: 'FDA 认证', desc: '医疗器械认证', icon: '✅' },
    { name: 'GMP 认证', desc: '药品生产质量', icon: '🏭' },
  ];

  const stats = [
    { label: '服务医院', value: '2,847', unit: '家', icon: '🏥' },
    { label: '注册医生', value: '156,892', unit: '人', icon: '👨‍⚕️' },
    { label: '患者用户', value: '8.9M', unit: '+', icon: '👥' },
    { label: '数据安全', value: '99.99', unit: '%', icon: '🔐' },
  ];

  return (
    <>
      {/* 主要底部栏 */}
      <footer className="bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-t border-red-200/30 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* 顶部统计数据 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {stats.map((stat, index) => (
              <div key={stat.label} className="text-center">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-red-200/30 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300">
                  <div className="text-3xl mb-2">{stat.icon}</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">
                    {stat.value}
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                      {stat.unit}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 主要内容区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* 公司信息 */}
            <div className="lg:col-span-1">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl shadow-lg mr-4">
                  <span className="text-2xl">🏥</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">MedChain</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">医疗数据共享平台</p>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                致力于通过区块链技术构建安全、透明、可信赖的医疗数据管理生态系统，
                为患者、医生和医疗机构提供专业的数字化医疗服务。
              </p>

              {/* 认证标识 */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">资质认证</h4>
                {certifications.map(cert => (
                  <div
                    key={cert.name}
                    className="flex items-center space-x-3 p-2 rounded-lg bg-white/50 dark:bg-gray-800/50"
                  >
                    <span className="text-lg">{cert.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {cert.name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{cert.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 快速导航 */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">快速导航</h3>
              <div className="space-y-3">
                {[
                  { name: '产品介绍', href: '#products' },
                  { name: '解决方案', href: '#solutions' },
                  { name: '技术架构', href: '#architecture' },
                  { name: '应用案例', href: '#cases' },
                  { name: '价格方案', href: '#pricing' },
                  { name: '开发者文档', href: '#docs' },
                  { name: '帮助中心', href: '#help' },
                  { name: '关于我们', href: '#about' },
                ].map(link => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="block text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 py-1"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            </div>

            {/* 联系信息 */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">联系我们</h3>
              <div className="space-y-4">
                {contactInfo.map(contact => (
                  <div key={contact.type} className="flex items-start space-x-3">
                    <span className="text-lg mt-1">{contact.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {contact.type}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-sm">
                        {contact.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 社交媒体 */}
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">关注我们</h4>
                <div className="flex space-x-3">
                  {[
                    { name: '微信', icon: '💬', color: 'bg-green-500' },
                    { name: '微博', icon: '📱', color: 'bg-red-500' },
                    { name: 'LinkedIn', icon: '💼', color: 'bg-blue-500' },
                    { name: 'GitHub', icon: '💻', color: 'bg-gray-700' },
                  ].map(social => (
                    <button
                      key={social.name}
                      className={`p-2 ${social.color} text-white rounded-lg hover:opacity-80 transition-opacity duration-200`}
                      title={social.name}
                    >
                      <span className="text-sm">{social.icon}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 医疗服务时间 */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">服务时间</h3>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-red-200/30 dark:border-gray-700/50">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">急救服务</span>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      24/7
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">在线咨询</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      8:00-22:00
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">技术支持</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      9:00-18:00
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">客服热线</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      24/7
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">系统运行正常</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 底部版权信息 */}
          <div className="mt-12 pt-8 border-t border-red-200/30 dark:border-gray-700">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                © 2024 MedChain. 保留所有权利. |
                <a href="#privacy" className="hover:text-red-600 dark:hover:text-red-400 ml-1">
                  隐私政策
                </a>{' '}
                |
                <a href="#terms" className="hover:text-red-600 dark:hover:text-red-400 ml-1">
                  服务条款
                </a>{' '}
                |
                <a href="#compliance" className="hover:text-red-600 dark:hover:text-red-400 ml-1">
                  合规声明
                </a>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span>ICP备案号: 京ICP备2024000001号</span>
                <span>|</span>
                <span>医疗器械经营许可证: 京食药监械经营许20240001号</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* 固定底部快捷操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        {/* 展开内容 */}
        {isExpanded && (
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-red-200/50 dark:border-gray-700/50 shadow-2xl">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">快速操作</h3>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {quickActions.map(action => (
                  <button
                    key={action.id}
                    onClick={action.action}
                    className="relative p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-red-200/30 dark:border-gray-600 hover:shadow-lg transition-all duration-200 group"
                  >
                    {action.badge && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {action.badge}
                      </div>
                    )}
                    <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">
                      {action.icon}
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {action.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 底部标签栏 */}
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-red-200/50 dark:border-gray-700/50 shadow-2xl">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex space-x-6">
              <button
                onClick={() => setActiveTab('quick')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  activeTab === 'quick'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                }`}
              >
                <span className="text-lg">⚡</span>
                <span className="text-sm font-medium">快捷</span>
              </button>

              <button
                onClick={() => setActiveTab('emergency')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  activeTab === 'emergency'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                }`}
              >
                <span className="text-lg">🚨</span>
                <span className="text-sm font-medium">急救</span>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              </button>

              <button
                onClick={() => setActiveTab('support')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  activeTab === 'support'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                }`}
              >
                <span className="text-lg">💬</span>
                <span className="text-sm font-medium">支持</span>
              </button>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:shadow-lg transition-all duration-200"
            >
              <span
                className={`text-lg transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              >
                ⬆️
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 底部间距 */}
      <div className="h-16"></div>
    </>
  );
};

export default MedicalFooter;
