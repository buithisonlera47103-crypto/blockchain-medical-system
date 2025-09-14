import {
  Settings,
  Save,
  RefreshCw,
  Shield,
  Database,
  Mail,
  Bell,
  Server,
  AlertTriangle,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast, Toaster } from 'sonner';

interface SystemConfig {
  general: {
    siteName: string;
    siteDescription: string;
    adminEmail: string;
    timezone: string;
    language: string;
    maintenanceMode: boolean;
  };
  security: {
    passwordMinLength: number;
    passwordRequireSpecialChar: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    enableTwoFactor: boolean;
    allowedIpRanges: string[];
  };
  database: {
    backupFrequency: string;
    retentionDays: number;
    enableEncryption: boolean;
    compressionLevel: number;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    enableSSL: boolean;
    fromAddress: string;
    fromName: string;
  };
  notifications: {
    enableEmailNotifications: boolean;
    enableSMSNotifications: boolean;
    enablePushNotifications: boolean;
    criticalAlertsOnly: boolean;
  };
  api: {
    rateLimit: number;
    enableCors: boolean;
    allowedOrigins: string[];
    apiVersion: string;
  };
}

const SystemSettingsContent: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'general' | 'security' | 'database' | 'email' | 'notifications' | 'api'
  >('general');
  const [hasChanges, setHasChanges] = useState(false);

  // 模拟系统配置数据
  useEffect(() => {
    const mockConfig: SystemConfig = {
      general: {
        siteName: '区块链电子病历系统',
        siteDescription: '基于区块链技术的安全电子病历共享平台',
        adminEmail: 'admin@hospital.com',
        timezone: 'Asia/Shanghai',
        language: 'zh-CN',
        maintenanceMode: false,
      },
      security: {
        passwordMinLength: 8,
        passwordRequireSpecialChar: true,
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        enableTwoFactor: true,
        allowedIpRanges: ['192.168.1.0/24', '10.0.0.0/8'],
      },
      database: {
        backupFrequency: 'daily',
        retentionDays: 30,
        enableEncryption: true,
        compressionLevel: 6,
      },
      email: {
        smtpHost: 'smtp.hospital.com',
        smtpPort: 587,
        smtpUser: 'noreply@hospital.com',
        smtpPassword: '********',
        enableSSL: true,
        fromAddress: 'noreply@hospital.com',
        fromName: '医院系统',
      },
      notifications: {
        enableEmailNotifications: true,
        enableSMSNotifications: false,
        enablePushNotifications: true,
        criticalAlertsOnly: false,
      },
      api: {
        rateLimit: 1000,
        enableCors: true,
        allowedOrigins: ['https://hospital.com', 'https://admin.hospital.com'],
        apiVersion: 'v1',
      },
    };

    setTimeout(() => {
      setConfig(mockConfig);
      setLoading(false);
    }, 1000);
  }, []);

  const handleConfigChange = (section: keyof SystemConfig, field: string, value: any) => {
    if (!config) return;

    setConfig(prev => ({
      ...prev!,
      [section]: {
        ...prev![section],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleArrayChange = (
    section: keyof SystemConfig,
    field: string,
    index: number,
    value: string
  ) => {
    if (!config) return;

    const currentArray = (config[section] as any)[field] as string[];
    const newArray = [...currentArray];
    newArray[index] = value;

    handleConfigChange(section, field, newArray);
  };

  const addArrayItem = (section: keyof SystemConfig, field: string) => {
    if (!config) return;

    const currentArray = (config[section] as any)[field] as string[];
    handleConfigChange(section, field, [...currentArray, '']);
  };

  const removeArrayItem = (section: keyof SystemConfig, field: string, index: number) => {
    if (!config) return;

    const currentArray = (config[section] as any)[field] as string[];
    const newArray = currentArray.filter((_, i) => i !== index);
    handleConfigChange(section, field, newArray);
  };

  const handleSave = async () => {
    setSaving(true);

    // 模拟保存操作
    await new Promise(resolve => setTimeout(resolve, 2000));

    setSaving(false);
    setHasChanges(false);
    toast.success('系统设置保存成功');
  };

  const handleReset = () => {
    if (window.confirm('确定要重置所有设置吗？这将恢复到默认配置。')) {
      window.location.reload();
    }
  };

  const testEmailConfig = async () => {
    toast.info('正在测试邮件配置...');

    // 模拟测试邮件
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast.success('测试邮件发送成功');
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载系统设置中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
          <p className="text-gray-600">配置系统参数和功能设置</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleReset}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            重置
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>

      {/* 更改提示 */}
      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800">您有未保存的更改，请记得保存设置。</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 侧边栏导航 */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'general'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-4 h-4 mr-3" />
              基本设置
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'security'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Shield className="w-4 h-4 mr-3" />
              安全设置
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'database'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Database className="w-4 h-4 mr-3" />
              数据库设置
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'email'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Mail className="w-4 h-4 mr-3" />
              邮件设置
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'notifications'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Bell className="w-4 h-4 mr-3" />
              通知设置
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'api'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Server className="w-4 h-4 mr-3" />
              API设置
            </button>
          </nav>
        </div>

        {/* 设置内容 */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow p-6">
            {/* 基本设置 */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">基本设置</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">站点名称</label>
                    <input
                      type="text"
                      value={config.general.siteName}
                      onChange={e => handleConfigChange('general', 'siteName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      管理员邮箱
                    </label>
                    <input
                      type="email"
                      value={config.general.adminEmail}
                      onChange={e => handleConfigChange('general', 'adminEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">时区</label>
                    <select
                      value={config.general.timezone}
                      onChange={e => handleConfigChange('general', 'timezone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Asia/Shanghai">Asia/Shanghai</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="Europe/London">Europe/London</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">语言</label>
                    <select
                      value={config.general.language}
                      onChange={e => handleConfigChange('general', 'language', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="zh-CN">简体中文</option>
                      <option value="en-US">English</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">站点描述</label>
                  <textarea
                    value={config.general.siteDescription}
                    onChange={e => handleConfigChange('general', 'siteDescription', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="maintenanceMode"
                    checked={config.general.maintenanceMode}
                    onChange={e =>
                      handleConfigChange('general', 'maintenanceMode', e.target.checked)
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="maintenanceMode" className="ml-2 text-sm text-gray-700">
                    维护模式（启用后普通用户无法访问系统）
                  </label>
                </div>
              </div>
            )}

            {/* 安全设置 */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">安全设置</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      密码最小长度
                    </label>
                    <input
                      type="number"
                      min="6"
                      max="20"
                      value={config.security.passwordMinLength}
                      onChange={e =>
                        handleConfigChange(
                          'security',
                          'passwordMinLength',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      会话超时时间（分钟）
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={config.security.sessionTimeout}
                      onChange={e =>
                        handleConfigChange('security', 'sessionTimeout', parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最大登录尝试次数
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="10"
                      value={config.security.maxLoginAttempts}
                      onChange={e =>
                        handleConfigChange('security', 'maxLoginAttempts', parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="passwordRequireSpecialChar"
                      checked={config.security.passwordRequireSpecialChar}
                      onChange={e =>
                        handleConfigChange(
                          'security',
                          'passwordRequireSpecialChar',
                          e.target.checked
                        )
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="passwordRequireSpecialChar"
                      className="ml-2 text-sm text-gray-700"
                    >
                      密码必须包含特殊字符
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableTwoFactor"
                      checked={config.security.enableTwoFactor}
                      onChange={e =>
                        handleConfigChange('security', 'enableTwoFactor', e.target.checked)
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="enableTwoFactor" className="ml-2 text-sm text-gray-700">
                      启用双因素认证
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    允许的IP地址范围
                  </label>
                  <div className="space-y-2">
                    {config.security.allowedIpRanges.map((ip, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={ip}
                          onChange={e =>
                            handleArrayChange('security', 'allowedIpRanges', index, e.target.value)
                          }
                          placeholder="192.168.1.0/24"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => removeArrayItem('security', 'allowedIpRanges', index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addArrayItem('security', 'allowedIpRanges')}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      + 添加IP范围
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 数据库设置 */}
            {activeTab === 'database' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">数据库设置</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">备份频率</label>
                    <select
                      value={config.database.backupFrequency}
                      onChange={e =>
                        handleConfigChange('database', 'backupFrequency', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="hourly">每小时</option>
                      <option value="daily">每天</option>
                      <option value="weekly">每周</option>
                      <option value="monthly">每月</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      备份保留天数
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={config.database.retentionDays}
                      onChange={e =>
                        handleConfigChange('database', 'retentionDays', parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      压缩级别（1-9）
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="9"
                      value={config.database.compressionLevel}
                      onChange={e =>
                        handleConfigChange('database', 'compressionLevel', parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableEncryption"
                    checked={config.database.enableEncryption}
                    onChange={e =>
                      handleConfigChange('database', 'enableEncryption', e.target.checked)
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="enableEncryption" className="ml-2 text-sm text-gray-700">
                    启用数据库加密
                  </label>
                </div>
              </div>
            )}

            {/* 邮件设置 */}
            {activeTab === 'email' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">邮件设置</h3>
                  <button
                    onClick={testEmailConfig}
                    className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    测试配置
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP服务器
                    </label>
                    <input
                      type="text"
                      value={config.email.smtpHost}
                      onChange={e => handleConfigChange('email', 'smtpHost', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">SMTP端口</label>
                    <input
                      type="number"
                      value={config.email.smtpPort}
                      onChange={e =>
                        handleConfigChange('email', 'smtpPort', parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP用户名
                    </label>
                    <input
                      type="text"
                      value={config.email.smtpUser}
                      onChange={e => handleConfigChange('email', 'smtpUser', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">SMTP密码</label>
                    <input
                      type="password"
                      value={config.email.smtpPassword}
                      onChange={e => handleConfigChange('email', 'smtpPassword', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      发件人地址
                    </label>
                    <input
                      type="email"
                      value={config.email.fromAddress}
                      onChange={e => handleConfigChange('email', 'fromAddress', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      发件人名称
                    </label>
                    <input
                      type="text"
                      value={config.email.fromName}
                      onChange={e => handleConfigChange('email', 'fromName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableSSL"
                    checked={config.email.enableSSL}
                    onChange={e => handleConfigChange('email', 'enableSSL', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="enableSSL" className="ml-2 text-sm text-gray-700">
                    启用SSL/TLS加密
                  </label>
                </div>
              </div>
            )}

            {/* 通知设置 */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">通知设置</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">邮件通知</h4>
                      <p className="text-sm text-gray-600">通过邮件发送系统通知</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.notifications.enableEmailNotifications}
                      onChange={e =>
                        handleConfigChange(
                          'notifications',
                          'enableEmailNotifications',
                          e.target.checked
                        )
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">短信通知</h4>
                      <p className="text-sm text-gray-600">通过短信发送重要通知</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.notifications.enableSMSNotifications}
                      onChange={e =>
                        handleConfigChange(
                          'notifications',
                          'enableSMSNotifications',
                          e.target.checked
                        )
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">推送通知</h4>
                      <p className="text-sm text-gray-600">通过浏览器推送通知</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.notifications.enablePushNotifications}
                      onChange={e =>
                        handleConfigChange(
                          'notifications',
                          'enablePushNotifications',
                          e.target.checked
                        )
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">仅严重警报</h4>
                      <p className="text-sm text-gray-600">只发送严重级别的警报通知</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.notifications.criticalAlertsOnly}
                      onChange={e =>
                        handleConfigChange('notifications', 'criticalAlertsOnly', e.target.checked)
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* API设置 */}
            {activeTab === 'api' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">API设置</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      请求频率限制（每分钟）
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="10000"
                      value={config.api.rateLimit}
                      onChange={e =>
                        handleConfigChange('api', 'rateLimit', parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">API版本</label>
                    <select
                      value={config.api.apiVersion}
                      onChange={e => handleConfigChange('api', 'apiVersion', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="v1">v1</option>
                      <option value="v2">v2</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableCors"
                    checked={config.api.enableCors}
                    onChange={e => handleConfigChange('api', 'enableCors', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="enableCors" className="ml-2 text-sm text-gray-700">
                    启用CORS跨域请求
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    允许的来源域名
                  </label>
                  <div className="space-y-2">
                    {config.api.allowedOrigins.map((origin, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={origin}
                          onChange={e =>
                            handleArrayChange('api', 'allowedOrigins', index, e.target.value)
                          }
                          placeholder="https://example.com"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => removeArrayItem('api', 'allowedOrigins', index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addArrayItem('api', 'allowedOrigins')}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      + 添加域名
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default SystemSettingsContent;
