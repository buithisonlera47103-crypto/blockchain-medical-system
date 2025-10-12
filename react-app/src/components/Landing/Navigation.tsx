import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navigation: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: '首页', href: '#home' },
    { label: '功能特性', href: '#features' },
    { label: '技术架构', href: '#architecture' },
    { label: '应用场景', href: '#use-cases' },
    { label: '关于我们', href: '#about' }
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/98 shadow-md border-b border-gray-200'
          : 'bg-white/95 shadow-sm border-b border-gray-200/80'
      }`}
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-22 py-1">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 transition-transform duration-200 hover:scale-105"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl">🏥</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-900">MedChain</span>
              <span className="text-xs text-gray-500 font-medium">医疗区块链</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-10">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="relative text-base font-medium text-gray-600 hover:text-blue-600 transition-colors duration-300 py-2 px-3 group"
              >
                {item.label}
                <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 transform -translate-x-1/2 transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              to="/admin-login"
              className="flex items-center gap-2 px-5 py-2.5 text-base font-medium text-gray-600 border-2 border-orange-300 rounded-xl hover:text-orange-600 hover:border-orange-500 hover:bg-orange-50 transition-all duration-300"
            >
              <Shield className="w-5 h-5" />
              <span>管理员入口</span>
            </Link>
            <Link
              to="/login"
              className="px-6 py-2.5 text-base font-medium text-blue-600 border-2 border-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-300 hover:shadow-md"
            >
              登录
            </Link>
            <Link
              to="/register"
              className="px-6 py-2.5 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              注册
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden border-t border-gray-200 bg-white"
          >
            <div className="px-6 py-4 space-y-2">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="block py-3 px-4 text-gray-600 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-4 space-y-2 border-t border-gray-200">
                <Link
                  to="/admin-login"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 text-gray-600 border border-orange-300 rounded-lg hover:text-orange-600 hover:border-orange-500 hover:bg-orange-50 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Shield className="w-4 h-4" />
                  <span>管理员入口</span>
                </Link>
                <Link
                  to="/login"
                  className="block py-3 px-4 text-center text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="block py-3 px-4 text-center text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  注册
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navigation;

