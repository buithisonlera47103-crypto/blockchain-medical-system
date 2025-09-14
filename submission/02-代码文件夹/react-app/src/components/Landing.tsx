import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import EnhancedNavigation from './EnhancedNavigation';
import Footer from './Footer';
const Landing: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: '🛡️',
      title: '数据安全保护',
      description: '采用256位加密算法，确保医疗数据在传输和存储过程中的绝对安全',
      color: 'bg-blue-500',
    },
    {
      icon: '🧊',
      title: '区块链技术',
      description: '基于Hyperledger Fabric构建，保证数据不可篡改和完整性验证',
      color: 'bg-purple-500',
    },
    {
      icon: '🌐',
      title: '去中心化网络',
      description: '分布式架构设计，消除单点故障，提供7x24小时稳定服务',
      color: 'bg-green-500',
    },
    {
      icon: '🌐',
      title: '全球互通',
      description: '支持跨地区、跨机构的医疗数据安全共享和协作',
      color: 'bg-orange-500',
    },
  ];

  const stats = [
    { number: '10,000+', label: '医疗记录', icon: '🧰' },
    { number: '500+', label: '医疗机构', icon: '🏥' },
    { number: '2,000+', label: '医护人员', icon: '👨‍⚕️' },
    { number: '99.9%', label: '系统可用性', icon: '❤️' },
  ];

  const benefits = [
    {
      title: '提高诊疗效率',
      description: '医生可快速获取患者完整病史，提升诊断准确性',
      icon: '📈',
    },
    {
      title: '保护患者隐私',
      description: '基于智能合约的权限控制，患者完全掌控数据访问权',
      icon: '🔑',
    },
    {
      title: '降低医疗成本',
      description: '避免重复检查和治疗，优化医疗资源配置',
      icon: '🗄️',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative">
      {/* Enhanced Navigation */}
      <EnhancedNavigation />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Simple background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-30"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-30"></div>
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-30"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center">
            {/* Logo and Title with enhanced animation */}
            <div
              className={`flex items-center justify-center mb-8 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
            >
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                <div className="relative p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl mr-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="h-12 w-12 text-white">🏥</span>
                </div>
              </div>
              <div className="text-left">
                <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-2 bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
                  MedChain
                </h1>
                <p className="text-lg text-blue-600 dark:text-blue-400 font-medium flex items-center">
                  <span className="mr-2 animate-bounce">🚀</span>
                  区块链医疗数据共享平台
                </p>
              </div>
            </div>

            {/* Main Headline with enhanced gradient */}
            <h2
              className={`text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight transform transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
            >
              安全、透明、
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient-x">
                  可信赖
                </span>
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              </span>
              <br />
              的医疗数据管理
            </h2>

            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              基于区块链技术构建的下一代医疗数据共享平台，为医疗机构、医护人员和患者提供安全、高效的数据管理解决方案
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                to="/login"
                className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-medical-primary to-medical-accent text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 backdrop-blur-sm border border-medical-primary/20"
              >
                立即登录
                <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">
                  ➡️
                </span>
              </Link>
              <Link
                to="/register"
                className="group inline-flex items-center px-8 py-4 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl border border-medical-primary/30 dark:border-gray-700 transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 backdrop-blur-sm"
              >
                免费注册
                <span className="ml-2 group-hover:scale-110 transition-transform duration-300">
                  👥
                </span>
              </Link>
              <Link
                to="/admin-login"
                className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 backdrop-blur-sm border border-purple-600/20"
              >
                管理员登录
                <span className="ml-2 group-hover:rotate-12 transition-transform duration-300">
                  🔐
                </span>
              </Link>
            </div>

            {/* Demo Video Button */}
            <button className="group inline-flex items-center text-medical-primary dark:text-medical-primary/80 font-medium hover:text-medical-accent dark:hover:text-medical-accent/80 transition-colors duration-300">
              <div className="p-3 bg-medical-primary/10 dark:bg-medical-primary/20 rounded-full mr-3 group-hover:bg-medical-primary/20 dark:group-hover:bg-medical-primary/30 transition-colors duration-300 backdrop-blur-sm">
                <span className="h-4 w-4">▶️</span>
              </div>
              观看产品演示
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section - 升级版医疗统计信息 */}
      <div className="py-20 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-blue-900/30 dark:via-cyan-900/30 dark:to-teal-900/30 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-cyan-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '1s' }}
          ></div>
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-teal-300/15 to-blue-300/15 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '2s' }}
          ></div>
          {/* 浮动医疗图标 */}
          <div className="absolute top-20 right-20 text-4xl text-blue-400/30 animate-float">🧰</div>
          <div className="absolute bottom-32 left-32 text-3xl text-cyan-400/30 animate-float-delayed">
            🏥
          </div>
          <div className="absolute top-1/3 right-1/4 text-2xl text-teal-400/30 animate-float">
            👨‍⚕️
          </div>
          <div className="absolute bottom-20 left-1/4 text-3xl text-blue-400/30 animate-float-delayed">
            ❤️
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {/* 标题部分 */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 rounded-3xl mb-8 shadow-2xl">
              <span className="text-3xl text-white">📊</span>
            </div>
            <h3 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent mb-6">
              平台统计数据
            </h3>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              实时展示MedChain平台的核心数据指标，见证我们在医疗数据管理领域的卓越表现
            </p>
          </div>

          {/* 统计卡片网格 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const gradients = [
                'from-blue-500 via-blue-600 to-blue-700',
                'from-cyan-500 via-cyan-600 to-cyan-700',
                'from-teal-500 via-teal-600 to-teal-700',
                'from-emerald-500 via-emerald-600 to-emerald-700',
              ];
              const bgGradients = [
                'from-blue-100/80 to-blue-200/80 dark:from-blue-900/40 dark:to-blue-800/40',
                'from-cyan-100/80 to-cyan-200/80 dark:from-cyan-900/40 dark:to-cyan-800/40',
                'from-teal-100/80 to-teal-200/80 dark:from-teal-900/40 dark:to-teal-800/40',
                'from-emerald-100/80 to-emerald-200/80 dark:from-emerald-900/40 dark:to-emerald-800/40',
              ];
              const borderColors = [
                'border-blue-300/60 dark:border-blue-600/40',
                'border-cyan-300/60 dark:border-cyan-600/40',
                'border-teal-300/60 dark:border-teal-600/40',
                'border-emerald-300/60 dark:border-emerald-600/40',
              ];
              const textColors = [
                'text-blue-700 dark:text-blue-300',
                'text-cyan-700 dark:text-cyan-300',
                'text-teal-700 dark:text-teal-300',
                'text-emerald-700 dark:text-emerald-300',
              ];

              return (
                <div
                  key={index}
                  className={`group bg-white/95 dark:bg-gray-800/95 rounded-3xl p-8 shadow-xl hover:shadow-2xl transform hover:-translate-y-3 hover:scale-105 transition-all duration-500 border-2 ${borderColors[index]} backdrop-blur-lg relative overflow-hidden`}
                >
                  {/* 悬停背景效果 */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${bgGradients[index]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  ></div>

                  <div className="relative z-10">
                    {/* 图标容器 */}
                    <div className="flex items-center justify-center mb-6">
                      <div
                        className={`p-4 bg-gradient-to-r ${gradients[index]} rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl`}
                      >
                        <span className="text-4xl text-white flex items-center justify-center">
                          {stat.icon}
                        </span>
                      </div>
                    </div>

                    {/* 数字显示 */}
                    <div
                      className={`text-4xl font-bold ${textColors[index]} mb-3 group-hover:scale-110 transition-all duration-300`}
                    >
                      {stat.number}
                    </div>

                    {/* 标签文字 */}
                    <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300">
                      {stat.label}
                    </div>

                    {/* 装饰性进度条 */}
                    <div className="mt-4 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${gradients[index]} rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 delay-200`}
                      ></div>
                    </div>
                  </div>

                  {/* 闪光效果 */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 底部补充信息 */}
          <div className="mt-16 text-center">
            <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl px-8 py-4 shadow-lg backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/30 inline-block">
              <span className="text-blue-600 dark:text-blue-400 font-semibold text-lg">
                🔥 数据实时更新，展现平台活力
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-900/20 dark:via-amber-900/20 dark:to-yellow-900/20 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-orange-300/20 to-amber-300/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-amber-300/20 to-yellow-300/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-yellow-200/15 to-orange-200/15 rounded-full blur-3xl"></div>
          {/* Floating medical icons */}
          <div className="absolute top-32 right-32 text-4xl text-orange-300/30 animate-float">
            🧬
          </div>
          <div className="absolute bottom-32 left-32 text-3xl text-amber-300/30 animate-float-delayed">
            ⚕️
          </div>
          <div className="absolute top-1/3 right-1/4 text-2xl text-yellow-300/30 animate-float">
            🔬
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500 rounded-3xl mb-8 shadow-2xl">
              <span className="text-3xl text-white">🚀</span>
            </div>
            <h3 className="text-5xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent mb-6">
              核心技术特性
            </h3>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              采用最先进的区块链技术，为医疗数据管理提供前所未有的安全性和可靠性
            </p>
            <div className="mt-8 flex justify-center">
              <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl px-6 py-3 shadow-lg backdrop-blur-sm border border-orange-200/50 dark:border-orange-700/30">
                <span className="text-orange-600 dark:text-orange-400 font-semibold">
                  🔥 企业级区块链解决方案
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const gradients = [
                'from-orange-400 to-amber-500',
                'from-amber-400 to-yellow-500',
                'from-yellow-400 to-orange-500',
                'from-orange-500 to-red-500',
              ];
              const bgGradients = [
                'from-orange-100/60 to-amber-100/60 dark:from-orange-900/30 dark:to-amber-900/30',
                'from-amber-100/60 to-yellow-100/60 dark:from-amber-900/30 dark:to-yellow-900/30',
                'from-yellow-100/60 to-orange-100/60 dark:from-yellow-900/30 dark:to-orange-900/30',
                'from-orange-100/60 to-red-100/60 dark:from-orange-900/30 dark:to-red-900/30',
              ];
              const borderColors = [
                'border-orange-200/60 dark:border-orange-700/40',
                'border-amber-200/60 dark:border-amber-700/40',
                'border-yellow-200/60 dark:border-yellow-700/40',
                'border-orange-200/60 dark:border-red-700/40',
              ];
              const textColors = [
                'text-orange-600 dark:text-orange-400',
                'text-amber-600 dark:text-amber-400',
                'text-yellow-600 dark:text-yellow-400',
                'text-orange-600 dark:text-red-400',
              ];

              return (
                <div
                  key={index}
                  className={`group bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 shadow-xl hover:shadow-2xl transform hover:-translate-y-3 hover:scale-105 transition-all duration-500 border ${borderColors[index]} backdrop-blur-sm animate-fade-scale relative overflow-hidden`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${bgGradients[index]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  ></div>
                  <div className="relative z-10">
                    <div
                      className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r ${gradients[index]} rounded-3xl mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl`}
                    >
                      <span className="text-3xl text-white">{feature.icon}</span>
                    </div>
                    <h4
                      className={`text-2xl font-bold ${textColors[index]} mb-4 group-hover:scale-105 transition-all duration-300`}
                    >
                      {feature.title}
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg mb-6">
                      {feature.description}
                    </p>

                    {/* Feature highlights */}
                    <div className="space-y-2">
                      {index === 0 && (
                        <>
                          <div className="flex items-center text-sm text-orange-600 dark:text-orange-400 font-medium">
                            <span className="mr-2">🔐</span>
                            AES-256 军用级加密
                          </div>
                          <div className="flex items-center text-sm text-orange-600 dark:text-orange-400 font-medium">
                            <span className="mr-2">🛡️</span>
                            零知识证明技术
                          </div>
                        </>
                      )}
                      {index === 1 && (
                        <>
                          <div className="flex items-center text-sm text-amber-600 dark:text-amber-400 font-medium">
                            <span className="mr-2">⚡</span>
                            1000+ TPS 处理能力
                          </div>
                          <div className="flex items-center text-sm text-amber-600 dark:text-amber-400 font-medium">
                            <span className="mr-2">🔗</span>
                            不可篡改数据链
                          </div>
                        </>
                      )}
                      {index === 2 && (
                        <>
                          <div className="flex items-center text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                            <span className="mr-2">🌐</span>
                            99.99% 系统可用性
                          </div>
                          <div className="flex items-center text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                            <span className="mr-2">⚖️</span>
                            负载均衡架构
                          </div>
                        </>
                      )}
                      {index === 3 && (
                        <>
                          <div className="flex items-center text-sm text-orange-600 dark:text-red-400 font-medium">
                            <span className="mr-2">🤝</span>
                            跨链互操作性
                          </div>
                          <div className="flex items-center text-sm text-orange-600 dark:text-red-400 font-medium">
                            <span className="mr-2">🌍</span>
                            全球标准兼容
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Technology stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 shadow-lg backdrop-blur-sm border border-orange-200/50 dark:border-orange-700/30">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                256-bit
              </div>
              <div className="text-gray-600 dark:text-gray-400">加密强度</div>
            </div>
            <div className="text-center bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 shadow-lg backdrop-blur-sm border border-amber-200/50 dark:border-amber-700/30">
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                1000+
              </div>
              <div className="text-gray-600 dark:text-gray-400">TPS 处理</div>
            </div>
            <div className="text-center bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 shadow-lg backdrop-blur-sm border border-yellow-200/50 dark:border-yellow-700/30">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                99.99%
              </div>
              <div className="text-gray-600 dark:text-gray-400">可用性</div>
            </div>
            <div className="text-center bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 shadow-lg backdrop-blur-sm border border-orange-200/50 dark:border-red-700/30">
              <div className="text-3xl font-bold text-orange-600 dark:text-red-400 mb-2">24/7</div>
              <div className="text-gray-600 dark:text-gray-400">技术支持</div>
            </div>
          </div>
        </div>
      </div>

      {/* Technology Architecture Section */}
      <div className="py-20 bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-50 dark:from-sky-900/20 dark:via-cyan-900/20 dark:to-blue-900/20 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-sky-300/20 to-cyan-300/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-cyan-300/20 to-blue-300/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-gradient-to-r from-blue-200/15 to-sky-200/15 rounded-full blur-3xl"></div>
          {/* Floating tech icons */}
          <div className="absolute top-20 right-20 text-4xl text-sky-300/30 animate-float">🏗️</div>
          <div className="absolute bottom-40 left-40 text-3xl text-cyan-300/30 animate-float-delayed">
            🔧
          </div>
          <div className="absolute top-2/3 right-1/3 text-2xl text-blue-300/30 animate-float">
            ⚙️
          </div>
          <div className="absolute bottom-20 right-1/4 text-3xl text-sky-300/30 animate-float-delayed">
            🔩
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-sky-400 via-cyan-500 to-blue-500 rounded-3xl mb-8 shadow-2xl">
              <span className="text-4xl text-white">🏗️</span>
            </div>
            <h3 className="text-5xl font-bold bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent mb-6">
              技术架构
            </h3>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed mb-8">
              基于Hyperledger Fabric的企业级区块链架构，确保数据安全与系统稳定
            </p>
            <div className="flex justify-center space-x-4">
              <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl px-6 py-3 shadow-lg backdrop-blur-sm border border-sky-200/50 dark:border-sky-700/30">
                <span className="text-sky-600 dark:text-sky-400 font-semibold">🔥 企业级架构</span>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl px-6 py-3 shadow-lg backdrop-blur-sm border border-cyan-200/50 dark:border-cyan-700/30">
                <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                  ⚡ 高性能设计
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16">
            {/* Blockchain Layer */}
            <div className="group bg-white/90 dark:bg-gray-800/90 rounded-3xl p-10 border border-sky-200/60 dark:border-sky-700/40 hover:shadow-2xl transition-all duration-500 relative overflow-hidden transform hover:-translate-y-4 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-100/60 to-cyan-100/60 dark:from-sky-900/30 dark:to-cyan-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-sky-400 to-cyan-500 rounded-3xl mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl">
                  <span className="text-4xl text-white">🔗</span>
                </div>
                <h4 className="text-3xl font-bold text-sky-600 dark:text-sky-400 mb-6 group-hover:scale-105 transition-all duration-300">
                  区块链层
                </h4>
                <p className="text-gray-700 dark:text-gray-300 mb-8 text-lg leading-relaxed">
                  Hyperledger Fabric提供企业级区块链基础设施，确保数据不可篡改
                </p>

                {/* Architecture details */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-center text-sky-600 dark:text-sky-400 font-medium">
                    <span className="mr-3 text-xl">🔐</span>
                    <span>智能合约管理</span>
                  </div>
                  <div className="flex items-center justify-center text-sky-600 dark:text-sky-400 font-medium">
                    <span className="mr-3 text-xl">⚖️</span>
                    <span>共识机制</span>
                  </div>
                  <div className="flex items-center justify-center text-sky-600 dark:text-sky-400 font-medium">
                    <span className="mr-3 text-xl">🛡️</span>
                    <span>数据不可篡改</span>
                  </div>
                </div>

                {/* Performance metrics */}
                <div className="bg-sky-50/80 dark:bg-sky-900/20 rounded-2xl p-4 border border-sky-200/50 dark:border-sky-700/30">
                  <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mb-1">15秒</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">区块确认时间</div>
                </div>
              </div>
            </div>

            {/* Security Layer */}
            <div className="group bg-white/90 dark:bg-gray-800/90 rounded-3xl p-10 border border-cyan-200/60 dark:border-cyan-700/40 hover:shadow-2xl transition-all duration-500 relative overflow-hidden transform hover:-translate-y-4 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-100/60 to-blue-100/60 dark:from-cyan-900/30 dark:to-blue-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-3xl mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl">
                  <span className="text-4xl text-white">🛡️</span>
                </div>
                <h4 className="text-3xl font-bold text-cyan-600 dark:text-cyan-400 mb-6 group-hover:scale-105 transition-all duration-300">
                  安全层
                </h4>
                <p className="text-gray-700 dark:text-gray-300 mb-8 text-lg leading-relaxed">
                  多重加密算法和智能合约保护，确保医疗数据隐私安全
                </p>

                {/* Security features */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-medium">
                    <span className="mr-3 text-xl">🔒</span>
                    <span>端到端加密</span>
                  </div>
                  <div className="flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-medium">
                    <span className="mr-3 text-xl">🔑</span>
                    <span>多因子认证</span>
                  </div>
                  <div className="flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-medium">
                    <span className="mr-3 text-xl">👥</span>
                    <span>权限管理</span>
                  </div>
                </div>

                {/* Security metrics */}
                <div className="bg-cyan-50/80 dark:bg-cyan-900/20 rounded-2xl p-4 border border-cyan-200/50 dark:border-cyan-700/30">
                  <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mb-1">
                    256-bit
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">AES加密标准</div>
                </div>
              </div>
            </div>

            {/* Application Layer */}
            <div className="group bg-white/90 dark:bg-gray-800/90 rounded-3xl p-10 border border-blue-200/60 dark:border-blue-700/40 hover:shadow-2xl transition-all duration-500 relative overflow-hidden transform hover:-translate-y-4 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100/60 to-sky-100/60 dark:from-blue-900/30 dark:to-sky-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-blue-400 to-sky-500 rounded-3xl mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl">
                  <span className="text-4xl text-white">📱</span>
                </div>
                <h4 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-105 transition-all duration-300">
                  应用层
                </h4>
                <p className="text-gray-700 dark:text-gray-300 mb-8 text-lg leading-relaxed">
                  用户友好的界面设计，支持多平台访问和实时数据同步
                </p>

                {/* Application features */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium">
                    <span className="mr-3 text-xl">💻</span>
                    <span>Web/移动应用</span>
                  </div>
                  <div className="flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium">
                    <span className="mr-3 text-xl">🔌</span>
                    <span>RESTful API</span>
                  </div>
                  <div className="flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium">
                    <span className="mr-3 text-xl">🔗</span>
                    <span>第三方集成</span>
                  </div>
                </div>

                {/* Application metrics */}
                <div className="bg-blue-50/80 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-700/30">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    99.9%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">API可用性</div>
                </div>
              </div>
            </div>
          </div>

          {/* Architecture flow diagram */}
          <div className="mt-20">
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-8 shadow-xl backdrop-blur-sm border border-cyan-200/50 dark:border-cyan-700/30">
              <h4 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-200 mb-8">
                数据流架构图
              </h4>
              <div className="flex items-center justify-center space-x-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-sky-400 to-cyan-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                    <span className="text-2xl text-white">👤</span>
                  </div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">用户端</div>
                </div>
                <div className="text-2xl text-cyan-400">→</div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                    <span className="text-2xl text-white">🔒</span>
                  </div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    安全验证
                  </div>
                </div>
                <div className="text-2xl text-blue-400">→</div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-sky-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                    <span className="text-2xl text-white">⚙️</span>
                  </div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    业务处理
                  </div>
                </div>
                <div className="text-2xl text-sky-400">→</div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-sky-400 to-cyan-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                    <span className="text-2xl text-white">🔗</span>
                  </div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    区块链存储
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Testimonials Section */}
      <div className="py-20 bg-gradient-to-br from-orange-50 via-pink-50 to-rose-50 dark:from-orange-900/20 dark:via-pink-900/20 dark:to-rose-900/20 backdrop-blur-sm relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-r from-orange-300/30 to-pink-300/30 rounded-full blur-xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-gradient-to-r from-rose-300/30 to-orange-300/30 rounded-full blur-xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-pink-200/20 to-rose-200/20 rounded-full blur-2xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-400 to-pink-500 rounded-2xl mb-6 shadow-lg">
              <span className="text-2xl text-white">💬</span>
            </div>
            <h3 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-pink-600 to-rose-600 bg-clip-text text-transparent mb-4">
              客户评价
            </h3>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
              来自全球医疗机构的真实反馈，见证MedChain的卓越表现
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-orange-200/50 dark:border-orange-700/30 backdrop-blur-sm group hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-100/50 to-pink-100/50 dark:from-orange-900/20 dark:to-pink-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center mb-6">
                  <div className="w-14 h-14 bg-gradient-to-r from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <span className="text-xl text-white">👨‍⚕️</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-300">
                      张医生
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      心内科主任 • 协和医院
                    </p>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex mb-3">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-orange-400 text-lg mr-1">
                        ⭐
                      </span>
                    ))}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 italic text-lg leading-relaxed">
                    "MedChain让我们能够快速获取患者的完整病史，大大提高了诊断效率和准确性。数据安全性让我们非常放心。"
                  </p>
                </div>
                <div className="flex items-center text-sm text-orange-600 dark:text-orange-400 font-medium">
                  <span className="mr-2">📈</span>
                  诊断效率提升 85%
                </div>
              </div>
            </div>

            <div className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-pink-200/50 dark:border-pink-700/30 backdrop-blur-sm group hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-100/50 to-rose-100/50 dark:from-pink-900/20 dark:to-rose-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center mb-6">
                  <div className="w-14 h-14 bg-gradient-to-r from-pink-400 to-rose-500 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <span className="text-xl text-white">🏥</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors duration-300">
                      李院长
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      院长 • 市人民医院
                    </p>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex mb-3">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-pink-400 text-lg mr-1">
                        ⭐
                      </span>
                    ))}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 italic text-lg leading-relaxed">
                    "区块链技术确保了我们医院数据的安全性，患者对数据隐私保护非常满意。跨科室协作更加高效。"
                  </p>
                </div>
                <div className="flex items-center text-sm text-pink-600 dark:text-pink-400 font-medium">
                  <span className="mr-2">🛡️</span>
                  数据安全性 99.99%
                </div>
              </div>
            </div>

            <div className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-rose-200/50 dark:border-rose-700/30 backdrop-blur-sm group hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-100/50 to-orange-100/50 dark:from-rose-900/20 dark:to-orange-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center mb-6">
                  <div className="w-14 h-14 bg-gradient-to-r from-rose-400 to-orange-500 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <span className="text-xl text-white">👥</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors duration-300">
                      王主任
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      信息科主任 • 华西医院
                    </p>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex mb-3">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-rose-400 text-lg mr-1">
                        ⭐
                      </span>
                    ))}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 italic text-lg leading-relaxed">
                    "系统稳定性极佳，99.9%的可用性让我们的医疗服务从未中断。技术支持团队响应迅速专业。"
                  </p>
                </div>
                <div className="flex items-center text-sm text-rose-600 dark:text-rose-400 font-medium">
                  <span className="mr-2">⚡</span>
                  系统可用性 99.9%
                </div>
              </div>
            </div>
          </div>

          {/* Additional testimonial stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                4.9/5
              </div>
              <div className="text-gray-600 dark:text-gray-400">平均评分</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600 dark:text-pink-400 mb-2">1,200+</div>
              <div className="text-gray-600 dark:text-gray-400">客户评价</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-rose-600 dark:text-rose-400 mb-2">98%</div>
              <div className="text-gray-600 dark:text-gray-400">推荐率</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                24/7
              </div>
              <div className="text-gray-600 dark:text-gray-400">技术支持</div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-red-900/20 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-48 h-48 bg-gradient-to-r from-amber-300/20 to-orange-300/20 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 left-20 w-56 h-56 bg-gradient-to-r from-orange-300/20 to-red-300/20 rounded-full blur-2xl"></div>
          <div className="absolute top-1/3 left-1/3 w-32 h-32 bg-gradient-to-r from-red-200/30 to-amber-200/30 rounded-full blur-xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 rounded-3xl mb-6 shadow-2xl">
              <span className="text-3xl text-white">🚀</span>
            </div>
            <h3 className="text-4xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
              为什么选择 MedChain？
            </h3>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              我们致力于通过创新技术改善医疗服务质量，为医疗机构、医护人员和患者创造价值
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const gradients = [
                'from-amber-400 to-orange-500',
                'from-orange-400 to-red-500',
                'from-red-400 to-pink-500',
              ];
              const bgGradients = [
                'from-amber-100/50 to-orange-100/50 dark:from-amber-900/20 dark:to-orange-900/20',
                'from-orange-100/50 to-red-100/50 dark:from-orange-900/20 dark:to-red-900/20',
                'from-red-100/50 to-pink-100/50 dark:from-red-900/20 dark:to-pink-900/20',
              ];
              const borderColors = [
                'border-amber-200/50 dark:border-amber-700/30',
                'border-orange-200/50 dark:border-orange-700/30',
                'border-red-200/50 dark:border-red-700/30',
              ];
              const textColors = [
                'text-amber-600 dark:text-amber-400',
                'text-orange-600 dark:text-orange-400',
                'text-red-600 dark:text-red-400',
              ];

              return (
                <div
                  key={index}
                  className={`bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border ${borderColors[index]} backdrop-blur-sm group hover:scale-105 relative overflow-hidden`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${bgGradients[index]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  ></div>
                  <div className="relative z-10 text-center">
                    <div
                      className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r ${gradients[index]} rounded-3xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                    >
                      <span className="text-3xl text-white">{benefit.icon}</span>
                    </div>
                    <h4
                      className={`text-2xl font-bold ${textColors[index]} mb-4 group-hover:scale-105 transition-transform duration-300`}
                    >
                      {benefit.title}
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg mb-6">
                      {benefit.description}
                    </p>

                    {/* Additional benefit details */}
                    <div className="space-y-3">
                      {index === 0 && (
                        <>
                          <div className="flex items-center justify-center text-sm text-amber-600 dark:text-amber-400 font-medium">
                            <span className="mr-2">⏱️</span>
                            平均节省诊断时间 40%
                          </div>
                          <div className="flex items-center justify-center text-sm text-amber-600 dark:text-amber-400 font-medium">
                            <span className="mr-2">🎯</span>
                            诊断准确率提升至 95%
                          </div>
                        </>
                      )}
                      {index === 1 && (
                        <>
                          <div className="flex items-center justify-center text-sm text-orange-600 dark:text-orange-400 font-medium">
                            <span className="mr-2">🔐</span>
                            256位端到端加密
                          </div>
                          <div className="flex items-center justify-center text-sm text-orange-600 dark:text-orange-400 font-medium">
                            <span className="mr-2">👤</span>
                            患者数据自主控制
                          </div>
                        </>
                      )}
                      {index === 2 && (
                        <>
                          <div className="flex items-center justify-center text-sm text-red-600 dark:text-red-400 font-medium">
                            <span className="mr-2">💰</span>
                            平均降低成本 30%
                          </div>
                          <div className="flex items-center justify-center text-sm text-red-600 dark:text-red-400 font-medium">
                            <span className="mr-2">♻️</span>
                            减少重复检查 60%
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Call to action */}
          <div className="mt-16 text-center">
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-8 shadow-xl backdrop-blur-sm border border-orange-200/50 dark:border-orange-700/30">
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                准备体验 MedChain 的强大功能？
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                立即开始您的数字化医疗之旅，享受安全、高效的医疗数据管理服务
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/demo"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <span className="mr-2">🚀</span>
                  免费体验
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center px-8 py-4 bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 font-semibold rounded-2xl shadow-lg hover:shadow-xl border border-orange-200 dark:border-orange-700 transform hover:scale-105 transition-all duration-300"
                >
                  <span className="mr-2">📝</span>
                  立即注册
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Industry Certifications Section */}
      <div className="py-20 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-16 left-16 w-40 h-40 bg-gradient-to-r from-emerald-300/25 to-teal-300/25 rounded-full blur-2xl"></div>
          <div className="absolute bottom-16 right-16 w-48 h-48 bg-gradient-to-r from-teal-300/25 to-cyan-300/25 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-cyan-200/15 to-emerald-200/15 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-18 h-18 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 rounded-3xl mb-6 shadow-2xl">
              <span className="text-3xl text-white">🏅</span>
            </div>
            <h3 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-4">
              行业认证与合规
            </h3>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              符合国际医疗数据安全标准，获得权威机构认证，确保您的数据安全无忧
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 text-center shadow-xl hover:shadow-2xl transition-all duration-500 border border-emerald-200/50 dark:border-emerald-700/30 backdrop-blur-sm group hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/50 to-teal-100/50 dark:from-emerald-900/20 dark:to-teal-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-20 h-20 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl text-white">🏆</span>
                </div>
                <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-105 transition-transform duration-300">
                  ISO 27001
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  信息安全管理体系国际标准认证
                </p>
                <div className="flex items-center justify-center text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="mr-2">✅</span>
                  已通过认证
                </div>
              </div>
            </div>

            <div className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 text-center shadow-xl hover:shadow-2xl transition-all duration-500 border border-teal-200/50 dark:border-teal-700/30 backdrop-blur-sm group hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-100/50 to-cyan-100/50 dark:from-teal-900/20 dark:to-cyan-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-20 h-20 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl text-white">🛡️</span>
                </div>
                <h4 className="text-xl font-bold text-teal-600 dark:text-teal-400 mb-3 group-hover:scale-105 transition-transform duration-300">
                  HIPAA
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  美国医疗隐私保护法案合规认证
                </p>
                <div className="flex items-center justify-center text-sm text-teal-600 dark:text-teal-400 font-medium">
                  <span className="mr-2">🔐</span>
                  隐私保护
                </div>
              </div>
            </div>

            <div className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 text-center shadow-xl hover:shadow-2xl transition-all duration-500 border border-cyan-200/50 dark:border-cyan-700/30 backdrop-blur-sm group hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-100/50 to-blue-100/50 dark:from-cyan-900/20 dark:to-blue-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-20 h-20 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl text-white">🌐</span>
                </div>
                <h4 className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mb-3 group-hover:scale-105 transition-transform duration-300">
                  GDPR
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  欧盟通用数据保护条例合规认证
                </p>
                <div className="flex items-center justify-center text-sm text-cyan-600 dark:text-cyan-400 font-medium">
                  <span className="mr-2">🌍</span>
                  全球合规
                </div>
              </div>
            </div>

            <div className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 text-center shadow-xl hover:shadow-2xl transition-all duration-500 border border-blue-200/50 dark:border-blue-700/30 backdrop-blur-sm group hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-indigo-100/50 dark:from-blue-900/20 dark:to-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl text-white">🔒</span>
                </div>
                <h4 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-105 transition-transform duration-300">
                  SOC 2
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  服务组织控制安全审计认证
                </p>
                <div className="flex items-center justify-center text-sm text-blue-600 dark:text-blue-400 font-medium">
                  <span className="mr-2">🔍</span>
                  安全审计
                </div>
              </div>
            </div>
          </div>

          {/* Additional compliance information */}
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-8 shadow-xl backdrop-blur-sm border border-teal-200/50 dark:border-teal-700/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-2xl mb-4 shadow-lg">
                  <span className="text-xl text-white">📋</span>
                </div>
                <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-2">定期审计</h5>
                <p className="text-gray-600 dark:text-gray-400">
                  每季度进行第三方安全审计，确保持续合规
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-2xl mb-4 shadow-lg">
                  <span className="text-xl text-white">🔄</span>
                </div>
                <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-2">持续监控</h5>
                <p className="text-gray-600 dark:text-gray-400">
                  7x24小时安全监控，实时检测潜在威胁
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl mb-4 shadow-lg">
                  <span className="text-xl text-white">📊</span>
                </div>
                <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-2">透明报告</h5>
                <p className="text-gray-600 dark:text-gray-400">定期发布安全合规报告，保持透明度</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Partners Section */}
      <div className="py-20 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 dark:from-rose-900/20 dark:via-orange-900/20 dark:to-amber-900/20 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-rose-300/30 to-orange-300/30 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-r from-orange-300/30 to-amber-300/30 rounded-full blur-2xl"></div>
          <div className="absolute top-1/3 left-1/3 w-56 h-56 bg-gradient-to-r from-amber-200/20 to-rose-200/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-18 h-18 bg-gradient-to-r from-rose-400 via-orange-500 to-amber-500 rounded-3xl mb-6 shadow-2xl">
              <span className="text-3xl text-white">🤝</span>
            </div>
            <h3 className="text-4xl font-bold bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 bg-clip-text text-transparent mb-4">
              合作伙伴
            </h3>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              与全球领先的医疗机构和技术公司建立战略合作关系，共同推动医疗数字化转型
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-rose-200/50 dark:border-rose-700/30 backdrop-blur-sm group hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-100/50 to-orange-100/50 dark:from-rose-900/20 dark:to-orange-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-rose-400 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl text-white">🏥</span>
                </div>
                <h4 className="text-xl font-bold text-rose-600 dark:text-rose-400 mb-3 group-hover:scale-105 transition-transform duration-300">
                  协和医院
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  国内顶级综合性医院
                </p>
                <div className="flex items-center justify-center text-sm text-rose-600 dark:text-rose-400 font-medium mt-3">
                  <span className="mr-2">🌟</span>
                  战略合作
                </div>
              </div>
            </div>

            <div className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-orange-200/50 dark:border-orange-700/30 backdrop-blur-sm group hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-100/50 to-amber-100/50 dark:from-orange-900/20 dark:to-amber-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-orange-400 to-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl text-white">👨‍⚕️</span>
                </div>
                <h4 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-3 group-hover:scale-105 transition-transform duration-300">
                  华西医院
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  西部医疗中心领导者
                </p>
                <div className="flex items-center justify-center text-sm text-orange-600 dark:text-orange-400 font-medium mt-3">
                  <span className="mr-2">🏆</span>
                  深度合作
                </div>
              </div>
            </div>

            <div className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-amber-200/50 dark:border-amber-700/30 backdrop-blur-sm group hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-100/50 to-yellow-100/50 dark:from-amber-900/20 dark:to-yellow-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl text-white">🧰</span>
                </div>
                <h4 className="text-xl font-bold text-amber-600 dark:text-amber-400 mb-3 group-hover:scale-105 transition-transform duration-300">
                  301医院
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  军队医疗系统标杆
                </p>
                <div className="flex items-center justify-center text-sm text-amber-600 dark:text-amber-400 font-medium mt-3">
                  <span className="mr-2">🎖️</span>
                  技术合作
                </div>
              </div>
            </div>

            <div className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-red-200/50 dark:border-red-700/30 backdrop-blur-sm group hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-100/50 to-rose-100/50 dark:from-red-900/20 dark:to-rose-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-red-400 to-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl text-white">❤️</span>
                </div>
                <h4 className="text-xl font-bold text-red-600 dark:text-red-400 mb-3 group-hover:scale-105 transition-transform duration-300">
                  阜外医院
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  心血管疾病专科权威
                </p>
                <div className="flex items-center justify-center text-sm text-red-600 dark:text-red-400 font-medium mt-3">
                  <span className="mr-2">💖</span>
                  专科合作
                </div>
              </div>
            </div>
          </div>

          {/* Partnership statistics */}
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-8 shadow-xl backdrop-blur-sm border border-orange-200/50 dark:border-orange-700/30">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-rose-400 to-orange-500 rounded-2xl mb-4 shadow-lg">
                  <span className="text-xl text-white">🌍</span>
                </div>
                <h5 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">50+</h5>
                <p className="text-gray-600 dark:text-gray-400">全球合作伙伴</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-400 to-amber-500 rounded-2xl mb-4 shadow-lg">
                  <span className="text-xl text-white">🏥</span>
                </div>
                <h5 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">200+</h5>
                <p className="text-gray-600 dark:text-gray-400">医疗机构</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-2xl mb-4 shadow-lg">
                  <span className="text-xl text-white">🔬</span>
                </div>
                <h5 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">15+</h5>
                <p className="text-gray-600 dark:text-gray-400">研发项目</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-400 to-rose-500 rounded-2xl mb-4 shadow-lg">
                  <span className="text-xl text-white">💡</span>
                </div>
                <h5 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">100+</h5>
                <p className="text-gray-600 dark:text-gray-400">创新解决方案</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Section */}
      <div className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              为什么选择 MedChain？
            </h3>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              与传统医疗数据管理系统相比，我们提供更安全、更高效的解决方案
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">功能特性</th>
                  <th className="px-6 py-4 text-center font-semibold">传统系统</th>
                  <th className="px-6 py-4 text-center font-semibold bg-gradient-to-r from-green-500 to-teal-500">
                    MedChain
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    数据安全性
                  </td>
                  <td className="px-6 py-4 text-center text-red-500">❌ 中心化存储风险</td>
                  <td className="px-6 py-4 text-center text-green-500">✅ 区块链加密保护</td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">数据共享</td>
                  <td className="px-6 py-4 text-center text-red-500">❌ 孤岛式管理</td>
                  <td className="px-6 py-4 text-center text-green-500">✅ 跨机构互通</td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">权限控制</td>
                  <td className="px-6 py-4 text-center text-yellow-500">⚠️ 基础权限管理</td>
                  <td className="px-6 py-4 text-center text-green-500">✅ 智能合约控制</td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">审计追踪</td>
                  <td className="px-6 py-4 text-center text-red-500">❌ 有限的日志记录</td>
                  <td className="px-6 py-4 text-center text-green-500">✅ 完整操作记录</td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    系统可用性
                  </td>
                  <td className="px-6 py-4 text-center text-yellow-500">⚠️ 95-98%</td>
                  <td className="px-6 py-4 text-center text-green-500">✅ 99.9%+</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="py-20 bg-gradient-to-r from-medical-primary to-medical-accent backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="mb-8">
            <span className="h-16 w-16 text-white mx-auto mb-6 animate-health-monitor">🔒</span>
            <h3 className="text-3xl font-bold text-white mb-4">企业级安全保障</h3>
            <p className="text-xl text-medical-primary/20 max-w-3xl mx-auto mb-8">
              我们采用银行级安全标准，确保您的医疗数据得到最高级别的保护
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition-all duration-300 border border-white/20 group animate-fade-scale">
              <span className="h-8 w-8 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                ✅
              </span>
              <h4 className="text-lg font-semibold mb-2">端到端加密</h4>
              <p className="text-white/80">所有数据传输均采用AES-256加密</p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition-all duration-300 border border-white/20 group animate-fade-scale">
              <span className="h-8 w-8 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                ✅
              </span>
              <h4 className="text-lg font-semibold mb-2">权限控制</h4>
              <p className="text-white/80">基于角色的精细化访问控制</p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition-all duration-300 border border-white/20 group animate-fade-scale">
              <span className="h-8 w-8 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                ✅
              </span>
              <h4 className="text-lg font-semibold mb-2">审计追踪</h4>
              <p className="text-white/80">完整的操作日志和审计记录</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-medical-primary/5 dark:bg-gray-900 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            准备开始您的数字化医疗之旅？
          </h3>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            立即加入 MedChain 平台，体验安全、高效的医疗数据管理服务
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/demo"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 backdrop-blur-sm border border-purple-500/20"
            >
              🎮 在线演示体验
              <span className="ml-2">🚀</span>
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-medical-primary to-medical-accent text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 backdrop-blur-sm border border-medical-primary/20"
            >
              免费开始使用
              <span className="ml-2">➡️</span>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center px-8 py-4 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl border border-medical-primary/30 dark:border-gray-700 transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              已有账户？登录
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Landing;
