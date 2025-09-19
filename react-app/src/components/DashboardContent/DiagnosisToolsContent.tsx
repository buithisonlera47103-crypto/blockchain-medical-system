import {
  Stethoscope,
  Brain,
  Heart,
  Activity,
  Eye,
  Search,
  Cpu,
  Zap,
  Shield,
  Database,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Camera,
  Mic,
  Upload,
  Download,
  Star,
  Target,
  Layers,
  Sparkles,
  Bot,
  ScanLine,
  Microscope,
  Thermometer,
  Pill,
  X,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface DiagnosticTool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'ai' | 'imaging' | 'lab' | 'vital' | 'specialty';
  accuracy: number;
  processingTime: number;
  color: string;
  isAvailable: boolean;
  requiresBlockchain?: boolean;
}

interface PatientData {
  symptoms: string[];
  vitalSigns: {
    bloodPressure: string;
    heartRate: number;
    temperature: number;
    respiratoryRate: number;
    oxygenSaturation: number;
  };
  labResults: any[];
  medicalHistory: string[];
  currentMedications: string[];
  images: any[];
}

interface DiagnosisResult {
  id: string;
  condition: string;
  probability: number;
  confidence: 'high' | 'medium' | 'low';
  description: string;
  recommendedTests: string[];
  treatment: string[];
  urgency: 'emergency' | 'urgent' | 'routine';
  aiModel: string;
  blockchainVerified?: boolean;
}

const DiagnosisToolsContent: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<DiagnosticTool | null>(null);
  const [patientData, setPatientData] = useState<PatientData>({
    symptoms: [],
    vitalSigns: {
      bloodPressure: '120/80',
      heartRate: 72,
      temperature: 36.5,
      respiratoryRate: 16,
      oxygenSaturation: 98,
    },
    labResults: [],
    medicalHistory: [],
    currentMedications: [],
    images: [],
  });
  const [diagnosisResults, setDiagnosisResults] = useState<DiagnosisResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'tools' | 'results' | 'history'>('tools');

  // AI诊断工具数据
  const diagnosticTools: DiagnosticTool[] = [
    {
      id: 'ai-symptom-analyzer',
      name: 'AI症状分析器',
      description: '基于深度学习的症状分析，支持多模态数据输入',
      icon: <Bot className="w-6 h-6" />,
      category: 'ai',
      accuracy: 94.2,
      processingTime: 2.3,
      color: 'from-blue-500 to-cyan-600',
      isAvailable: true,
      requiresBlockchain: true,
    },
    {
      id: 'cardiac-ai',
      name: '智能心脏诊断',
      description: '心电图AI分析，心律失常自动识别',
      icon: <Heart className="w-6 h-6" />,
      category: 'specialty',
      accuracy: 97.8,
      processingTime: 1.8,
      color: 'from-red-500 to-pink-600',
      isAvailable: true,
      requiresBlockchain: true,
    },
    {
      id: 'medical-imaging-ai',
      name: '医学影像AI',
      description: 'CT、MRI、X光片智能分析与病灶识别',
      icon: <ScanLine className="w-6 h-6" />,
      category: 'imaging',
      accuracy: 96.5,
      processingTime: 5.2,
      color: 'from-purple-500 to-indigo-600',
      isAvailable: true,
      requiresBlockchain: true,
    },
    {
      id: 'lab-analyzer',
      name: '实验室数据分析',
      description: '血液、尿液等检验结果的AI解读',
      icon: <Microscope className="w-6 h-6" />,
      category: 'lab',
      accuracy: 92.1,
      processingTime: 1.5,
      color: 'from-green-500 to-emerald-600',
      isAvailable: true,
    },
    {
      id: 'drug-interaction',
      name: '药物相互作用检查',
      description: '基于区块链的药物安全性评估',
      icon: <Pill className="w-6 h-6" />,
      category: 'specialty',
      accuracy: 99.1,
      processingTime: 0.8,
      color: 'from-orange-500 to-red-600',
      isAvailable: true,
      requiresBlockchain: true,
    },
    {
      id: 'vital-monitor',
      name: '生命体征监测',
      description: '实时生命体征数据分析和预警系统',
      icon: <Activity className="w-6 h-6" />,
      category: 'vital',
      accuracy: 98.3,
      processingTime: 0.5,
      color: 'from-teal-500 to-cyan-600',
      isAvailable: true,
    },
  ];

  // 模拟AI诊断过程
  const performDiagnosis = async (tool: DiagnosticTool) => {
    setIsProcessing(true);
    setSelectedTool(tool);

    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, tool.processingTime * 1000));

    // 生成模拟诊断结果
    const mockResults: DiagnosisResult[] = [
      {
        id: '1',
        condition: '高血压',
        probability: 87.3,
        confidence: 'high',
        description: '基于症状和生命体征分析，患者可能患有原发性高血压',
        recommendedTests: ['24小时血压监测', '心电图', '血脂检查'],
        treatment: ['生活方式调整', 'ACE抑制剂', '定期监测'],
        urgency: 'routine',
        aiModel: 'MedicalAI-v3.2',
        blockchainVerified: tool.requiresBlockchain,
      },
      {
        id: '2',
        condition: '糖尿病前期',
        probability: 72.1,
        confidence: 'medium',
        description: '血糖水平轻度升高，建议进一步检查确诊',
        recommendedTests: ['糖化血红蛋白', '口服葡萄糖耐量试验'],
        treatment: ['饮食控制', '运动治疗', '体重管理'],
        urgency: 'routine',
        aiModel: 'DiabetesAI-v2.1',
        blockchainVerified: false,
      },
      {
        id: '3',
        condition: '焦虑症',
        probability: 64.8,
        confidence: 'medium',
        description: '心理症状评估显示轻度焦虑倾向',
        recommendedTests: ['心理量表评估', '甲状腺功能检查'],
        treatment: ['认知行为治疗', '放松训练', '必要时药物治疗'],
        urgency: 'routine',
        aiModel: 'MentalHealthAI-v1.8',
      },
    ];

    setDiagnosisResults(mockResults);
    setIsProcessing(false);
    setActiveTab('results');
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'urgent':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'routine':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-600 dark:text-green-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };
    
    return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-blue-900 p-6 lg:p-8">
      {/* AI科技风格背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-br from-green-500/8 to-emerald-500/8 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-gradient-to-br from-orange-500/6 to-pink-500/6 rounded-full blur-3xl animate-pulse delay-1400"></div>
        {/* AI网格效果 */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]"></div>
        {/* 数据流动线条 */}
        <div className="absolute top-1/4 left-1/4 w-1 h-20 bg-gradient-to-b from-cyan-500/30 to-transparent animate-pulse delay-500"></div>
        <div className="absolute top-3/4 right-1/3 w-1 h-16 bg-gradient-to-b from-blue-500/30 to-transparent animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-8xl mx-auto">
        {/* 现代化标题区域 */}
        <div className="text-center py-12 mb-8">
          <div className="group inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-700 rounded-3xl mb-6 shadow-2xl hover:shadow-blue-500/25 transition-all duration-500 hover:scale-110 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-3xl animate-pulse"></div>
            <Brain className="w-12 h-12 text-white group-hover:rotate-12 transition-transform duration-300 relative z-10" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white animate-pulse" />
          </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-blue-700 via-indigo-800 to-cyan-900 dark:from-blue-300 dark:via-indigo-400 dark:to-cyan-300 bg-clip-text text-transparent">
                AI智能诊断中心
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              融合<span className="font-semibold text-blue-600 dark:text-blue-400">深度学习</span>与区块链技术的智能诊断系统，
              <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent font-semibold"> 精准高效</span>
            </p>
          </div>

          {/* AI状态指示器 */}
          <div className="flex items-center justify-center mt-8 space-x-6 flex-wrap gap-4">
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-blue-500 animate-pulse" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI引擎在线</span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">区块链验证</span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-cyan-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">模型库同步</span>
              </div>
            </div>
          </div>
        </div>

        {/* 标签导航 */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-2 mb-8">
          <div className="flex justify-center space-x-2">
            {[
              { key: 'tools', label: '🤖 诊断工具', icon: Bot },
              { key: 'results', label: '📊 诊断结果', icon: BarChart3 },
              { key: 'history', label: '📚 诊断历史', icon: Clock },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 px-8 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                  activeTab === key
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 诊断工具页面 */}
        {activeTab === 'tools' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {diagnosticTools.map((tool, index) => (
              <div
                key={tool.id}
                className="group bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer relative overflow-hidden"
                onClick={() => performDiagnosis(tool)}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* 工具状态指示 */}
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                  {tool.isAvailable ? (
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  ) : (
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  )}
                  {tool.requiresBlockchain && (
                    <Shield className="w-4 h-4 text-cyan-500" />
                  )}
      </div>

                {/* 悬停光效 */}
                <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-3xl`}></div>
                
                <div className="relative">
                  {/* 工具图标 */}
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${tool.color} rounded-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <div className="text-white">{tool.icon}</div>
      </div>

                  {/* 工具信息 */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {tool.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mt-2">
                        {tool.description}
                      </p>
                    </div>

                    {/* 性能指标 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400">准确率</div>
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {tool.accuracy}%
                        </div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400">处理时间</div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {tool.processingTime}s
                        </div>
                      </div>
                    </div>

                    {/* 分类标签 */}
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        tool.category === 'ai' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        tool.category === 'imaging' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' :
                        tool.category === 'lab' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        tool.category === 'vital' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' :
                        'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        {tool.category === 'ai' ? '人工智能' :
                         tool.category === 'imaging' ? '医学影像' :
                         tool.category === 'lab' ? '实验室' :
                         tool.category === 'vital' ? '生命体征' : '专科工具'}
                      </span>
                      
                      {tool.isAvailable ? (
                        <button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-xl transition-all duration-300 hover:scale-105">
                          开始诊断
                        </button>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">维护中</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 诊断结果页面 */}
        {activeTab === 'results' && (
          <div className="space-y-8">
            {isProcessing ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl animate-spin flex items-center justify-center">
                      <Brain className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-3xl animate-ping opacity-30"></div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      AI正在分析中...
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedTool?.name} 正在处理患者数据，请稍候
                    </p>
                  </div>
                </div>
              </div>
            ) : diagnosisResults.length === 0 ? (
              <div className="text-center py-20">
                <div className="p-8 bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-800 dark:to-blue-900/20 rounded-3xl inline-block mb-6">
                  <BarChart3 className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">暂无诊断结果</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  请先选择诊断工具进行分析
                </p>
              </div>
            ) : (
              diagnosisResults.map((result, index) => (
                <div
                  key={result.id}
                  className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-8 hover:shadow-2xl transition-all duration-300"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 诊断信息 */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {result.condition}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mt-2">
                            {result.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {result.probability}%
                          </div>
                          <div className={`text-sm font-semibold ${getConfidenceColor(result.confidence)}`}>
                            {result.confidence === 'high' ? '高置信度' : 
                             result.confidence === 'medium' ? '中等置信度' : '低置信度'}
                          </div>
                        </div>
                      </div>

                      {/* 推荐检查 */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          推荐检查项目
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {result.recommendedTests.map((test, idx) => (
                            <span
                              key={idx}
                              className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-xl text-sm font-medium"
                            >
                              {test}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 治疗建议 */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          治疗建议
                        </h4>
                        <div className="space-y-2">
                          {result.treatment.map((treatment, idx) => (
                            <div key={idx} className="flex items-center space-x-3">
                              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                              <span className="text-gray-700 dark:text-gray-300">{treatment}</span>
                            </div>
              ))}
            </div>
          </div>
        </div>

                    {/* 状态和验证信息 */}
                    <div className="space-y-6">
                      {/* 紧急程度 */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4">
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                          紧急程度
                        </div>
                        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-semibold ${getUrgencyColor(result.urgency)}`}>
                          {result.urgency === 'emergency' ? <AlertTriangle className="w-4 h-4" /> :
                           result.urgency === 'urgent' ? <Clock className="w-4 h-4" /> :
                           <CheckCircle className="w-4 h-4" />}
                          <span>
                            {result.urgency === 'emergency' ? '紧急' :
                             result.urgency === 'urgent' ? '急需处理' : '常规处理'}
                          </span>
                        </div>
                      </div>

                      {/* AI模型信息 */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                          AI模型
                        </div>
                        <div className="flex items-center space-x-2">
                          <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                            {result.aiModel}
                          </span>
                        </div>
                      </div>

                      {/* 区块链验证 */}
                      {result.blockchainVerified && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4">
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                            区块链验证
                          </div>
                          <div className="flex items-center space-x-2">
                            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                              已验证
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 操作按钮 */}
                      <div className="space-y-3">
                        <button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 rounded-2xl transition-all duration-300 hover:scale-105">
                          生成报告
                        </button>
                        <button className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 rounded-2xl transition-all duration-300 hover:scale-105">
                          保存到病历
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 诊断历史页面 */}
        {activeTab === 'history' && (
          <div className="text-center py-20">
            <div className="p-8 bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-800 dark:to-blue-900/20 rounded-3xl inline-block mb-6">
              <Clock className="w-16 h-16 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">诊断历史</h3>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              这里将显示您的诊断历史记录
            </p>
        </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosisToolsContent;