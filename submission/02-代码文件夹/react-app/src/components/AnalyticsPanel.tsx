import axios from 'axios';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

import PredictionChart from './PredictionChart';
// 类型定义
interface ModelTrainingRequest {
  patientId: string;
  encryptedData: string;
}

interface ModelTrainingResponse {
  modelId: string;
  status: string;
}

interface ModelAggregationRequest {
  modelIds: string[];
}

interface ModelAggregationResponse {
  globalModel: string;
  accuracy: number;
}

interface PredictionResult {
  predictionId: string;
  diseaseType: string;
  probability: number;
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendations: string[];
  timestamp: string;
}

interface FederatedLearningStats {
  totalModels: number;
  averageAccuracy: number;
  lastTrainingTime: string;
  statusDistribution: Record<string, number>;
}

const AnalyticsPanel: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();

  // 获取token
  const token = localStorage.getItem('emr_token');

  // 状态管理
  const [patientId, setPatientId] = useState<string>('');
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [isAggregating, setIsAggregating] = useState<boolean>(false);
  const [trainedModels, setTrainedModels] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [stats, setStats] = useState<FederatedLearningStats | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // API基础配置
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const axiosConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }),
    [token]
  );

  // 获取统计信息
  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/analytics/statistics`, axiosConfig);
      setStats(response.data);
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  }, [API_BASE_URL, axiosConfig]);

  // 获取预测结果
  const fetchPredictions = useCallback(
    async (patientId: string) => {
      if (!patientId) return;

      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/v1/analytics/predictions/${patientId}`,
          axiosConfig
        );
        setPredictions(response.data);
      } catch (error) {
        console.error('获取预测结果失败:', error);
        toast.error('获取预测结果失败');
      }
    },
    [API_BASE_URL, axiosConfig]
  );

  // 训练本地模型
  const handleTrainModel = async () => {
    if (!patientId.trim()) {
      toast.error('请输入患者ID');
      return;
    }

    if (!user?.userId) {
      toast.error('用户未登录');
      return;
    }

    setIsTraining(true);

    try {
      // 模拟加密数据
      const encryptedData = btoa(
        JSON.stringify({
          patientId,
          medicalHistory: ['高血压', '糖尿病'],
          symptoms: ['头痛', '疲劳'],
          vitals: { bloodPressure: '140/90', heartRate: 85 },
          timestamp: new Date().toISOString(),
        })
      );

      const requestData: ModelTrainingRequest = {
        patientId,
        encryptedData,
      };

      const response = await axios.post<ModelTrainingResponse>(
        `${API_BASE_URL}/api/v1/analytics/train`,
        requestData,
        axiosConfig
      );

      const { modelId, status } = response.data;

      if (status === 'TRAINING' || status === 'COMPLETED') {
        setTrainedModels(prev => [...prev, modelId]);
        toast.success(`模型训练已启动，模型ID: ${modelId}`);

        // 刷新统计信息
        await fetchStats();

        // 如果训练完成，获取预测结果
        if (status === 'COMPLETED') {
          await fetchPredictions(patientId);
        }
      } else {
        toast.error('模型训练失败');
      }
    } catch (error: any) {
      console.error('训练模型失败:', error);
      if (error.response?.status === 401) {
        toast.error('无权限执行此操作');
      } else if (error.response?.status === 429) {
        toast.error('请求过于频繁，请稍后再试');
      } else {
        toast.error('模型训练失败，请稍后重试');
      }
    } finally {
      setIsTraining(false);
    }
  };

  // 聚合全局模型
  const handleAggregateModels = async () => {
    if (trainedModels.length === 0) {
      toast.error('没有可聚合的模型');
      return;
    }

    setIsAggregating(true);

    try {
      const requestData: ModelAggregationRequest = {
        modelIds: trainedModels,
      };

      const response = await axios.post<ModelAggregationResponse>(
        `${API_BASE_URL}/api/v1/analytics/aggregate`,
        requestData,
        axiosConfig
      );

      const { accuracy } = response.data;

      toast.success(`全局模型聚合完成，准确率: ${(accuracy * 100).toFixed(2)}%`);

      // 刷新统计信息
      await fetchStats();

      // 如果有选中的患者，刷新预测结果
      if (selectedPatientId) {
        await fetchPredictions(selectedPatientId);
      }
    } catch (error: any) {
      console.error('聚合模型失败:', error);
      if (error.response?.status === 401) {
        toast.error('无权限执行此操作');
      } else {
        toast.error('模型聚合失败，请稍后重试');
      }
    } finally {
      setIsAggregating(false);
    }
  };

  // 组件挂载时获取统计信息
  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token, fetchStats]);

  // 监听选中患者变化
  useEffect(() => {
    if (selectedPatientId) {
      fetchPredictions(selectedPatientId);
    }
  }, [selectedPatientId, fetchPredictions]);

  // 主题样式
  const panelClass =
    theme === 'dark'
      ? 'bg-gray-800 border-gray-700 text-white'
      : 'bg-white border-gray-200 text-gray-900';

  const inputClass =
    theme === 'dark'
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500';

  const buttonClass =
    'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2';
  const disabledButtonClass =
    'bg-gray-400 text-white font-medium py-2 px-4 rounded-lg cursor-not-allowed flex items-center gap-2';

  return (
    <div className={`p-6 rounded-lg shadow-md border ${panelClass}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <span className="text-blue-600">📊</span>
          联邦学习分析
        </h2>
        <p className="text-sm opacity-75">
          基于加密数据的分布式机器学习分析，保护患者隐私的同时提供疾病预测
        </p>
      </div>

      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-lg border ${panelClass}`}>
            <div className="text-2xl font-bold text-blue-600">{stats.totalModels}</div>
            <div className="text-sm opacity-75">总模型数</div>
          </div>
          <div className={`p-4 rounded-lg border ${panelClass}`}>
            <div className="text-2xl font-bold text-green-600">
              {(stats.averageAccuracy * 100).toFixed(1)}%
            </div>
            <div className="text-sm opacity-75">平均准确率</div>
          </div>
          <div className={`p-4 rounded-lg border ${panelClass}`}>
            <div className="text-2xl font-bold text-purple-600">
              {stats.statusDistribution.COMPLETED || 0}
            </div>
            <div className="text-sm opacity-75">已完成训练</div>
          </div>
          <div className={`p-4 rounded-lg border ${panelClass}`}>
            <div className="text-2xl font-bold text-orange-600">
              {stats.statusDistribution.TRAINING || 0}
            </div>
            <div className="text-sm opacity-75">训练中</div>
          </div>
        </div>
      )}

      {/* 模型训练区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className={`p-4 rounded-lg border ${panelClass}`}>
          <h3 className="text-lg font-semibold mb-4">本地模型训练</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">患者ID</label>
              <input
                type="text"
                value={patientId}
                onChange={e => setPatientId(e.target.value)}
                placeholder="输入患者ID"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${inputClass}`}
                disabled={isTraining}
              />
            </div>
            <button
              onClick={handleTrainModel}
              disabled={isTraining || !patientId.trim()}
              className={isTraining || !patientId.trim() ? disabledButtonClass : buttonClass}
            >
              {isTraining ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  训练中...
                </>
              ) : (
                <>
                  <span>▶️</span>
                  开始训练
                </>
              )}
            </button>
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${panelClass}`}>
          <h3 className="text-lg font-semibold mb-4">全局模型聚合</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm opacity-75 mb-2">已训练模型: {trainedModels.length} 个</p>
              {trainedModels.length > 0 && (
                <div className="text-xs opacity-60">
                  {trainedModels.slice(0, 3).map((id, index) => (
                    <div key={index}>{id.substring(0, 8)}...</div>
                  ))}
                  {trainedModels.length > 3 && <div>还有 {trainedModels.length - 3} 个模型...</div>}
                </div>
              )}
            </div>
            <button
              onClick={handleAggregateModels}
              disabled={isAggregating || trainedModels.length === 0}
              className={
                isAggregating || trainedModels.length === 0 ? disabledButtonClass : buttonClass
              }
            >
              {isAggregating ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  聚合中...
                </>
              ) : (
                <>
                  <span>📊</span>
                  聚合模型
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 预测结果查询 */}
      <div className={`p-4 rounded-lg border ${panelClass} mb-6`}>
        <h3 className="text-lg font-semibold mb-4">预测结果查询</h3>
        <div className="flex gap-4">
          <input
            type="text"
            value={selectedPatientId}
            onChange={e => setSelectedPatientId(e.target.value)}
            placeholder="输入患者ID查询预测结果"
            className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${inputClass}`}
          />
          <button
            onClick={() => fetchPredictions(selectedPatientId)}
            disabled={!selectedPatientId.trim()}
            className={!selectedPatientId.trim() ? disabledButtonClass : buttonClass}
          >
            查询
          </button>
        </div>
      </div>

      {/* 预测结果展示 */}
      {predictions.length > 0 && (
        <div className={`p-4 rounded-lg border ${panelClass}`}>
          <h3 className="text-lg font-semibold mb-4">预测结果</h3>
          <PredictionChart predictions={predictions} />

          {/* 详细结果列表 */}
          <div className="mt-6 space-y-3">
            {predictions.map(prediction => (
              <div key={prediction.predictionId} className={`p-3 rounded-lg border ${panelClass}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{prediction.diseaseType}</h4>
                    <p className="text-sm opacity-75">
                      预测时间: {new Date(prediction.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {(prediction.probability * 100).toFixed(1)}%
                    </div>
                    <div
                      className={`text-xs px-2 py-1 rounded ${
                        prediction.riskLevel === 'HIGH'
                          ? 'bg-red-100 text-red-800'
                          : prediction.riskLevel === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {prediction.riskLevel === 'HIGH'
                        ? '高风险'
                        : prediction.riskLevel === 'MEDIUM'
                          ? '中风险'
                          : '低风险'}
                    </div>
                  </div>
                </div>
                <div className="text-sm opacity-75">
                  置信度: {(prediction.confidence * 100).toFixed(1)}%
                </div>
                {prediction.recommendations && prediction.recommendations.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-1">建议:</p>
                    <ul className="text-sm opacity-75 list-disc list-inside">
                      {prediction.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 无预测结果时的提示 */}
      {selectedPatientId && predictions.length === 0 && (
        <div className={`p-4 rounded-lg border ${panelClass} text-center`}>
          <span className="mx-auto text-4xl text-yellow-500 mb-2">⚠️</span>
          <p className="text-lg font-medium mb-1">暂无预测结果</p>
          <p className="text-sm opacity-75">该患者暂无可用的预测结果，请先训练相关模型</p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPanel;
