import React from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, Heart, Users, Award, TrendingUp, Briefcase, Code, Shield, Zap } from 'lucide-react';

const AboutSection: React.FC = () => {
  const stats = [
    { icon: '🏆', value: '5+', label: '年行业经验', color: 'from-blue-500 to-blue-600' },
    { icon: '👥', value: '50+', label: '专业团队', color: 'from-green-500 to-green-600' },
    { icon: '🏥', value: '200+', label: '合作机构', color: 'from-purple-500 to-purple-600' },
    { icon: '🎯', value: '99.9%', label: '客户满意度', color: 'from-orange-500 to-orange-600' }
  ];

  const values = [
    {
      icon: Target,
      title: '使命',
      description: '通过区块链技术创新，构建安全可信的医疗数据生态，推动医疗行业数字化转型',
      color: 'blue'
    },
    {
      icon: Eye,
      title: '愿景',
      description: '成为全球领先的医疗区块链解决方案提供商，让医疗数据更安全、更透明、更高效',
      color: 'purple'
    },
    {
      icon: Heart,
      title: '价值观',
      description: '以用户为中心，追求卓越品质，持续创新突破，构建诚信合作的生态系统',
      color: 'pink'
    }
  ];

  const team = [
    {
      icon: Code,
      title: '技术团队',
      description: '资深区块链工程师和医疗信息化专家',
      members: '25+',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Briefcase,
      title: '产品团队',
      description: '经验丰富的产品经理和UX设计师',
      members: '12+',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Shield,
      title: '安全团队',
      description: '专业的信息安全和合规审计专家',
      members: '8+',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Users,
      title: '服务团队',
      description: '7×24小时客户支持和售后服务',
      members: '15+',
      color: 'from-orange-500 to-red-500'
    }
  ];

  const milestones = [
    { year: '2020', event: '公司成立', description: '启动医疗区块链研发' },
    { year: '2021', event: '产品上线', description: '首个医疗联盟链平台发布' },
    { year: '2022', event: '规模扩张', description: '服务机构突破100家' },
    { year: '2023', event: '技术突破', description: '获得国家发明专利5项' },
    { year: '2024', event: '行业领先', description: '成为医疗区块链标准制定单位' },
    { year: '2025', event: '持续创新', description: '推出AI+区块链融合方案' }
  ];

  const honors = [
    { icon: '🏅', title: '国家高新技术企业', org: '科技部' },
    { icon: '🎖️', title: '区块链创新应用奖', org: '工信部' },
    { icon: '⭐', title: '医疗信息化优秀案例', org: '卫健委' },
    { icon: '🏆', title: '中国区块链百强企业', org: '中国信通院' }
  ];

  return (
    <section id="about" className="relative py-24 bg-gradient-to-b from-white via-slate-50/50 to-white overflow-hidden">
      {/* Background Cloud Mist */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.08, 0.15, 0.08]
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-br from-blue-50/30 to-cyan-50/25 rounded-full blur-3xl pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full text-sm font-semibold text-blue-700 mb-4">
            <Users className="w-4 h-4" />
            关于我们
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            引领医疗区块链创新
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            我们致力于通过区块链技术推动医疗行业的数字化转型，
            为医疗机构和患者提供更安全、更高效、更透明的医疗数据管理服务
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative group"
            >
              <div className={`bg-gradient-to-br ${stat.color} rounded-2xl p-8 text-center text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2`}>
                <div className="text-5xl mb-4">{stat.icon}</div>
                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-sm opacity-90 font-medium">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Mission, Vision, Values */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8 mb-20"
        >
          {values.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
            >
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${
                value.color === 'blue' ? 'from-blue-500 to-blue-600' :
                value.color === 'purple' ? 'from-purple-500 to-purple-600' :
                'from-pink-500 to-pink-600'
              } flex items-center justify-center mb-6 shadow-lg`}>
                <value.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{value.title}</h3>
              <p className="text-gray-600 leading-relaxed">{value.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Team Overview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">专业团队</h3>
            <p className="text-lg text-gray-600">汇聚行业顶尖人才，打造卓越产品和服务</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-center border border-gray-100"
              >
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${member.color} flex items-center justify-center mb-4 mx-auto shadow-lg`}>
                  <member.icon className="w-10 h-10 text-white" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{member.title}</h4>
                <p className="text-sm text-gray-600 mb-3">{member.description}</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{member.members}</span>
                  <span className="text-xs text-gray-500">成员</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">发展历程</h3>
            <p className="text-lg text-gray-600">持续创新，稳步前行</p>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 hidden lg:block"></div>

            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-8 ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}
                >
                  {/* Content */}
                  <div className={`flex-1 ${index % 2 === 0 ? 'lg:text-right' : 'lg:text-left'}`}>
                    <div className="inline-block bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-blue-500">
                      <div className="text-3xl font-bold text-blue-600 mb-2">{milestone.year}</div>
                      <div className="text-xl font-bold text-gray-900 mb-2">{milestone.event}</div>
                      <div className="text-gray-600">{milestone.description}</div>
                    </div>
                  </div>

                  {/* Center Dot */}
                  <div className="hidden lg:block">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-4 border-white shadow-lg"></div>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1 hidden lg:block"></div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Honors & Awards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-3xl p-12 text-white"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">荣誉资质</h3>
            <p className="text-lg text-blue-100">获得行业广泛认可和权威认证</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {honors.map((honor, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center hover:bg-white/20 transition-all duration-300"
              >
                <div className="text-5xl mb-4">{honor.icon}</div>
                <h4 className="text-lg font-bold mb-2">{honor.title}</h4>
                <p className="text-sm text-blue-200">颁发单位：{honor.org}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;

