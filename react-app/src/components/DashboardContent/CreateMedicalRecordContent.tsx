import {
  Save,
  Upload,
  FileText,
  User,
  Calendar,
  Stethoscope,
  AlertCircle,
  CheckCircle,
  X,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import React, { useState } from 'react';
import { useMedicalRecord, MedicalRecord } from '../../contexts/MedicalRecordContext';

interface MedicalRecordForm {
  patientId: string;
  patientName: string;
  recordType: string;
  department: string;
  chiefComplaint: string;
  presentIllness: string;
  pastHistory: string;
  physicalExam: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  attachments: File[];
}

const CreateMedicalRecordContent: React.FC = () => {
  const { addMedicalRecord } = useMedicalRecord();
  const [form, setForm] = useState<MedicalRecordForm>({
    patientId: '',
    patientName: '',
    recordType: '诊断报告',
    department: '内科',
    chiefComplaint: '',
    presentIllness: '',
    pastHistory: '',
    physicalExam: '',
    diagnosis: '',
    treatment: '',
    notes: '',
    attachments: [],
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [currentStep, setCurrentStep] = useState(1);

  const handleInputChange = (field: keyof MedicalRecordForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;

    setUploading(true);
    const newFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newFiles.push(file);
      
      // 模拟上传进度
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      
      // 模拟上传过程
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
      }
    }

    setForm(prev => ({ ...prev, attachments: [...prev.attachments, ...newFiles] }));
    setUploading(false);
  };

  const removeAttachment = (index: number) => {
    setForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // 模拟保存过程
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 创建新的医疗记录
      const newRecord: MedicalRecord = {
        id: `MR${Date.now()}`,
        patientId: form.patientId,
        patientName: form.patientName,
        patientAge: 0, // 可以从患者信息中获取
        recordType: form.recordType,
        department: form.department,
        chiefComplaint: form.chiefComplaint,
        presentIllness: form.presentIllness,
        pastHistory: form.pastHistory,
        physicalExam: form.physicalExam,
        diagnosis: form.diagnosis,
        treatment: form.treatment,
        notes: form.notes,
        attachments: [], // 将在文件上传时更新
        createdAt: new Date().toISOString().split('T')[0],
        status: 'active',
        doctorName: '当前医生', // 可以从用户上下文中获取
      };

      // 保存到全局状态
      addMedicalRecord(newRecord);

      console.log('Saving medical record:', newRecord);

      alert('病历保存成功！');

      // 重置表单
      setForm({
        patientId: '',
        patientName: '',
        recordType: '诊断报告',
        department: '内科',
        chiefComplaint: '',
        presentIllness: '',
        pastHistory: '',
        physicalExam: '',
        diagnosis: '',
        treatment: '',
        notes: '',
        attachments: [],
      });
      setCurrentStep(1);
    } catch (error) {
      console.error('Failed to save medical record:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = () => {
    return form.patientId && form.patientName && form.chiefComplaint && form.diagnosis;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-blue-900 p-6 lg:p-8">
      {/* ByteDance/Google 风格背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-blue-500/8 via-indigo-500/8 to-cyan-500/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-br from-emerald-500/8 to-teal-500/8 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-gradient-to-br from-orange-500/6 to-amber-500/6 rounded-full blur-3xl animate-pulse delay-1400"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]"></div>
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* 现代化页面标题 - Google 风格 */}
        <div className="text-center py-12 mb-8">
          <div className="group inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 rounded-3xl mb-6 shadow-2xl hover:shadow-emerald-500/25 transition-all duration-500 hover:scale-110">
            <FileText className="w-10 h-10 text-white group-hover:rotate-12 transition-transform duration-300" />
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-gray-900 via-emerald-800 to-teal-900 dark:from-white dark:via-emerald-300 dark:to-teal-300 bg-clip-text text-transparent">
                创建医疗记录
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              为患者创建<span className="font-semibold text-emerald-600 dark:text-emerald-400">专业详细</span>的医疗记录，确保信息
              <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent font-semibold"> 准确完整</span>
            </p>
          </div>
          
          {/* 字节跳动风格进度指示器 */}
          <div className="flex items-center justify-center mt-8 space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold transition-all duration-300 ${
                  currentStep >= step
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg scale-110'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-1 mx-2 rounded-full transition-all duration-300 ${
                    currentStep > step ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              步骤 {currentStep}/3: {currentStep === 1 ? '基本信息' : currentStep === 2 ? '医疗详情' : '文件上传'}
            </p>
          </div>
        </div>

        {/* Google Material Design 3 多步骤表单 */}
        <div className="space-y-8">
          {/* 步骤1: 基本信息 */}
          {currentStep === 1 && (
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 dark:border-gray-700/40 p-8 lg:p-10 hover:shadow-3xl transition-all duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                {/* 患者基本信息 */}
                <div className="space-y-8">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        患者基本信息
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">填写患者的基础资料</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        患者姓名 *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.patientName}
                          onChange={(e) => handleInputChange('patientName', e.target.value)}
                          className="w-full px-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white text-lg placeholder-gray-500 dark:placeholder-gray-400 shadow-inner group-hover:shadow-lg"
                          placeholder="输入患者完整姓名"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    </div>
                    
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        患者ID *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.patientId}
                          onChange={(e) => handleInputChange('patientId', e.target.value)}
                          className="w-full px-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white text-lg placeholder-gray-500 dark:placeholder-gray-400 shadow-inner group-hover:shadow-lg"
                          placeholder="输入患者唯一标识ID"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 科室和记录类型 */}
                <div className="space-y-8">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                      <Stethoscope className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        科室信息
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">选择科室和记录类型</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        科室 *
                      </label>
                      <div className="relative">
                        <select
                          value={form.department}
                          onChange={(e) => handleInputChange('department', e.target.value)}
                          className="w-full px-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white text-lg cursor-pointer shadow-inner group-hover:shadow-lg appearance-none"
                        >
                          <option value="">🏥 请选择科室</option>
                          <option value="内科">🫀 内科</option>
                          <option value="外科">🔪 外科</option>
                          <option value="儿科">👶 儿科</option>
                          <option value="妇产科">👩 妇产科</option>
                          <option value="骨科">🦴 骨科</option>
                          <option value="神经科">🧠 神经科</option>
                          <option value="心血管科">❤️ 心血管科</option>
                          <option value="呼吸科">🫁 呼吸科</option>
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        记录类型 *
                      </label>
                      <div className="relative">
                        <select
                          value={form.recordType}
                          onChange={(e) => handleInputChange('recordType', e.target.value)}
                          className="w-full px-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white text-lg cursor-pointer shadow-inner group-hover:shadow-lg appearance-none"
                        >
                          <option value="">📋 请选择记录类型</option>
                          <option value="门诊记录">🏥 门诊记录</option>
                          <option value="住院记录">🛏️ 住院记录</option>
                          <option value="急诊记录">🚨 急诊记录</option>
                          <option value="手术记录">⚕️ 手术记录</option>
                          <option value="检查报告">🔬 检查报告</option>
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 步骤导航 */}
              <div className="flex justify-between items-center mt-10 pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  步骤 1 / 3
                </div>
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!form.patientName || !form.patientId || !form.department || !form.recordType}
                  className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 hover:scale-105 disabled:scale-100 disabled:shadow-none"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center space-x-2">
                    <span>下一步</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 步骤2: 医疗详情 */}
          {currentStep === 2 && (
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 dark:border-gray-700/40 p-8 lg:p-10 hover:shadow-3xl transition-all duration-500">
              <div className="flex items-center space-x-4 mb-8">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    医疗详细信息
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">填写详细的医疗记录信息</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      主诉 *
                    </label>
                    <textarea
                      value={form.chiefComplaint}
                      onChange={(e) => handleInputChange('chiefComplaint', e.target.value)}
                      rows={4}
                      className="w-full px-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white text-lg placeholder-gray-500 dark:placeholder-gray-400 shadow-inner group-hover:shadow-lg resize-none"
                      placeholder="请详细描述患者的主要症状和不适..."
                    />
                  </div>
                  
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      现病史
                    </label>
                    <textarea
                      value={form.presentIllness}
                      onChange={(e) => handleInputChange('presentIllness', e.target.value)}
                      rows={4}
                      className="w-full px-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white text-lg placeholder-gray-500 dark:placeholder-gray-400 shadow-inner group-hover:shadow-lg resize-none"
                      placeholder="描述患者当前疾病的发生、发展过程..."
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      既往史
                    </label>
                    <textarea
                      value={form.pastHistory}
                      onChange={(e) => handleInputChange('pastHistory', e.target.value)}
                      rows={4}
                      className="w-full px-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white text-lg placeholder-gray-500 dark:placeholder-gray-400 shadow-inner group-hover:shadow-lg resize-none"
                      placeholder="患者以往的疾病史、手术史、过敏史等..."
                    />
                  </div>
                  
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      体格检查
                    </label>
                    <textarea
                      value={form.physicalExam}
                      onChange={(e) => handleInputChange('physicalExam', e.target.value)}
                      rows={4}
                      className="w-full px-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white text-lg placeholder-gray-500 dark:placeholder-gray-400 shadow-inner group-hover:shadow-lg resize-none"
                      placeholder="记录体格检查的详细结果..."
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-6">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    诊断结果 *
                  </label>
                  <textarea
                    value={form.diagnosis}
                    onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                    rows={3}
                    className="w-full px-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white text-lg placeholder-gray-500 dark:placeholder-gray-400 shadow-inner group-hover:shadow-lg resize-none"
                    placeholder="基于检查结果给出明确的诊断..."
                  />
                </div>
                
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    治疗方案
                  </label>
                  <textarea
                    value={form.treatment}
                    onChange={(e) => handleInputChange('treatment', e.target.value)}
                    rows={3}
                    className="w-full px-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white text-lg placeholder-gray-500 dark:placeholder-gray-400 shadow-inner group-hover:shadow-lg resize-none"
                    placeholder="详细的治疗计划和建议..."
                  />
                </div>
                
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    备注
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white text-lg placeholder-gray-500 dark:placeholder-gray-400 shadow-inner group-hover:shadow-lg resize-none"
                    placeholder="其他需要记录的相关信息..."
                  />
                </div>
              </div>

              {/* 步骤导航 */}
              <div className="flex justify-between items-center mt-10 pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="group relative overflow-hidden bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <div className="relative flex items-center space-x-2">
                    <ArrowLeft className="w-5 h-5" />
                    <span>上一步</span>
                  </div>
                </button>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  步骤 2 / 3
                </div>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!form.chiefComplaint || !form.diagnosis}
                  className="group relative overflow-hidden bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-orange-500/25 hover:scale-105 disabled:scale-100 disabled:shadow-none"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center space-x-2">
                    <span>下一步</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 步骤3: 文件上传和保存 */}
          {currentStep === 3 && (
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 dark:border-gray-700/40 p-8 lg:p-10 hover:shadow-3xl transition-all duration-500">
              <div className="flex items-center space-x-4 mb-8">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    文件上传和确认
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">上传相关医疗文档并确认保存</p>
                </div>
              </div>

              {/* 文件上传区域 */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center hover:border-green-500 dark:hover:border-green-400 transition-all duration-300 group mb-8">
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl inline-block group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-12 h-12 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">上传医疗文档</h4>
                    <p className="text-gray-600 dark:text-gray-400">拖拽文件到此处，或点击选择文件</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">支持 PDF, DOC, JPG, PNG 格式，最大 10MB</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    <Upload className="w-5 h-5" />
                    <span>选择文件</span>
                  </label>
                </div>
              </div>

              {/* 已上传文件列表 */}
              {form.attachments.length > 0 && (
                <div className="mb-8 space-y-3">
                  <h5 className="font-semibold text-gray-900 dark:text-white">已上传文件:</h5>
                  {form.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</span>
                      </div>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 最终确认和保存 */}
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl mb-8">
                <div className="flex items-center space-x-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white">记录摘要</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">患者:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{form.patientName || '未填写'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">科室:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{form.department || '未选择'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">记录类型:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{form.recordType || '未选择'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">附件数量:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{form.attachments.length} 个文件</span>
                  </div>
                </div>
              </div>

              {/* 步骤导航和保存 */}
              <div className="flex justify-between items-center pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="group relative overflow-hidden bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <div className="relative flex items-center space-x-2">
                    <ArrowLeft className="w-5 h-5" />
                    <span>上一步</span>
                  </div>
                </button>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  步骤 3 / 3
                </div>
                <button
                  onClick={handleSave}
                  disabled={!isFormValid() || saving}
                  className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-10 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-green-500/25 hover:scale-105 disabled:scale-100 disabled:shadow-none"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center space-x-3">
                    {saving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>保存中...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>保存记录</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateMedicalRecordContent;