import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../contexts/ThemeContext';

/**
 * 页脚组件
 * 显示版权信息、链接和社交媒体图标
 */
const Footer: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [showModal, setShowModal] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; delay: number }>
  >([]);

  useEffect(() => {
    setIsVisible(true);
    // 生成浮动粒子
    const newParticles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  // 处理链接点击事件
  const handleLinkClick = (type: string) => {
    setShowModal(type);
  };

  // 关闭模态框
  const closeModal = () => {
    setShowModal(null);
  };

  // 获取模态框内容
  const getModalContent = (type: string) => {
    switch (type) {
      case 'encryption':
        return {
          title: '数据加密存储',
          content:
            '我们采用AES-256加密算法对所有医疗数据进行端到端加密，确保数据在传输和存储过程中的安全性。所有敏感信息都经过多层加密保护，只有授权用户才能访问。',
        };
      case 'cloud':
        return {
          title: '云端同步',
          content:
            '基于分布式云架构，实现多节点数据同步备份。支持实时数据同步，确保医疗记录在不同设备和地点都能及时更新，提供7x24小时不间断服务。',
        };
      case 'collaboration':
        return {
          title: '多方协作',
          content:
            '支持医院、诊所、患者等多方参与的协作模式。通过智能合约管理权限，实现安全的数据共享和协作流程，提高医疗服务效率。',
        };
      case 'global':
        return {
          title: '全球部署',
          content:
            '在全球多个地区部署节点，确保服务的高可用性和低延迟。符合各国医疗数据保护法规，支持跨境医疗数据安全传输。',
        };
      case 'privacy':
        return {
          title: '隐私政策',
          content:
            '我们严格遵守GDPR、HIPAA等国际隐私保护法规。承诺不会未经授权收集、使用或分享您的个人医疗信息。您拥有数据的完全控制权，可随时查看、修改或删除您的信息。',
        };
      case 'terms':
        return {
          title: '服务条款',
          content:
            '使用MedChain平台即表示您同意遵守我们的服务条款。我们提供安全可靠的医疗数据管理服务，用户需合法合规使用平台功能，不得进行任何违法活动。',
        };
      case 'data-agreement':
        return {
          title: '数据使用协议',
          content:
            '明确规定数据的收集、处理、存储和使用方式。我们仅在提供服务所必需的范围内使用您的数据，并采取严格的安全措施保护数据安全。',
        };
      case 'compliance':
        return {
          title: '合规声明',
          content:
            '我们严格遵守医疗行业相关法规，包括但不限于医疗器械管理条例、网络安全法等。定期接受第三方安全审计，确保平台的合规性和安全性。',
        };
      case 'support':
        return {
          title: '技术支持',
          content:
            '我们提供7x24小时技术支持服务。如遇问题，请通过以下方式联系我们：\n\n📧 邮箱：support@medchain.com\n📞 电话：400-888-9999\n💬 在线客服：工作日9:00-18:00\n\n我们的技术团队将在第一时间为您解决问题。',
        };
      default:
        return {
          title: '信息',
          content: '感谢您对MedChain的关注！',
        };
    }
  };

  return (
    <footer
      className={`mt-auto relative overflow-hidden transition-all duration-1000 transform ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      } ${
        isDark
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-300'
          : 'bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-600'
      }`}
    >
      {/* 增强的装饰性背景元素 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 right-0 w-40 h-40 bg-purple-500 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        ></div>
        <div
          className="absolute top-1/2 left-1/3 w-24 h-24 bg-green-500 rounded-full blur-2xl animate-pulse"
          style={{ animationDelay: '2s' }}
        ></div>
        <div
          className="absolute top-1/4 right-1/4 w-28 h-28 bg-pink-500 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '3s' }}
        ></div>

        {/* 浮动粒子 */}
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-float opacity-30"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}

        {/* 动画网格 */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-12 gap-4 h-full">
            {Array.from({ length: 48 }, (_, i) => (
              <div
                key={i}
                className="border border-blue-500/20 animate-pulse"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '4s',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* 主要内容区域 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* 公司信息 */}
            <div className="space-y-4 transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center space-x-3 group">
                <div className="relative p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg group-hover:shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                  <span className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300">
                    🧊
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent group-hover:from-blue-500 group-hover:to-purple-500 transition-all duration-300">
                  MedChain
                </h3>
                <div className="flex space-x-1">
                  <span className="w-3 h-3 text-yellow-400 animate-pulse">⭐</span>
                  <span
                    className="w-3 h-3 text-yellow-400 animate-pulse"
                    style={{ animationDelay: '0.2s' }}
                  >
                    ⭐
                  </span>
                  <span
                    className="w-3 h-3 text-yellow-400 animate-pulse"
                    style={{ animationDelay: '0.4s' }}
                  >
                    ⭐
                  </span>
                </div>
              </div>
              <p
                className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
              >
                基于区块链技术的医疗数据共享平台，为医疗行业提供安全、透明、高效的数据管理解决方案。
              </p>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 group cursor-pointer">
                  <span className="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform duration-200">
                    🛡️
                  </span>
                  <span className="text-xs text-green-500 font-medium group-hover:text-green-400 transition-colors duration-200">
                    安全认证
                  </span>
                </div>
                <div className="flex items-center space-x-2 group cursor-pointer">
                  <span className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform duration-200">
                    📜
                  </span>
                  <span className="text-xs text-blue-500 font-medium group-hover:text-blue-400 transition-colors duration-200">
                    ISO 27001
                  </span>
                </div>
                <div className="flex items-center space-x-2 group cursor-pointer">
                  <span className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform duration-200">
                    🚀
                  </span>
                  <span className="text-xs text-purple-500 font-medium group-hover:text-purple-400 transition-colors duration-200">
                    创新技术
                  </span>
                </div>
              </div>
            </div>

            {/* 产品服务 */}
            <div className="space-y-4 transform hover:scale-105 transition-all duration-300">
              <h4 className="text-base font-semibold mb-4 flex items-center space-x-2 group">
                <div className="relative">
                  <span className="w-4 h-4 text-blue-500 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                    📈
                  </span>
                  <div className="absolute inset-0 bg-blue-400 rounded-full opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-300"></div>
                </div>
                <span className="group-hover:text-blue-500 transition-colors duration-300">
                  产品服务
                </span>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  ></div>
                  <div
                    className="w-1 h-1 bg-green-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                </div>
              </h4>
              <ul className="space-y-3">
                <li className="group">
                  <button
                    onClick={() => handleLinkClick('encryption')}
                    className={`text-sm hover:text-blue-500 transition-all duration-300 flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transform hover:translate-x-2 ${
                      isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'
                    }`}
                  >
                    <div className="relative">
                      <span className="w-3 h-3 group-hover:scale-110 transition-transform duration-200">
                        🔒
                      </span>
                      <div className="absolute inset-0 bg-blue-400 rounded-full opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></div>
                    </div>
                    <span className="group-hover:font-medium transition-all duration-200">
                      数据加密存储
                    </span>
                    <div className="w-0 group-hover:w-2 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 rounded-full"></div>
                  </button>
                </li>
                <li className="group">
                  <button
                    onClick={() => handleLinkClick('cloud')}
                    className={`text-sm hover:text-blue-500 transition-all duration-300 flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transform hover:translate-x-2 ${
                      isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'
                    }`}
                  >
                    <div className="relative">
                      <span className="w-3 h-3 group-hover:scale-110 transition-transform duration-200">
                        ☁️
                      </span>
                      <div className="absolute inset-0 bg-blue-400 rounded-full opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></div>
                    </div>
                    <span className="group-hover:font-medium transition-all duration-200">
                      云端同步
                    </span>
                    <div className="w-0 group-hover:w-2 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 rounded-full"></div>
                  </button>
                </li>
                <li className="group">
                  <button
                    onClick={() => handleLinkClick('collaboration')}
                    className={`text-sm hover:text-blue-500 transition-all duration-300 flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transform hover:translate-x-2 ${
                      isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'
                    }`}
                  >
                    <div className="relative">
                      <span className="w-3 h-3 group-hover:scale-110 transition-transform duration-200">
                        👥
                      </span>
                      <div className="absolute inset-0 bg-blue-400 rounded-full opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></div>
                    </div>
                    <span className="group-hover:font-medium transition-all duration-200">
                      多方协作
                    </span>
                    <div className="w-0 group-hover:w-2 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 rounded-full"></div>
                  </button>
                </li>
                <li className="group">
                  <button
                    onClick={() => handleLinkClick('global')}
                    className={`text-sm hover:text-blue-500 transition-all duration-300 flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transform hover:translate-x-2 ${
                      isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'
                    }`}
                  >
                    <div className="relative">
                      <span className="w-3 h-3 group-hover:scale-110 transition-transform duration-200">
                        🌐
                      </span>
                      <div className="absolute inset-0 bg-blue-400 rounded-full opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></div>
                    </div>
                    <span className="group-hover:font-medium transition-all duration-200">
                      全球部署
                    </span>
                    <div className="w-0 group-hover:w-2 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 rounded-full"></div>
                  </button>
                </li>
              </ul>
            </div>

            {/* 法律信息 */}
            <div className="space-y-4 transform hover:scale-105 transition-all duration-300">
              <h4 className="text-base font-semibold mb-4 flex items-center space-x-2 group">
                <div className="relative">
                  <span className="w-4 h-4 text-purple-500 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                    🏆
                  </span>
                  <div className="absolute inset-0 bg-purple-400 rounded-full opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-300"></div>
                </div>
                <span className="group-hover:text-purple-500 transition-colors duration-300">
                  法律信息
                </span>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="w-3 h-3 text-purple-400 animate-pulse">📜</span>
                </div>
              </h4>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={() => handleLinkClick('privacy')}
                    className={`text-sm hover:text-blue-500 transition-colors cursor-pointer ${
                      isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'
                    }`}
                  >
                    {t('footer.privacy', '隐私政策')}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleLinkClick('terms')}
                    className={`text-sm hover:text-blue-500 transition-colors cursor-pointer ${
                      isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'
                    }`}
                  >
                    {t('footer.terms', '服务条款')}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleLinkClick('data-agreement')}
                    className={`text-sm hover:text-blue-500 transition-colors cursor-pointer ${
                      isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'
                    }`}
                  >
                    数据使用协议
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleLinkClick('compliance')}
                    className={`text-sm hover:text-blue-500 transition-colors cursor-pointer ${
                      isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'
                    }`}
                  >
                    合规声明
                  </button>
                </li>
              </ul>
            </div>

            {/* 联系我们 */}
            <div className="space-y-4 transform hover:scale-105 transition-all duration-300">
              <h4 className="text-base font-semibold mb-4 flex items-center space-x-2 group">
                <div className="relative">
                  <span className="w-4 h-4 text-green-500 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                    📞
                  </span>
                  <div className="absolute inset-0 bg-green-400 rounded-full opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-300"></div>
                </div>
                <span className="group-hover:text-green-500 transition-colors duration-300">
                  联系我们
                </span>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                </div>
              </h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 group cursor-pointer p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-300">
                  <div className="relative">
                    <span className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform duration-200">
                      📧
                    </span>
                    <div className="absolute inset-0 bg-blue-400 rounded-full opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></div>
                  </div>
                  <span className="text-sm group-hover:text-blue-500 group-hover:font-medium transition-all duration-200">
                    support@medchain.com
                  </span>
                  <div className="w-0 group-hover:w-2 h-0.5 bg-gradient-to-r from-blue-400 to-green-400 transition-all duration-300 rounded-full"></div>
                </div>
                <div className="flex items-center space-x-3 group cursor-pointer p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-300">
                  <div className="relative">
                    <span className="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform duration-200">
                      📞
                    </span>
                    <div className="absolute inset-0 bg-green-400 rounded-full opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></div>
                  </div>
                  <span className="text-sm group-hover:text-green-500 group-hover:font-medium transition-all duration-200">
                    400-888-9999
                  </span>
                  <div className="w-0 group-hover:w-2 h-0.5 bg-gradient-to-r from-green-400 to-blue-400 transition-all duration-300 rounded-full"></div>
                </div>
                <div className="flex items-center space-x-3 group cursor-pointer p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300">
                  <div className="relative">
                    <span className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform duration-200">
                      📍
                    </span>
                    <div className="absolute inset-0 bg-red-400 rounded-full opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></div>
                  </div>
                  <span className="text-sm group-hover:text-red-500 group-hover:font-medium transition-all duration-200">
                    北京市朝阳区科技园
                  </span>
                  <div className="w-0 group-hover:w-2 h-0.5 bg-gradient-to-r from-red-400 to-purple-400 transition-all duration-300 rounded-full"></div>
                </div>
                <button
                  onClick={() => handleLinkClick('support')}
                  className={`text-sm hover:text-blue-500 transition-all duration-300 inline-flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transform hover:translate-x-2 group ${
                    isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'
                  }`}
                >
                  <div className="relative">
                    <span className="w-3 h-3 group-hover:scale-110 transition-transform duration-200">
                      💻
                    </span>
                    <div className="absolute inset-0 bg-blue-400 rounded-full opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></div>
                  </div>
                  <span className="group-hover:font-medium transition-all duration-200">
                    {t('footer.support', '技术支持')}
                  </span>
                  <div className="w-0 group-hover:w-2 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 rounded-full"></div>
                </button>
              </div>
            </div>
          </div>

          {/* 分隔线 */}
          <div className={`border-t pt-8 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
              {/* 版权信息 */}
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">
                    © 2024 {t('common.appName', 'MedChain')}.{' '}
                    {t('footer.allRightsReserved', 'All rights reserved.')}
                  </span>
                  <span className="text-red-500 animate-pulse">
                    <span className="w-4 h-4">❤️</span>
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 text-green-500">🛡️</span>
                    <span className="text-xs text-green-500 font-medium">安全合规</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 text-blue-500">🧊</span>
                    <span className="text-xs text-blue-500 font-medium">区块链驱动</span>
                  </div>
                </div>
              </div>

              {/* 社交媒体图标 */}
              <div className="flex items-center space-x-4 group">
                <span className="text-sm font-medium mr-2 group-hover:text-blue-500 transition-colors duration-300">
                  关注我们:
                </span>
                <div className="flex space-x-3">
                  <a
                    href="https://github.com/medchain"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`relative p-3 rounded-full transition-all duration-300 hover:scale-125 hover:shadow-xl hover:-translate-y-1 group/social ${
                      isDark
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
                        : 'bg-gray-100 hover:bg-gray-800 text-gray-600 hover:text-white'
                    }`}
                    title="GitHub - 查看我们的开源项目"
                  >
                    <span className="w-4 h-4 group-hover/social:rotate-12 transition-transform duration-300">
                      📁
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-600 to-gray-800 rounded-full opacity-0 group-hover/social:opacity-20 transition-opacity duration-300"></div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full opacity-0 group-hover/social:opacity-30 blur transition-opacity duration-300"></div>
                  </a>
                  <a
                    href="https://linkedin.com/company/medchain"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`relative p-3 rounded-full transition-all duration-300 hover:scale-125 hover:shadow-xl hover:-translate-y-1 group/social ${
                      isDark
                        ? 'bg-gray-700 hover:bg-blue-600 text-gray-300 hover:text-white'
                        : 'bg-gray-100 hover:bg-blue-600 text-gray-600 hover:text-white'
                    }`}
                    title="LinkedIn - 关注我们的最新动态"
                  >
                    <span className="w-4 h-4 group-hover/social:rotate-12 transition-transform duration-300">
                      💼
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full opacity-0 group-hover/social:opacity-20 transition-opacity duration-300"></div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full opacity-0 group-hover/social:opacity-30 blur transition-opacity duration-300"></div>
                  </a>
                  <a
                    href="https://twitter.com/medchain_tech"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`relative p-3 rounded-full transition-all duration-300 hover:scale-125 hover:shadow-xl hover:-translate-y-1 group/social ${
                      isDark
                        ? 'bg-gray-700 hover:bg-blue-400 text-gray-300 hover:text-white'
                        : 'bg-gray-100 hover:bg-blue-400 text-gray-600 hover:text-white'
                    }`}
                    title="Twitter - 获取实时更新"
                  >
                    <span className="w-4 h-4 group-hover/social:rotate-12 transition-transform duration-300">
                      🐦
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full opacity-0 group-hover/social:opacity-20 transition-opacity duration-300"></div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-300 to-blue-500 rounded-full opacity-0 group-hover/social:opacity-30 blur transition-opacity duration-300"></div>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* 技术信息 */}
          <div
            className={`mt-6 pt-6 border-t transition-all duration-500 ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6">
                <span
                  className={`text-xs flex items-center space-x-2 group cursor-pointer p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 ${
                    isDark
                      ? 'text-gray-400 hover:text-blue-400'
                      : 'text-gray-500 hover:text-blue-600'
                  }`}
                >
                  <div className="relative">
                    <span className="w-3 h-3 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                      🧊
                    </span>
                    <div className="absolute inset-0 bg-blue-400 rounded-full opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></div>
                  </div>
                  <span className="group-hover:font-medium transition-all duration-200">
                    {t('footer.poweredBy', 'Powered by')} Hyperledger Fabric & React
                  </span>
                </span>
                <div className="flex items-center space-x-4">
                  <span
                    className={`text-xs flex items-center space-x-1 group cursor-pointer p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-300 ${
                      isDark
                        ? 'text-gray-400 hover:text-green-400'
                        : 'text-gray-500 hover:text-green-600'
                    }`}
                  >
                    <span className="group-hover:scale-110 transition-transform duration-200">
                      🔒
                    </span>
                    <span className="group-hover:font-medium transition-all duration-200">
                      256位加密
                    </span>
                  </span>
                  <span
                    className={`text-xs flex items-center space-x-1 group cursor-pointer p-2 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all duration-300 ${
                      isDark
                        ? 'text-gray-400 hover:text-yellow-400'
                        : 'text-gray-500 hover:text-yellow-600'
                    }`}
                  >
                    <span className="group-hover:scale-110 transition-transform duration-200">
                      ⚡
                    </span>
                    <span className="group-hover:font-medium transition-all duration-200">
                      99.9%可用性
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span
                  className={`text-xs group cursor-pointer p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300 ${
                    isDark
                      ? 'text-gray-400 hover:text-purple-400'
                      : 'text-gray-500 hover:text-purple-600'
                  }`}
                >
                  <span className="group-hover:font-medium transition-all duration-200">
                    {t('footer.version', 'Version')} 1.0.0
                  </span>
                </span>
                <div className="flex items-center space-x-2 group cursor-pointer p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-300">
                  <div className="relative">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse group-hover:animate-ping"></div>
                    <div className="absolute inset-0 bg-green-400 rounded-full opacity-0 group-hover:opacity-50 blur-sm transition-opacity duration-300"></div>
                  </div>
                  <span className="text-xs text-green-500 font-medium group-hover:text-green-400 transition-colors duration-200">
                    系统正常
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 模态框 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-all duration-300"
            onClick={closeModal}
          ></div>

          {/* 模态框内容 */}
          <div
            className={`relative max-w-2xl w-full max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl transform transition-all duration-300 animate-slideUp hover:scale-105 ${
              isDark
                ? 'bg-gray-800 text-white border border-gray-700'
                : 'bg-white text-gray-900 border border-gray-200'
            }`}
          >
            {/* 装饰性背景 */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse"></div>
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl animate-float"></div>
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-green-400/10 to-blue-400/10 rounded-full blur-3xl animate-float-delayed"></div>
            </div>

            {/* 头部 */}
            <div
              className={`relative flex items-center justify-between p-6 border-b backdrop-blur-sm ${
                isDark ? 'border-gray-700 bg-gray-800/80' : 'border-gray-200 bg-white/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 bg-blue-400 rounded-full opacity-50 blur-sm animate-ping"></div>
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {getModalContent(showModal).title}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className={`relative p-2 rounded-full transition-all duration-300 hover:scale-110 hover:rotate-90 group ${
                  isDark
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="w-5 h-5 transition-transform duration-300">❌</span>
                <div className="absolute inset-0 bg-red-400 rounded-full opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-300"></div>
              </button>
            </div>

            {/* 内容 */}
            <div className="relative p-6">
              <div
                className={`text-sm leading-relaxed whitespace-pre-line transition-all duration-300 ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                {getModalContent(showModal).content}
              </div>

              {/* 装饰性元素 */}
              <div className="absolute top-4 right-4 opacity-10">
                <div className="w-16 h-16 border-2 border-dashed border-blue-400 rounded-full animate-spin-slow"></div>
              </div>
            </div>

            {/* 底部 */}
            <div
              className={`relative flex justify-end p-6 border-t backdrop-blur-sm ${
                isDark ? 'border-gray-700 bg-gray-800/80' : 'border-gray-200 bg-white/80'
              }`}
            >
              <button
                onClick={closeModal}
                className="relative px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all duration-300 font-medium transform hover:scale-105 hover:shadow-lg group overflow-hidden"
              >
                <span className="relative z-10">关闭</span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-30 blur transition-opacity duration-300 rounded-lg"></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;
