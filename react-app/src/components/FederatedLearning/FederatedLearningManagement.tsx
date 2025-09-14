import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../utils/api';
import { formatDateTime } from '../../utils/format';

interface FederatedLearningTask {
  taskId: string;
  taskName: string;
  modelType: string;
  privacyLevel: 'low' | 'medium' | 'high';
  status: 'CREATED' | 'TRAINING' | 'AGGREGATING' | 'COMPLETED' | 'FAILED';
  participantCount: number;
  currentRound: number;
  maxRounds: number;
  globalAccuracy?: number;
  convergenceMetric?: number;
  privacyBudgetConsumed: number;
  totalPrivacyBudget: number;
  createdAt: string;
  completedAt?: string;
  creatorId: string;
  description?: string;
}

interface LocalModel {
  modelId: string;
  taskId: string;
  accuracy: number;
  loss: number;
  dataSize: number;
  privacyBudgetUsed: number;
  status: 'TRAINING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

interface PredictionJob {
  predictionId: string;
  modelId: string;
  modelName: string;
  prediction: number | number[];
  confidence: number;
  privacyGuarantee: string;
  timestamp: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

interface PrivacyBudget {
  userId: string;
  totalBudget: number;
  consumedBudget: number;
  remainingBudget: number;
  lastUpdate: string;
}

const FederatedLearningManagement: React.FC = () => {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<FederatedLearningTask[]>([]);
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [predictions, setPredictions] = useState<PredictionJob[]>([]);
  const [privacyBudget, setPrivacyBudget] = useState<PrivacyBudget | null>(null);

  const [loading, setLoading] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showPrediction, setShowPrediction] = useState(false);
  const [selectedTask, setSelectedTask] = useState<FederatedLearningTask | null>(null);

  const [activeTab, setActiveTab] = useState('overview');

  // 表单状态
  const [createTaskForm, setCreateTaskForm] = useState({
    taskName: '',
    modelType: 'logistic_regression',
    privacyLevel: 'medium' as 'low' | 'medium' | 'high',
    description: '',
  });

  const [predictionForm, setPredictionForm] = useState({
    modelId: '',
    inputData: '',
    confidenceThreshold: 0.5,
  });

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksData, modelsData, predictionsData, budgetData] = await Promise.all([
        apiRequest('/api/v1/analytics/tasks'),
        apiRequest('/api/v1/analytics/models'),
        apiRequest('/api/v1/analytics/predictions'),
        apiRequest(`/api/v1/analytics/privacy-budget/${user?.userId}`),
      ]);

      setTasks(tasksData.tasks || []);
      setLocalModels(modelsData.models || []);
      setPredictions(predictionsData.predictions || []);
      setPrivacyBudget(budgetData);
    } catch (error: any) {
      console.error('获取数据失败:', error);
      toast.error('获取数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createTaskForm.taskName.trim()) {
      toast.error('请输入任务名称');
      return;
    }

    try {
      await apiRequest('/api/v1/analytics/tasks', {
        method: 'POST',
        body: JSON.stringify(createTaskForm),
      });

      setShowCreateTask(false);
      setCreateTaskForm({
        taskName: '',
        modelType: 'logistic_regression',
        privacyLevel: 'medium',
        description: '',
      });
      toast.success('联邦学习任务创建成功！');
      fetchDashboardData();
    } catch (error: any) {
      console.error('创建任务失败:', error);
      toast.error('创建任务失败，请重试');
    }
  };

  const handleJoinTask = async (taskId: string) => {
    try {
      await apiRequest(`/api/v1/analytics/tasks/${taskId}/join`, {
        method: 'POST',
        body: JSON.stringify({
          privacyParams: {
            epsilon: 1.0,
            delta: 1e-5,
          },
        }),
      });

      toast.success('成功加入联邦学习任务！');
      fetchDashboardData();
    } catch (error: any) {
      console.error('加入任务失败:', error);
      toast.error('加入任务失败，请重试');
    }
  };

  const handleStartAggregation = async (taskId: string) => {
    try {
      await apiRequest(`/api/v1/analytics/tasks/${taskId}/aggregate`, {
        method: 'POST',
        body: JSON.stringify({
          aggregationMethod: 'fedavg',
        }),
      });

      toast.success('聚合过程已开始！');
      fetchDashboardData();
    } catch (error: any) {
      console.error('开始聚合失败:', error);
      toast.error('开始聚合失败，请重试');
    }
  };

  const handlePrediction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!predictionForm.modelId || !predictionForm.inputData) {
      toast.error('请填写所有必填字段');
      return;
    }

    try {
      await apiRequest('/api/v1/analytics/predict', {
        method: 'POST',
        body: JSON.stringify({
          modelId: predictionForm.modelId,
          inputData: predictionForm.inputData.split(',').map(Number),
          confidenceThreshold: predictionForm.confidenceThreshold,
        }),
      });

      setShowPrediction(false);
      setPredictionForm({
        modelId: '',
        inputData: '',
        confidenceThreshold: 0.5,
      });
      toast.success('预测任务已提交！');
      fetchDashboardData();
    } catch (error: any) {
      console.error('预测失败:', error);
      toast.error('预测失败，请重试');
    }
  };

  const getPrivacyLevelColor = (level: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-orange-100 text-orange-800',
      high: 'bg-red-100 text-red-800',
    };
    return colors[level as keyof typeof colors] || colors.medium;
  };

  const getPrivacyLevelText = (level: string) => {
    const texts = {
      low: '低隐私',
      medium: '中隐私',
      high: '高隐私',
    };
    return texts[level as keyof typeof texts] || level;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      CREATED: 'bg-gray-100 text-gray-800',
      TRAINING: 'bg-blue-100 text-blue-800',
      AGGREGATING: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || colors.CREATED;
  };

  const getStatusText = (status: string) => {
    const texts = {
      CREATED: '已创建',
      TRAINING: '训练中',
      AGGREGATING: '聚合中',
      COMPLETED: '已完成',
      FAILED: '失败',
    };
    return texts[status as keyof typeof texts] || status;
  };

  const renderOverviewStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {tasks.filter(t => ['TRAINING', 'AGGREGATING'].includes(t.status)).length}
            </p>
            <p className="text-gray-600">活跃任务</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {localModels.filter(m => m.status === 'COMPLETED').length}
            </p>
            <p className="text-gray-600">参与训练</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{predictions.length}</p>
            <p className="text-gray-600">预测次数</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {privacyBudget ? privacyBudget.remainingBudget.toFixed(2) : '0.00'}
            </p>
            <p className="text-gray-600">隐私预算剩余</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrivacyExplanation = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">隐私保护机制</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">差分隐私</h4>
          <p className="text-gray-600 text-sm">
            在训练数据中添加精心校准的噪声，确保单个患者的数据无法被推断出来。
          </p>
        </div>

        <div className="text-center p-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">安全聚合</h4>
          <p className="text-gray-600 text-sm">
            使用加密技术保护模型参数在传输过程中的安全，防止中间人攻击。
          </p>
        </div>

        <div className="text-center p-4">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-8 h-8 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">联邦学习</h4>
          <p className="text-gray-600 text-sm">
            数据不离开本地，只共享模型参数，实现"数据可用不可见"的协作学习。
          </p>
        </div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">请先登录以使用联邦学习功能</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题区域 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <svg
                className="w-8 h-8 mr-3 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
              联邦学习平台
            </h1>
            <p className="text-gray-600 mt-2">
              基于区块链的隐私保护联邦学习系统，实现医疗数据的安全协作分析
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowPrediction(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              开始预测
            </button>
            <button
              onClick={() => setShowCreateTask(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              创建任务
            </button>
          </div>
        </div>
      </div>

      {/* 概览统计 */}
      {renderOverviewStats()}

      {/* 隐私保护说明 */}
      {renderPrivacyExplanation()}

      {/* 主要内容区域 */}
      <div className="bg-white rounded-lg shadow-md">
        {/* 标签导航 */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'tasks', label: '学习任务', icon: '🎯' },
              { key: 'models', label: '我的模型', icon: '🧠' },
              { key: 'predictions', label: '预测历史', icon: '📊' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 标签内容 */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  {tasks.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <svg
                        className="w-16 h-16 mx-auto mb-4 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      <p>暂无学习任务</p>
                      <button
                        onClick={() => setShowCreateTask(true)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        创建第一个任务
                      </button>
                    </div>
                  ) : (
                    tasks.map(task => (
                      <div
                        key={task.taskId}
                        className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{task.taskName}</h3>
                            <p className="text-gray-600">{task.description}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getPrivacyLevelColor(task.privacyLevel)}`}
                            >
                              {getPrivacyLevelText(task.privacyLevel)}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}
                            >
                              {getStatusText(task.status)}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-500">模型类型</p>
                            <p className="font-medium">{task.modelType}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">参与者</p>
                            <p className="font-medium">{task.participantCount}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">轮次</p>
                            <p className="font-medium">
                              {task.currentRound}/{task.maxRounds}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">全局准确率</p>
                            <p className="font-medium">
                              {task.globalAccuracy
                                ? `${(task.globalAccuracy * 100).toFixed(2)}%`
                                : '-'}
                            </p>
                          </div>
                        </div>

                        {/* 隐私预算进度条 */}
                        <div className="mb-4">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>隐私预算</span>
                            <span>
                              {task.privacyBudgetConsumed.toFixed(2)}/{task.totalPrivacyBudget}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${(task.privacyBudgetConsumed / task.totalPrivacyBudget) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedTask(task)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                          >
                            查看详情
                          </button>
                          {task.status === 'CREATED' && (
                            <button
                              onClick={() => handleJoinTask(task.taskId)}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              加入训练
                            </button>
                          )}
                          {task.status === 'TRAINING' && task.creatorId === user.userId && (
                            <button
                              onClick={() => handleStartAggregation(task.taskId)}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              开始聚合
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'models' && (
                <div className="space-y-4">
                  {localModels.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <svg
                        className="w-16 h-16 mx-auto mb-4 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                        />
                      </svg>
                      <p>暂无模型</p>
                    </div>
                  ) : (
                    localModels.map(model => (
                      <div key={model.modelId} className="border border-gray-200 rounded-lg p-6">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">模型ID</p>
                            <p className="font-medium">{model.modelId}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">准确率</p>
                            <p className="font-medium">{(model.accuracy * 100).toFixed(2)}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">损失</p>
                            <p className="font-medium">{model.loss.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">数据量</p>
                            <p className="font-medium">{model.dataSize}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">状态</p>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(model.status)}`}
                            >
                              {getStatusText(model.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'predictions' && (
                <div className="space-y-4">
                  {predictions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <svg
                        className="w-16 h-16 mx-auto mb-4 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      <p>暂无预测记录</p>
                    </div>
                  ) : (
                    predictions.map(prediction => (
                      <div
                        key={prediction.predictionId}
                        className="border border-gray-200 rounded-lg p-6"
                      >
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">预测ID</p>
                            <p className="font-medium">{prediction.predictionId}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">模型</p>
                            <p className="font-medium">{prediction.modelName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">预测结果</p>
                            <p className="font-medium">{JSON.stringify(prediction.prediction)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">置信度</p>
                            <p className="font-medium">
                              {(prediction.confidence * 100).toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">时间</p>
                            <p className="font-medium">{formatDateTime(prediction.timestamp)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 创建任务模态框 */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">创建联邦学习任务</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">任务名称 *</label>
                <input
                  type="text"
                  value={createTaskForm.taskName}
                  onChange={e => setCreateTaskForm({ ...createTaskForm, taskName: e.target.value })}
                  placeholder="例如：糖尿病风险预测模型"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模型类型 *</label>
                <select
                  value={createTaskForm.modelType}
                  onChange={e =>
                    setCreateTaskForm({ ...createTaskForm, modelType: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="logistic_regression">逻辑回归</option>
                  <option value="neural_network">神经网络</option>
                  <option value="decision_tree">决策树</option>
                  <option value="random_forest">随机森林</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  隐私保护等级 *
                </label>
                <select
                  value={createTaskForm.privacyLevel}
                  onChange={e =>
                    setCreateTaskForm({
                      ...createTaskForm,
                      privacyLevel: e.target.value as 'low' | 'medium' | 'high',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">低 - 更高准确率，较低隐私保护</option>
                  <option value="medium">中 - 平衡准确率和隐私</option>
                  <option value="high">高 - 最强隐私保护，可能影响准确率</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">任务描述</label>
                <textarea
                  value={createTaskForm.description}
                  onChange={e =>
                    setCreateTaskForm({ ...createTaskForm, description: e.target.value })
                  }
                  placeholder="描述学习任务的目标和要求"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateTask(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  创建任务
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 预测模态框 */}
      {showPrediction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">执行预测</h2>
            <form onSubmit={handlePrediction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择模型 *</label>
                <select
                  value={predictionForm.modelId}
                  onChange={e => setPredictionForm({ ...predictionForm, modelId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">请选择模型</option>
                  {tasks
                    .filter(t => t.status === 'COMPLETED')
                    .map(task => (
                      <option key={task.taskId} value={task.taskId}>
                        {task.taskName} (准确率: {((task.globalAccuracy || 0) * 100).toFixed(2)}%)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">输入数据 *</label>
                <input
                  type="text"
                  value={predictionForm.inputData}
                  onChange={e =>
                    setPredictionForm({ ...predictionForm, inputData: e.target.value })
                  }
                  placeholder="输入特征值，用逗号分隔，例如：1.2,3.4,5.6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">置信度阈值</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={predictionForm.confidenceThreshold}
                  onChange={e =>
                    setPredictionForm({
                      ...predictionForm,
                      confidenceThreshold: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">隐私保护提醒：</span>
                  预测结果将添加隐私保护噪声，确保个人数据的安全性。
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPrediction(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  开始预测
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 任务详情模态框 */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold">任务详情</h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">任务名称</p>
                  <p className="font-medium">{selectedTask.taskName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">模型类型</p>
                  <p className="font-medium">{selectedTask.modelType}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">时间线</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <div>
                      <p className="font-medium">任务创建</p>
                      <p className="text-sm text-gray-600">
                        {formatDateTime(selectedTask.createdAt)}
                      </p>
                    </div>
                  </div>
                  {selectedTask.status !== 'CREATED' && (
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium">开始训练</p>
                        <p className="text-sm text-gray-600">
                          参与者: {selectedTask.participantCount}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedTask.status === 'COMPLETED' && selectedTask.completedAt && (
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium">训练完成</p>
                        <p className="text-sm text-gray-600">
                          {formatDateTime(selectedTask.completedAt)}
                        </p>
                        <p className="text-sm text-gray-600">
                          最终准确率: {((selectedTask.globalAccuracy || 0) * 100).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">隐私保护信息</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>隐私等级: {getPrivacyLevelText(selectedTask.privacyLevel)}</p>
                  <p>
                    隐私预算消耗: {selectedTask.privacyBudgetConsumed.toFixed(2)} /{' '}
                    {selectedTask.totalPrivacyBudget}
                  </p>
                  <p>收敛度量: {selectedTask.convergenceMetric?.toFixed(4) || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FederatedLearningManagement;
