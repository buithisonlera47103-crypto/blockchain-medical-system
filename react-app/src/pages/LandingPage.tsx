import React from 'react';
import { motion } from 'framer-motion';
import Navigation from '../components/Landing/Navigation';
import HeroSection from '../components/Landing/HeroSection';
import FeaturesSection from '../components/Landing/FeaturesSection';
import ArchitectureSection from '../components/Landing/ArchitectureSection';
import CaseStudiesSection from '../components/Landing/CaseStudiesSection';
import ResourcesSection from '../components/Landing/ResourcesSection';
import AboutSection from '../components/Landing/AboutSection';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <HeroSection />
      
      {/* Professional Sections */}
      <FeaturesSection />
      <ArchitectureSection />
      <CaseStudiesSection />
      <AboutSection />
      <ResourcesSection />

      {/* Footer - Light Theme - Enlarged */}
      <footer className="relative bg-gradient-to-b from-slate-50 via-sky-50/30 to-blue-50/40 border-t border-sky-200/50 py-24 overflow-hidden">
        {/* Footer Cloud Mist Effects */}
        <motion.div
          animate={{
            x: [-20, 20, -20],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-100/30 via-sky-50/20 to-transparent rounded-full blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{
            x: [20, -20, 20],
            opacity: [0.12, 0.2, 0.12]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3
          }}
          className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-gradient-to-tr from-cyan-100/25 to-transparent rounded-full blur-3xl pointer-events-none"
        />
        
        <div className="relative z-10 max-w-7xl mx-auto px-8 lg:px-12">
          <div className="grid md:grid-cols-4 gap-16 lg:gap-20 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl">
                  <span className="text-white text-3xl">🏥</span>
                </div>
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">MedChain</div>
                  <div className="text-sm text-gray-500 font-medium mt-0.5">医疗区块链</div>
                </div>
              </div>
              <p className="text-gray-600 text-base leading-relaxed pr-4">
                基于区块链的医疗数据管理平台，为医疗行业提供安全、透明、可信的数字化解决方案。
              </p>
              <div className="mt-8 flex gap-4">
                <a href="#" className="w-12 h-12 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-all hover:scale-110 group">
                  <span className="text-blue-600 text-xl">📱</span>
                </a>
                <a href="#" className="w-12 h-12 rounded-xl bg-sky-100 hover:bg-sky-200 flex items-center justify-center transition-all hover:scale-110 group">
                  <span className="text-sky-600 text-xl">💬</span>
                </a>
                <a href="#" className="w-12 h-12 rounded-xl bg-cyan-100 hover:bg-cyan-200 flex items-center justify-center transition-all hover:scale-110 group">
                  <span className="text-cyan-600 text-xl">📧</span>
                </a>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-6 text-xl">产品</h3>
              <ul className="space-y-4 text-base">
                <li><a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-3 group">
                  <span className="w-2 h-2 rounded-full bg-blue-400 group-hover:bg-blue-600 transition-colors"></span>
                  功能特性
                </a></li>
                <li><a href="#architecture" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-3 group">
                  <span className="w-2 h-2 rounded-full bg-blue-400 group-hover:bg-blue-600 transition-colors"></span>
                  技术架构
                </a></li>
                <li><a href="#use-cases" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-3 group">
                  <span className="w-2 h-2 rounded-full bg-blue-400 group-hover:bg-blue-600 transition-colors"></span>
                  应用场景
                </a></li>
                <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-3 group">
                  <span className="w-2 h-2 rounded-full bg-blue-400 group-hover:bg-blue-600 transition-colors"></span>
                  价格方案
                </a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-6 text-xl">支持</h3>
              <ul className="space-y-4 text-base">
                <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-3 group">
                  <span className="w-2 h-2 rounded-full bg-sky-400 group-hover:bg-sky-600 transition-colors"></span>
                  帮助中心
                </a></li>
                <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-3 group">
                  <span className="w-2 h-2 rounded-full bg-sky-400 group-hover:bg-sky-600 transition-colors"></span>
                  技术文档
                </a></li>
                <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-3 group">
                  <span className="w-2 h-2 rounded-full bg-sky-400 group-hover:bg-sky-600 transition-colors"></span>
                  联系我们
                </a></li>
                <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-3 group">
                  <span className="w-2 h-2 rounded-full bg-sky-400 group-hover:bg-sky-600 transition-colors"></span>
                  开发者社区
                </a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-6 text-xl">法律</h3>
              <ul className="space-y-4 text-base">
                <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-3 group">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 group-hover:bg-cyan-600 transition-colors"></span>
                  隐私政策
                </a></li>
                <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-3 group">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 group-hover:bg-cyan-600 transition-colors"></span>
                  服务条款
                </a></li>
                <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-3 group">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 group-hover:bg-cyan-600 transition-colors"></span>
                  Cookie政策
                </a></li>
                <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-3 group">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 group-hover:bg-cyan-600 transition-colors"></span>
                  合规认证
                </a></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="pt-10 border-t border-sky-200/60">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-base text-gray-600">
                &copy; 2025 MedChain. 保留所有权利。 | 
                <a href="#" className="ml-2 text-blue-600 hover:text-blue-700 font-semibold">ICP备案号</a>
              </p>
              <div className="flex items-center gap-8 text-sm text-gray-500">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></span>
                  系统运行正常
                </span>
                <span className="font-medium">Version 2.5.0</span>
                <span>Updated: 2025-01-10</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

