import React, { useState, useEffect } from 'react';

interface UseCase {
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

const UseCases: React.FC = () => {
  // const { t } = useTranslation(); // 暂时未使用
  const [activeCase, setActiveCase] = useState(0);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const useCases: UseCase[] = [
    {
      id: 'hospital-management',
      title: '大型医院信息化管理',
      subtitle: '三甲医院数字化转型解决方案',
      description:
        '为大型医疗机构提供完整的数字化医疗数据管理解决方案，实现患者信息、诊疗记录、医疗影像等数据的安全存储和高效共享。',
      icon: '🏥',
      image: '🏥🔬💊',
      category: '医院管理',
      benefits: [
        '患者数据统一管理',
        '医疗流程数字化',
        '跨科室信息共享',
        '医疗质量监控',
        '成本控制优化',
      ],
      metrics: [
        { label: '诊疗效率', value: '+45%', improvement: '提升45%' },
        { label: '数据准确性', value: '99.8%', improvement: '达到99.8%' },
        { label: '运营成本', value: '-30%', improvement: '降低30%' },
      ],
      workflow: [
        {
          step: 1,
          title: '患者登记',
          description: '患者信息录入系统，生成唯一身份标识',
          icon: '📝',
        },
        {
          step: 2,
          title: '诊疗记录',
          description: '医生诊断信息实时记录到区块链',
          icon: '👨‍⚕️',
        },
        {
          step: 3,
          title: '数据共享',
          description: '授权科室间安全共享患者信息',
          icon: '🔄',
        },
        {
          step: 4,
          title: '质量监控',
          description: '医疗质量指标实时监控和分析',
          icon: '📊',
        },
      ],
      testimonial: {
        quote:
          '使用MedChain后，我们医院的信息化水平得到了质的提升，患者满意度和医疗效率都有显著改善。',
        author: '张主任',
        position: '某三甲医院信息科主任',
        avatar: '👨‍⚕️',
      },
    },
    {
      id: 'telemedicine',
      title: '远程医疗服务',
      subtitle: '跨地域医疗协作平台',
      description: '连接城乡医疗资源，实现远程诊断、会诊、培训等服务，让优质医疗资源惠及更多患者。',
      icon: '📱',
      image: '📱💻🌐',
      category: '远程医疗',
      benefits: ['远程诊断服务', '专家在线会诊', '医疗资源共享', '降低就医成本', '提升医疗可及性'],
      metrics: [
        { label: '服务覆盖', value: '500+', improvement: '覆盖500+医疗机构' },
        { label: '患者满意度', value: '96%', improvement: '达到96%' },
        { label: '诊断准确率', value: '94%', improvement: '保持94%' },
      ],
      workflow: [
        {
          step: 1,
          title: '预约挂号',
          description: '患者在线预约远程诊疗服务',
          icon: '📅',
        },
        {
          step: 2,
          title: '视频问诊',
          description: '医生与患者进行视频诊疗交流',
          icon: '📹',
        },
        {
          step: 3,
          title: '数据同步',
          description: '诊疗数据实时同步到区块链',
          icon: '🔄',
        },
        {
          step: 4,
          title: '处方开具',
          description: '电子处方安全传输到药房',
          icon: '💊',
        },
      ],
      testimonial: {
        quote:
          '远程医疗让我们偏远地区的患者也能享受到大城市专家的诊疗服务，真正实现了医疗资源的公平分配。',
        author: '李医生',
        position: '县级医院内科主任',
        avatar: '👩‍⚕️',
      },
    },
    {
      id: 'health-management',
      title: '个人健康管理',
      subtitle: '全生命周期健康档案',
      description:
        '为个人用户提供完整的健康数据管理服务，包括体检报告、用药记录、健康监测等，实现个性化健康管理。',
      icon: '❤️',
      image: '❤️📊🏃‍♂️',
      category: '健康管理',
      benefits: ['个人健康档案', '健康数据分析', '疾病预警提醒', '用药安全管理', '健康趋势跟踪'],
      metrics: [
        { label: '用户活跃度', value: '85%', improvement: '保持85%' },
        { label: '健康改善', value: '+60%', improvement: '改善60%' },
        { label: '预警准确率', value: '92%', improvement: '达到92%' },
      ],
      workflow: [
        {
          step: 1,
          title: '数据采集',
          description: '收集用户各类健康数据信息',
          icon: '📱',
        },
        {
          step: 2,
          title: '智能分析',
          description: 'AI算法分析健康状况和风险',
          icon: '🤖',
        },
        {
          step: 3,
          title: '个性建议',
          description: '生成个性化健康管理建议',
          icon: '💡',
        },
        {
          step: 4,
          title: '持续跟踪',
          description: '长期跟踪健康状况变化趋势',
          icon: '📈',
        },
      ],
      testimonial: {
        quote:
          '通过MedChain的健康管理功能，我能够更好地了解自己的健康状况，及时发现和预防潜在的健康问题。',
        author: '王女士',
        position: '平台用户',
        avatar: '👩',
      },
    },
    {
      id: 'drug-traceability',
      title: '药品溯源管理',
      subtitle: '全链条药品安全保障',
      description:
        '建立完整的药品供应链追溯体系，从生产、流通到使用全过程监管，确保药品安全和质量。',
      icon: '💊',
      image: '💊🔍📦',
      category: '药品管理',
      benefits: [
        '药品全程追溯',
        '假药防伪识别',
        '供应链透明化',
        '质量问题快速定位',
        '监管效率提升',
      ],
      metrics: [
        { label: '追溯覆盖率', value: '100%', improvement: '实现100%' },
        { label: '假药识别率', value: '99.5%', improvement: '达到99.5%' },
        { label: '召回效率', value: '+80%', improvement: '提升80%' },
      ],
      workflow: [
        {
          step: 1,
          title: '生产记录',
          description: '药品生产信息上链记录',
          icon: '🏭',
        },
        {
          step: 2,
          title: '流通跟踪',
          description: '药品流通过程实时跟踪',
          icon: '🚚',
        },
        {
          step: 3,
          title: '销售验证',
          description: '销售环节真伪验证',
          icon: '🏪',
        },
        {
          step: 4,
          title: '使用监控',
          description: '患者用药情况监控',
          icon: '👤',
        },
      ],
      testimonial: {
        quote: '药品溯源系统让我们能够快速定位问题药品，大大提升了药品安全监管的效率和准确性。',
        author: '陈局长',
        position: '药监局信息化负责人',
        avatar: '👨‍💼',
      },
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const currentCase = useCases[activeCase];

  return (
    <div
      id="use-cases"
      className="py-20 bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-green-900"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">🎯 实际应用场景</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            深入了解MedChain在不同医疗场景中的实际应用，看看我们如何为各类医疗机构和用户创造价值
          </p>
        </div>

        {/* 案例选择器 */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {useCases.map((useCase, index) => (
            <button
              key={useCase.id}
              onClick={() => setActiveCase(index)}
              className={`group relative px-6 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                activeCase === index
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-2xl'
                  : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-lg'
              } ${animationPhase === index ? 'animate-pulse' : ''}`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                  {useCase.icon}
                </span>
                <div className="text-left">
                  <div className="text-sm font-medium">{useCase.category}</div>
                  <div className="text-xs opacity-75">{useCase.title}</div>
                </div>
              </div>
              {activeCase === index && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white rotate-45"></div>
              )}
            </button>
          ))}
        </div>

        {/* 案例详情 */}
        <div
          className={`transition-all duration-500 transform ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* 案例概述 */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center mb-6">
                <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl mr-4 shadow-lg">
                  <span className="text-3xl">{currentCase.icon}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentCase.title}
                  </h3>
                  <p className="text-blue-600 dark:text-blue-400 font-medium">
                    {currentCase.subtitle}
                  </p>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                {currentCase.description}
              </p>

              {/* 核心优势 */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="mr-2">✨</span>
                  核心优势
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {currentCase.benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-center text-sm text-gray-600 dark:text-gray-300"
                    >
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></span>
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>

              {/* 关键指标 */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="mr-2">📊</span>
                  关键指标
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {currentCase.metrics.map((metric, index) => (
                    <div
                      key={index}
                      className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {metric.value}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 视觉展示 */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50 dark:border-gray-700/50">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <span className="mr-2">🎨</span>
                场景展示
              </h4>

              {/* 图形化展示 */}
              <div className="relative h-64 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-xl mb-6 flex items-center justify-center overflow-hidden">
                <div className="text-8xl opacity-20 absolute">{currentCase.image}</div>
                <div className="relative z-10 text-center">
                  <div className="text-4xl mb-4">{currentCase.icon}</div>
                  <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    {currentCase.category}
                  </div>
                </div>

                {/* 动画元素 */}
                <div className="absolute inset-0">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`absolute w-3 h-3 bg-blue-400 rounded-full opacity-30 animate-float`}
                      style={{
                        left: `${20 + i * 15}%`,
                        top: `${30 + (i % 2) * 40}%`,
                        animationDelay: `${i * 0.5}s`,
                        animationDuration: `${3 + i * 0.5}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* 用户评价 */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl border border-blue-200 dark:border-blue-700">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-xl">{currentCase.testimonial.avatar}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 dark:text-gray-300 italic mb-3">
                      "{currentCase.testimonial.quote}"
                    </p>
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {currentCase.testimonial.author}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {currentCase.testimonial.position}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 工作流程 */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50 dark:border-gray-700/50">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-8 text-center flex items-center justify-center">
              <span className="mr-3">🔄</span>
              {currentCase.title} - 工作流程
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {currentCase.workflow.map((step, index) => (
                <div key={step.step} className="relative">
                  <div className="text-center">
                    <div className="relative inline-block">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg mb-4 mx-auto">
                        <span className="text-2xl">{step.icon}</span>
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md border-2 border-blue-500">
                        <span className="text-xs font-bold text-blue-500">{step.step}</span>
                      </div>
                    </div>
                    <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {step.title}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
                  </div>

                  {/* 连接线 */}
                  {index < currentCase.workflow.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-full w-6 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transform -translate-y-1/2">
                      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-purple-500 rounded-full"></div>
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

export default UseCases;
