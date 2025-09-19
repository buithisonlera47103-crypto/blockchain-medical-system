import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Pill,
  User,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Save,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { useMedicalRecord } from '../../contexts/MedicalRecordContext';
import type { Prescription as PrescriptionType, Medication as MedicationType } from '../../contexts/MedicalRecordContext';

interface Medication {
  id: string;
  name: string;
  specification: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  unit: string;
  instructions: string;
}

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  diagnosis: string;
  medications: Medication[];
  createdAt: string;
  status: 'draft' | 'issued' | 'dispensed' | 'completed';
  doctorName: string;
  notes: string;
}

const DoctorPrescriptionContent: React.FC = () => {
  const { prescriptions, addPrescription, updatePrescription, deletePrescription } = useMedicalRecord();
  const [localPrescriptions, setLocalPrescriptions] = useState<Prescription[]>([
    {
      id: 'RX001',
      patientId: 'P001234',
      patientName: '张三',
      patientAge: 45,
      diagnosis: '高血压',
      medications: [
        {
          id: 'M001',
          name: '氨氯地平片',
          specification: '5mg',
          dosage: '1片',
          frequency: '每日1次',
          duration: '30天',
          quantity: 30,
          unit: '片',
          instructions: '晨起空腹服用',
        },
      ],
      createdAt: '2024-01-15',
      status: 'issued',
      doctorName: '李医生',
      notes: '定期监测血压',
    },
    {
      id: 'RX002',
      patientId: 'P001235',
      patientName: '李四',
      patientAge: 38,
      diagnosis: '感冒',
      medications: [
        {
          id: 'M002',
          name: '阿莫西林胶囊',
          specification: '0.25g',
          dosage: '2粒',
          frequency: '每日3次',
          duration: '7天',
          quantity: 42,
          unit: '粒',
          instructions: '饭后服用',
        },
        {
          id: 'M003',
          name: '布洛芬片',
          specification: '0.2g',
          dosage: '1片',
          frequency: '每日2次',
          duration: '3天',
          quantity: 6,
          unit: '片',
          instructions: '发热时服用',
        },
      ],
      createdAt: '2024-01-14',
      status: 'dispensed',
      doctorName: '李医生',
      notes: '多饮水，注意休息',
    },
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newPrescription, setNewPrescription] = useState<Partial<Prescription>>({
    patientId: '',
    patientName: '',
    patientAge: 0,
    diagnosis: '',
    medications: [],
    notes: '',
    status: 'draft',
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'issued':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'dispensed':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="w-4 h-4" />;
      case 'issued':
        return <CheckCircle className="w-4 h-4" />;
      case 'dispensed':
        return <Pill className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return '草稿';
      case 'issued':
        return '已开具';
      case 'dispensed':
        return '已配药';
      case 'completed':
        return '已完成';
      default:
        return '未知';
    }
  };

  // 合并本地和全局处方数据
  const allPrescriptions = [...prescriptions, ...localPrescriptions];

  const filteredPrescriptions = allPrescriptions.filter(prescription => {
    const matchesSearch = 
      prescription.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.diagnosis.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || prescription.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const addMedication = () => {
    const newMedication: Medication = {
      id: `M${Date.now()}`,
      name: '',
      specification: '',
      dosage: '',
      frequency: '',
      duration: '',
      quantity: 0,
      unit: '',
      instructions: '',
    };
    
    setNewPrescription(prev => ({
      ...prev,
      medications: [...(prev.medications || []), newMedication],
    }));
  };

  const removeMedication = (medicationId: string) => {
    setNewPrescription(prev => ({
      ...prev,
      medications: prev.medications?.filter(med => med.id !== medicationId) || [],
    }));
  };

  const updateMedication = (medicationId: string, field: keyof Medication, value: string | number) => {
    setNewPrescription(prev => ({
      ...prev,
      medications: prev.medications?.map(med => 
        med.id === medicationId ? { ...med, [field]: value } : med
      ) || [],
    }));
  };

  const savePrescription = () => {
    if (!newPrescription.patientId || !newPrescription.patientName || !newPrescription.diagnosis) {
      alert('请填写必填信息');
      return;
    }

    const prescription: Prescription = {
      id: `RX${Date.now()}`,
      patientId: newPrescription.patientId!,
      patientName: newPrescription.patientName!,
      patientAge: newPrescription.patientAge || 0,
      diagnosis: newPrescription.diagnosis!,
      medications: newPrescription.medications || [],
      createdAt: new Date().toISOString().split('T')[0],
      status: 'draft',
      doctorName: '当前医生',
      notes: newPrescription.notes || '',
    };

    // 保存到全局状态
    addPrescription(prescription);
    setNewPrescription({
      patientId: '',
      patientName: '',
      patientAge: 0,
      diagnosis: '',
      medications: [],
      notes: '',
      status: 'draft',
    });
    setShowCreateForm(false);
    alert('处方保存成功！');
  };

  const handleViewDetails = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowDetailModal(true);
  };

  const handleEditPrescription = (prescription: Prescription) => {
    setEditingPrescription(prescription);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (editingPrescription) {
      updatePrescription(editingPrescription.id, editingPrescription);
      setShowEditModal(false);
      setEditingPrescription(null);
      alert('处方更新成功！');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-blue-900 p-6 lg:p-8">
      {/* Material Design 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-blue-500/8 via-indigo-500/8 to-purple-500/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-br from-emerald-500/8 to-teal-500/8 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-gradient-to-br from-violet-500/6 to-purple-500/6 rounded-full blur-3xl animate-pulse delay-1400"></div>
      </div>

      <div className="relative space-y-8">
        {/* 现代化页面标题 - Google/Apple 风格 */}
        <div className="text-center py-12">
          <div className="group inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-3xl mb-6 shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 hover:scale-110">
            <Pill className="w-10 h-10 text-white group-hover:rotate-12 transition-transform duration-300" />
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-gray-900 via-purple-800 to-indigo-900 dark:from-white dark:via-purple-300 dark:to-indigo-300 bg-clip-text text-transparent">
                处方管理
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              <span className="font-semibold text-purple-600 dark:text-purple-400">智能开具</span>、精准管理和
              <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent font-semibold"> 实时跟踪</span> 患者处方
            </p>
          </div>
          <div className="mt-8">
            <button
              onClick={() => setShowCreateForm(true)}
              className="group relative overflow-hidden bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-3xl transition-all duration-500 shadow-2xl hover:shadow-3xl hover:shadow-purple-500/25 hover:scale-105 transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-3">
                <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                <span className="text-lg">新建处方</span>
                <div className="w-2 h-2 bg-white rounded-full group-hover:scale-125 transition-transform duration-300"></div>
              </div>
            </button>
          </div>
        </div>

        {/* Google Material Design 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 mb-12">
          <div className="group relative overflow-hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-blue-500/10 border border-white/40 dark:border-gray-700/40 hover:shadow-3xl hover:shadow-blue-500/20 hover:scale-[1.02] transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-blue-500/30 transition-all duration-300">
                    <Pill className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-transparent rounded-full"></div>
                </div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 tracking-wide uppercase">总处方数</p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-4xl font-bold bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 bg-clip-text text-transparent">
                    {allPrescriptions.length}
                  </p>
                  <span className="text-lg text-gray-400 dark:text-gray-500">张</span>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-indigo-500/10 border border-white/40 dark:border-gray-700/40 hover:shadow-3xl hover:shadow-indigo-500/20 hover:scale-[1.02] transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-xl group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-indigo-500/30 transition-all duration-300">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-transparent rounded-full"></div>
                </div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 tracking-wide uppercase">已开具</p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-4xl font-bold bg-gradient-to-br from-indigo-600 via-blue-700 to-cyan-700 bg-clip-text text-transparent">
                    {allPrescriptions.filter(p => p.status === 'issued').length}
                  </p>
                  <span className="text-lg text-gray-400 dark:text-gray-500">张</span>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-amber-500/10 border border-white/40 dark:border-gray-700/40 hover:shadow-3xl hover:shadow-amber-500/20 hover:scale-[1.02] transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-xl group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-amber-500/30 transition-all duration-300">
                    <Pill className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-1 h-8 bg-gradient-to-b from-amber-500 to-transparent rounded-full"></div>
                </div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 tracking-wide uppercase">已配药</p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-4xl font-bold bg-gradient-to-br from-amber-600 via-orange-700 to-red-600 bg-clip-text text-transparent">
                    {allPrescriptions.filter(p => p.status === 'dispensed').length}
                  </p>
                  <span className="text-lg text-gray-400 dark:text-gray-500">张</span>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-emerald-500/10 border border-white/40 dark:border-gray-700/40 hover:shadow-3xl hover:shadow-emerald-500/20 hover:scale-[1.02] transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-xl group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-emerald-500/30 transition-all duration-300">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-1 h-8 bg-gradient-to-b from-emerald-500 to-transparent rounded-full"></div>
                </div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 tracking-wide uppercase">已完成</p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-4xl font-bold bg-gradient-to-br from-emerald-600 via-green-700 to-teal-700 bg-clip-text text-transparent">
                    {allPrescriptions.filter(p => p.status === 'completed').length}
                  </p>
                  <span className="text-lg text-gray-400 dark:text-gray-500">张</span>
                </div>
              </div>
            </div>
          </div>
      </div>

        {/* 搜索和筛选 - Apple风格简洁设计 */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/40 dark:border-gray-700/40 hover:shadow-3xl transition-all duration-300">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="w-6 h-6 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                </div>
                <input
                  type="text"
                  placeholder="🔍 智能搜索患者姓名、ID或诊断..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white text-lg placeholder-gray-500 dark:placeholder-gray-400 shadow-inner"
                />
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>
            <div className="lg:w-64">
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Filter className="w-6 h-6 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-300" />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-14 pr-10 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white text-lg appearance-none cursor-pointer shadow-inner"
                >
                  <option value="all">🔄 所有状态</option>
                  <option value="draft">✏️ 草稿</option>
                  <option value="issued">✅ 已开具</option>
                  <option value="dispensed">💊 已配药</option>
                  <option value="completed">🎉 已完成</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 处方列表 - Microsoft Fluent Design 风格 */}
        <div className="space-y-6">
          {filteredPrescriptions.length === 0 ? (
            <div className="group bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl p-16 shadow-2xl border border-white/40 dark:border-gray-700/40 text-center hover:shadow-3xl transition-all duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-indigo-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="p-6 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-3xl mb-6 inline-block group-hover:scale-110 transition-transform duration-300">
                    <Pill className="w-20 h-20 text-purple-500 dark:text-purple-400" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    暂无处方记录
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                    点击"新建处方"开始为患者<span className="font-semibold text-purple-600 dark:text-purple-400">开具专业处方</span>
                  </p>
                  <div className="mt-8">
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="group inline-flex items-center space-x-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25"
                    >
                      <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                      <span>立即创建</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            filteredPrescriptions.map((prescription) => (
            <div
              key={prescription.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {prescription.patientName}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({prescription.patientId})
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {prescription.patientAge}岁
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{prescription.createdAt}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{prescription.doctorName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(prescription.status)}`}>
                    {getStatusIcon(prescription.status)}
                    <span>{getStatusText(prescription.status)}</span>
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewDetails(prescription)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditPrescription(prescription)}
                      className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                      title="编辑处方"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deletePrescription(prescription.id)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="删除处方"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">诊断</p>
                <p className="font-medium text-gray-900 dark:text-white">{prescription.diagnosis}</p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">药物清单:</p>
                {prescription.medications.map((medication) => (
                  <div key={medication.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">药物名称</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {medication.name} ({medication.specification})
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">用法用量</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {medication.dosage} {medication.frequency}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">疗程/数量</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {medication.duration} / {medication.quantity}{medication.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">用药说明</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {medication.instructions}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {prescription.notes && (
                <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">医嘱</p>
                  <p className="text-gray-900 dark:text-white">{prescription.notes}</p>
                </div>
              )}
            </div>
            ))
          )}
        </div>

      {/* 新建处方模态框 */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">新建处方</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 患者信息 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    患者ID *
                  </label>
                  <input
                    type="text"
                    value={newPrescription.patientId || ''}
                    onChange={(e) => setNewPrescription(prev => ({ ...prev, patientId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="输入患者ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    患者姓名 *
                  </label>
                  <input
                    type="text"
                    value={newPrescription.patientName || ''}
                    onChange={(e) => setNewPrescription(prev => ({ ...prev, patientName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="输入患者姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    年龄
                  </label>
                  <input
                    type="number"
                    value={newPrescription.patientAge || ''}
                    onChange={(e) => setNewPrescription(prev => ({ ...prev, patientAge: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="输入年龄"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  诊断 *
                </label>
                <input
                  type="text"
                  value={newPrescription.diagnosis || ''}
                  onChange={(e) => setNewPrescription(prev => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="输入诊断结果"
                />
              </div>

              {/* 药物列表 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">药物清单</h3>
                  <button
                    onClick={addMedication}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>添加药物</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {(newPrescription.medications || []).map((medication, index) => (
                    <div key={medication.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white">药物 {index + 1}</h4>
                        <button
                          onClick={() => removeMedication(medication.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            药物名称
                          </label>
                          <input
                            type="text"
                            value={medication.name}
                            onChange={(e) => updateMedication(medication.id, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            placeholder="药物名称"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            规格
                          </label>
                          <input
                            type="text"
                            value={medication.specification}
                            onChange={(e) => updateMedication(medication.id, 'specification', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            placeholder="如: 5mg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            用法用量
                          </label>
                          <input
                            type="text"
                            value={medication.dosage}
                            onChange={(e) => updateMedication(medication.id, 'dosage', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            placeholder="如: 1片"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            频次
                          </label>
                          <input
                            type="text"
                            value={medication.frequency}
                            onChange={(e) => updateMedication(medication.id, 'frequency', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            placeholder="如: 每日3次"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            疗程
                          </label>
                          <input
                            type="text"
                            value={medication.duration}
                            onChange={(e) => updateMedication(medication.id, 'duration', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            placeholder="如: 7天"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            数量
                          </label>
                          <input
                            type="number"
                            value={medication.quantity}
                            onChange={(e) => updateMedication(medication.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            placeholder="数量"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            单位
                          </label>
                          <input
                            type="text"
                            value={medication.unit}
                            onChange={(e) => updateMedication(medication.id, 'unit', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            placeholder="如: 片"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            用药说明
                          </label>
                          <input
                            type="text"
                            value={medication.instructions}
                            onChange={(e) => updateMedication(medication.id, 'instructions', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            placeholder="如: 饭后服用"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {(newPrescription.medications || []).length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Pill className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>暂无药物，点击"添加药物"开始添加</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  医嘱
                </label>
                <textarea
                  value={newPrescription.notes || ''}
                  onChange={(e) => setNewPrescription(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="输入医嘱和注意事项..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={savePrescription}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>保存处方</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default DoctorPrescriptionContent;
