import {
  Settings,
  User,
  Shield,
  Bell,
  Globe,
  Moon,
  Sun,
  Smartphone,
  Database,
  Lock,
  Key,
  Fingerprint,
  Eye,
  EyeOff,
  Camera,
  Mic,
  Monitor,
  Wifi,
  Bluetooth,
  Download,
  Upload,
  Trash2,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Languages,
  Palette,
  Volume2,
  VolumeX,
  Zap,
  Cpu,
  Activity,
  BarChart3,
  Target,
  Award,
  Star,
  Save,
  X,
} from 'lucide-react';
import React, { useState } from 'react';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface SettingItem {
  id: string;
  title: string;
  description: string;
  type: 'toggle' | 'select' | 'input' | 'slider' | 'button';
  value: any;
  options?: string[];
  min?: number;
  max?: number;
}

const SettingsContent: React.FC = () => {
  const [activeSection, setActiveSection] = useState('profile');
  const [settings, setSettings] = useState<{ [key: string]: any }>({
    // 个人资料设置
    displayName: '张医生',
    email: 'zhangdoctor@hospital.com',
    phone: '+86 138-0013-8000',
    department: '心血管科',
    title: '主任医师',
    avatar: '',
    
    // 安全设置
    twoFactorAuth: true,
    biometricLogin: true,
    sessionTimeout: 30,
    passwordComplexity: 'high',
    
    // 通知设置
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    emergencyAlerts: true,
    soundEnabled: true,
    vibrationEnabled: true,
    
    // 外观设置
    theme: 'auto',
    language: 'zh-CN',
    fontSize: 'medium',
    colorScheme: 'default',
    animationsEnabled: true,
    
    // 隐私设置
    profileVisibility: 'colleagues',
    dataSharing: false,
    analyticsTracking: true,
    locationServices: false,
    
    // 系统设置
    autoSave: true,
    offlineMode: true,
    cacheSize: 500,
    syncInterval: 15,
    
    // 区块链设置
    blockchainEnabled: true,
    encryptionLevel: 'AES-256',
    nodeParticipation: true,
    dataVerification: true,
  });

  const settingsSections: SettingsSection[] = [
    {
      id: 'profile',
      title: '个人资料',
      description: '管理个人信息和专业资料',
      icon: <User className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-600',
    },
    {
      id: 'security',
      title: '安全设置',
      description: '账户安全和访问控制',
      icon: <Shield className="w-5 h-5" />,
      color: 'from-green-500 to-emerald-600',
    },
    {
      id: 'notifications',
      title: '通知设置',
      description: '消息和提醒偏好',
      icon: <Bell className="w-5 h-5" />,
      color: 'from-orange-500 to-red-600',
    },
    {
      id: 'appearance',
      title: '外观设置',
      description: '主题、语言和显示选项',
      icon: <Palette className="w-5 h-5" />,
      color: 'from-purple-500 to-indigo-600',
    },
    {
      id: 'privacy',
      title: '隐私设置',
      description: '数据隐私和共享设置',
      icon: <Lock className="w-5 h-5" />,
      color: 'from-pink-500 to-rose-600',
    },
    {
      id: 'system',
      title: '系统设置',
      description: '性能和同步选项',
      icon: <Cpu className="w-5 h-5" />,
      color: 'from-teal-500 to-cyan-600',
    },
    {
      id: 'blockchain',
      title: '区块链设置',
      description: '区块链验证和加密配置',
      icon: <Database className="w-5 h-5" />,
      color: 'from-indigo-500 to-purple-600',
    },
  ];

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const renderSettingItem = (item: SettingItem) => {
    switch (item.type) {
      case 'toggle':
        return (
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
            </div>
            <button
              onClick={() => updateSetting(item.id, !item.value)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                item.value ? 'bg-gradient-to-r from-blue-500 to-cyan-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  item.value ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        );
        
      case 'select':
        return (
          <div>
            <div className="mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
            </div>
            <select
              value={item.value}
              onChange={(e) => updateSetting(item.id, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {item.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );
        
      case 'input':
        return (
          <div>
            <div className="mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
            </div>
            <input
              type="text"
              value={item.value}
              onChange={(e) => updateSetting(item.id, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );
        
      case 'slider':
        return (
          <div>
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">{item.min}</span>
              <input
                type="range"
                min={item.min}
                max={item.max}
                value={item.value}
                onChange={(e) => updateSetting(item.id, parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <span className="text-sm text-gray-500">{item.max}</span>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 min-w-[3rem] text-right">
                {item.value}
              </span>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  张
                </div>
                <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Camera className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                { id: 'displayName', title: '显示名称', description: '其他用户看到的名称', type: 'input', value: settings.displayName },
                { id: 'email', title: '电子邮箱', description: '用于接收通知和登录', type: 'input', value: settings.email },
                { id: 'phone', title: '手机号码', description: '用于双重验证和紧急联系', type: 'input', value: settings.phone },
                { id: 'department', title: '科室', description: '所属医疗科室', type: 'select', value: settings.department, options: ['心血管科', '神经科', '外科', '儿科', '急诊科'] },
                { id: 'title', title: '职称', description: '专业职称', type: 'select', value: settings.title, options: ['住院医师', '主治医师', '副主任医师', '主任医师', '教授'] },
              ].map(item => (
                <div key={item.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  {renderSettingItem(item as SettingItem)}
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'security':
        return (
          <div className="space-y-6">
            {[
              { id: 'twoFactorAuth', title: '双重身份验证', description: '为账户添加额外安全层', type: 'toggle', value: settings.twoFactorAuth },
              { id: 'biometricLogin', title: '生物识别登录', description: '使用指纹或面部识别快速登录', type: 'toggle', value: settings.biometricLogin },
              { id: 'sessionTimeout', title: '会话超时（分钟）', description: '自动登出时间', type: 'slider', value: settings.sessionTimeout, min: 5, max: 120 },
              { id: 'passwordComplexity', title: '密码复杂度', description: '设置密码强度要求', type: 'select', value: settings.passwordComplexity, options: ['low', 'medium', 'high'] },
            ].map(item => (
              <div key={item.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                {renderSettingItem(item as SettingItem)}
              </div>
            ))}
            
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 dark:text-red-300">危险操作</h4>
                  <p className="text-red-700 dark:text-red-400 text-sm mt-1">这些操作可能影响账户安全</p>
                  <div className="mt-4 space-y-3">
                    <button className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-xl text-sm transition-colors">
                      重置密码
                    </button>
                    <button className="bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 font-medium py-2 px-4 rounded-xl text-sm transition-colors">
                      注销所有设备
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
            {[
              { id: 'pushNotifications', title: '推送通知', description: '接收应用内推送消息', type: 'toggle', value: settings.pushNotifications },
              { id: 'emailNotifications', title: '邮件通知', description: '通过邮件接收重要消息', type: 'toggle', value: settings.emailNotifications },
              { id: 'smsNotifications', title: '短信通知', description: '通过短信接收紧急消息', type: 'toggle', value: settings.smsNotifications },
              { id: 'appointmentReminders', title: '预约提醒', description: '预约前自动提醒', type: 'toggle', value: settings.appointmentReminders },
              { id: 'emergencyAlerts', title: '紧急警报', description: '接收急诊和紧急会诊通知', type: 'toggle', value: settings.emergencyAlerts },
              { id: 'soundEnabled', title: '声音提醒', description: '播放通知声音', type: 'toggle', value: settings.soundEnabled },
              { id: 'vibrationEnabled', title: '振动提醒', description: '启用设备振动', type: 'toggle', value: settings.vibrationEnabled },
            ].map(item => (
              <div key={item.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                {renderSettingItem(item as SettingItem)}
              </div>
            ))}
          </div>
        );
        
      case 'appearance':
        return (
          <div className="space-y-6">
            {[
              { id: 'theme', title: '主题模式', description: '选择明暗主题', type: 'select', value: settings.theme, options: ['light', 'dark', 'auto'] },
              { id: 'language', title: '语言', description: '界面显示语言', type: 'select', value: settings.language, options: ['zh-CN', 'en-US', 'ja-JP'] },
              { id: 'fontSize', title: '字体大小', description: '界面文字大小', type: 'select', value: settings.fontSize, options: ['small', 'medium', 'large'] },
              { id: 'colorScheme', title: '配色方案', description: '界面颜色主题', type: 'select', value: settings.colorScheme, options: ['default', 'blue', 'green', 'purple'] },
              { id: 'animationsEnabled', title: '动画效果', description: '启用界面动画和过渡效果', type: 'toggle', value: settings.animationsEnabled },
            ].map(item => (
              <div key={item.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                {renderSettingItem(item as SettingItem)}
              </div>
            ))}
          </div>
        );
        
      case 'privacy':
        return (
          <div className="space-y-6">
            {[
              { id: 'profileVisibility', title: '资料可见性', description: '控制谁可以查看您的资料', type: 'select', value: settings.profileVisibility, options: ['public', 'colleagues', 'private'] },
              { id: 'dataSharing', title: '数据共享', description: '允许匿名数据用于医学研究', type: 'toggle', value: settings.dataSharing },
              { id: 'analyticsTracking', title: '使用情况分析', description: '帮助改进应用功能', type: 'toggle', value: settings.analyticsTracking },
              { id: 'locationServices', title: '位置服务', description: '允许获取地理位置信息', type: 'toggle', value: settings.locationServices },
            ].map(item => (
              <div key={item.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                {renderSettingItem(item as SettingItem)}
              </div>
            ))}
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300">数据保护</h4>
                  <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">
                    您的医疗数据受到严格的隐私保护，符合相关法律法规要求。
                  </p>
                  <button className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
                    查看隐私政策
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'system':
        return (
          <div className="space-y-6">
            {[
              { id: 'autoSave', title: '自动保存', description: '自动保存工作进度', type: 'toggle', value: settings.autoSave },
              { id: 'offlineMode', title: '离线模式', description: '支持离线访问部分功能', type: 'toggle', value: settings.offlineMode },
              { id: 'cacheSize', title: '缓存大小（MB）', description: '本地数据缓存限制', type: 'slider', value: settings.cacheSize, min: 100, max: 2000 },
              { id: 'syncInterval', title: '同步间隔（分钟）', description: '数据同步频率', type: 'slider', value: settings.syncInterval, min: 5, max: 60 },
            ].map(item => (
              <div key={item.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                {renderSettingItem(item as SettingItem)}
              </div>
            ))}
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <Cpu className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-300">系统维护</h4>
                  <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">定期清理和优化系统性能</p>
                  <div className="mt-4 space-x-3">
                    <button className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-xl text-sm transition-colors">
                      清理缓存
                    </button>
                    <button className="bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 font-medium py-2 px-4 rounded-xl text-sm transition-colors">
                      导出数据
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'blockchain':
        return (
          <div className="space-y-6">
            {[
              { id: 'blockchainEnabled', title: '区块链验证', description: '启用数据区块链验证', type: 'toggle', value: settings.blockchainEnabled },
              { id: 'encryptionLevel', title: '加密级别', description: '数据加密强度', type: 'select', value: settings.encryptionLevel, options: ['AES-128', 'AES-256', 'RSA-2048'] },
              { id: 'nodeParticipation', title: '节点参与', description: '参与区块链网络维护', type: 'toggle', value: settings.nodeParticipation },
              { id: 'dataVerification', title: '数据验证', description: '自动验证数据完整性', type: 'toggle', value: settings.dataVerification },
            ].map(item => (
              <div key={item.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                {renderSettingItem(item as SettingItem)}
              </div>
            ))}
            
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-indigo-800 dark:text-indigo-300">区块链状态</h4>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-700 dark:text-indigo-400">网络状态</span>
                      <span className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-600 dark:text-green-400 font-medium">已连接</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-700 dark:text-indigo-400">节点数量</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">1,247</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-700 dark:text-indigo-400">区块高度</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">2,841,963</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-700 dark:text-indigo-400">验证记录</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">15,829</span>
                    </div>
                  </div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-100 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800 p-6 lg:p-8">
      {/* 设置中心风格背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-gray-500/10 via-blue-500/10 to-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-br from-slate-500/8 to-gray-500/8 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-gradient-to-br from-blue-500/6 to-cyan-500/6 rounded-full blur-3xl animate-pulse delay-1400"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* 现代化标题区域 */}
        <div className="text-center py-12 mb-8">
          <div className="group inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gray-600 via-blue-600 to-indigo-700 rounded-3xl mb-6 shadow-2xl hover:shadow-gray-500/25 transition-all duration-500 hover:scale-110 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-400/20 to-blue-400/20 rounded-3xl animate-pulse"></div>
            <Settings className="w-12 h-12 text-white group-hover:rotate-180 transition-transform duration-500 relative z-10" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-gray-700 via-blue-800 to-indigo-900 dark:from-gray-300 dark:via-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
                设置中心
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              个性化配置您的<span className="font-semibold text-gray-700 dark:text-gray-400">医疗工作环境</span>，
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-semibold"> 优化使用体验</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* 左侧导航 */}
          <div className="lg:w-80 space-y-3">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left p-4 rounded-2xl transition-all duration-300 ${
                  activeSection === section.id
                    ? 'bg-white dark:bg-gray-800 shadow-lg scale-105 border-2 border-blue-200 dark:border-blue-700'
                    : 'bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md backdrop-blur-sm'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 bg-gradient-to-br ${section.color} rounded-xl ${
                    activeSection === section.id ? 'scale-110' : ''
                  } transition-transform duration-300`}>
                    <div className="text-white">{section.icon}</div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {section.description}
                    </p>
                  </div>
                  {activeSection === section.id && (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* 右侧内容 */}
          <div className="flex-1">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {settingsSections.find(s => s.id === activeSection)?.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {settingsSections.find(s => s.id === activeSection)?.description}
                </p>
              </div>

              {renderSectionContent()}

              {/* 保存按钮 */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-end space-x-4">
                  <button className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    重置
                  </button>
                  <button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 hover:scale-105 flex items-center space-x-2">
                    <Save className="w-5 h-5" />
                    <span>保存设置</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsContent;