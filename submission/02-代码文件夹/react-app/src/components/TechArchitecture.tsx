import React, { useState, useEffect } from 'react';

interface ArchitectureLayer {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  image: string;
  category: string;
  benefits: string[];
  metrics: {
    label: string;
    value: string;
    improvement: string;
  }[];
  workflow: {
    step: number;
    title: string;
    description: string;
    icon: string;
  }[];
  testimonial: {
    quote: string;
    author: string;
    position: string;
    avatar: string;
  };
}

const TechArchitecture: React.FC = () => {
  // const { t } = useTranslation();
  const [activeLayer, setActiveLayer] = useState(0);
  // const [animationPhase, setAnimationPhase] = useState(0); // 暂时不使用动画阶段
  const [isVisible, setIsVisible] = useState(false);

  const architectureLayers: ArchitectureLayer[] = [
    {
      id: 'frontend-layer',
      title: '前端应用层',
      subtitle: 'React + TypeScript 现代化用户界面',
      description:
        '采用最新的前端技术栈构建响应式用户界面，提供流畅的用户体验和强大的交互功能，支持PWA和多语言国际化。',
      icon: '💻',
      image: '💻📱🌐',
      category: '前端层',
      benefits: [
        'React 18 + TypeScript',
        '响应式设计适配',
        'PWA 离线支持',
        '多语言国际化',
        '实时数据更新',
      ],
      metrics: [
        { label: '加载速度', value: '< 2秒', improvement: '提升60%' },
        { label: '兼容性', value: '95%+', improvement: '覆盖主流浏览器' },
        { label: '响应时间', value: '< 100ms', improvement: '用户交互流畅' },
      ],
      workflow: [
        {
          step: 1,
          title: '用户访问',
          description: '用户通过浏览器访问应用界面',
          icon: '🌐',
        },
        {
          step: 2,
          title: '身份验证',
          description: '安全的用户身份验证和授权',
          icon: '🔐',
        },
        {
          step: 3,
          title: '数据展示',
          description: '实时获取并展示医疗数据',
          icon: '📊',
        },
        {
          step: 4,
          title: '交互操作',
          description: '用户进行各种医疗数据操作',
          icon: '👆',
        },
      ],
      testimonial: {
        quote: '界面设计非常直观，医护人员很快就能上手使用，大大提高了我们的工作效率。',
        author: '李护士长',
        position: '某三甲医院护理部',
        avatar: '👩‍⚕️',
      },
    },
    {
      id: 'api-gateway',
      title: 'API 网关层',
      subtitle: '统一的服务入口和流量管控',
      description:
        '作为系统的统一入口，负责请求路由、身份认证、流量控制和负载均衡，确保系统的安全性和稳定性。',
      icon: '🚪',
      image: '🚪🔀⚖️',
      category: '网关层',
      benefits: [
        'Kong/Nginx 高性能网关',
        'JWT 令牌认证',
        'API 限流保护',
        '智能负载均衡',
        '实时监控告警',
      ],
      metrics: [
        { label: '吞吐量', value: '10K RPS', improvement: '支持万级请求' },
        { label: '可用性', value: '99.99%', improvement: '高可用保障' },
        { label: '延迟', value: '< 10ms', improvement: '极低延迟' },
      ],
      workflow: [
        {
          step: 1,
          title: '请求接收',
          description: '接收来自前端的所有API请求',
          icon: '📥',
        },
        {
          step: 2,
          title: '身份验证',
          description: '验证请求的身份和权限',
          icon: '🔍',
        },
        {
          step: 3,
          title: '路由分发',
          description: '将请求路由到相应的后端服务',
          icon: '🔀',
        },
        {
          step: 4,
          title: '响应返回',
          description: '处理响应并返回给前端',
          icon: '📤',
        },
      ],
      testimonial: {
        quote: 'API网关的统一管理让我们的系统架构更加清晰，安全性和性能都得到了显著提升。',
        author: '张架构师',
        position: '某医疗科技公司技术总监',
        avatar: '👨‍💻',
      },
    },
    {
      id: 'business-logic',
      title: '业务逻辑层',
      subtitle: 'Node.js 微服务架构核心',
      description:
        '基于Node.js构建的微服务架构，处理所有核心业务逻辑，支持事件驱动和异步处理，提供GraphQL API接口。',
      icon: '⚙️',
      image: '⚙️🧩🔄',
      category: '业务层',
      benefits: [
        'Node.js + Express 框架',
        '微服务架构设计',
        '事件驱动模式',
        '异步处理机制',
        'GraphQL API 接口',
      ],
      metrics: [
        { label: '服务数量', value: '15+', improvement: '模块化设计' },
        { label: '处理能力', value: '1M/天', improvement: '百万级处理' },
        { label: '扩展性', value: '水平扩展', improvement: '弹性伸缩' },
      ],
      workflow: [
        {
          step: 1,
          title: '请求处理',
          description: '接收并解析业务请求',
          icon: '📋',
        },
        {
          step: 2,
          title: '业务逻辑',
          description: '执行核心业务逻辑处理',
          icon: '🧠',
        },
        {
          step: 3,
          title: '数据操作',
          description: '与数据库和区块链交互',
          icon: '💾',
        },
        {
          step: 4,
          title: '结果返回',
          description: '返回处理结果给调用方',
          icon: '✅',
        },
      ],
      testimonial: {
        quote: '微服务架构让我们能够快速迭代和部署新功能，系统的可维护性大大提高。',
        author: '王开发经理',
        position: '某医院信息科开发团队',
        avatar: '👨‍💼',
      },
    },
    {
      id: 'blockchain-layer',
      title: '区块链网络层',
      subtitle: 'Hyperledger Fabric 分布式账本',
      description:
        '基于Hyperledger Fabric构建的企业级区块链网络，确保医疗数据的不可篡改性和可追溯性，提供强大的隐私保护机制。',
      icon: '⛓️',
      image: '⛓️🔒📜',
      category: '区块链层',
      benefits: [
        'Hyperledger Fabric 企业级',
        'PBFT 共识机制',
        '数据不可篡改',
        '分布式账本技术',
        '隐私保护通道',
      ],
      metrics: [
        { label: '交易速度', value: '1000 TPS', improvement: '高性能处理' },
        { label: '节点数量', value: '50+', improvement: '分布式部署' },
        { label: '数据安全', value: '军用级', improvement: '最高安全等级' },
      ],
      workflow: [
        {
          step: 1,
          title: '交易提交',
          description: '医疗数据交易提交到区块链',
          icon: '📝',
        },
        {
          step: 2,
          title: '共识验证',
          description: '网络节点进行共识验证',
          icon: '🤝',
        },
        {
          step: 3,
          title: '区块生成',
          description: '验证通过后生成新区块',
          icon: '🧱',
        },
        {
          step: 4,
          title: '链上存储',
          description: '数据永久存储在区块链上',
          icon: '💎',
        },
      ],
      testimonial: {
        quote: '区块链技术让我们的医疗数据真正做到了可信可追溯，患者和医生都更加信任我们的系统。',
        author: '陈院长',
        position: '某专科医院院长',
        avatar: '👨‍⚕️',
      },
    },
    {
      id: 'storage-layer',
      title: '存储层架构',
      subtitle: '混合存储解决方案',
      description:
        '结合传统数据库、IPFS分布式存储和区块链存储的混合架构，为不同类型的医疗数据提供最优的存储解决方案。',
      icon: '💾',
      image: '💾🗄️☁️',
      category: '存储层',
      benefits: [
        'PostgreSQL 关系数据库',
        'IPFS 分布式文件存储',
        'Redis 高速缓存',
        '数据备份与恢复',
        '智能数据分层',
      ],
      metrics: [
        { label: '存储容量', value: 'PB级', improvement: '海量存储' },
        { label: '访问速度', value: '< 50ms', improvement: '极速访问' },
        { label: '可靠性', value: '99.999%', improvement: '五个九可靠性' },
      ],
      workflow: [
        {
          step: 1,
          title: '数据分类',
          description: '根据数据类型进行智能分类',
          icon: '🏷️',
        },
        {
          step: 2,
          title: '存储选择',
          description: '选择最适合的存储方案',
          icon: '🎯',
        },
        {
          step: 3,
          title: '数据写入',
          description: '将数据写入相应的存储系统',
          icon: '💿',
        },
        {
          step: 4,
          title: '备份同步',
          description: '自动备份和多地同步',
          icon: '🔄',
        },
      ],
      testimonial: {
        quote: '混合存储架构完美解决了我们不同类型数据的存储需求，成本和性能都得到了优化。',
        author: '刘运维总监',
        position: '某大型医疗集团',
        avatar: '👨‍🔧',
      },
    },
  ];

  useEffect(() => {
    setIsVisible(true);
    // const interval = setInterval(() => {
    //   setAnimationPhase(prev => (prev + 1) % 4);
    // }, 3000);
    // return () => clearInterval(interval);
  }, []);

  const nextLayer = () => {
    setActiveLayer(prev => (prev + 1) % architectureLayers.length);
  };

  const prevLayer = () => {
    setActiveLayer(prev => (prev - 1 + architectureLayers.length) % architectureLayers.length);
  };

  const currentLayer = architectureLayers[activeLayer];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header Section */}
      <div className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-cyan-600/10 dark:from-indigo-400/5 dark:to-cyan-400/5" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">技术架构设计</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            深入了解MedChain平台的技术架构层次，从前端界面到区块链底层，每一层都经过精心设计以确保系统的安全性、可扩展性和高性能
          </p>
        </div>
      </div>

      {/* Architecture Diagram */}
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            系统架构总览
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {architectureLayers.map((layer, index) => (
              <div
                key={layer.id}
                onClick={() => setActiveLayer(index)}
                className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                  activeLayer === index
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg'
                    : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-400'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">{layer.icon}</div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-white">
                    {layer.category}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <div className="flex flex-wrap justify-center gap-4">
          {architectureLayers.map((layer, index) => (
            <button
              key={layer.id}
              onClick={() => setActiveLayer(index)}
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                activeLayer === index
                  ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg transform scale-105'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-md'
              }`}
            >
              <span className="mr-2">{layer.icon}</span>
              {layer.category}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div
          className={`transition-all duration-500 transform ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}
        >
          {/* Architecture Layer Card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden mb-12">
            {/* Header */}
            <div className="relative p-8 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-4">
                    <span className="text-4xl mr-4">{currentLayer.icon}</span>
                    <div>
                      <h2 className="text-3xl font-bold">{currentLayer.title}</h2>
                      <p className="text-indigo-100 text-lg">{currentLayer.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-indigo-50 text-lg leading-relaxed">
                    {currentLayer.description}
                  </p>
                </div>
                <div className="text-6xl opacity-20 ml-8">{currentLayer.image}</div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="p-8">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Benefits */}
                <div className="lg:col-span-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                    <span className="mr-3">✨</span>
                    核心特性
                  </h3>
                  <div className="space-y-3">
                    {currentLayer.benefits.map((benefit, index) => (
                      <div
                        key={index}
                        className="flex items-center p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg"
                      >
                        <span className="text-green-500 mr-3">✓</span>
                        <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Metrics */}
                <div className="lg:col-span-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                    <span className="mr-3">📊</span>
                    性能指标
                  </h3>
                  <div className="space-y-4">
                    {currentLayer.metrics.map((metric, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {metric.label}
                          </span>
                          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {metric.value}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {metric.improvement}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Workflow */}
                <div className="lg:col-span-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                    <span className="mr-3">🔄</span>
                    工作流程
                  </h3>
                  <div className="space-y-4">
                    {currentLayer.workflow.map((step, index) => (
                      <div
                        key={index}
                        className="flex items-start p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-4">
                          {step.step}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="text-lg mr-2">{step.icon}</span>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {step.title}
                            </h4>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial */}
            <div className="p-8 bg-gradient-to-r from-gray-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <span className="mr-3">💬</span>
                用户评价
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                <div className="flex items-start space-x-4">
                  <div className="text-4xl">{currentLayer.testimonial.avatar}</div>
                  <div className="flex-1">
                    <blockquote className="text-gray-700 dark:text-gray-300 text-lg italic mb-4">
                      "{currentLayer.testimonial.quote}"
                    </blockquote>
                    <div className="flex items-center">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {currentLayer.testimonial.author}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400 text-sm">
                          {currentLayer.testimonial.position}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={prevLayer}
              className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center"
            >
              <span className="mr-2">←</span>
              上一层架构
            </button>
            <button
              onClick={nextLayer}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center"
            >
              下一层架构
              <span className="ml-2">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechArchitecture;
