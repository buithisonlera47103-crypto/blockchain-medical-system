import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Link2, Database, Users, FileCheck, Lock, Activity, Share2 } from 'lucide-react';

const FeaturesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const features = [
    {
      icon: Shield,
      title: '端到端数据加密',
      description: '采用国密SM2/SM3/SM4算法体系',
      color: 'blue',
      details: [
        '传输层TLS 1.3加密',
        '存储层AES-256加密',
        '零知识证明隐私保护',
        'HSM硬件加密模块'
      ],
      performance: {
        label: '加密速度',
        value: '10,000 TPS',
        description: '支持每秒万次加密操作'
      }
    },
    {
      icon: Zap,
      title: '实时数据同步',
      description: '多节点并发共识机制',
      color: 'yellow',
      details: [
        'Raft共识算法',
        '毫秒级延迟',
        '99.99%数据一致性',
        '自动故障转移'
      ],
      performance: {
        label: '同步延迟',
        value: '<100ms',
        description: '平均区块确认时间'
      }
    },
    {
      icon: Link2,
      title: '全链路可追溯',
      description: '不可篡改的操作审计链',
      color: 'purple',
      details: [
        '完整操作日志',
        'Merkle树验证',
        '时间戳服务',
        '智能合约审计'
      ],
      performance: {
        label: '存储容量',
        value: '无限制',
        description: '支持PB级数据存储'
      }
    },
    {
      icon: Database,
      title: '分布式存储',
      description: 'IPFS + 区块链混合架构',
      color: 'green',
      details: [
        'IPFS内容寻址',
        '数据分片存储',
        '冗余备份机制',
        'CDN加速访问'
      ],
      performance: {
        label: '可用性',
        value: '99.99%',
        description: '年均停机时间<1小时'
      }
    },
    {
      icon: Users,
      title: '多角色权限',
      description: '细粒度访问控制系统',
      color: 'indigo',
      details: [
        'RBAC角色管理',
        'ABAC属性控制',
        '动态权限策略',
        '审批工作流'
      ],
      performance: {
        label: '并发用户',
        value: '10,000+',
        description: '支持万级并发访问'
      }
    },
    {
      icon: FileCheck,
      title: '智能合约',
      description: 'Chaincode自动化业务逻辑',
      color: 'pink',
      details: [
        'Go语言编写',
        '自动执行规则',
        '版本管理',
        '灰度发布'
      ],
      performance: {
        label: '执行速度',
        value: '<50ms',
        description: '平均合约执行时间'
      }
    }
  ];

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    yellow: 'from-yellow-500 to-orange-500',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-emerald-600',
    indigo: 'from-indigo-500 to-indigo-600',
    pink: 'from-pink-500 to-rose-500'
  };

  const bgColorClasses = {
    blue: 'from-blue-50 to-blue-100',
    yellow: 'from-yellow-50 to-orange-100',
    purple: 'from-purple-50 to-purple-100',
    green: 'from-green-50 to-emerald-100',
    indigo: 'from-indigo-50 to-indigo-100',
    pink: 'from-pink-50 to-rose-100'
  };

  return (
    <section id="features" className="relative py-24 bg-gradient-to-b from-white via-cyan-50/30 to-white overflow-hidden">
      {/* Cloud Mist Effect - Right Side */}
      <motion.div
        animate={{
          x: [0, -20, 0],
          opacity: [0.15, 0.25, 0.15]
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/4 right-0 w-[450px] h-[450px] bg-gradient-to-l from-cyan-100/25 via-blue-50/20 to-transparent rounded-full blur-3xl pointer-events-none"
      />

      {/* Cloud Mist Effect - Left Side */}
      <motion.div
        animate={{
          x: [0, 20, 0],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3
        }}
        className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-gradient-to-r from-sky-100/20 to-transparent rounded-full blur-3xl pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-sm font-semibold text-blue-700 mb-4">
            <Activity className="w-4 h-4" />
            核心功能
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            企业级区块链医疗解决方案
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            基于 Hyperledger Fabric 的分布式账本技术，提供安全、高效、可扩展的医疗数据管理能力
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer border border-gray-100 overflow-hidden"
              onClick={() => setActiveTab(index)}
            >
              {/* Gradient Border on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[feature.color as keyof typeof colorClasses]} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-2xl`}></div>
              
              {/* Icon */}
              <div className={`relative w-16 h-16 rounded-xl bg-gradient-to-br ${colorClasses[feature.color as keyof typeof colorClasses]} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                <feature.icon className="w-8 h-8 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-600 mb-6">
                {feature.description}
              </p>

              {/* Details List */}
              <ul className="space-y-2 mb-6">
                {feature.details.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 mt-1.5 flex-shrink-0"></span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>

              {/* Performance Badge */}
              <div className={`bg-gradient-to-br ${bgColorClasses[feature.color as keyof typeof bgColorClasses]} rounded-xl p-4 border border-gray-200`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">{feature.performance.label}</span>
                  <span className={`text-2xl font-bold bg-gradient-to-r ${colorClasses[feature.color as keyof typeof colorClasses]} bg-clip-text text-transparent`}>
                    {feature.performance.value}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{feature.performance.description}</p>
              </div>

              {/* Active Indicator */}
              {activeTab === index && (
                <motion.div
                  layoutId="activeFeature"
                  className="absolute -top-1 -right-1 w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <span className="text-white text-sm">✓</span>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Additional Features Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-3 gap-6"
        >
          <div className="bg-white rounded-xl p-6 border-l-4 border-blue-500 shadow-lg">
            <Lock className="w-10 h-10 text-blue-600 mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">国密合规</h3>
            <p className="text-sm text-gray-600">
              完全符合国家商用密码管理条例，通过等保三级认证
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 border-l-4 border-green-500 shadow-lg">
            <Activity className="w-10 h-10 text-green-600 mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">实时监控</h3>
            <p className="text-sm text-gray-600">
              提供完整的系统监控和告警机制，支持Prometheus + Grafana
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 border-l-4 border-purple-500 shadow-lg">
            <Share2 className="w-10 h-10 text-purple-600 mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">跨链互通</h3>
            <p className="text-sm text-gray-600">
              支持与其他区块链网络的跨链数据交互和协作
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;

