import {
  Pill,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  Bell,
  Download,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Phone,
  MapPin,
  ShoppingCart,
  QrCode,
  Heart,
  Activity,
  Thermometer,
  Zap
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../contexts/AuthContext';

interface Prescription {
  id: string;
  prescriptionNumber: string;
  doctor: {
    name: string;
    department: string;
    hospital: string;
  };
  medications: Medication[];
  issuedDate: string;
  validUntil: string;
  status: 'active' | 'expired' | 'used' | 'cancelled';
  instructions: string;
  refillsRemaining: number;
  totalRefills: number;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  unit: string;
  instructions: string;
  sideEffects?: string[];
  contraindications?: string[];
}

interface MedicationReminder {
  id: string;
  medicationName: string;
  time: string;
  dosage: string;
  taken: boolean;
  type: 'morning' | 'afternoon' | 'evening' | 'night';
}

const PrescriptionContent: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  const [prescriptions] = useState<Prescription[]>([
    {
      id: 'rx_001',
      prescriptionNumber: 'RX20240215001',
      doctor: {
        name: '张医生',
        department: '心内科',
        hospital: '市人民医院'
      },
      medications: [
        {
          id: 'med_001',
          name: '阿司匹林肠溶片',
          dosage: '100mg',
          frequency: '每日一次',
          duration: '30天',
          quantity: 30,
          unit: '片',
          instructions: '饭后服用，整片吞服',
          sideEffects: ['胃肠道不适', '出血倾向'],
          contraindications: ['胃溃疡', '严重肝肾功能不全']
        },
        {
          id: 'med_002',
          name: '美托洛尔缓释片',
          dosage: '50mg',
          frequency: '每日两次',
          duration: '30天',
          quantity: 60,
          unit: '片',
          instructions: '早晚各一次，饭前服用',
          sideEffects: ['头晕', '疲乏', '心率减慢']
        }
      ],
      issuedDate: '2024-02-15',
      validUntil: '2024-03-15',
      status: 'active',
      instructions: '请按时服药，如有不适及时联系医生',
      refillsRemaining: 2,
      totalRefills: 3
    },
    {
      id: 'rx_002',
      prescriptionNumber: 'RX20240210002',
      doctor: {
        name: '李医生',
        department: '内分泌科',
        hospital: '市中心医院'
      },
      medications: [
        {
          id: 'med_003',
          name: '二甲双胍缓释片',
          dosage: '500mg',
          frequency: '每日两次',
          duration: '30天',
          quantity: 60,
          unit: '片',
          instructions: '餐中或餐后服用',
          sideEffects: ['胃肠道反应', '乳酸酸中毒（罕见）']
        }
      ],
      issuedDate: '2024-02-10',
      validUntil: '2024-03-10',
      status: 'active',
      instructions: '定期监测血糖，注意饮食控制',
      refillsRemaining: 1,
      totalRefills: 2
    },
    {
      id: 'rx_003',
      prescriptionNumber: 'RX20240105003',
      doctor: {
        name: '王医生',
        department: '呼吸科',
        hospital: '市人民医院'
      },
      medications: [
        {
          id: 'med_004',
          name: '阿莫西林胶囊',
          dosage: '500mg',
          frequency: '每日三次',
          duration: '7天',
          quantity: 21,
          unit: '粒',
          instructions: '饭后服用，多饮水'
        }
      ],
      issuedDate: '2024-01-05',
      validUntil: '2024-02-05',
      status: 'expired',
      instructions: '完整疗程服用，不可随意停药',
      refillsRemaining: 0,
      totalRefills: 0
    }
  ]);

  const [medicationReminders] = useState<MedicationReminder[]>([
    {
      id: 'reminder_001',
      medicationName: '阿司匹林肠溶片',
      time: '08:00',
      dosage: '100mg',
      taken: true,
      type: 'morning'
    },
    {
      id: 'reminder_002',
      medicationName: '美托洛尔缓释片',
      time: '08:00',
      dosage: '50mg',
      taken: true,
      type: 'morning'
    },
    {
      id: 'reminder_003',
      medicationName: '美托洛尔缓释片',
      time: '20:00',
      dosage: '50mg',
      taken: false,
      type: 'evening'
    },
    {
      id: 'reminder_004',
      medicationName: '二甲双胍缓释片',
      time: '12:00',
      dosage: '500mg',
      taken: true,
      type: 'afternoon'
    },
    {
      id: 'reminder_005',
      medicationName: '二甲双胍缓释片',
      time: '18:00',
      dosage: '500mg',
      taken: false,
      type: 'evening'
    }
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const filteredPrescriptions = prescriptions.filter(prescription => {
    const matchesSearch = prescription.prescriptionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prescription.doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prescription.medications.some(med => med.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterStatus === 'all' || prescription.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'expired':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'used':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      case 'cancelled':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '有效';
      case 'expired':
        return '已过期';
      case 'used':
        return '已使用';
      case 'cancelled':
        return '已取消';
      default:
        return '未知';
    }
  };

  const getReminderTypeIcon = (type: string) => {
    switch (type) {
      case 'morning':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'afternoon':
        return <Heart className="w-4 h-4 text-orange-500" />;
      case 'evening':
        return <Activity className="w-4 h-4 text-purple-500" />;
      case 'night':
        return <Thermometer className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-blue-900 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl animate-spin"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-3xl animate-ping"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-blue-900">
      {/* 现代化背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-blue-500/8 via-indigo-500/8 to-cyan-500/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-br from-emerald-500/8 to-teal-500/8 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-gradient-to-br from-orange-500/6 to-amber-500/6 rounded-full blur-3xl animate-pulse delay-1400"></div>
      </div>

      <div className="relative p-6 space-y-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-xl">
                <Pill className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                  处方管理
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  管理您的药物处方和用药提醒
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
              <QrCode className="w-4 h-4" />
              <span className="text-sm font-semibold">扫描处方</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm font-semibold">刷新</span>
            </button>
          </div>
        </div>

        {/* 用药提醒概览 */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-xl">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">今日用药提醒</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">按时服药，关注健康</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {medicationReminders.map((reminder) => (
              <div key={reminder.id} className={`group relative overflow-hidden rounded-2xl p-4 border transition-all duration-300 hover:shadow-lg ${
                reminder.taken 
                  ? 'bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200/50 dark:border-green-700/50'
                  : 'bg-gradient-to-r from-orange-50/50 to-amber-50/50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200/50 dark:border-orange-700/50'
              }`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getReminderTypeIcon(reminder.type)}
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        {reminder.time}
                      </span>
                    </div>
                    {reminder.taken ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {reminder.medicationName}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{reminder.dosage}</p>
                  </div>
                  {!reminder.taken && (
                    <button className="w-full py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-xl hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors text-sm font-semibold">
                      标记已服用
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
            </div>
            <input
              type="text"
              placeholder="🔍 搜索处方号、医生或药物名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 shadow-inner"
            />
          </div>
          
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none pl-12 pr-10 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white shadow-inner min-w-[200px]"
            >
              <option value="all">全部处方</option>
              <option value="active">有效处方</option>
              <option value="expired">过期处方</option>
              <option value="used">已使用</option>
              <option value="cancelled">已取消</option>
            </select>
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Filter className="w-5 h-5 text-gray-400" />
            </div>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* 处方列表 */}
        <div className="space-y-6">
          {filteredPrescriptions.length === 0 ? (
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-gray-200/50 dark:border-gray-700/50 text-center">
              <div className="p-8 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-3xl mb-6 mx-auto w-fit">
                <Pill className="w-16 h-16 text-blue-500 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">暂无处方记录</h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg">您还没有任何处方记录，请联系医生开具处方</p>
            </div>
          ) : (
            filteredPrescriptions.map((prescription) => (
              <div key={prescription.id} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl hover:shadow-3xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
                <div className="space-y-6">
                  {/* 处方头部信息 */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl">
                          <Pill className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                            处方号：{prescription.prescriptionNumber}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{prescription.doctor.name} · {prescription.doctor.department}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span>{prescription.doctor.hospital}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-2">
                      <div className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(prescription.status)}`}>
                        {getStatusText(prescription.status)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        有效期至：{prescription.validUntil}
                      </div>
                    </div>
                  </div>

                  {/* 药物列表 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {prescription.medications.map((medication) => (
                      <div key={medication.id} className="group relative overflow-hidden bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-4 border border-gray-200/30 dark:border-gray-600/30 hover:shadow-lg transition-all duration-300">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                                {medication.name}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {medication.dosage} · {medication.frequency}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {medication.quantity}{medication.unit}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {medication.duration}
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-3 bg-white/80 dark:bg-gray-600/80 rounded-xl">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <strong>用法：</strong>{medication.instructions}
                            </p>
                          </div>
                          
                          {medication.sideEffects && (
                            <div className="p-3 bg-orange-50/50 dark:bg-orange-900/20 rounded-xl border border-orange-200/50 dark:border-orange-700/50">
                              <p className="text-sm text-orange-700 dark:text-orange-300">
                                <strong>副作用：</strong>{medication.sideEffects.join('、')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 处方底部信息和操作 */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>开具时间：{prescription.issuedDate}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RefreshCw className="w-4 h-4" />
                          <span>剩余续方：{prescription.refillsRemaining}/{prescription.totalRefills}</span>
                        </div>
                      </div>
                      {prescription.instructions && (
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>医嘱：</strong>{prescription.instructions}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setSelectedPrescription(prescription)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-semibold"
                      >
                        <Eye className="w-4 h-4" />
                        <span>查看详情</span>
                      </button>
                      <button className="flex items-center space-x-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors text-sm font-semibold">
                        <Download className="w-4 h-4" />
                        <span>下载</span>
                      </button>
                      {prescription.status === 'active' && (
                        <button className="flex items-center space-x-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-xl hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors text-sm font-semibold">
                          <ShoppingCart className="w-4 h-4" />
                          <span>购药</span>
                        </button>
                      )}
                      <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                        <Phone className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PrescriptionContent;