import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Server, Database, Shield, Layers, Cloud, Code, GitBranch, Cpu } from 'lucide-react';

const ArchitectureSection: React.FC = () => {
  const [activeLayer, setActiveLayer] = useState<number | null>(null);

  const techStack = {
    blockchain: [
      { name: 'Hyperledger Fabric', version: '2.5.x', icon: '⛓️' },
      { name: 'CouchDB / LevelDB', version: '3.x', icon: '📊' },
      { name: 'Raft Consensus', version: 'Built-in', icon: '🔄' }
    ],
    backend: [
      { name: 'Node.js', version: '18.x LTS', icon: '💚' },
      { name: 'Express.js', version: '4.x', icon: '⚡' },
      { name: 'Fabric SDK', version: '2.x', icon: '🔌' }
    ],
    frontend: [
      { name: 'React', version: '18.x', icon: '⚛️' },
      { name: 'TypeScript', version: '5.x', icon: '📘' },
      { name: 'Tailwind CSS', version: '3.x', icon: '🎨' }
    ],
    storage: [
      { name: 'IPFS', version: '0.x', icon: '🗄️' },
      { name: 'MinIO', version: 'Latest', icon: '☁️' },
      { name: 'Redis', version: '7.x', icon: '⚡' }
    ],
    security: [
      { name: '国密算法', version: 'SM2/3/4', icon: '🔐' },
      { name: 'JWT', version: 'Latest', icon: '🎫' },
      { name: 'OAuth 2.0', version: '2.0', icon: '🔑' }
    ],
    devops: [
      { name: 'Docker', version: '24.x', icon: '🐳' },
      { name: 'Kubernetes', version: '1.28', icon: '☸️' },
      { name: 'Prometheus', version: '2.x', icon: '📈' }
    ]
  };

  const layers = [
    {
      id: 1,
      title: '应用层',
      icon: Code,
      color: 'blue',
      description: '用户交互界面和业务逻辑',
      components: ['Web前端', '移动端APP', 'RESTful API', '管理后台'],
      tech: 'React + TypeScript + Tailwind CSS'
    },
    {
      id: 2,
      title: '服务层',
      icon: Server,
      color: 'green',
      description: '业务服务和中间件',
      components: ['身份认证', '权限管理', '业务网关', '消息队列'],
      tech: 'Node.js + Express + Redis + RabbitMQ'
    },
    {
      id: 3,
      title: '区块链层',
      icon: GitBranch,
      color: 'purple',
      description: 'Fabric网络和智能合约',
      components: ['Peer节点', 'Orderer节点', 'CA服务', 'Chaincode'],
      tech: 'Hyperledger Fabric 2.5 + Go'
    },
    {
      id: 4,
      title: '存储层',
      icon: Database,
      color: 'orange',
      description: '分布式数据存储',
      components: ['状态数据库', '区块存储', '文件存储', '缓存系统'],
      tech: 'CouchDB + IPFS + MinIO + Redis'
    }
  ];

  const securityFeatures = [
    { title: '传输安全', icon: Shield, items: ['TLS 1.3', 'mTLS认证', 'gRPC安全通道'] },
    { title: '数据安全', icon: Database, items: ['AES-256加密', '数据脱敏', '访问控制'] },
    { title: '网络安全', icon: Cloud, items: ['防火墙', 'DDoS防护', '入侵检测'] },
    { title: '合约安全', icon: Code, items: ['代码审计', '形式化验证', '沙箱隔离'] }
  ];

  return (
    <section id="architecture" className="relative py-24 bg-gradient-to-br from-slate-50 via-sky-50/40 to-white overflow-hidden">
      {/* Cloud Mist Effect - Center */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          rotate: [0, 5, 0],
          opacity: [0.12, 0.2, 0.12]
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-br from-blue-100/25 via-cyan-50/15 to-sky-50/20 rounded-full blur-3xl pointer-events-none"
      />

      {/* Cloud Mist Effect - Top Right */}
      <motion.div
        animate={{
          y: [0, -30, 0],
          opacity: [0.1, 0.18, 0.1]
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4
        }}
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-slate-100/30 to-transparent rounded-full blur-3xl pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full text-sm font-semibold text-purple-700 mb-4">
            <Layers className="w-4 h-4" />
            技术架构
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            企业级分布式架构
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            基于微服务架构和区块链技术，构建高可用、高性能、高安全的医疗数据管理平台
          </p>
        </motion.div>

        {/* Architecture Layers */}
        <div className="grid lg:grid-cols-4 gap-6 mb-16">
          {layers.map((layer, index) => (
            <motion.div
              key={layer.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onMouseEnter={() => setActiveLayer(layer.id)}
              onMouseLeave={() => setActiveLayer(null)}
              className={`relative bg-gradient-to-br ${
                layer.color === 'blue' ? 'from-blue-50 to-blue-100' :
                layer.color === 'green' ? 'from-green-50 to-green-100' :
                layer.color === 'purple' ? 'from-purple-50 to-purple-100' :
                'from-orange-50 to-orange-100'
              } rounded-2xl p-6 cursor-pointer transition-all duration-500 ${
                activeLayer === layer.id ? 'scale-105 shadow-2xl' : 'shadow-lg hover:shadow-xl'
              }`}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${
                layer.color === 'blue' ? 'from-blue-500 to-blue-600' :
                layer.color === 'green' ? 'from-green-500 to-green-600' :
                layer.color === 'purple' ? 'from-purple-500 to-purple-600' :
                'from-orange-500 to-orange-600'
              } flex items-center justify-center mb-4 shadow-lg`}>
                <layer.icon className="w-7 h-7 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">{layer.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{layer.description}</p>
              
              <div className="space-y-2 mb-4">
                {layer.components.map((component, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                    {component}
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t border-gray-300">
                <div className="text-xs font-medium text-gray-500 mb-1">技术栈</div>
                <div className="text-xs text-gray-700">{layer.tech}</div>
              </div>

              {activeLayer === layer.id && (
                <motion.div
                  layoutId="activeLayer"
                  className="absolute -inset-0.5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl -z-10"
                  transition={{ type: 'spring', bounce: 0.2 }}
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* Technology Stack */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8 lg:p-12 mb-16"
        >
          <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">完整技术栈</h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(techStack).map(([category, items], catIndex) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: catIndex * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <h4 className="text-lg font-bold text-gray-900 mb-4 capitalize">
                  {category === 'blockchain' ? '区块链' :
                   category === 'backend' ? '后端服务' :
                   category === 'frontend' ? '前端界面' :
                   category === 'storage' ? '存储系统' :
                   category === 'security' ? '安全加密' :
                   category === 'devops' ? 'DevOps' : category}
                </h4>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.version}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Security Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-3xl p-8 lg:p-12 text-white"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">全方位安全保障</h3>
            <p className="text-blue-100 text-lg">
              多层次、全方位的安全防护体系，确保医疗数据的绝对安全
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition-all duration-300"
              >
                <feature.icon className="w-10 h-10 text-blue-300 mb-4" />
                <h4 className="text-lg font-bold mb-3">{feature.title}</h4>
                <ul className="space-y-2">
                  {feature.items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-blue-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-12 pt-12 border-t border-white/20">
            <div className="text-center">
              <Cpu className="w-8 h-8 text-blue-300 mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">10,000+</div>
              <div className="text-sm text-blue-200">TPS吞吐量</div>
            </div>
            <div className="text-center">
              <Server className="w-8 h-8 text-green-300 mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">99.99%</div>
              <div className="text-sm text-blue-200">系统可用性</div>
            </div>
            <div className="text-center">
              <Shield className="w-8 h-8 text-purple-300 mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">&lt;100ms</div>
              <div className="text-sm text-blue-200">响应延迟</div>
            </div>
            <div className="text-center">
              <Database className="w-8 h-8 text-orange-300 mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">PB级</div>
              <div className="text-sm text-blue-200">存储容量</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ArchitectureSection;

