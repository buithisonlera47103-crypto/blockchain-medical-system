import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, TrendingUp, Users, Award, CheckCircle2, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const CaseStudiesSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const caseStudies = [
    {
      institution: '北京协和医院',
      logo: '🏥',
      type: '三甲综合医院',
      scale: '2000+ 床位',
      color: 'blue',
      challenge: '多院区间电子病历共享难、数据安全性低、审计追溯困难',
      solution: '部署Fabric联盟链，实现4个院区间的安全病历共享',
      results: [
        { label: '数据共享效率', value: '提升300%', icon: TrendingUp },
        { label: '病历查询时间', value: '从30分钟降至<5秒', icon: Users },
        { label: '数据篡改事件', value: '降至0', icon: CheckCircle2 }
      ],
      quote: '区块链技术彻底解决了我们多年来的数据孤岛问题，病历共享更加安全高效。',
      author: '信息科主任 - 张医生'
    },
    {
      institution: '上海市第一人民医院',
      logo: '🏥',
      type: '三甲专科医院',
      scale: '1500+ 床位',
      color: 'green',
      challenge: '药品溯源困难、供应链不透明、假药风险高',
      solution: '建立药品全生命周期追溯系统，覆盖采购-使用全流程',
      results: [
        { label: '药品溯源覆盖率', value: '100%', icon: TrendingUp },
        { label: '采购成本', value: '降低15%', icon: Award },
        { label: '用药安全事故', value: '同比下降60%', icon: CheckCircle2 }
      ],
      quote: '通过区块链技术，我们实现了药品的完整溯源，大大提升了用药安全性。',
      author: '药剂科主任 - 李主任'
    },
    {
      institution: '广东省人民医院集团',
      logo: '🏥',
      type: '医联体',
      scale: '50+ 成员单位',
      color: 'purple',
      challenge: '医联体间数据互通难、转诊信息不同步、重复检查浪费',
      solution: '搭建医联体区块链平台，实现50+医院的数据互通',
      results: [
        { label: '转诊效率', value: '提升400%', icon: TrendingUp },
        { label: '重复检查率', value: '降低70%', icon: Users },
        { label: '患者满意度', value: '提升至95%', icon: Award }
      ],
      quote: '区块链平台让医联体真正"联"起来了，患者就医体验显著改善。',
      author: '信息中心主任 - 王主任'
    }
  ];

  const partners = [
    { name: '北京协和医院', logo: '🏥' },
    { name: '上海交通大学', logo: '🎓' },
    { name: '华为云', logo: '☁️' },
    { name: '阿里云', logo: '☁️' },
    { name: '腾讯云', logo: '☁️' },
    { name: 'IBM', logo: '💼' },
    { name: '国家卫健委', logo: '🏛️' },
    { name: '中国信通院', logo: '🏢' }
  ];

  const certifications = [
    { name: '等保三级', icon: '🛡️', org: '公安部' },
    { name: 'ISO 27001', icon: '📜', org: '国际标准' },
    { name: '医疗器械软件', icon: '⚕️', org: 'NMPA' },
    { name: '区块链信息服务', icon: '🔗', org: '网信办' }
  ];

  return (
    <section id="use-cases" className="relative py-24 bg-white overflow-hidden">
      {/* Cloud Mist Effect - Bottom Left */}
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          x: [0, 15, 0],
          opacity: [0.08, 0.15, 0.08]
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-1/3 left-0 w-[550px] h-[550px] bg-gradient-to-tr from-blue-50/30 via-cyan-50/20 to-transparent rounded-full blur-3xl pointer-events-none"
      />

      {/* Cloud Mist Effect - Top Right */}
      <motion.div
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.1, 0.18, 0.1]
        }}
        transition={{
          duration: 13,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5
        }}
        className="absolute top-20 right-0 w-[480px] h-[480px] bg-gradient-to-bl from-sky-50/25 to-transparent rounded-full blur-3xl pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full text-sm font-semibold text-green-700 mb-4">
            <Building2 className="w-4 h-4" />
            成功案例
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            服务全国顶级医疗机构
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            已为全国200+医疗机构提供区块链解决方案，处理1000万+医疗记录，赢得广泛认可
          </p>
        </motion.div>

        {/* Case Studies Carousel */}
        <div className="relative mb-20">
          {/* Navigation Buttons */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between items-center pointer-events-none z-20 px-4">
            <button
              onClick={() => setCurrentIndex((prev) => (prev === 0 ? caseStudies.length - 1 : prev - 1))}
              className="pointer-events-auto w-14 h-14 rounded-full bg-white shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 group border-2 border-gray-200 hover:border-blue-500"
              aria-label="上一个案例"
            >
              <ChevronLeft className="w-7 h-7 text-gray-700 group-hover:text-blue-600 transition-colors" />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev === caseStudies.length - 1 ? 0 : prev + 1))}
              className="pointer-events-auto w-14 h-14 rounded-full bg-white shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 group border-2 border-gray-200 hover:border-blue-500"
              aria-label="下一个案例"
            >
              <ChevronRight className="w-7 h-7 text-gray-700 group-hover:text-blue-600 transition-colors" />
            </button>
          </div>

          {/* Carousel Container */}
          <div className="overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="bg-white rounded-3xl shadow-xl overflow-hidden"
              >
                <div className="grid lg:grid-cols-5 gap-8 p-8 lg:p-12">
                  {/* Left: Institution Info */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className={`inline-flex items-center gap-4 p-4 bg-gradient-to-br ${
                      caseStudies[currentIndex].color === 'blue' ? 'from-blue-50 to-blue-100' :
                      caseStudies[currentIndex].color === 'green' ? 'from-green-50 to-green-100' :
                      'from-purple-50 to-purple-100'
                    } rounded-2xl`}>
                      <span className="text-5xl">{caseStudies[currentIndex].logo}</span>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{caseStudies[currentIndex].institution}</h3>
                        <p className="text-sm text-gray-600">{caseStudies[currentIndex].type}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 className="w-5 h-5" />
                      <span className="font-medium">{caseStudies[currentIndex].scale}</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-bold text-gray-500 mb-2">面临挑战</h4>
                        <p className="text-gray-700">{caseStudies[currentIndex].challenge}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-500 mb-2">解决方案</h4>
                        <p className="text-gray-700">{caseStudies[currentIndex].solution}</p>
                      </div>
                    </div>

                    <div className={`p-4 bg-gradient-to-br ${
                      caseStudies[currentIndex].color === 'blue' ? 'from-blue-50 to-cyan-50' :
                      caseStudies[currentIndex].color === 'green' ? 'from-green-50 to-emerald-50' :
                      'from-purple-50 to-pink-50'
                    } rounded-xl border-l-4 ${
                      caseStudies[currentIndex].color === 'blue' ? 'border-blue-500' :
                      caseStudies[currentIndex].color === 'green' ? 'border-green-500' :
                      'border-purple-500'
                    }`}>
                      <p className="text-sm italic text-gray-700 mb-2">"{caseStudies[currentIndex].quote}"</p>
                      <p className="text-xs text-gray-500">— {caseStudies[currentIndex].author}</p>
                    </div>
                  </div>

                  {/* Right: Results */}
                  <div className="lg:col-span-3 space-y-6">
                    <h4 className="text-2xl font-bold text-gray-900 mb-6">实施效果</h4>
                    
                    <div className="grid sm:grid-cols-3 gap-6">
                      {caseStudies[currentIndex].results.map((result, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`p-6 rounded-2xl bg-gradient-to-br ${
                            caseStudies[currentIndex].color === 'blue' ? 'from-blue-500 to-blue-600' :
                            caseStudies[currentIndex].color === 'green' ? 'from-green-500 to-green-600' :
                            'from-purple-500 to-purple-600'
                          } text-white shadow-lg`}
                        >
                          <result.icon className="w-8 h-8 mb-3 opacity-80" />
                          <div className="text-3xl font-bold mb-2">{result.value}</div>
                          <div className="text-sm opacity-90">{result.label}</div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Additional Benefits */}
                    <div className="bg-gray-50 rounded-2xl p-6">
                      <h5 className="font-bold text-gray-900 mb-4">其他显著收益</h5>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {[
                          '数据合规性达到100%',
                          '系统运维成本降低40%',
                          '跨部门协作效率提升5倍',
                          '获得行业最佳实践奖'
                        ].map((benefit, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button className="w-full sm:w-auto px-8 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 font-semibold group">
                      <span>查看完整案例</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Carousel Indicators */}
          <div className="flex justify-center gap-3 mt-8">
            {caseStudies.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex
                    ? 'w-12 h-3 bg-gradient-to-r from-blue-500 to-cyan-500'
                    : 'w-3 h-3 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`跳转到案例 ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Partners & Certifications */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Partners */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl p-8 shadow-lg"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              合作伙伴
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {partners.map((partner, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="aspect-square bg-gray-50 rounded-xl flex flex-col items-center justify-center hover:bg-blue-50 hover:shadow-md transition-all duration-300 cursor-pointer group"
                >
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{partner.logo}</span>
                  <span className="text-xs text-gray-600 text-center px-2">{partner.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Certifications */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl p-8 shadow-lg"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Award className="w-6 h-6 text-purple-600" />
              资质认证
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {certifications.map((cert, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all duration-300"
                >
                  <span className="text-4xl mb-3 block">{cert.icon}</span>
                  <h4 className="font-bold text-gray-900 mb-1">{cert.name}</h4>
                  <p className="text-xs text-gray-600">{cert.org}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CaseStudiesSection;

