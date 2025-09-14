import React, { useEffect, useState } from 'react';

import EnhancedNavigation from './EnhancedNavigation';
import Footer from './Footer';

// Custom CSS animations
const customStyles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
    50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
  }
  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .animate-float { animation: float 6s ease-in-out infinite; }
  .animate-float-delayed { animation: float 6s ease-in-out infinite 2s; }
  .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
  .animate-gradient { animation: gradient-shift 8s ease infinite; background-size: 200% 200%; }
`;

const About: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const teamMembers = [
    {
      name: '张医生',
      position: '首席技术官',
      avatar: '👨‍⚕️',
      description: '15年医疗信息化经验，区块链技术专家，主导核心架构设计',
      expertise: ['区块链架构', '医疗信息化', '数据安全'],
      achievements: '获得国家科技进步奖，发表SCI论文20余篇',
    },
    {
      name: '李工程师',
      position: '产品总监',
      avatar: '👩‍💻',
      description: '专注于医疗产品设计与用户体验优化，打造行业标杆产品',
      expertise: ['产品设计', '用户体验', '项目管理'],
      achievements: '主导设计的产品获得红点设计奖',
    },
    {
      name: '王博士',
      position: '研发总监',
      avatar: '👨‍🔬',
      description: '计算机科学博士，AI与区块链融合专家，技术创新引领者',
      expertise: ['人工智能', '算法优化', '系统架构'],
      achievements: '拥有核心技术专利15项，IEEE高级会员',
    },
    {
      name: '陈主任',
      position: '医疗顾问',
      avatar: '👩‍⚕️',
      description: '三甲医院信息科主任，临床信息化专家，医疗流程权威',
      expertise: ['临床流程', '医疗标准', '合规审查'],
      achievements: '参与制定国家医疗信息化标准',
    },
  ];

  const customerCases = [
    {
      name: '北京协和医院',
      logo: '🏥',
      description: '全面部署医疗数据区块链系统，实现跨科室数据安全共享',
      results: ['数据查询效率提升80%', '医疗纠纷减少60%', '患者满意度提升至95%'],
      category: '三甲医院',
    },
    {
      name: '上海儿童医学中心',
      logo: '👶',
      description: '建立儿童健康档案区块链平台，保障儿童医疗数据安全',
      results: ['建档效率提升70%', '数据准确率达99.9%', '家长满意度显著提升'],
      category: '专科医院',
    },
    {
      name: '广东省人民医院',
      logo: '🏥',
      description: '构建区域医疗联盟数据共享平台，实现医疗资源优化配置',
      results: ['覆盖医院200+', '服务患者500万+', '医疗成本降低30%'],
      category: '医疗联盟',
    },
  ];

  const technicalAdvantages = [
    {
      icon: '🔐',
      title: '零知识证明技术',
      description: '采用先进的零知识证明算法，确保医疗数据在验证过程中的隐私保护',
      features: ['隐私保护', '数据验证', '合规审计'],
    },
    {
      icon: '⚡',
      title: '高性能共识机制',
      description: '自主研发的医疗专用共识算法，支持高并发医疗数据处理',
      features: ['高并发处理', '低延迟响应', '节能环保'],
    },
    {
      icon: '🔗',
      title: '跨链互操作',
      description: '支持多种区块链网络互联互通，实现医疗数据的无缝流转',
      features: ['多链支持', '数据互通', '标准兼容'],
    },
    {
      icon: '🛡️',
      title: '智能合约安全',
      description: '经过形式化验证的智能合约，确保医疗业务逻辑的安全可靠',
      features: ['形式化验证', '安全审计', '自动执行'],
    },
    {
      icon: '🏥',
      title: '医疗数据标准化',
      description: '支持HL7 FHIR等国际医疗数据标准，确保数据互操作性',
      features: ['标准兼容', '数据映射', '格式转换'],
    },
    {
      icon: '🤖',
      title: 'AI辅助诊断',
      description: '集成人工智能算法，提供智能化的医疗数据分析和辅助决策',
      features: ['智能分析', '辅助诊断', '预测建模'],
    },
  ];

  const values = [
    {
      icon: '🎯',
      title: '使命驱动',
      description:
        '致力于通过技术创新改善医疗服务质量，让每个人都能享受到安全、高效的医疗数据管理服务。',
    },
    {
      icon: '🔒',
      title: '安全至上',
      description:
        '采用最高级别的安全标准，确保医疗数据的隐私性和完整性，建立患者与医疗机构之间的信任桥梁。',
    },
    {
      icon: '🚀',
      title: '持续创新',
      description:
        '不断探索前沿技术，将区块链、AI等技术与医疗场景深度融合，推动医疗行业数字化转型。',
    },
    {
      icon: '🤝',
      title: '合作共赢',
      description: '与医疗机构、技术伙伴携手合作，构建开放、互信的医疗数据生态系统。',
    },
  ];

  const milestones = [
    {
      year: '2018',
      title: '公司成立',
      description: '在北京成立，专注医疗区块链技术研发',
      icon: '🏢',
    },
    {
      year: '2019',
      title: '技术突破',
      description: '完成核心区块链架构设计，获得多项技术专利',
      icon: '💡',
    },
    {
      year: '2020',
      title: '产品发布',
      description: '正式发布MedChain平台，首批医院开始试点',
      icon: '🚀',
    },
    {
      year: '2021',
      title: '规模扩张',
      description: '合作医院突破100家，用户数量快速增长',
      icon: '📈',
    },
    {
      year: '2022',
      title: '行业认可',
      description: '获得国家级医疗信息化奖项，成为行业标杆',
      icon: '🏆',
    },
    {
      year: '2023',
      title: '国际化',
      description: '开始国际市场布局，与海外医疗机构建立合作',
      icon: '🌍',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-cyan-900/20">
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <EnhancedNavigation />

      {/* Hero Section */}
      <div className="relative pt-20 pb-12 overflow-hidden bg-gradient-to-br from-blue-300 via-sky-300 to-cyan-300">
        {/* Advanced Background Effects */}
        <div className="absolute inset-0">
          {/* Animated gradient orbs */}
          <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-blue-200/20 to-sky-200/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-sky-200/20 to-cyan-200/20 rounded-full blur-3xl animate-bounce"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-200/15 to-blue-200/15 rounded-full blur-3xl animate-spin-slow"></div>

          {/* Medical DNA helix pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-32 left-1/4 text-6xl text-white animate-float">🧬</div>
            <div className="absolute top-48 right-1/3 text-5xl text-white animate-float-delayed">
              ⚕️
            </div>
            <div className="absolute bottom-40 left-1/3 text-4xl text-white animate-float">🔬</div>
            <div className="absolute bottom-32 right-1/4 text-5xl text-white animate-float-delayed">
              💊
            </div>
            <div className="absolute top-1/3 left-1/6 text-3xl text-white animate-float">🩺</div>
            <div className="absolute top-2/3 right-1/6 text-4xl text-white animate-float-delayed">
              🏥
            </div>
          </div>

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-30">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            ></div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div
            className={`transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
          >
            {/* Company logo with medical cross */}
            <div className="inline-flex items-center justify-center w-32 h-32 bg-white/20 backdrop-blur-lg rounded-full mb-8 shadow-2xl border border-white/30 group hover:scale-110 transition-all duration-500">
              <div className="relative">
                <span className="text-5xl text-white group-hover:scale-110 transition-transform duration-300">
                  🏥
                </span>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">✓</span>
                </div>
              </div>
            </div>

            {/* Main heading with gradient text */}
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent mb-4 leading-tight">
              医疗区块链
              <br />
              <span className="text-3xl md:text-4xl">创新引领者</span>
            </h1>

            {/* Enhanced description */}
            <p className="text-base md:text-lg text-white/90 max-w-4xl mx-auto leading-relaxed mb-6 font-light">
              专注医疗数据安全与隐私保护的区块链技术公司
              <br className="hidden md:block" />
              为全球医疗机构提供可信、高效、合规的数字化解决方案
            </p>

            {/* Key highlights */}
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl px-4 py-2 border border-white/20">
                <span className="text-white font-semibold text-sm">🏆 行业领先</span>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl px-4 py-2 border border-white/20">
                <span className="text-white font-semibold text-sm">🔒 安全可信</span>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl px-4 py-2 border border-white/20">
                <span className="text-white font-semibold text-sm">🌍 全球服务</span>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-bold rounded-2xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 hover:scale-105 transition-all duration-300 group">
                <span className="mr-3 text-xl group-hover:scale-110 transition-transform">🚀</span>
                了解我们的技术
              </button>
              <button className="inline-flex items-center px-8 py-4 bg-white/20 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl border border-white/30 transform hover:-translate-y-2 hover:scale-105 transition-all duration-300 backdrop-blur-lg group">
                <span className="mr-3 text-xl group-hover:scale-110 transition-transform">💬</span>
                预约产品演示
              </button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Our Story */}
      <div className="py-20 bg-gradient-to-br from-blue-50/80 via-sky-50/60 to-cyan-50/40 dark:from-blue-900/30 dark:via-sky-900/20 dark:to-cyan-900/15 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-32 left-16 w-24 h-24 bg-blue-300/8 rounded-full blur-2xl"></div>
          <div className="absolute bottom-32 right-16 w-28 h-28 bg-sky-300/8 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-cyan-300/8 rounded-full blur-xl"></div>
        </div>

        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-sky-600 rounded-2xl mb-6 shadow-lg">
              <span className="text-2xl text-white">📖</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">我们的故事</h2>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-blue-100/60 dark:border-gray-700/40">
            <div className="prose prose-lg max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
              <p className="text-xl mb-6 text-gray-800 dark:text-gray-200 font-medium">
                我们的故事始于一个简单而深刻的信念：技术应该让医疗变得更加透明、安全和高效。
              </p>

              <p className="mb-6">
                几年前，我们的创始团队在医疗行业工作时，深深感受到传统医疗数据管理系统的局限性。患者的医疗记录分散在各个医院，医生无法快速获取完整的病史信息，而患者对自己的医疗数据缺乏控制权。我们意识到，区块链技术可以彻底改变这一现状。
              </p>

              <p className="mb-6">
                我们从一个小团队开始，怀着对医疗区块链技术的热情和对患者权益的关注，开始了这段创业之旅。我们相信，每个人都应该拥有对自己医疗数据的完全控制权，同时医疗机构之间应该能够安全、高效地共享必要的医疗信息。
              </p>

              <p className="mb-6">
                在发展过程中，我们不断学习、创新和改进。我们与医院、诊所和患者密切合作，深入了解他们的真实需求，并将这些需求转化为技术解决方案。我们的团队从最初的几个人发展到现在的专业团队，每个人都对我们的使命充满热情。
              </p>

              <p className="mb-0">
                今天，我们很自豪能够为医疗行业提供安全、可靠的区块链解决方案。我们的技术已经帮助众多医疗机构提升了数据安全性和运营效率，同时让患者更好地掌控自己的健康信息。这只是我们故事的开始，我们将继续致力于用技术创新推动医疗行业的进步。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Cases Section */}
      <div className="py-20 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl mb-8 shadow-2xl">
              <span className="text-3xl text-white">🏆</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">成功案例</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              与全国知名医疗机构深度合作，共同推动医疗数字化转型
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {customerCases.map((case_, index) => (
              <div
                key={index}
                className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-200/50 dark:border-gray-700/30 backdrop-blur-sm group hover:scale-105 relative overflow-hidden"
              >
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative z-10">
                  {/* Hospital logo and category */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-2xl text-white">{case_.logo}</span>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm rounded-full font-medium">
                      {case_.category}
                    </span>
                  </div>

                  {/* Hospital name */}
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                    {case_.name}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                    {case_.description}
                  </p>

                  {/* Results */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      核心成果：
                    </h4>
                    {case_.results.map((result, resultIndex) => (
                      <div key={resultIndex} className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{result}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Technical Advantages Section */}
      <div className="py-20 bg-white dark:bg-gray-900 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl mb-8 shadow-2xl">
              <span className="text-3xl text-white">⚡</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">技术优势</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              基于前沿区块链技术，为医疗行业提供安全、高效、可信的数字化解决方案
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {technicalAdvantages.map((advantage, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-800/50 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-200/50 dark:border-gray-700/30 group hover:scale-105 relative overflow-hidden"
              >
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-purple-50/30 dark:from-blue-900/10 dark:to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative z-10">
                  {/* Icon */}
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl text-white">{advantage.icon}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                    {advantage.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                    {advantage.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-2">
                    {advantage.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="py-16 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-indigo-900/30 dark:via-blue-900/30 dark:to-cyan-900/30 relative overflow-hidden">
        {/* Enhanced background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-cyan-400/15 rounded-full blur-2xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 rounded-full mb-6 shadow-lg">
              <span className="text-2xl text-white">🎯</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              我们的使命与愿景
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              通过创新技术推动医疗行业数字化转型，构建安全、透明、高效的医疗数据生态系统
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <div key={index} className="relative group">
                {/* Card background with enhanced effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-blue-50/90 dark:from-gray-800/90 dark:to-blue-900/30 rounded-3xl shadow-2xl group-hover:shadow-3xl transition-all duration-500 backdrop-blur-sm border border-white/50 dark:border-gray-700/50"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative p-6 group-hover:scale-105 transition-transform duration-500">
                  {/* Icon and title section */}
                  <div className="flex items-center mb-6">
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <span className="text-2xl text-white">{value.icon}</span>
                      </div>
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                    </div>
                    <div className="ml-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                        {value.title}
                      </h3>
                      <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mt-2 group-hover:w-24 transition-all duration-300"></div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {value.description}
                  </p>

                  {/* Decorative element */}
                  <div className="absolute bottom-6 right-6 w-8 h-8 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="py-16 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/20 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-32 left-16 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-32 right-16 w-32 h-32 bg-purple-400/10 rounded-full blur-2xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-6 shadow-lg">
              <span className="text-2xl text-white">👥</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">核心团队</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              汇聚医疗、技术、产品等领域的顶尖人才，拥有丰富的行业经验，为您提供专业可靠的服务
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((member, index) => (
              <div key={index} className="relative group">
                {/* Card background */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/95 to-blue-50/80 dark:from-gray-800/95 dark:to-blue-900/30 rounded-3xl shadow-2xl group-hover:shadow-3xl transition-all duration-500 backdrop-blur-sm border border-white/60 dark:border-gray-700/40"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-purple-50/30 dark:from-blue-900/10 dark:to-purple-900/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative p-6 group-hover:scale-105 transition-transform duration-500">
                  <div className="text-center">
                    {/* Avatar with enhanced effects */}
                    <div className="relative mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-full mx-auto flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 relative overflow-hidden">
                        <span className="text-2xl text-white z-10">{member.avatar}</span>
                        {/* Animated ring */}
                        <div className="absolute inset-0 rounded-full border-4 border-white/30 group-hover:border-white/50 transition-colors duration-300"></div>
                      </div>
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                    </div>

                    {/* Name and position */}
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                      {member.name}
                    </h3>
                    <div className="inline-block px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-medium rounded-full mb-3 shadow-lg">
                      {member.position}
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed mb-3">
                      {member.description}
                    </p>

                    {/* Expertise tags */}
                    <div className="flex flex-wrap gap-1 justify-center mb-3">
                      {member.expertise.map((skill, skillIndex) => (
                        <span
                          key={skillIndex}
                          className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Achievements */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {member.achievements}
                    </div>
                  </div>

                  {/* Decorative corner element */}
                  <div className="absolute top-4 right-4 w-4 h-4 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Company Timeline */}
      <div className="py-16 bg-gradient-to-br from-blue-50/60 via-sky-50/40 to-cyan-50/30 dark:from-blue-900/20 dark:via-sky-900/15 dark:to-cyan-900/10 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-20 h-20 bg-blue-300/6 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 bg-sky-300/6 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-cyan-300/6 rounded-full blur-xl"></div>
        </div>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-400 to-sky-500 rounded-2xl mb-6 shadow-lg">
              <span className="text-2xl text-white">📈</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">发展历程</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              从初创到行业领先，见证我们在医疗区块链领域的每一个重要时刻
            </p>
          </div>

          <div className="relative">
            {/* Simplified timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-blue-400 via-sky-500 to-cyan-500 rounded-full shadow-sm"></div>

            <div className="space-y-10">
              {milestones.map((milestone, index) => (
                <div
                  key={index}
                  className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'} group`}
                >
                  <div className="flex-1 px-8">
                    <div className="relative">
                      {/* Simplified card background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-blue-50/80 dark:from-gray-800/90 dark:to-blue-900/20 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 backdrop-blur-sm border border-blue-100/60 dark:border-gray-700/40"></div>

                      <div className="relative p-6 group-hover:scale-102 transition-transform duration-300">
                        {/* Header with icon and year */}
                        <div className="flex items-center mb-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 via-sky-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                              <span className="text-lg text-white">{milestone.icon}</span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-2xl font-bold text-transparent bg-gradient-to-r from-blue-500 to-sky-600 bg-clip-text">
                              {milestone.year}
                            </div>
                            <div className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-sky-500 rounded-full mt-1 group-hover:w-12 transition-all duration-300"></div>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                          {milestone.title}
                        </h3>

                        {/* Description */}
                        <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Simplified timeline dot */}
                  <div className="relative z-20">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full border-3 border-white dark:border-gray-900 shadow-lg group-hover:scale-110 transition-transform duration-300"></div>
                  </div>

                  <div className="flex-1"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="py-16 bg-gradient-to-br from-blue-500/80 via-sky-600/70 to-cyan-700/60 relative overflow-hidden">
        {/* Simplified background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-16 left-16 w-24 h-24 bg-white/6 rounded-full blur-2xl"></div>
          <div className="absolute bottom-16 right-16 w-28 h-28 bg-cyan-300/8 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-sky-300/6 rounded-full blur-xl"></div>
        </div>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-white/20 to-cyan-300/20 rounded-2xl mb-6 shadow-lg backdrop-blur-sm border border-white/20">
              <span className="text-2xl text-white">💬</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-6 tracking-tight">联系我们</h2>
            <p className="text-lg text-blue-100 max-w-3xl mx-auto leading-relaxed">
              准备好开启您的医疗区块链之旅了吗？我们的专家团队随时为您提供专业支持与咨询服务
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Email Contact */}
            <div className="group relative">
              <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center hover:bg-white/15 transition-all duration-300 border border-white/20 group-hover:border-white/40 group-hover:scale-102">
                <div className="relative mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-white/20 to-cyan-300/20 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:scale-105 transition-transform duration-300">
                    <span className="text-2xl text-white">📧</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-cyan-200 transition-colors duration-300">
                  邮箱联系
                </h3>
                <p className="text-lg text-blue-100 mb-3 font-semibold">contact@medchain.com</p>
                <p className="text-blue-200 text-sm">我们会在24小时内回复您的邮件</p>
              </div>
            </div>

            {/* Phone Contact */}
            <div className="group relative">
              <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center hover:bg-white/15 transition-all duration-300 border border-white/20 group-hover:border-white/40 group-hover:scale-102">
                <div className="relative mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-white/20 to-sky-300/20 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:scale-105 transition-transform duration-300">
                    <span className="text-2xl text-white">📞</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-sky-200 transition-colors duration-300">
                  电话咨询
                </h3>
                <p className="text-lg text-blue-100 mb-3 font-semibold">400-123-4567</p>
                <p className="text-blue-200 text-sm">工作日 9:00-18:00</p>
              </div>
            </div>

            {/* Office Address */}
            <div className="group relative">
              <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center hover:bg-white/15 transition-all duration-300 border border-white/20 group-hover:border-white/40 group-hover:scale-102">
                <div className="relative mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-white/20 to-cyan-300/20 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:scale-105 transition-transform duration-300">
                    <span className="text-2xl text-white">📍</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-cyan-200 transition-colors duration-300">
                  办公地址
                </h3>
                <p className="text-lg text-blue-100 mb-3 font-semibold">北京市朝阳区科技园区</p>
                <p className="text-blue-200 text-sm">欢迎预约参观我们的办公室</p>
              </div>
            </div>
          </div>

          {/* Simplified CTA Section */}
          <div className="text-center">
            <div className="inline-flex flex-col sm:flex-row gap-4 items-center">
              <button className="group relative bg-white text-blue-600 px-8 py-3 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 border border-white/20">
                <span className="relative z-10">立即联系我们</span>
              </button>
              <button className="group relative bg-transparent text-white px-8 py-3 rounded-2xl font-bold text-lg border border-white/40 hover:border-white/80 hover:bg-white/10 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105">
                <span className="relative z-10">预约演示</span>
              </button>
            </div>
            <p className="text-blue-200 mt-6 text-base">或扫描二维码添加微信咨询</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default About;
