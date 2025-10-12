import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, BookOpen, Video, Code, MessageCircle, Calendar, Mail, Phone, MapPin } from 'lucide-react';

const ResourcesSection: React.FC = () => {
  const resources = [
    {
      icon: FileText,
      title: '产品白皮书',
      description: '详细了解区块链医疗解决方案的技术架构和应用场景',
      size: '2.5 MB',
      format: 'PDF',
      color: 'blue',
      downloadLink: '#'
    },
    {
      icon: BookOpen,
      title: '技术文档',
      description: 'API接口文档、SDK使用指南和最佳实践',
      size: '15 MB',
      format: 'ZIP',
      color: 'green',
      downloadLink: '#'
    },
    {
      icon: Video,
      title: '产品演示视频',
      description: '10分钟快速了解系统功能和操作流程',
      size: '150 MB',
      format: 'MP4',
      color: 'purple',
      downloadLink: '#'
    },
    {
      icon: Code,
      title: '开发者SDK',
      description: 'Node.js / Python / Java 多语言SDK',
      size: '5 MB',
      format: 'ZIP',
      color: 'orange',
      downloadLink: '#'
    }
  ];

  const contactMethods = [
    {
      icon: Phone,
      title: '电话咨询',
      content: '400-123-4567',
      description: '工作日 9:00-18:00',
      color: 'blue'
    },
    {
      icon: Mail,
      title: '邮件联系',
      content: 'contact@medchain.com',
      description: '24小时内回复',
      color: 'green'
    },
    {
      icon: MessageCircle,
      title: '在线客服',
      content: '立即咨询',
      description: '实时在线支持',
      color: 'purple'
    },
    {
      icon: Calendar,
      title: '预约演示',
      content: '免费体验',
      description: '专人一对一讲解',
      color: 'orange'
    }
  ];

  return (
    <section className="relative py-24 bg-gradient-to-t from-sky-50 via-white to-transparent overflow-hidden">
      {/* Cloud Mist Effect - Bottom Center */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          y: [0, 20, 0],
          opacity: [0.15, 0.25, 0.15]
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-0 left-1/3 w-[600px] h-[600px] bg-gradient-to-t from-blue-50/35 via-sky-50/25 to-transparent rounded-full blur-3xl pointer-events-none"
      />

      {/* Cloud Mist Effect - Top Left */}
      <motion.div
        animate={{
          rotate: [0, -5, 0],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 6
        }}
        className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-cyan-50/20 to-transparent rounded-full blur-3xl pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Resources Download */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-sm font-semibold text-blue-700 mb-4">
              <Download className="w-4 h-4" />
              资源下载
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              免费获取技术资料
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              下载白皮书、技术文档和开发工具，深入了解我们的区块链医疗解决方案
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {resources.map((resource, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border-2 border-gray-100 hover:border-blue-300 group cursor-pointer"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${
                  resource.color === 'blue' ? 'from-blue-500 to-blue-600' :
                  resource.color === 'green' ? 'from-green-500 to-green-600' :
                  resource.color === 'purple' ? 'from-purple-500 to-purple-600' :
                  'from-orange-500 to-orange-600'
                } flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <resource.icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2">{resource.title}</h3>
                <p className="text-sm text-gray-600 mb-4 min-h-[40px]">{resource.description}</p>

                <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
                  <span>{resource.format}</span>
                  <span>{resource.size}</span>
                </div>

                <button className={`w-full py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r ${
                  resource.color === 'blue' ? 'from-blue-600 to-blue-700' :
                  resource.color === 'green' ? 'from-green-600 to-green-700' :
                  resource.color === 'purple' ? 'from-purple-600 to-purple-700' :
                  'from-orange-600 to-orange-700'
                } hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2`}>
                  <Download className="w-4 h-4" />
                  <span>立即下载</span>
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Contact Section - Light Theme */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-sky-50 via-blue-50/50 to-cyan-50 rounded-3xl p-8 lg:p-12 border-2 border-sky-200/50 shadow-xl"
        >
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 bg-clip-text text-transparent">
              联系我们，开启区块链医疗之旅
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              专业团队为您提供7×24小时技术支持和咨询服务
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {contactMethods.map((method, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-sky-100 hover:border-blue-300"
              >
                <method.icon className={`w-10 h-10 mb-4 ${
                  method.color === 'blue' ? 'text-blue-600' :
                  method.color === 'green' ? 'text-green-600' :
                  method.color === 'purple' ? 'text-purple-600' :
                  'text-orange-600'
                }`} />
                <h3 className="text-lg font-bold mb-2 text-gray-900">{method.title}</h3>
                <p className={`text-2xl font-bold mb-2 ${
                  method.color === 'blue' ? 'text-blue-600' :
                  method.color === 'green' ? 'text-green-600' :
                  method.color === 'purple' ? 'text-purple-600' :
                  'text-orange-600'
                }`}>{method.content}</p>
                <p className="text-sm text-gray-600">{method.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Contact Form - Wider */}
          <div className="max-w-6xl mx-auto bg-white rounded-2xl p-10 shadow-lg border-2 border-sky-100">
            <h3 className="text-3xl font-bold mb-8 text-center text-gray-900">快速咨询表单</h3>
            
            <form className="grid md:grid-cols-2 gap-8">
              <div>
                <label className="block text-base font-semibold mb-3 text-gray-900">您的姓名 *</label>
                <input
                  type="text"
                  placeholder="请输入姓名"
                  className="w-full px-5 py-4 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-base font-semibold mb-3 text-gray-900">联系电话 *</label>
                <input
                  type="tel"
                  placeholder="请输入手机号"
                  className="w-full px-5 py-4 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-base font-semibold mb-3 text-gray-900">公司名称</label>
                <input
                  type="text"
                  placeholder="请输入公司名称"
                  className="w-full px-5 py-4 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-base font-semibold mb-3 text-gray-900">电子邮箱</label>
                <input
                  type="email"
                  placeholder="请输入邮箱"
                  className="w-full px-5 py-4 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-base font-semibold mb-3 text-gray-900">咨询内容 *</label>
                <textarea
                  placeholder="请描述您的需求或问题"
                  rows={5}
                  className="w-full px-5 py-4 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                  required
                ></textarea>
              </div>

              <div className="md:col-span-2 flex items-start gap-4">
                <input
                  type="checkbox"
                  id="privacy"
                  className="mt-1.5 w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500"
                  required
                />
                <label htmlFor="privacy" className="text-base text-gray-600">
                  我已阅读并同意《隐私政策》和《服务条款》，允许MedChain团队联系我
                </label>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full py-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  提交咨询
                </button>
              </div>
            </form>
          </div>

          {/* Office Location */}
          <div className="mt-16 pt-12 border-t-2 border-sky-200/50">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="bg-white rounded-2xl p-6 shadow-md border border-sky-100">
                <MapPin className="w-10 h-10 mx-auto mb-4 text-blue-600" />
                <h4 className="font-bold text-lg text-gray-900 mb-2">北京总部</h4>
                <p className="text-base text-gray-600">北京市朝阳区XXX大厦</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-md border border-sky-100">
                <MapPin className="w-10 h-10 mx-auto mb-4 text-cyan-600" />
                <h4 className="font-bold text-lg text-gray-900 mb-2">上海分部</h4>
                <p className="text-base text-gray-600">上海市浦东新区XXX广场</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-md border border-sky-100">
                <MapPin className="w-10 h-10 mx-auto mb-4 text-sky-600" />
                <h4 className="font-bold text-lg text-gray-900 mb-2">深圳分部</h4>
                <p className="text-base text-gray-600">深圳市南山区XXX科技园</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ResourcesSection;

