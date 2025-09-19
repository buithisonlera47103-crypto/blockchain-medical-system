import { Users, Search, Filter, Eye, Phone, Mail, Calendar, FileText, X } from 'lucide-react';
import React, { useState } from 'react';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  phone: string;
  email: string;
  lastVisit: string;
  nextAppointment?: string;
  condition: string;
  status: 'stable' | 'critical' | 'recovering' | 'follow_up';
  recordsCount: number;
}

const PatientManagementContent: React.FC = () => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [patients] = useState<Patient[]>([
    {
      id: 'P001234',
      name: '张三',
      age: 45,
      gender: 'male',
      phone: '138-0000-1234',
      email: 'zhang.san@email.com',
      lastVisit: '2024-01-15',
      nextAppointment: '2024-01-20',
      condition: '高血压',
      status: 'stable',
      recordsCount: 5,
    },
    {
      id: 'P001235',
      name: '李四',
      age: 38,
      gender: 'female',
      phone: '139-0000-5678',
      email: 'li.si@email.com',
      lastVisit: '2024-01-10',
      nextAppointment: '2024-01-18',
      condition: '糖尿病',
      status: 'follow_up',
      recordsCount: 8,
    },
    {
      id: 'P001236',
      name: '王五',
      age: 52,
      gender: 'male',
      phone: '137-0000-9012',
      email: 'wang.wu@email.com',
      lastVisit: '2024-01-08',
      condition: '心脏病',
      status: 'critical',
      recordsCount: 12,
    },
    {
      id: 'P001237',
      name: '赵六',
      age: 29,
      gender: 'female',
      phone: '136-0000-3456',
      email: 'zhao.liu@email.com',
      lastVisit: '2024-01-05',
      nextAppointment: '2024-01-22',
      condition: '术后恢复',
      status: 'recovering',
      recordsCount: 3,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowDetailModal(true);
  };

  const handleViewMedicalRecords = (patientId: string) => {
    alert(`查看患者 ${patientId} 的病历记录`);
    // 这里可以跳转到医疗记录页面并过滤该患者的记录
  };

  const handleAppointmentManagement = (patientId: string) => {
    alert(`管理患者 ${patientId} 的预约`);
    // 这里可以跳转到预约管理页面
  };

  const handleContactPatient = (patient: Patient) => {
    alert(`联系患者：${patient.name}\n电话：${patient.phone}`);
    // 这里可以打开电话拨号或短信应用
  };

  const handleSendEmail = (patient: Patient) => {
    alert(`发送邮件给：${patient.name}\n邮箱：${patient.email}`);
    // 这里可以打开邮件客户端
  };

  const getStatusColor = (status: string) => {
    const colors = {
      stable: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      recovering: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      follow_up: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      stable: '稳定',
      critical: '危重',
      recovering: '恢复中',
      follow_up: '随访',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.condition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || patient.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-gray-900 dark:via-slate-900 dark:to-zinc-900 relative overflow-hidden">
      {/* 现代化背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-violet-500/5 to-pink-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      
      <div className="relative z-10 space-y-8 p-6">
        {/* 现代化页面标题和操作 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-6 sm:mb-0">
            <div className="flex items-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl blur opacity-75"></div>
                <div className="relative p-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg">
                  <Users className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                  患者管理
                </h1>
                <div className="w-16 h-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mt-2"></div>
              </div>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
              智能化患者信息管理系统
            </p>
          </div>
          <div className="flex space-x-3">
            <button className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-2 group-hover:text-white transition-colors duration-300">
                <Filter className="w-5 h-5" />
                <span>筛选</span>
              </div>
            </button>
            <button className="group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>添加患者</span>
              </div>
            </button>
          </div>
        </div>

        {/* 现代化搜索和筛选 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="flex-1">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors duration-300" />
                <input
                  type="text"
                  placeholder="搜索患者姓名、ID或病情..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="relative w-full pl-12 pr-4 py-3.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white transition-all duration-300 hover:bg-white dark:hover:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="appearance-none px-4 py-3.5 pr-10 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white transition-all duration-300 hover:bg-white dark:hover:bg-gray-700 cursor-pointer"
                >
                  <option value="all">全部状态</option>
                  <option value="stable">稳定</option>
                  <option value="critical">危重</option>
                  <option value="recovering">恢复中</option>
                  <option value="follow_up">随访</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 现代化统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-sm hover:shadow-lg transition-all duration-300 group hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">总患者数</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {patients.length}
                </p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">活跃患者</span>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl group-hover:from-indigo-100 group-hover:to-indigo-200 dark:group-hover:from-indigo-800/30 dark:group-hover:to-indigo-700/30 transition-all duration-300">
                <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-sm hover:shadow-lg transition-all duration-300 group hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">今日预约</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {patients.filter(p => p.nextAppointment === '2024-01-20').length}
                </p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">今日安排</span>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl group-hover:from-emerald-100 group-hover:to-emerald-200 dark:group-hover:from-emerald-800/30 dark:group-hover:to-emerald-700/30 transition-all duration-300">
                <Calendar className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-sm hover:shadow-lg transition-all duration-300 group hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">医疗记录</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {patients.reduce((sum, p) => sum + p.recordsCount, 0)}
                </p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">总记录数</span>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl group-hover:from-blue-100 group-hover:to-blue-200 dark:group-hover:from-blue-800/30 dark:group-hover:to-blue-700/30 transition-all duration-300">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-sm hover:shadow-lg transition-all duration-300 group hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">危重患者</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {patients.filter(p => p.status === 'critical').length}
                </p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">需关注</span>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl group-hover:from-red-100 group-hover:to-red-200 dark:group-hover:from-red-800/30 dark:group-hover:to-red-700/30 transition-all duration-300">
                <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 font-bold text-sm">!</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* 现代化患者列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2.5 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl mr-3">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">患者列表</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">共 {filteredPatients.length} 位患者</p>
              </div>
            </div>
            <button className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all duration-300 shadow-sm hover:shadow-md flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>添加患者</span>
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredPatients.map((patient) => (
            <div key={patient.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {patient.name}
                      </h4>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {patient.id}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(patient.status)}`}>
                        {getStatusLabel(patient.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">年龄:</span>
                        <p className="text-gray-900 dark:text-white font-medium">{patient.age}岁 ({patient.gender === 'male' ? '男' : '女'})</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">病情:</span>
                        <p className="text-gray-900 dark:text-white font-medium">{patient.condition}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">上次就诊:</span>
                        <p className="text-gray-900 dark:text-white font-medium">{patient.lastVisit}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">下次预约:</span>
                        <p className="text-gray-900 dark:text-white font-medium">{patient.nextAppointment || '无'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200">
                    <Phone className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors duration-200">
                    <Mail className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleViewDetails(patient)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>查看详情</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredPatients.length === 0 && (
        <div className="text-center py-12">
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl inline-block mb-4">
            <Users className="w-12 h-12 text-gray-400 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            暂无患者记录
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            没有找到符合条件的患者
          </p>
        </div>
      )}

      {/* 患者详情模态框 */}
      {showDetailModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-3xl border border-white/20 dark:border-gray-700/50">
            <div className="p-8 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-50/80 to-purple-50/80 dark:from-blue-900/20 dark:to-purple-900/20">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  患者详情 - {selectedPatient.name}
                </h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">基本信息</h3>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl">
                      <label className="block text-sm font-bold text-blue-700 dark:text-blue-300 mb-2">患者ID</label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedPatient.id}</p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl">
                      <label className="block text-sm font-bold text-purple-700 dark:text-purple-300 mb-2">姓名</label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedPatient.name}</p>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl">
                      <label className="block text-sm font-bold text-green-700 dark:text-green-300 mb-2">年龄</label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedPatient.age}岁</p>
                    </div>
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 p-4 rounded-xl">
                      <label className="block text-sm font-bold text-orange-700 dark:text-orange-300 mb-2">性别</label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedPatient.gender === 'male' ? '男' : '女'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-6">联系信息</h3>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-xl">
                      <label className="block text-sm font-bold text-blue-700 dark:text-blue-300 mb-2">电话</label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedPatient.phone}</p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 p-4 rounded-xl">
                      <label className="block text-sm font-bold text-purple-700 dark:text-purple-300 mb-2">邮箱</label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedPatient.email}</p>
                    </div>
                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700 dark:to-slate-700 p-4 rounded-xl">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">状态</label>
                      <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold shadow-lg ${getStatusColor(selectedPatient.status)}`}>
                        {getStatusLabel(selectedPatient.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 医疗信息 */}
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-6">医疗信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-red-700 dark:text-red-300 mb-3">主要病情</label>
                    <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl p-4 shadow-lg">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedPatient.condition}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-green-700 dark:text-green-300 mb-3">病历数量</label>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 shadow-lg">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedPatient.recordsCount} 条记录</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">最后就诊</label>
                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700 dark:to-slate-700 rounded-xl p-4 shadow-lg">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedPatient.lastVisit}</p>
                    </div>
                  </div>
                  {selectedPatient.nextAppointment && (
                    <div>
                      <label className="block text-sm font-bold text-yellow-700 dark:text-yellow-300 mb-3">下次预约</label>
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-4 shadow-lg">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedPatient.nextAppointment}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 快速操作 */}
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">快速操作</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <button
                    onClick={() => handleViewMedicalRecords(selectedPatient.id)}
                    className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl group"
                  >
                    <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">查看病历</span>
                  </button>
                  <button
                    onClick={() => handleAppointmentManagement(selectedPatient.id)}
                    className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl group"
                  >
                    <Calendar className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">预约管理</span>
                  </button>
                  <button
                    onClick={() => handleContactPatient(selectedPatient)}
                    className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl hover:from-purple-100 hover:to-violet-100 dark:hover:from-purple-900/30 dark:hover:to-violet-900/30 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl group"
                  >
                    <Phone className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">联系患者</span>
                  </button>
                  <button
                    onClick={() => handleSendEmail(selectedPatient)}
                    className="p-6 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-2xl hover:from-orange-100 hover:to-yellow-100 dark:hover:from-orange-900/30 dark:hover:to-yellow-900/30 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl group"
                  >
                    <Mail className="w-8 h-8 text-orange-600 dark:text-orange-400 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">发送邮件</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50/80 to-gray-100/60 dark:from-gray-700/80 dark:to-gray-800/60 flex justify-end space-x-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-semibold hover:scale-105"
              >
                关闭
              </button>
              <button className="px-6 py-3 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 text-white rounded-xl transition-all duration-300 font-bold shadow-xl hover:shadow-2xl hover:scale-105">
                编辑患者信息
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default PatientManagementContent;
