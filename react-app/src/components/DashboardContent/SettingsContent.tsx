import { Settings, User, Shield, Bell, Palette, Database } from 'lucide-react';
import React, { useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { changeLanguage, getCurrentLanguageConfig } from '../../i18n/config';

const SettingsContent: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: true,
    system: true,
  });
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState(getCurrentLanguageConfig().code);

  const tabs = [
    { id: 'profile', name: '个人资料', icon: User },
    { id: 'security', name: '安全设置', icon: Shield },
    { id: 'notifications', name: '通知设置', icon: Bell },
    { id: 'appearance', name: '外观设置', icon: Palette },
    { id: 'system', name: '系统设置', icon: Database },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {user?.name || '患者'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {user?.role === 'patient' ? '患者' : '医生'}
                </p>
                <button className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                  更换头像
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  姓名
                </label>
                <input
                  type="text"
                  defaultValue={user?.name || '患者姓名'}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  邮箱
                </label>
                <input
                  type="email"
                  defaultValue={user?.email || 'patient@example.com'}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  电话
                </label>
                <input
                  type="tel"
                  defaultValue="+86 138 0013 8000"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  紧急联系人
                </label>
                <input
                  type="text"
                  defaultValue="李女士 (配偶)"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                健康偏好
              </label>
              <textarea
                rows={4}
                defaultValue="关注心血管健康，定期体检，保持健康的生活方式。"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                紧急联系人电话
              </label>
              <input
                type="tel"
                defaultValue="+86 139 0013 9000"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">安全提醒</h4>
              </div>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-2">
                为了保护您的账户安全，建议定期更新密码并启用双因素认证。
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">密码设置</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      当前密码
                    </label>
                    <input
                      type="password"
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      新密码
                    </label>
                    <input
                      type="password"
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      确认新密码
                    </label>
                    <input
                      type="password"
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">双因素认证</h4>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">启用双因素认证</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      通过手机验证码增强账户安全
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">登录历史</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Windows - Chrome</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        192.168.1.100 • 2024-01-15 14:30
                      </p>
                    </div>
                    <span className="text-green-600 dark:text-green-400 text-sm">当前会话</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">iPhone - Safari</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        192.168.1.105 • 2024-01-15 09:15
                      </p>
                    </div>
                    <button className="text-red-600 dark:text-red-400 text-sm hover:text-red-800 dark:hover:text-red-300">
                      终止会话
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">通知方式</h4>
              <div className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => {
                  const labels = {
                    email: '邮件通知',
                    push: '推送通知',
                    sms: '短信通知',
                    system: '系统通知',
                  };
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {labels[key as keyof typeof labels]}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {key === 'email' && '接收重要系统邮件通知'}
                          {key === 'push' && '浏览器推送通知'}
                          {key === 'sms' && '紧急情况短信提醒'}
                          {key === 'system' && '系统内消息通知'}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={e =>
                            setNotifications({ ...notifications, [key]: e.target.checked })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">通知时间</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    开始时间
                  </label>
                  <input
                    type="time"
                    defaultValue="08:00"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    结束时间
                  </label>
                  <input
                    type="time"
                    defaultValue="22:00"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">主题设置</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['light', 'dark', 'auto'].map(themeOption => (
                  <div
                    key={themeOption}
                    onClick={() => setTheme(themeOption)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      theme === themeOption
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-center">
                      <div
                        className={`w-12 h-12 mx-auto mb-2 rounded-lg ${
                          themeOption === 'light'
                            ? 'bg-white border-2 border-gray-200'
                            : themeOption === 'dark'
                              ? 'bg-gray-800 border-2 border-gray-600'
                              : 'bg-gradient-to-br from-white to-gray-800'
                        }`}
                      ></div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {themeOption === 'light'
                          ? '浅色'
                          : themeOption === 'dark'
                            ? '深色'
                            : '自动'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">语言设置</h4>
              <select
                value={language}
                onChange={e => {
                  const newLanguage = e.target.value as 'zh-CN' | 'en-US';
                  setLanguage(newLanguage);
                  changeLanguage(newLanguage);
                }}
                className="w-full md:w-auto p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">显示设置</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">紧凑模式</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      减少界面元素间距，显示更多内容
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">动画效果</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">启用界面过渡动画效果</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">数据管理</h4>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">数据备份</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        上次备份: 2024-01-15 02:00
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                      立即备份
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">缓存清理</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        当前缓存大小: 2.3GB
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                      清理缓存
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">系统信息</h4>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">系统版本</p>
                    <p className="font-medium text-gray-900 dark:text-white">v2.1.0</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">数据库版本</p>
                    <p className="font-medium text-gray-900 dark:text-white">PostgreSQL 13.7</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">最后更新</p>
                    <p className="font-medium text-gray-900 dark:text-white">2024-01-10</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">许可证</p>
                    <p className="font-medium text-gray-900 dark:text-white">企业版</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">API设置</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    API密钥
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="password"
                      defaultValue="sk-1234567890abcdef"
                      className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                      重新生成
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    API限制
                  </label>
                  <select className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option>1000 请求/小时</option>
                    <option>5000 请求/小时</option>
                    <option>10000 请求/小时</option>
                    <option>无限制</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {user?.role === 'patient' ? '个人设置' : '系统设置'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {user?.role === 'patient'
              ? '管理个人资料、安全设置和偏好配置'
              : '管理个人资料、安全设置和系统配置'
            }
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* 设置导航 */}
        <div className="lg:w-64">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <nav className="space-y-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* 设置内容 */}
        <div className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {renderTabContent()}

            {/* 保存按钮 */}
            <div className="mt-8 flex justify-end space-x-4">
              <button className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                取消
              </button>
              <button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all">
                保存设置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsContent;
