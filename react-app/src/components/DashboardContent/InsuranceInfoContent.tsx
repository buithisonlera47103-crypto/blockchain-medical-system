import {
  Shield,
  CreditCard,
  Calendar,
  User,
  MapPin,
  Phone,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Upload,
  RefreshCw,
  Eye,
  Edit,
  Plus,
  DollarSign,
  Percent,
  TrendingUp,
  BarChart3,
  Receipt,
  Building,
  Mail,
  Hash
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../contexts/AuthContext';

interface InsurancePolicy {
  id: string;
  type: 'basic' | 'commercial' | 'supplementary';
  provider: string;
  policyNumber: string;
  membershipNumber: string;
  status: 'active' | 'expired' | 'suspended' | 'pending';
  startDate: string;
  endDate: string;
  premiumAmount: number;
  deductible: number;
  coverageLimit: number;
  coveragePercentage: number;
  benefits: Benefit[];
  recentClaims: Claim[];
}

interface Benefit {
  id: string;
  category: string;
  description: string;
  coverageType: 'full' | 'partial' | 'fixed';
  coverageAmount?: number;
  coveragePercentage?: number;
  annualLimit?: number;
  usedAmount: number;
  remainingAmount: number;
}

interface Claim {
  id: string;
  claimNumber: string;
  provider: string;
  serviceDate: string;
  submissionDate: string;
  amount: number;
  approvedAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  description: string;
  documents: string[];
}

interface InsuranceContact {
  type: 'customer_service' | 'claims' | 'emergency';
  department: string;
  phone: string;
  email: string;
  hours: string;
}

const InsuranceInfoContent: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<InsurancePolicy | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [insurancePolicies] = useState<InsurancePolicy[]>([
    {
      id: 'policy_001',
      type: 'basic',
      provider: '中国人寿保险',
      policyNumber: 'PICC2024001234',
      membershipNumber: 'M20240001',
      status: 'active',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      premiumAmount: 3600,
      deductible: 1000,
      coverageLimit: 500000,
      coveragePercentage: 80,
      benefits: [
        {
          id: 'benefit_001',
          category: '住院医疗',
          description: '住院费用报销',
          coverageType: 'partial',
          coveragePercentage: 80,
          annualLimit: 200000,
          usedAmount: 25000,
          remainingAmount: 175000
        },
        {
          id: 'benefit_002',
          category: '门诊医疗',
          description: '门诊费用报销',
          coverageType: 'partial',
          coveragePercentage: 70,
          annualLimit: 50000,
          usedAmount: 8500,
          remainingAmount: 41500
        },
        {
          id: 'benefit_003',
          category: '特殊疾病',
          description: '重大疾病保障',
          coverageType: 'full',
          coverageAmount: 300000,
          annualLimit: 300000,
          usedAmount: 0,
          remainingAmount: 300000
        }
      ],
      recentClaims: [
        {
          id: 'claim_001',
          claimNumber: 'CLM20240215001',
          provider: '市人民医院',
          serviceDate: '2024-02-10',
          submissionDate: '2024-02-15',
          amount: 3500,
          approvedAmount: 2800,
          status: 'approved',
          description: '心脏检查费用',
          documents: ['住院发票', '诊断证明', '检查报告']
        },
        {
          id: 'claim_002',
          claimNumber: 'CLM20240201002',
          provider: '中心医院',
          serviceDate: '2024-01-28',
          submissionDate: '2024-02-01',
          amount: 1200,
          approvedAmount: 1200,
          status: 'approved',
          description: '门诊治疗费用',
          documents: ['门诊发票', '处方单']
        }
      ]
    },
    {
      id: 'policy_002',
      type: 'commercial',
      provider: '平安健康保险',
      policyNumber: 'PA2024005678',
      membershipNumber: 'PA20240002',
      status: 'active',
      startDate: '2024-01-15',
      endDate: '2025-01-14',
      premiumAmount: 8400,
      deductible: 500,
      coverageLimit: 1000000,
      coveragePercentage: 90,
      benefits: [
        {
          id: 'benefit_004',
          category: '高端医疗',
          description: '高端医疗服务',
          coverageType: 'partial',
          coveragePercentage: 90,
          annualLimit: 800000,
          usedAmount: 12000,
          remainingAmount: 788000
        },
        {
          id: 'benefit_005',
          category: '海外医疗',
          description: '海外就医保障',
          coverageType: 'partial',
          coveragePercentage: 80,
          annualLimit: 200000,
          usedAmount: 0,
          remainingAmount: 200000
        }
      ],
      recentClaims: []
    }
  ]);

  const [insuranceContacts] = useState<InsuranceContact[]>([
    {
      type: 'customer_service',
      department: '客户服务中心',
      phone: '400-123-4567',
      email: 'service@insurance.com',
      hours: '9:00-18:00 (工作日)'
    },
    {
      type: 'claims',
      department: '理赔服务部',
      phone: '400-789-0123',
      email: 'claims@insurance.com',
      hours: '24小时服务'
    },
    {
      type: 'emergency',
      department: '紧急救援',
      phone: '400-911-2345',
      email: 'emergency@insurance.com',
      hours: '24小时服务'
    }
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'expired':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'suspended':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'pending':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
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
      case 'suspended':
        return '暂停';
      case 'pending':
        return '待生效';
      default:
        return '未知';
    }
  };

  const getClaimStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'processing':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getClaimStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return '已批准';
      case 'rejected':
        return '被拒绝';
      case 'processing':
        return '处理中';
      case 'pending':
        return '待审核';
      default:
        return '未知';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'basic':
        return 'from-blue-500 to-indigo-600';
      case 'commercial':
        return 'from-purple-500 to-indigo-600';
      case 'supplementary':
        return 'from-emerald-500 to-teal-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'basic':
        return '基本医保';
      case 'commercial':
        return '商业保险';
      case 'supplementary':
        return '补充保险';
      default:
        return '其他';
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
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                  保险信息
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  管理您的医疗保险和理赔记录
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
              <Plus className="w-4 h-4" />
              <span className="text-sm font-semibold">添加保险</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm font-semibold">刷新</span>
            </button>
          </div>
        </div>

        {/* 保险概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">有效保险</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">当前生效的保险</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {insurancePolicies.filter(p => p.status === 'active').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">个保险计划</div>
          </div>

          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">总保额</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">累计保障金额</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              ¥{(insurancePolicies.reduce((sum, p) => sum + p.coverageLimit, 0) / 10000).toFixed(0)}万
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">保障额度</div>
          </div>

          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">年度保费</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">当年保费支出</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              ¥{insurancePolicies.reduce((sum, p) => sum + p.premiumAmount, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">保费总额</div>
          </div>
        </div>

        {/* 标签导航 */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-2 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex space-x-2">
            {[
              { key: 'overview', label: '保险概览', icon: <Shield className="w-4 h-4" /> },
              { key: 'benefits', label: '保障内容', icon: <BarChart3 className="w-4 h-4" /> },
              { key: 'claims', label: '理赔记录', icon: <Receipt className="w-4 h-4" /> },
              { key: 'contacts', label: '联系方式', icon: <Phone className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-2xl transition-all duration-300 ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                }`}
              >
                {tab.icon}
                <span className="font-semibold">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 标签内容 */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {insurancePolicies.map((policy) => (
              <div key={policy.id} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl hover:shadow-3xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
                <div className="space-y-6">
                  {/* 保险头部信息 */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 bg-gradient-to-br ${getTypeColor(policy.type)} rounded-2xl shadow-xl`}>
                          <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {policy.provider}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Hash className="w-4 h-4" />
                              <span>{policy.policyNumber}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <CreditCard className="w-4 h-4" />
                              <span>{policy.membershipNumber}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-2">
                      <div className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(policy.status)}`}>
                        {getStatusText(policy.status)}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(policy.type).replace('from-', 'bg-').replace('to-', '').split(' ')[0]}/10 text-gray-700 dark:text-gray-300`}>
                        {getTypeText(policy.type)}
                      </div>
                    </div>
                  </div>

                  {/* 保险详细信息 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-4 border border-gray-200/30 dark:border-gray-600/30">
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">保险费用</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ¥{policy.premiumAmount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">年保费</div>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-4 border border-gray-200/30 dark:border-gray-600/30">
                      <div className="flex items-center space-x-2 mb-2">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">保额限额</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ¥{(policy.coverageLimit / 10000).toFixed(0)}万
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">保障上限</div>
                    </div>

                    <div className="bg-gradient-to-r from-orange-50/50 to-amber-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-4 border border-gray-200/30 dark:border-gray-600/30">
                      <div className="flex items-center space-x-2 mb-2">
                        <Percent className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">报销比例</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {policy.coveragePercentage}%
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">报销比例</div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-4 border border-gray-200/30 dark:border-gray-600/30">
                      <div className="flex items-center space-x-2 mb-2">
                        <CreditCard className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">免赔额</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ¥{policy.deductible.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">年免赔额</div>
                    </div>
                  </div>

                  {/* 保险期限和操作 */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>生效时间：{policy.startDate}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>到期时间：{policy.endDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="flex items-center space-x-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-semibold">
                        <Eye className="w-4 h-4" />
                        <span>查看详情</span>
                      </button>
                      <button className="flex items-center space-x-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors text-sm font-semibold">
                        <Download className="w-4 h-4" />
                        <span>保单下载</span>
                      </button>
                      <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'benefits' && (
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="space-y-6">
              {insurancePolicies.map((policy) => (
                <div key={policy.id} className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>{policy.provider} - 保障内容</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {policy.benefits.map((benefit) => (
                      <div key={benefit.id} className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-4 border border-gray-200/30 dark:border-gray-600/30">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-white">{benefit.category}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{benefit.description}</p>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">年度限额</span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                ¥{benefit.annualLimit?.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">已使用</span>
                              <span className="font-semibold text-orange-600 dark:text-orange-400">
                                ¥{benefit.usedAmount.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">剩余额度</span>
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                ¥{benefit.remainingAmount.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${benefit.annualLimit ? (benefit.usedAmount / benefit.annualLimit) * 100 : 0}%` 
                              }}
                            ></div>
                          </div>
                          
                          <div className="text-center">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              使用率：{benefit.annualLimit ? ((benefit.usedAmount / benefit.annualLimit) * 100).toFixed(1) : 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'claims' && (
          <div className="space-y-6">
            {insurancePolicies.map((policy) => 
              policy.recentClaims.length > 0 && (
                <div key={policy.id} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                      <Receipt className="w-5 h-5" />
                      <span>{policy.provider} - 理赔记录</span>
                    </h3>
                    
                    <div className="space-y-4">
                      {policy.recentClaims.map((claim) => (
                        <div key={claim.id} className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-4 border border-gray-200/30 dark:border-gray-600/30">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                                  <Receipt className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-900 dark:text-white">
                                    理赔单号：{claim.claimNumber}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{claim.description}</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">医疗机构</span>
                                  <p className="font-semibold text-gray-900 dark:text-white">{claim.provider}</p>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">服务日期</span>
                                  <p className="font-semibold text-gray-900 dark:text-white">{claim.serviceDate}</p>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">申请金额</span>
                                  <p className="font-semibold text-orange-600 dark:text-orange-400">¥{claim.amount.toLocaleString()}</p>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">批准金额</span>
                                  <p className="font-semibold text-green-600 dark:text-green-400">¥{claim.approvedAmount.toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right space-y-2">
                              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getClaimStatusColor(claim.status)}`}>
                                {getClaimStatusText(claim.status)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                提交：{claim.submissionDate}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <Phone className="w-6 h-6" />
                <span>保险公司联系方式</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {insuranceContacts.map((contact, index) => (
                  <div key={index} className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-6 border border-gray-200/30 dark:border-gray-600/30">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-2xl shadow-xl ${
                          contact.type === 'emergency' ? 'bg-gradient-to-br from-red-500 to-pink-600' :
                          contact.type === 'claims' ? 'bg-gradient-to-br from-orange-500 to-amber-600' :
                          'bg-gradient-to-br from-blue-500 to-indigo-600'
                        }`}>
                          {contact.type === 'emergency' ? <AlertCircle className="w-6 h-6 text-white" /> :
                           contact.type === 'claims' ? <Receipt className="w-6 h-6 text-white" /> :
                           <Phone className="w-6 h-6 text-white" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">{contact.department}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{contact.hours}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900 dark:text-white font-semibold">{contact.phone}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900 dark:text-white">{contact.email}</span>
                        </div>
                      </div>
                      
                      <button className={`w-full py-2 rounded-xl transition-colors text-sm font-semibold ${
                        contact.type === 'emergency' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50' :
                        contact.type === 'claims' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50' :
                        'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                      }`}>
                        立即联系
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InsuranceInfoContent;