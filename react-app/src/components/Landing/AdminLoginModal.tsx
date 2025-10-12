import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, AlertTriangle, Eye, EyeOff, Lock, User } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    adminId: '',
    password: '',
    verificationMethod: 'google',
    verificationCode: '',
    hardwareToken: '',
    trustDevice: false
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Implement admin login logic
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.4, type: 'spring' }}
              className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border-t-4 border-purple-600"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative px-8 pt-8 pb-6 text-center border-b border-gray-100">
                <button
                  onClick={onClose}
                  className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 hover:rotate-90 transition-all duration-300"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>

                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">管理员登录</h2>
                <p className="text-sm text-gray-500">仅限系统管理员访问</p>
              </div>

              {/* Body */}
              <div className="px-8 py-6">
                {/* Warning */}
                <div className="flex items-start gap-3 p-4 mb-6 bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-400 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-amber-900 mb-1">管理员专属登录入口</h3>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      此入口仅供系统管理员使用，请谨慎操作。所有操作将被记录。
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Admin ID */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      管理员ID <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.adminId}
                        onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
                        placeholder="请输入管理员唯一标识"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:bg-white transition-all duration-300"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      安全密钥 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="请输入安全密钥"
                        className="w-full pl-12 pr-12 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:bg-white transition-all duration-300"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      双重验证 <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      <select
                        value={formData.verificationMethod}
                        onChange={(e) => setFormData({ ...formData, verificationMethod: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:bg-white transition-all duration-300 cursor-pointer"
                      >
                        <option value="google">Google认证</option>
                        <option value="sms">短信验证</option>
                        <option value="email">邮箱验证</option>
                      </select>
                      <input
                        type="text"
                        value={formData.verificationCode}
                        onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value })}
                        placeholder="123456"
                        maxLength={6}
                        pattern="[0-9]{6}"
                        className="w-full px-4 py-3 text-center text-2xl font-semibold tracking-widest bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all duration-300"
                        required
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      请输入您的认证APP中显示的6位数字代码
                    </p>
                  </div>

                  {/* Hardware Token (Optional) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      硬件令牌 <span className="text-gray-400 font-normal">(可选)</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.hardwareToken}
                        onChange={(e) => setFormData({ ...formData, hardwareToken: e.target.value })}
                        placeholder="请插入USB安全密钥或输入TOTP代码"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:bg-white transition-all duration-300"
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      使用硬件令牌可提供额外的安全保护
                    </p>
                  </div>

                  {/* Trust Device */}
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.trustDevice}
                      onChange={(e) => setFormData({ ...formData, trustDevice: e.target.checked })}
                      className="w-5 h-5 rounded border-2 border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-purple-600 transition-colors">
                      信任此设备 30 天
                    </span>
                  </label>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 text-base font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl shadow-lg hover:from-purple-700 hover:to-purple-800 hover:shadow-purple-500/50 hover:shadow-2xl hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none transition-all duration-300 relative overflow-hidden"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>登录中...</span>
                      </div>
                    ) : (
                      '安全登录'
                    )}
                  </button>
                </form>
              </div>

              {/* Footer */}
              <div className="px-8 py-6 text-center border-t border-gray-100">
                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors group"
                >
                  <span className="transform transition-transform duration-300 group-hover:-translate-x-1">←</span>
                  <span>返回普通登录</span>
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AdminLoginModal;

