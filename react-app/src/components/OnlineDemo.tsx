import React, { useState, useEffect, useMemo } from 'react';

interface DemoCase {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  image: string;
  category: string;
  features: string[];
  metrics: {
    label: string;
    value: string;
    improvement: string;
  }[];
  demoSteps: {
    step: number;
    title: string;
    description: string;
    icon: string;
    action: string;
  }[];
  testimonial: {
    quote: string;
    author: string;
    position: string;
    avatar: string;
  };
}

const OnlineDemo: React.FC = () => {
  // const { t } = useTranslation();
  const [activeDemo, setActiveDemo] = useState(0);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const demoCases: DemoCase[] = useMemo(
    () => [
      {
        id: 'patient-record-demo',
        title: '患者病历管理演示',
        subtitle: '体验完整的病历创建和查询流程',
        description:
          '通过交互式演示，体验如何在区块链上安全地创建、存储和查询患者病历信息，感受数据的不可篡改性和隐私保护。',
        icon: '📋',
        image: '📋💾🔒',
        category: '病历管理',
        features: [
          '病历信息加密存储',
          '权限控制访问',
          '数据不可篡改',
          '实时同步更新',
          '隐私保护机制',
        ],
        metrics: [
          { label: '数据安全性', value: '100%', improvement: '绝对安全' },
          { label: '查询速度', value: '<2s', improvement: '毫秒级响应' },
          { label: '存储可靠性', value: '99.99%', improvement: '高可靠性' },
        ],
        demoSteps: [
          {
            step: 1,
            title: '患者注册',
            description: '创建新患者档案，生成唯一区块链身份',
            icon: '👤',
            action: 'register',
          },
          {
            step: 2,
            title: '病历录入',
            description: '医生录入诊断信息，数据加密上链',
            icon: '✍️',
            action: 'input',
          },
          {
            step: 3,
            title: '权限授权',
            description: '患者授权其他医生查看病历',
            icon: '🔐',
            action: 'authorize',
          },
          {
            step: 4,
            title: '数据查询',
            description: '授权医生安全查询患者病历',
            icon: '🔍',
            action: 'query',
          },
        ],
        testimonial: {
          quote:
            '这个演示让我清楚地看到了区块链技术在医疗数据管理中的巨大潜力，数据安全和隐私保护做得非常好。',
          author: '李医生',
          position: '心内科主任医师',
          avatar: '👨‍⚕️',
        },
      },
      {
        id: 'drug-tracking-demo',
        title: '药品溯源追踪演示',
        subtitle: '全程追踪药品从生产到使用的完整链路',
        description:
          '演示药品在供应链中的每个环节如何被记录和追踪，确保药品的真实性和安全性，防止假药流入市场。',
        icon: '💊',
        image: '💊🔍📦',
        category: '药品溯源',
        features: ['生产信息记录', '流通过程追踪', '真伪验证机制', '召回快速定位', '质量监控预警'],
        metrics: [
          { label: '追溯准确率', value: '100%', improvement: '完全追溯' },
          { label: '假药识别', value: '99.9%', improvement: '精准识别' },
          { label: '召回效率', value: '+300%', improvement: '大幅提升' },
        ],
        demoSteps: [
          {
            step: 1,
            title: '生产记录',
            description: '药品生产信息实时上链记录',
            icon: '🏭',
            action: 'produce',
          },
          {
            step: 2,
            title: '物流跟踪',
            description: '运输过程中的位置和状态更新',
            icon: '🚚',
            action: 'transport',
          },
          {
            step: 3,
            title: '销售验证',
            description: '药房销售时进行真伪验证',
            icon: '🏪',
            action: 'verify',
          },
          {
            step: 4,
            title: '使用追踪',
            description: '患者用药信息安全记录',
            icon: '👤',
            action: 'track',
          },
        ],
        testimonial: {
          quote: '药品溯源演示非常直观，让我们看到了如何有效防止假药，保障患者用药安全。',
          author: '张药师',
          position: '医院药剂科主任',
          avatar: '👩‍⚕️',
        },
      },
      {
        id: 'telemedicine-demo',
        title: '远程医疗服务演示',
        subtitle: '体验跨地域的安全医疗数据共享',
        description:
          '演示远程医疗场景下，如何安全地在不同医疗机构间共享患者数据，实现高效的远程诊疗服务。',
        icon: '📱',
        image: '📱💻🌐',
        category: '远程医疗',
        features: [
          '跨机构数据共享',
          '实时视频诊疗',
          '电子处方开具',
          '远程监护数据',
          '多方协作诊断',
        ],
        metrics: [
          { label: '连接速度', value: '<1s', improvement: '极速连接' },
          { label: '数据同步', value: '实时', improvement: '零延迟' },
          { label: '诊疗效率', value: '+200%', improvement: '显著提升' },
        ],
        demoSteps: [
          {
            step: 1,
            title: '远程预约',
            description: '患者在线预约远程诊疗服务',
            icon: '📅',
            action: 'book',
          },
          {
            step: 2,
            title: '数据授权',
            description: '患者授权医生访问相关病历',
            icon: '🔑',
            action: 'grant',
          },
          {
            step: 3,
            title: '视频诊疗',
            description: '医生与患者进行远程视频诊断',
            icon: '📹',
            action: 'consult',
          },
          {
            step: 4,
            title: '处方同步',
            description: '电子处方安全传输到指定药房',
            icon: '💊',
            action: 'prescribe',
          },
        ],
        testimonial: {
          quote: '远程医疗演示展示了技术如何打破地域限制，让优质医疗资源惠及更多患者。',
          author: '王主任',
          position: '远程医疗中心主任',
          avatar: '👨‍💼',
        },
      },
      {
        id: 'health-monitoring-demo',
        title: '健康监测数据演示',
        subtitle: '个人健康数据的智能分析和管理',
        description: '展示如何收集、分析个人健康监测数据，通过AI算法提供个性化健康建议和预警提醒。',
        icon: '❤️',
        image: '❤️📊🏃‍♂️',
        category: '健康监测',
        features: ['多设备数据整合', 'AI智能分析', '健康趋势预测', '异常预警提醒', '个性化建议'],
        metrics: [
          { label: '数据准确性', value: '98%', improvement: '高精度' },
          { label: '预警及时性', value: '秒级', improvement: '实时预警' },
          { label: '健康改善', value: '+150%', improvement: '显著改善' },
        ],
        demoSteps: [
          {
            step: 1,
            title: '数据采集',
            description: '从各种设备收集健康监测数据',
            icon: '📱',
            action: 'collect',
          },
          {
            step: 2,
            title: 'AI分析',
            description: '人工智能算法分析健康状况',
            icon: '🤖',
            action: 'analyze',
          },
          {
            step: 3,
            title: '风险评估',
            description: '评估潜在健康风险和趋势',
            icon: '⚠️',
            action: 'assess',
          },
          {
            step: 4,
            title: '建议推送',
            description: '生成个性化健康管理建议',
            icon: '💡',
            action: 'recommend',
          },
        ],
        testimonial: {
          quote: '健康监测演示让我看到了个人健康管理的未来，数据驱动的健康管理真的很有效。',
          author: '陈女士',
          position: '平台体验用户',
          avatar: '👩',
        },
      },
    ],
    []
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep(prev => {
          const nextStep = (prev + 1) % demoCases[activeDemo].demoSteps.length;
          if (nextStep === 0) {
            setIsPlaying(false);
          }
          return nextStep;
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeDemo, demoCases, setIsPlaying]);

  const currentDemo = demoCases[activeDemo];

  const startDemo = () => {
    setCurrentStep(0);
    setIsPlaying(true);
  };

  const stopDemo = () => {
    setIsPlaying(false);
  };

  return (
    <div
      id="online-demo"
      className="py-20 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">🎮 在线演示体验</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            通过交互式演示深度体验MedChain的核心功能，亲身感受区块链技术在医疗领域的创新应用
          </p>
        </div>

        {/* 演示选择器 */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {demoCases.map((demo, index) => (
            <button
              key={demo.id}
              onClick={() => {
                setActiveDemo(index);
                setCurrentStep(0);
                setIsPlaying(false);
              }}
              className={`group relative px-6 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                activeDemo === index
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-2xl'
                  : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-lg'
              } ${animationPhase === index ? 'animate-pulse' : ''}`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                  {demo.icon}
                </span>
                <div className="text-left">
                  <div className="text-sm font-medium">{demo.category}</div>
                  <div className="text-xs opacity-75">{demo.title}</div>
                </div>
              </div>
              {activeDemo === index && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white rotate-45"></div>
              )}
            </button>
          ))}
        </div>

        {/* 演示详情 */}
        <div
          className={`transition-all duration-500 transform ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* 演示概述 */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center mb-6">
                <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mr-4 shadow-lg">
                  <span className="text-3xl">{currentDemo.icon}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentDemo.title}
                  </h3>
                  <p className="text-purple-600 dark:text-purple-400 font-medium">
                    {currentDemo.subtitle}
                  </p>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                {currentDemo.description}
              </p>

              {/* 核心特性 */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="mr-2">⚡</span>
                  核心特性
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {currentDemo.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center text-sm text-gray-600 dark:text-gray-300"
                    >
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 flex-shrink-0"></span>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              {/* 性能指标 */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="mr-2">📈</span>
                  性能指标
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {currentDemo.metrics.map((metric, index) => (
                    <div
                      key={index}
                      className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {metric.value}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 交互式演示 */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  <span className="mr-2">🎯</span>
                  交互式演示
                </h4>
                <div className="flex space-x-2">
                  <button
                    onClick={startDemo}
                    disabled={isPlaying}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPlaying ? '演示中...' : '开始演示'}
                  </button>
                  <button
                    onClick={stopDemo}
                    disabled={!isPlaying}
                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    停止演示
                  </button>
                </div>
              </div>

              {/* 演示界面 */}
              <div className="relative h-64 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-xl mb-6 flex items-center justify-center overflow-hidden">
                <div className="text-8xl opacity-20 absolute">{currentDemo.image}</div>
                <div className="relative z-10 text-center">
                  <div className="text-4xl mb-4 animate-bounce">{currentDemo.icon}</div>
                  <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    {currentDemo.category}
                  </div>
                  {isPlaying && (
                    <div className="mt-4 px-4 py-2 bg-white/80 dark:bg-gray-800/80 rounded-lg">
                      <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        正在执行: {currentDemo.demoSteps[currentStep]?.title}
                      </div>
                    </div>
                  )}
                </div>

                {/* 动画粒子 */}
                <div className="absolute inset-0">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className={`absolute w-3 h-3 bg-purple-400 rounded-full opacity-40 ${
                        isPlaying ? 'animate-ping' : 'animate-float'
                      }`}
                      style={{
                        left: `${15 + i * 12}%`,
                        top: `${25 + (i % 3) * 25}%`,
                        animationDelay: `${i * 0.3}s`,
                        animationDuration: `${2 + i * 0.3}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* 用户反馈 */}
              <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl border border-purple-200 dark:border-purple-700">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-xl">{currentDemo.testimonial.avatar}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 dark:text-gray-300 italic mb-3">
                      "{currentDemo.testimonial.quote}"
                    </p>
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {currentDemo.testimonial.author}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {currentDemo.testimonial.position}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 演示步骤 */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50 dark:border-gray-700/50">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-8 text-center flex items-center justify-center">
              <span className="mr-3">🔄</span>
              {currentDemo.title} - 演示步骤
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {currentDemo.demoSteps.map((step, index) => (
                <div key={step.step} className="relative">
                  <div
                    className={`text-center transition-all duration-500 ${
                      isPlaying && currentStep === index ? 'transform scale-110' : ''
                    }`}
                  >
                    <div className="relative inline-block">
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg mb-4 mx-auto transition-all duration-500 ${
                          isPlaying && currentStep === index
                            ? 'bg-gradient-to-r from-green-500 to-blue-500 animate-pulse'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500'
                        }`}
                      >
                        <span className="text-2xl">{step.icon}</span>
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md border-2 border-purple-500">
                        <span className="text-xs font-bold text-purple-500">{step.step}</span>
                      </div>
                      {isPlaying && currentStep === index && (
                        <div className="absolute -inset-2 bg-green-400 rounded-full opacity-30 animate-ping"></div>
                      )}
                    </div>
                    <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {step.title}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
                    {isPlaying && currentStep === index && (
                      <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
                        正在执行...
                      </div>
                    )}
                  </div>

                  {/* 连接线 */}
                  {index < currentDemo.demoSteps.length - 1 && (
                    <div
                      className={`hidden lg:block absolute top-8 left-full w-6 h-0.5 transform -translate-y-1/2 transition-all duration-500 ${
                        isPlaying && currentStep >= index
                          ? 'bg-gradient-to-r from-green-500 to-blue-500'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500'
                      }`}
                    >
                      <div
                        className={`absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full ${
                          isPlaying && currentStep >= index ? 'bg-blue-500' : 'bg-pink-500'
                        }`}
                      ></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineDemo;
