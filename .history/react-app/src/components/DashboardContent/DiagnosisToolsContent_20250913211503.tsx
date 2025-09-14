import { Stethoscope, Brain, Heart, Lungs, Eye, Microscope } from 'lucide-react';
import React, { useState } from 'react';

const DiagnosisToolsContent: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [patientData, setPatientData] = useState({
    symptoms: '',
    vitalSigns: {
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      respiratoryRate: '',
    },
    labResults: '',
  });

  const diagnosticTools = [
    {
      id: 'symptom-checker',
      name: '症状检查器',
      icon: <Stethoscope className="w-6 h-6" />,
      description: '基于症状的初步诊断建议',
      color: 'bg-blue-500',
    },
    {
      id: 'differential-diagnosis',
      name: '鉴别诊断',
      icon: <Brain className="w-6 h-6" />,
      description: '多种可能诊断的比较分析',
      color: 'bg-purple-500',
    },
    {
      id: 'cardiac-assessment',
      name: '心脏评估',
      icon: <Heart className="w-6 h-6" />,
      description: '心血管系统专项评估',
      color: 'bg-red-500',
    },
    {
      id: 'respiratory-analysis',
      name: '呼吸系统分析',
      icon: <Lungs className="w-6 h-6" />,
      description: '肺功能和呼吸系统评估',
      color: 'bg-green-500',
    },
    {
      id: 'ophthalmology',
      name: '眼科检查',
      icon: <Eye className="w-6 h-6" />,
      description: '视力和眼部健康评估',
      color: 'bg-yellow-500',
    },
    {
      id: 'lab-interpreter',
      name: '化验结果解读',
      icon: <Microscope className="w-6 h-6" />,
      description: '实验室检查结果智能分析',
      color: 'bg-indigo-500',
    },
  ];

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
  };

  const renderToolInterface = () => {
    if (!selectedTool) {
      return (
        <div className="text-center py-12">
          <Stethoscope className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            选择诊断工具
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            请从左侧选择一个诊断工具开始使用
          </p>
        </div>
      );
    }

    const tool = diagnosticTools.find(t => t.id === selectedTool);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${tool?.color} text-white`}>
            {tool?.icon}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {tool?.name}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {tool?.description}
            </p>
          </div>
        </div>

        {/* 患者数据输入区域 */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            患者信息输入
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                主要症状
              </label>
              <textarea
                value={patientData.symptoms}
                onChange={(e) => setPatientData({...patientData, symptoms: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
                placeholder="请描述患者的主要症状..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  血压
                </label>
                <input
                  type="text"
                  value={patientData.vitalSigns.bloodPressure}
                  onChange={(e) => setPatientData({
                    ...patientData,
                    vitalSigns: {...patientData.vitalSigns, bloodPressure: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="120/80 mmHg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  心率
                </label>
                <input
                  type="text"
                  value={patientData.vitalSigns.heartRate}
                  onChange={(e) => setPatientData({
                    ...patientData,
                    vitalSigns: {...patientData.vitalSigns, heartRate: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="72 bpm"
                />
              </div>
            </div>

            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
              开始分析
            </button>
          </div>
        </div>

        {/* 诊断结果区域 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            诊断建议
          </h4>
          <div className="text-gray-500 dark:text-gray-400 text-center py-8">
            输入患者信息后，这里将显示AI辅助诊断建议
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          诊断工具
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          AI辅助诊断工具，帮助医生进行更准确的诊断
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 工具列表 */}
        <div className="col-span-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              可用工具
            </h3>
            <div className="space-y-2">
              {diagnosticTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleToolSelect(tool.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedTool === tool.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded ${tool.color} text-white`}>
                      {tool.icon}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {tool.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {tool.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 工具界面 */}
        <div className="col-span-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {renderToolInterface()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisToolsContent;
