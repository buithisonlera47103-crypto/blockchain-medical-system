import { Shield, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../hooks/useAuth';

interface InsurancePolicy {
  id: string;
  policyNumber: string;
  insuranceCompany: string;
  policyType: string;
  coverageAmount: number;
  deductible: number;
  premium: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'pending';
  beneficiaries: string[];
  coverageDetails: {
    hospitalization: boolean;
    outpatient: boolean;
    emergency: boolean;
    prescription: boolean;
    dental: boolean;
    vision: boolean;
  };
}

interface InsuranceClaim {
  id: string;
  claimNumber: string;
  claimDate: string;
  serviceDate: string;
  provider: string;
  diagnosis: string;
  claimedAmount: number;
  approvedAmount: number;
  status: 'approved' | 'pending' | 'denied' | 'processing';
  notes?: string;
}

const InsuranceInfoContent: React.FC = () => {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [activeTab, setActiveTab] = useState<'policies' | 'claims'>('policies');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟获取当前患者的保险信息
    const mockPolicies: InsurancePolicy[] = [
      {
        id: 'policy001',
        policyNumber: 'POL-2024-001234',
        insuranceCompany: '中国人寿保险',
        policyType: '综合医疗保险',
        coverageAmount: 500000,
        deductible: 1000,
        premium: 3600,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        status: 'active',
        beneficiaries: ['配偶', '子女'],
        coverageDetails: {
          hospitalization: true,
          outpatient: true,
          emergency: true,
          prescription: true,
          dental: false,
          vision: false,
        },
      },
      {
        id: 'policy002',
        policyNumber: 'POL-2024-005678',
        insuranceCompany: '平安健康保险',
        policyType: '意外伤害保险',
        coverageAmount: 100000,
        deductible: 0,
        premium: 1200,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        status: 'active',
        beneficiaries: ['法定继承人'],
        coverageDetails: {
          hospitalization: true,
          outpatient: false,
          emergency: true,
          prescription: false,
          dental: false,
          vision: false,
        },
      },
    ];

    const mockClaims: InsuranceClaim[] = [
      {
        id: 'claim001',
        claimNumber: 'CLM-2024-001',
        claimDate: '2024-01-15',
        serviceDate: '2024-01-10',
        provider: '市人民医院',
        diagnosis: '急性胃炎',
        claimedAmount: 2500,
        approvedAmount: 2200,
        status: 'approved',
        notes: '已扣除免赔额300元',
      },
      {
        id: 'claim002',
        claimNumber: 'CLM-2024-002',
        claimDate: '2024-01-20',
        serviceDate: '2024-01-18',
        provider: '康复诊所',
        diagnosis: '物理治疗',
        claimedAmount: 800,
        approvedAmount: 0,
        status: 'processing',
        notes: '正在审核中',
      },
    ];

    // 只显示当前患者的保险信息
    if (user) {
      setPolicies(mockPolicies);
      setClaims(mockClaims);
    }
    setLoading(false);
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'expired':
      case 'denied':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '有效';
      case 'expired':
        return '已过期';
      case 'pending':
        return '待生效';
      case 'approved':
        return '已批准';
      case 'denied':
        return '已拒绝';
      case 'processing':
        return '处理中';
      default:
        return '未知';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">我的保险信息</h1>
        <p className="text-gray-600 dark:text-gray-400">查看您的保险政策和理赔记录</p>
      </div>

      {/* 标签页导航 */}
      <div className="mb-8">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('policies')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'policies'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              保险政策
            </button>
            <button
              onClick={() => setActiveTab('claims')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'claims'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              理赔记录
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'policies' && (
        <div>
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">有效保单</p>
                  <p className="text-2xl font-bold text-green-600">
                    {policies.filter(p => p.status === 'active').length}
                  </p>
                </div>
                <div className="text-3xl text-green-500">🛡️</div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总保额</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(policies.reduce((sum, p) => sum + p.coverageAmount, 0))}
                  </p>
                </div>
                <div className="text-3xl text-blue-500">💰</div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">年保费</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(policies.reduce((sum, p) => sum + p.premium, 0))}
                  </p>
                </div>
                <div className="text-3xl text-purple-500">📊</div>
              </div>
            </div>
          </div>

          {/* 保险政策列表 */}
          <div className="space-y-6">
            {policies.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-lg border border-gray-100 dark:border-gray-700 text-center">
                <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  暂无保险政策
                </h3>
                <p className="text-gray-600 dark:text-gray-400">您还没有任何保险政策记录</p>
              </div>
            ) : (
              policies.map(policy => (
                <div
                  key={policy.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {policy.policyType}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(policy.status)}`}
                        >
                          {getStatusText(policy.status)}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">{policy.insuranceCompany}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        保单号: {policy.policyNumber}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">保额</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(policy.coverageAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">免赔额</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(policy.deductible)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">年保费</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(policy.premium)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">有效期</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {policy.startDate} 至 {policy.endDate}
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">保障范围</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(policy.coverageDetails).map(([key, covered]) => {
                        const labels: Record<string, string> = {
                          hospitalization: '住院医疗',
                          outpatient: '门诊医疗',
                          emergency: '急诊医疗',
                          prescription: '处方药物',
                          dental: '牙科治疗',
                          vision: '视力保健',
                        };
                        return (
                          <div key={key} className="flex items-center space-x-2">
                            {covered ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-gray-400" />
                            )}
                            <span
                              className={`text-sm ${
                                covered
                                  ? 'text-gray-900 dark:text-white'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {labels[key]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">受益人</p>
                    <div className="flex flex-wrap gap-2">
                      {policy.beneficiaries.map((beneficiary, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded-full text-sm"
                        >
                          {beneficiary}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'claims' && (
        <div>
          {/* 理赔统计 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总理赔次数</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {claims.length}
                  </p>
                </div>
                <div className="text-3xl text-blue-500">📋</div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">已批准</p>
                  <p className="text-2xl font-bold text-green-600">
                    {claims.filter(c => c.status === 'approved').length}
                  </p>
                </div>
                <div className="text-3xl text-green-500">✅</div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">处理中</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {claims.filter(c => c.status === 'processing').length}
                  </p>
                </div>
                <div className="text-3xl text-yellow-500">⏳</div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">已获赔付</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(
                      claims
                        .filter(c => c.status === 'approved')
                        .reduce((sum, c) => sum + c.approvedAmount, 0)
                    )}
                  </p>
                </div>
                <div className="text-3xl text-blue-500">💰</div>
              </div>
            </div>
          </div>

          {/* 理赔记录列表 */}
          <div className="space-y-4">
            {claims.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-lg border border-gray-100 dark:border-gray-700 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  暂无理赔记录
                </h3>
                <p className="text-gray-600 dark:text-gray-400">您还没有任何理赔记录</p>
              </div>
            ) : (
              claims.map(claim => (
                <div
                  key={claim.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {claim.diagnosis}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(claim.status)}`}
                        >
                          {getStatusText(claim.status)}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">{claim.provider}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        理赔号: {claim.claimNumber}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">服务日期</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {claim.serviceDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">申请日期</p>
                      <p className="font-medium text-gray-900 dark:text-white">{claim.claimDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">申请金额</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(claim.claimedAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">批准金额</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {claim.status === 'approved'
                          ? formatCurrency(claim.approvedAmount)
                          : '待定'}
                      </p>
                    </div>
                  </div>

                  {claim.notes && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">备注</p>
                      <p className="text-gray-900 dark:text-white">{claim.notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InsuranceInfoContent;
