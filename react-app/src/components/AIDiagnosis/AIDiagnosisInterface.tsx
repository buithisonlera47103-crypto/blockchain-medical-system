import {
  Upload,
  Image,
  FileText,
  Brain,
  Zap,
  Eye,
  CheckCircle,
  Download,
  Share2,
} from 'lucide-react';
import React, { useState, useCallback } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../utils/api';

interface MedicalImage {
  id: string;
  filename: string;
  type: 'xray' | 'ct' | 'mri' | 'ultrasound' | 'pathology';
  size: number;
  uploadTime: string;
  processed: boolean;
  url?: string;
}

interface DiagnosisResult {
  id: string;
  imageId: string;
  findings: Array<{
    type: string;
    location: { x: number; y: number; width: number; height: number };
    confidence: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  overall: {
    diagnosis: string;
    confidence: number;
    recommendations: string[];
    urgency: 'routine' | 'urgent' | 'emergent';
  };
  processingTime: number;
  timestamp: string;
  reviewStatus: 'pending' | 'reviewed' | 'approved';
  reviewerNotes?: string;
}

interface ClinicalContext {
  patientAge: number;
  patientGender: 'male' | 'female';
  symptoms: string[];
  medicalHistory: string[];
  currentMedications: string[];
  clinicalQuestion: string;
}

const AIDiagnosisInterface: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upload' | 'analyze' | 'results' | 'history'>(
    'upload'
  );
  const [uploadedImages, setUploadedImages] = useState<MedicalImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<MedicalImage | null>(null);
  const [diagnosisResults, setDiagnosisResults] = useState<DiagnosisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [clinicalContext, setClinicalContext] = useState<ClinicalContext>({
    patientAge: 0,
    patientGender: 'male',
    symptoms: [],
    medicalHistory: [],
    currentMedications: [],
    clinicalQuestion: '',
  });

  // 文件上传处理
  const handleFileUpload = useCallback(async (files: FileList) => {
    const newImages: MedicalImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // 验证文件类型
      if (!file.type.startsWith('image/') && file.type !== 'application/dicom') {
        alert(`文件 ${file.name} 不是支持的图像格式`);
        continue;
      }

      // 验证文件大小 (最大50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert(`文件 ${file.name} 超过大小限制 (50MB)`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('patientId', 'current-patient-id');

        const response = await apiRequest('/api/v1/ai-diagnosis/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.success) {
          const newImage: MedicalImage = {
            id: response.data.imageId,
            filename: file.name,
            type: detectImageType(file.name),
            size: file.size,
            uploadTime: new Date().toISOString(),
            processed: false,
            url: response.data.imageUrl,
          };
          newImages.push(newImage);
        }
      } catch (error) {
        console.error(`上传文件 ${file.name} 失败:`, error);
        alert(`上传文件 ${file.name} 失败`);
      }
    }

    setUploadedImages(prev => [...prev, ...newImages]);
  }, []);

  // 检测图像类型
  const detectImageType = (filename: string): MedicalImage['type'] => {
    const name = filename.toLowerCase();
    if (name.includes('xray') || name.includes('x-ray')) return 'xray';
    if (name.includes('ct')) return 'ct';
    if (name.includes('mri')) return 'mri';
    if (name.includes('ultrasound') || name.includes('us')) return 'ultrasound';
    if (name.includes('pathology') || name.includes('histo')) return 'pathology';
    return 'xray'; // 默认
  };

  // 执行AI诊断
  const performDiagnosis = async () => {
    if (!selectedImage) {
      alert('请先选择要分析的图像');
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await apiRequest('/api/v1/ai-diagnosis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId: selectedImage.id,
          clinicalContext,
          analysisType: 'comprehensive',
          requestingDoctorId: user?.userId,
        }),
      });

      if (response.success) {
        const result: DiagnosisResult = response.data;
        setDiagnosisResults(prev => [result, ...prev]);
        setActiveTab('results');

        // 更新图像状态
        setUploadedImages(prev =>
          prev.map(img => (img.id === selectedImage.id ? { ...img, processed: true } : img))
        );
      }
    } catch (error) {
      console.error('AI诊断失败:', error);
      alert('AI诊断失败，请重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 渲染上传界面
  const renderUploadTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Upload className="mr-2" size={20} />
          医学影像上传
        </h3>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            multiple
            accept="image/*,.dcm"
            onChange={e => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Image className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">点击上传医学影像</p>
            <p className="text-gray-500">支持 DICOM、JPEG、PNG 格式，单个文件最大 50MB</p>
          </label>
        </div>
      </div>

      {/* 已上传图像列表 */}
      {uploadedImages.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">已上传图像</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadedImages.map(image => (
              <div
                key={image.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedImage?.id === image.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedImage(image)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm truncate">{image.filename}</span>
                  {image.processed && <CheckCircle className="text-green-500" size={16} />}
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>类型: {image.type.toUpperCase()}</div>
                  <div>大小: {(image.size / 1024 / 1024).toFixed(2)} MB</div>
                  <div>上传时间: {new Date(image.uploadTime).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // 渲染分析界面
  const renderAnalyzeTab = () => (
    <div className="space-y-6">
      {/* 临床信息输入 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FileText className="mr-2" size={20} />
          临床信息
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">患者年龄</label>
            <input
              type="number"
              value={clinicalContext.patientAge}
              onChange={e =>
                setClinicalContext(prev => ({
                  ...prev,
                  patientAge: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入患者年龄"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">性别</label>
            <select
              value={clinicalContext.patientGender}
              onChange={e =>
                setClinicalContext(prev => ({
                  ...prev,
                  patientGender: e.target.value as 'male' | 'female',
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="male">男性</option>
              <option value="female">女性</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">临床问题</label>
          <textarea
            value={clinicalContext.clinicalQuestion}
            onChange={e =>
              setClinicalContext(prev => ({
                ...prev,
                clinicalQuestion: e.target.value,
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="请描述需要AI协助诊断的临床问题"
          />
        </div>
      </div>

      {/* 选中图像预览 */}
      {selectedImage && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Eye className="mr-2" size={20} />
            图像预览
          </h3>

          <div className="border rounded-lg p-4">
            <div className="text-center">
              <div className="bg-gray-100 rounded-lg p-8 mb-4">
                {selectedImage.url ? (
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.filename}
                    className="max-w-full max-h-64 mx-auto"
                  />
                ) : (
                  <div className="text-gray-500">
                    <Image size={64} className="mx-auto mb-2" />
                    <p>图像预览</p>
                  </div>
                )}
              </div>
              <p className="font-medium">{selectedImage.filename}</p>
              <p className="text-sm text-gray-500">
                {selectedImage.type.toUpperCase()} • {(selectedImage.size / 1024 / 1024).toFixed(2)}{' '}
                MB
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={performDiagnosis}
              disabled={isAnalyzing || !selectedImage}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  AI分析中...
                </>
              ) : (
                <>
                  <Brain className="mr-2" size={20} />
                  开始AI诊断
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // 渲染结果界面
  const renderResultsTab = () => (
    <div className="space-y-6">
      {diagnosisResults.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <Brain className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">暂无诊断结果</p>
        </div>
      ) : (
        diagnosisResults.map(result => (
          <div key={result.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <CheckCircle className="mr-2 text-green-500" size={20} />
                AI诊断结果
              </h3>
              <div className="flex space-x-2">
                <button className="p-2 text-gray-500 hover:text-gray-700">
                  <Download size={16} />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700">
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            {/* 整体诊断结果 */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">诊断结论</h4>
              <p className="text-blue-800 mb-2">{result.overall.diagnosis}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">
                  置信度: {(result.overall.confidence * 100).toFixed(1)}%
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    result.overall.urgency === 'emergent'
                      ? 'bg-red-100 text-red-800'
                      : result.overall.urgency === 'urgent'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                  }`}
                >
                  {result.overall.urgency === 'emergent'
                    ? '紧急'
                    : result.overall.urgency === 'urgent'
                      ? '紧迫'
                      : '常规'}
                </span>
              </div>
            </div>

            {/* 具体发现 */}
            {result.findings.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold mb-3">具体发现</h4>
                <div className="space-y-3">
                  {result.findings.map((finding, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{finding.type}</span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            finding.severity === 'high'
                              ? 'bg-red-100 text-red-800'
                              : finding.severity === 'medium'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {finding.severity === 'high'
                            ? '高'
                            : finding.severity === 'medium'
                              ? '中'
                              : '低'}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm mb-2">{finding.description}</p>
                      <div className="text-xs text-gray-500">
                        位置: ({finding.location.x}, {finding.location.y}) • 置信度:{' '}
                        {(finding.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 建议 */}
            {result.overall.recommendations.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-3">AI建议</h4>
                <ul className="space-y-2">
                  {result.overall.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <Zap className="mr-2 mt-0.5 text-blue-500" size={16} />
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 元信息 */}
            <div className="pt-4 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
              <span>分析时间: {result.processingTime}秒</span>
              <span>生成时间: {new Date(result.timestamp).toLocaleString()}</span>
            </div>

            {/* 医生审核状态 */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">医生审核状态:</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    result.reviewStatus === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : result.reviewStatus === 'reviewed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {result.reviewStatus === 'approved'
                    ? '已批准'
                    : result.reviewStatus === 'reviewed'
                      ? '已审核'
                      : '待审核'}
                </span>
              </div>
              {result.reviewerNotes && (
                <p className="text-sm text-gray-600 mt-2">审核意见: {result.reviewerNotes}</p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Brain className="mr-3 text-blue-600" size={28} />
            AI诊断助手
          </h1>
          <p className="text-gray-600 mt-2">基于深度学习的医学影像智能分析系统</p>
        </div>

        {/* 标签导航 */}
        <div className="flex border-b border-gray-200">
          {[
            { key: 'upload', label: '影像上传', icon: Upload },
            { key: 'analyze', label: 'AI分析', icon: Brain },
            { key: 'results', label: '诊断结果', icon: CheckCircle },
            { key: 'history', label: '历史记录', icon: FileText },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="mr-2" size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 标签内容 */}
      <div className="min-h-96">
        {activeTab === 'upload' && renderUploadTab()}
        {activeTab === 'analyze' && renderAnalyzeTab()}
        {activeTab === 'results' && renderResultsTab()}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">历史记录功能开发中...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIDiagnosisInterface;
