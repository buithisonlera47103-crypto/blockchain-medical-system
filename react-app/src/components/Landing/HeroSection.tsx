import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Link2, CheckCircle, PlayCircle, FileText, ArrowDown } from 'lucide-react';
import AnimatedLogo from './AnimatedLogo';

const HeroSection: React.FC = () => {
  const stats = [
    { value: '10,000+', label: '医疗记录' },
    { value: '500+', label: '合作机构' },
    { value: '2,000+', label: '医护人员' },
    { value: '99.9%', label: '可用性' }
  ];

  const features = [
    { icon: Shield, text: '数据加密' },
    { icon: Zap, text: '实时同步' },
    { icon: Link2, text: '全程可溯' }
  ];

  return (
    <section className="relative min-h-screen pt-28 pb-20 overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-50">
      {/* Cloud Mist Effect 1 - Top Left */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.25, 0.35, 0.25]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-20 left-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/40 via-sky-50/30 to-transparent rounded-full blur-3xl pointer-events-none"
      />

      {/* Cloud Mist Effect 2 - Top Right */}
      <motion.div
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.2, 0.3, 0.2]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute top-40 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-sky-100/35 via-blue-50/25 to-transparent rounded-full blur-3xl pointer-events-none"
      />

      {/* Subtle Grid Background */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(224, 242, 254, 0.4) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(224, 242, 254, 0.4) 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }}
      ></div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-5 gap-16 items-center">
          {/* Left Content - 60% */}
          <div className="lg:col-span-3 space-y-8">
            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm font-medium text-green-700"
            >
              <CheckCircle className="w-4 h-4 text-green-600" />
              国家医疗数据安全认证
            </motion.div>

            {/* Main Title */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight"
            >
              区块链医疗数据管理
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                安全 · 透明 · 可信
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.4 }}
              className="text-xl text-gray-600 leading-relaxed max-w-2xl"
            >
              基于 Hyperledger Fabric 区块链技术，为医疗机构、医护人员
              和患者提供安全可靠的数据管理解决方案。保护隐私，提升效率。
            </motion.p>

            {/* Feature Tags */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.4, delay: 0.6 }}
              className="flex flex-wrap gap-3"
            >
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 transition-all duration-300 cursor-pointer"
                >
                  <feature.icon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">{feature.text}</span>
                </div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.6, delay: 0.8 }}
              className="flex flex-wrap gap-4"
            >
              <button className="flex items-center gap-2 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg hover:shadow-blue-500/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <span>开始使用</span>
                <span>→</span>
              </button>
              <button className="flex items-center gap-2 px-8 py-4 text-base font-semibold text-blue-600 bg-white border-2 border-blue-600 rounded-xl hover:bg-blue-50 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <PlayCircle className="w-5 h-5" />
                <span>观看演示</span>
              </button>
              <button className="flex items-center gap-2 px-6 py-4 text-base font-medium text-gray-600 hover:text-blue-600 transition-all duration-300 group">
                <FileText className="w-5 h-5" />
                <span>技术文档</span>
                <span className="transform transition-transform duration-300 group-hover:translate-x-1">→</span>
              </button>
            </motion.div>

            {/* Trust Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.8, delay: 1.0 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-white/80 backdrop-blur-lg border border-gray-200 rounded-2xl shadow-lg"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-extrabold text-blue-600 mb-1">{stat.value}</div>
                  <div className="text-sm font-medium text-gray-600">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right Visual Decoration - 40% */}
          <div className="hidden lg:block lg:col-span-2 relative h-[600px]">
            <AnimatedLogo />
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2 }}
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer animate-bounce"
      >
        <span className="text-sm font-medium text-gray-500">向下滚动</span>
        <ArrowDown className="w-6 h-6 text-blue-600" />
      </motion.div>
    </section>
  );
};

export default HeroSection;

