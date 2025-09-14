import React, { useState, useEffect } from 'react';

interface FeatureSpec {
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

const FeatureSpecs: React.FC = () => {
  // const { t } = useTranslation(); // 暂时不使用国际化
  const [activeSpec, setActiveSpec] = useState(0);
  // const [animationPhase, setAnimationPhase] = useState(0); // 暂时不使用动画阶段
  const [isVisible, setIsVisible] = useState(false);

  const featureSpecs: FeatureSpec[] = [
    {
      id: 'performance-optimization',
      title: '高性能架构设计',
      subtitle: '毫秒级响应的医疗数据处理',
      description:
        '采用先进的缓存策略、负载均衡和数据库优化技术，确保系统在高并发场景下依然保持快速响应，为医疗机构提供流畅的用户体验。',
      icon: '⚡',
      image: '⚡🚀💨',
      category: '性能优化',
      benefits: [
        'API响应时间 < 200ms',
        '支持万级并发用户',
        '99.9% 系统可用性',
        '智能缓存机制',
        '自动负载均衡',
      ],
      metrics: [
        { label: '响应速度', value: '< 200ms', improvement: '提升75%' },
        { label: '并发处理', value: '10,000+', improvement: '增长500%' },
        { label: '系统稳定性', value: '99.9%', improvement: '提升至99.9%' },
      ],
      workflow: [
        {
          step: 1,
          title: '请求接收',
          description: 'API网关接收并验证用户请求',
          icon: '📥',
        },
        {
          step: 2,
          title: '缓存查询',
          description: 'Redis缓存层快速检索常用数据',
          icon: '⚡',
        },
        {
          step: 3,
          title: '负载分发',
          description: '智能负载均衡器分发请求到最优服务器',
          icon: '⚖️',
        },
        {
          step: 4,
          title: '结果返回',
          description: '优化后的数据快速返回给用户',
          icon: '📤',
        },
      ],
      testimonial: {
        quote:
          '系统性能的提升让我们的工作效率大幅提高，患者等待时间明显缩短，医护人员的工作体验也得到了显著改善。',
        author: '李工程师',
        position: '某医院信息技术部主管',
        avatar: '👨‍💻',
      },
    },
    {
      id: 'compatibility-support',
      title: '全面兼容性支持',
      subtitle: '跨平台无缝医疗数据交互',
      description:
        '支持多种操作系统、浏览器和医疗设备，遵循国际医疗信息标准，确保与现有医疗系统的完美集成和数据互通。',
      icon: '🔗',
      image: '🔗🌐💻',
      category: '兼容性',
      benefits: [
        '支持95%主流浏览器',
        '跨平台设备适配',
        'HL7 FHIR标准兼容',
        'DICOM医学影像支持',
        '多种数据格式互通',
      ],
      metrics: [
        { label: '浏览器兼容', value: '95%+', improvement: '覆盖95%以上' },
        { label: '设备适配', value: '100%', improvement: '完美适配' },
        { label: '标准支持', value: '8种', improvement: '支持8种标准' },
      ],
      workflow: [
        {
          step: 1,
          title: '环境检测',
          description: '自动检测用户设备和浏览器环境',
          icon: '🔍',
        },
        {
          step: 2,
          title: '适配调整',
          description: '根据环境自动调整界面和功能',
          icon: '🔧',
        },
        {
          step: 3,
          title: '标准转换',
          description: '数据格式自动转换为标准格式',
          icon: '🔄',
        },
        {
          step: 4,
          title: '无缝集成',
          description: '与现有医疗系统无缝对接',
          icon: '🤝',
        },
      ],
      testimonial: {
        quote:
          '兼容性问题一直是我们的痛点，MedChain完美解决了这个问题，现在我们可以在任何设备上流畅使用。',
        author: '王医生',
        position: '某社区医院主治医师',
        avatar: '👩‍⚕️',
      },
    },
    {
      id: 'scalability-design',
      title: '弹性扩展架构',
      subtitle: '随业务增长自动扩容的智能系统',
      description:
        '基于微服务和容器化技术构建的弹性架构，支持水平扩展和垂直扩展，确保系统能够随着业务增长自动调整资源配置。',
      icon: '📈',
      image: '📈🧩🐳',
      category: '扩展性',
      benefits: [
        '微服务架构设计',
        'Docker容器化部署',
        'Kubernetes自动编排',
        '无限水平扩展',
        '5分钟快速部署',
      ],
      metrics: [
        { label: '扩展能力', value: '无限制', improvement: '支持无限扩展' },
        { label: '部署时间', value: '< 5分钟', improvement: '缩短90%' },
        { label: '资源利用', value: '85%+', improvement: '提升40%' },
      ],
      workflow: [
        {
          step: 1,
          title: '负载监控',
          description: '实时监控系统负载和性能指标',
          icon: '📊',
        },
        {
          step: 2,
          title: '自动扩容',
          description: '根据负载自动启动新的服务实例',
          icon: '🚀',
        },
        {
          step: 3,
          title: '流量分发',
          description: '智能分发流量到新增的服务节点',
          icon: '🌊',
        },
        {
          step: 4,
          title: '资源优化',
          description: '动态调整资源配置以优化性能',
          icon: '⚙️',
        },
      ],
      testimonial: {
        quote: '随着我们医院规模的扩大，系统能够自动扩容真的太重要了，完全不用担心性能瓶颈问题。',
        author: '陈主任',
        position: '某大型医疗集团CTO',
        avatar: '👨‍💼',
      },
    },
    {
      id: 'security-compliance',
      title: '安全合规保障',
      subtitle: '医疗级数据安全与隐私保护',
      description:
        '采用多层安全防护机制，符合HIPAA、GDPR等国际医疗数据保护标准，确保患者隐私和医疗数据的绝对安全。',
      icon: '🔒',
      image: '🔒🛡️🔐',
      category: '安全合规',
      benefits: [
        'AES-256位加密',
        'HIPAA合规认证',
        '多因子身份验证',
        '数据脱敏处理',
        '安全审计日志',
      ],
      metrics: [
        { label: '加密强度', value: 'AES-256', improvement: '军用级加密' },
        { label: '合规标准', value: '5项', improvement: '通过5项认证' },
        { label: '安全等级', value: 'AAA', improvement: '最高安全等级' },
      ],
      workflow: [
        {
          step: 1,
          title: '身份验证',
          description: '多因子认证确保用户身份安全',
          icon: '🔐',
        },
        {
          step: 2,
          title: '权限控制',
          description: '基于角色的细粒度权限管理',
          icon: '👥',
        },
        {
          step: 3,
          title: '数据加密',
          description: '传输和存储全程加密保护',
          icon: '🔒',
        },
        {
          step: 4,
          title: '审计追踪',
          description: '完整的操作日志和审计记录',
          icon: '📋',
        },
      ],
      testimonial: {
        quote: '作为医疗机构，数据安全是我们最关心的问题，MedChain的安全保障让我们完全放心。',
        author: '赵院长',
        position: '某专科医院院长',
        avatar: '👨‍⚕️',
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

  const nextSpec = () => {
    setActiveSpec(prev => (prev + 1) % featureSpecs.length);
  };

  const prevSpec = () => {
    setActiveSpec(prev => (prev - 1 + featureSpecs.length) % featureSpecs.length);
  };

  const currentSpec = featureSpecs[activeSpec];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header Section */}
      <div className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 dark:from-blue-400/5 dark:to-purple-400/5" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">产品特性规格</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            深入了解MedChain平台的核心技术特性，从性能优化到安全合规，为您的医疗数字化转型提供强有力的技术保障
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <div className="flex flex-wrap justify-center gap-4">
          {featureSpecs.map((spec, index) => (
            <button
              key={spec.id}
              onClick={() => setActiveSpec(index)}
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                activeSpec === index
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg transform scale-105'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-md'
              }`}
            >
              <span className="mr-2">{spec.icon}</span>
              {spec.category}
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
          {/* Feature Card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden mb-12">
            {/* Header */}
            <div className="relative p-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-4">
                    <span className="text-4xl mr-4">{currentSpec.icon}</span>
                    <div>
                      <h2 className="text-3xl font-bold">{currentSpec.title}</h2>
                      <p className="text-blue-100 text-lg">{currentSpec.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-blue-50 text-lg leading-relaxed">{currentSpec.description}</p>
                </div>
                <div className="text-6xl opacity-20 ml-8">{currentSpec.image}</div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="p-8">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Benefits */}
                <div className="lg:col-span-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                    <span className="mr-3">✨</span>
                    核心优势
                  </h3>
                  <div className="space-y-3">
                    {currentSpec.benefits.map((benefit, index) => (
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
                    关键指标
                  </h3>
                  <div className="space-y-4">
                    {currentSpec.metrics.map((metric, index) => (
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
                    实现流程
                  </h3>
                  <div className="space-y-4">
                    {currentSpec.workflow.map((step, index) => (
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
            <div className="p-8 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-600">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <span className="mr-3">💬</span>
                用户评价
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                <div className="flex items-start space-x-4">
                  <div className="text-4xl">{currentSpec.testimonial.avatar}</div>
                  <div className="flex-1">
                    <blockquote className="text-gray-700 dark:text-gray-300 text-lg italic mb-4">
                      "{currentSpec.testimonial.quote}"
                    </blockquote>
                    <div className="flex items-center">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {currentSpec.testimonial.author}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400 text-sm">
                          {currentSpec.testimonial.position}
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
              onClick={prevSpec}
              className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center"
            >
              <span className="mr-2">←</span>
              上一个特性
            </button>
            <button
              onClick={nextSpec}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center"
            >
              下一个特性
              <span className="ml-2">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureSpecs;
