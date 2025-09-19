import {
  Phone,
  AlertTriangle,
  Heart,
  MapPin,
  Clock,
  User,
  Shield,
  Plus,
  Edit,
  Trash2,
  Star,
  Navigation,
  Car,
  Ambulance,
  Building2,
  Mail,
  MessageCircle,
  Save,
  RefreshCw,
  Check,
  X,
  Info,
  Zap,
  Activity,
  Home,
  Briefcase
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../contexts/AuthContext';

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
  isPrimary: boolean;
  isAvailable24h: boolean;
  notes?: string;
  medicalPower?: boolean;
}

interface MedicalAlert {
  id: string;
  type: 'allergy' | 'medication' | 'condition' | 'procedure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details?: string;
  dateAdded: string;
  isActive: boolean;
}

interface EmergencyService {
  id: string;
  type: 'hospital' | 'police' | 'fire' | 'ambulance' | 'poison';
  name: string;
  phone: string;
  address: string;
  distance?: string;
  availability: '24h' | 'business' | 'emergency';
  specialties?: string[];
}

const EmergencyContactContent: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('contacts');
  const [isEditing, setIsEditing] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([
    {
      id: 'contact_001',
      name: '李明',
      relationship: '配偶',
      phone: '138-8888-8888',
      email: 'liming@email.com',
      address: '北京市朝阳区xxx街道xxx号',
      isPrimary: true,
      isAvailable24h: true,
      medicalPower: true,
      notes: '主要紧急联系人，可代为做医疗决定'
    },
    {
      id: 'contact_002',
      name: '张华',
      relationship: '兄弟',
      phone: '139-9999-9999',
      email: 'zhanghua@email.com',
      address: '北京市海淀区xxx路xxx号',
      isPrimary: false,
      isAvailable24h: false,
      medicalPower: false,
      notes: '工作时间联系'
    },
    {
      id: 'contact_003',
      name: '王医生',
      relationship: '主治医生',
      phone: '010-1234-5678',
      email: 'wangdr@hospital.com',
      address: '市人民医院心内科',
      isPrimary: false,
      isAvailable24h: false,
      medicalPower: false,
      notes: '心脏病专科医生'
    }
  ]);

  const [medicalAlerts] = useState<MedicalAlert[]>([
    {
      id: 'alert_001',
      type: 'allergy',
      severity: 'critical',
      description: '青霉素过敏',
      details: '曾出现严重过敏反应，包括呼吸困难和皮疹',
      dateAdded: '2024-01-15',
      isActive: true
    },
    {
      id: 'alert_002',
      type: 'medication',
      severity: 'high',
      description: '正在服用华法林',
      details: '抗凝血药物，手术前需停药',
      dateAdded: '2024-02-01',
      isActive: true
    },
    {
      id: 'alert_003',
      type: 'condition',
      severity: 'medium',
      description: '高血压',
      details: '需要定期监测血压，避免高盐饮食',
      dateAdded: '2024-01-20',
      isActive: true
    }
  ]);

  const [emergencyServices] = useState<EmergencyService[]>([
    {
      id: 'service_001',
      type: 'hospital',
      name: '市人民医院',
      phone: '010-1234-5678',
      address: '北京市朝阳区医院路1号',
      distance: '2.3公里',
      availability: '24h',
      specialties: ['急诊科', '心内科', '神经科', 'ICU']
    },
    {
      id: 'service_002',
      type: 'ambulance',
      name: '120急救中心',
      phone: '120',
      address: '全市范围',
      availability: '24h'
    },
    {
      id: 'service_003',
      type: 'police',
      name: '110报警服务',
      phone: '110',
      address: '全市范围',
      availability: '24h'
    },
    {
      id: 'service_004',
      type: 'fire',
      name: '119消防救援',
      phone: '119',
      address: '全市范围',
      availability: '24h'
    },
    {
      id: 'service_005',
      type: 'poison',
      name: '中毒急救中心',
      phone: '010-8765-4321',
      address: '北京市西城区xxx路xxx号',
      distance: '5.1公里',
      availability: '24h',
      specialties: ['中毒救治', '药物中毒', '食物中毒']
    }
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-700';
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-700';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '危急';
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return '未知';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'allergy':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medication':
        return <Activity className="w-4 h-4" />;
      case 'condition':
        return <Heart className="w-4 h-4" />;
      case 'procedure':
        return <Zap className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getAlertTypeText = (type: string) => {
    switch (type) {
      case 'allergy':
        return '过敏';
      case 'medication':
        return '用药';
      case 'condition':
        return '疾病';
      case 'procedure':
        return '手术';
      default:
        return '其他';
    }
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'hospital':
        return <Building2 className="w-6 h-6 text-white" />;
      case 'ambulance':
        return <Ambulance className="w-6 h-6 text-white" />;
      case 'police':
        return <Shield className="w-6 h-6 text-white" />;
      case 'fire':
        return <Zap className="w-6 h-6 text-white" />;
      case 'poison':
        return <AlertTriangle className="w-6 h-6 text-white" />;
      default:
        return <Phone className="w-6 h-6 text-white" />;
    }
  };

  const getServiceColor = (type: string) => {
    switch (type) {
      case 'hospital':
        return 'from-blue-500 to-indigo-600';
      case 'ambulance':
        return 'from-red-500 to-pink-600';
      case 'police':
        return 'from-purple-500 to-indigo-600';
      case 'fire':
        return 'from-orange-500 to-amber-600';
      case 'poison':
        return 'from-emerald-500 to-teal-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship.toLowerCase()) {
      case '配偶':
        return <Heart className="w-4 h-4" />;
      case '父母':
      case '父亲':
      case '母亲':
        return <Home className="w-4 h-4" />;
      case '子女':
      case '儿子':
      case '女儿':
        return <User className="w-4 h-4" />;
      case '医生':
      case '主治医生':
        return <Activity className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-blue-900 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-3xl animate-spin"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-pink-500 rounded-3xl animate-ping"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-100 dark:from-gray-900 dark:via-slate-900 dark:to-red-900">
      {/* 现代化背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-red-500/8 via-orange-500/8 to-amber-500/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-br from-emerald-500/8 to-teal-500/8 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-gradient-to-br from-purple-500/6 to-indigo-500/6 rounded-full blur-3xl animate-pulse delay-1400"></div>
      </div>

      <div className="relative p-6 space-y-8">
        {/* 页面标题和紧急呼叫按钮 */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gradient-to-br from-red-500 to-pink-600 rounded-3xl shadow-xl animate-pulse">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 bg-clip-text text-transparent">
                  紧急联系
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  紧急情况下的重要联系信息
                </p>
              </div>
            </div>
          </div>
          
          {/* 紧急呼叫按钮 */}
          <div className="flex items-center space-x-3">
            <button className="group relative overflow-hidden bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-8 py-4 rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/25 hover:scale-110 transform">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-3">
                <Phone className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
                <span className="text-lg font-bold">紧急呼叫 120</span>
              </div>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
              <Plus className="w-4 h-4" />
              <span className="text-sm font-semibold">添加联系人</span>
            </button>
          </div>
        </div>

        {/* 标签导航 */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-2 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex space-x-2">
            {[
              { key: 'contacts', label: '紧急联系人', icon: <User className="w-4 h-4" /> },
              { key: 'alerts', label: '医疗警报', icon: <AlertTriangle className="w-4 h-4" /> },
              { key: 'services', label: '紧急服务', icon: <Phone className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-2xl transition-all duration-300 ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                }`}
              >
                {tab.icon}
                <span className="font-semibold">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 紧急联系人标签 */}
        {activeTab === 'contacts' && (
          <div className="space-y-6">
            {emergencyContacts.map((contact) => (
              <div key={contact.id} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl hover:shadow-3xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
                <div className="space-y-4">
                  {/* 联系人头部 */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-4 rounded-3xl shadow-xl ${contact.isPrimary ? 'bg-gradient-to-br from-red-500 to-pink-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                        {getRelationshipIcon(contact.relationship)}
                        <div className="w-6 h-6 text-white" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {contact.name}
                          </h3>
                          {contact.isPrimary && (
                            <div className="flex items-center space-x-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-semibold">
                              <Star className="w-4 h-4 fill-current" />
                              <span>主要联系人</span>
                            </div>
                          )}
                          {contact.isAvailable24h && (
                            <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold">
                              <Clock className="w-4 h-4" />
                              <span>24小时</span>
                            </div>
                          )}
                        </div>
                        <p className="text-lg text-gray-600 dark:text-gray-400 font-semibold">
                          {contact.relationship}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 联系方式 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-4 border border-gray-200/30 dark:border-gray-600/30">
                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">电话</p>
                          <p className="font-bold text-gray-900 dark:text-white text-lg">{contact.phone}</p>
                        </div>
                      </div>
                      <button className="mt-3 w-full py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-semibold">
                        立即拨打
                      </button>
                    </div>

                    {contact.email && (
                      <div className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-4 border border-gray-200/30 dark:border-gray-600/30">
                        <div className="flex items-center space-x-3">
                          <Mail className="w-5 h-5 text-emerald-500" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">邮箱</p>
                            <p className="font-bold text-gray-900 dark:text-white">{contact.email}</p>
                          </div>
                        </div>
                        <button className="mt-3 w-full py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors text-sm font-semibold">
                          发送邮件
                        </button>
                      </div>
                    )}

                    {contact.address && (
                      <div className="bg-gradient-to-r from-orange-50/50 to-amber-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-4 border border-gray-200/30 dark:border-gray-600/30">
                        <div className="flex items-center space-x-3">
                          <MapPin className="w-5 h-5 text-orange-500" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">地址</p>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">{contact.address}</p>
                          </div>
                        </div>
                        <button className="mt-3 w-full py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-xl hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors text-sm font-semibold">
                          查看位置
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 权限和备注 */}
                  <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        {contact.medicalPower && (
                          <div className="flex items-center space-x-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-semibold">
                            <Shield className="w-4 h-4" />
                            <span>有医疗决定权</span>
                          </div>
                        )}
                        {contact.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <strong>备注：</strong>{contact.notes}
                          </p>
                        )}
                      </div>
                      
                      <button className="flex items-center space-x-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-semibold">
                        <MessageCircle className="w-4 h-4" />
                        <span>发送紧急消息</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 医疗警报标签 */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-xl">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">重要医疗信息</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">紧急情况下医护人员需要了解的信息</p>
                  </div>
                </div>
                <button className="flex items-center space-x-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-semibold">添加警报</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {medicalAlerts.map((alert) => (
                  <div key={alert.id} className={`relative overflow-hidden rounded-2xl p-4 border-2 transition-all duration-300 hover:shadow-lg ${getSeverityColor(alert.severity)}`}>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          {getAlertTypeIcon(alert.type)}
                          <div>
                            <h4 className="font-bold text-lg">{alert.description}</h4>
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="px-2 py-1 rounded-full bg-white/50 dark:bg-gray-800/50 font-semibold">
                                {getAlertTypeText(alert.type)}
                              </span>
                              <span className="px-2 py-1 rounded-full bg-white/50 dark:bg-gray-800/50 font-semibold">
                                {getSeverityText(alert.severity)}严重度
                              </span>
                            </div>
                          </div>
                        </div>
                        <button className="p-1 hover:bg-white/20 dark:hover:bg-gray-800/20 rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {alert.details && (
                        <p className="text-sm leading-relaxed">{alert.details}</p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs">
                        <span>添加时间：{alert.dateAdded}</span>
                        {alert.isActive && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                            <span>活跃</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 紧急服务标签 */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {emergencyServices.map((service) => (
                <div key={service.id} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl hover:shadow-3xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
                  <div className="space-y-4">
                    {/* 服务头部 */}
                    <div className="flex items-center space-x-4">
                      <div className={`p-4 bg-gradient-to-br ${getServiceColor(service.type)} rounded-3xl shadow-xl`}>
                        {getServiceIcon(service.type)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {service.name}
                        </h3>
                        <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{service.availability === '24h' ? '24小时服务' : '工作时间'}</span>
                          </div>
                          {service.distance && (
                            <div className="flex items-center space-x-1">
                              <Navigation className="w-4 h-4" />
                              <span>{service.distance}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 联系信息 */}
                    <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-4 border border-gray-200/30 dark:border-gray-600/30">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Phone className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">电话</p>
                            <p className="font-bold text-gray-900 dark:text-white text-xl">{service.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">地址</p>
                            <p className="text-gray-900 dark:text-white">{service.address}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 专科服务 */}
                    {service.specialties && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">专科服务：</p>
                        <div className="flex flex-wrap gap-2">
                          {service.specialties.map((specialty, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-3 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                      <button className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-2xl transition-all duration-300 hover:shadow-lg font-semibold ${
                        service.type === 'ambulance' || service.type === 'police' || service.type === 'fire'
                          ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
                      }`}>
                        <Phone className="w-5 h-5" />
                        <span>立即拨打</span>
                      </button>
                      {service.address !== '全市范围' && (
                        <button className="flex items-center space-x-2 px-4 py-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-2xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors font-semibold">
                          <Navigation className="w-4 h-4" />
                          <span>导航</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyContactContent;