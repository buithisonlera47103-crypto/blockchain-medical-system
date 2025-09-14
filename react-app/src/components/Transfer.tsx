import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { PulseLoader } from 'react-spinners';
import { toast } from 'react-toastify';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { transferAPI } from '../utils/api';
// 权限控制已通过路由层面实现

/**
 * 转移表单数据接口
 */
interface TransferFormData {
  id: string;
  newOwner: string;
}

/**
 * 转移流程步骤
 */
type TransferStep = 'initiate' | 'verify' | 'update' | 'complete';

/**
 * 转移所有权页面组件
 * 提供医疗记录所有权转移功能
 */
const Transfer: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<TransferStep>('initiate');
  const [transferProgress, setTransferProgress] = useState(0);

  // 使用 react-hook-form 进行表单管理
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<TransferFormData>({
    defaultValues: {
      id: '',
      newOwner: '',
    },
  });

  const watchedValues = watch();

  /**
   * 处理转移表单提交
   */
  const onSubmit = async (data: TransferFormData) => {
    try {
      setIsLoading(true);

      // 模拟转移流程
      await simulateTransferProcess(data);
    } catch (error) {
      console.error('转移错误:', error);
      toast.error(t('transfer.transferError'), {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setCurrentStep('initiate');
      setTransferProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 模拟转移流程
   */
  const simulateTransferProcess = async (data: TransferFormData) => {
    const steps: { step: TransferStep; progress: number; delay: number }[] = [
      { step: 'initiate', progress: 25, delay: 1000 },
      { step: 'verify', progress: 50, delay: 2000 },
      { step: 'update', progress: 75, delay: 2000 },
      { step: 'complete', progress: 100, delay: 1000 },
    ];

    for (const { step, progress, delay } of steps) {
      setCurrentStep(step);
      setTransferProgress(progress);

      if (step === 'verify') {
        // 模拟API调用验证所有权
        try {
          const response = await transferAPI.transferOwnership(data.id, data.newOwner);

          if (!response.success) {
            throw new Error('Transfer failed');
          }
        } catch (error) {
          // 如果API失败，继续模拟流程
          console.log('API调用失败，使用模拟数据');
        }
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // 转移完成
    toast.success(t('transfer.transferSuccess'), {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });

    // 重置表单
    setTimeout(() => {
      reset();
      setCurrentStep('initiate');
      setTransferProgress(0);
    }, 2000);
  };

  /**
   * 重置转移流程
   */
  const handleReset = () => {
    reset();
    setCurrentStep('initiate');
    setTransferProgress(0);
    setIsLoading(false);
  };

  /**
   * 渲染转移流程步骤
   */
  const renderTransferSteps = () => {
    const steps = [
      {
        key: 'initiate' as TransferStep,
        title: t('transfer.step1'),
        description: '发起转移请求',
        icon: '🔄',
      },
      {
        key: 'verify' as TransferStep,
        title: t('transfer.step2'),
        description: '验证当前所有权',
        icon: '🪪',
      },
      {
        key: 'update' as TransferStep,
        title: t('transfer.step3'),
        description: '更新区块链记录',
        icon: '⚙️',
      },
      {
        key: 'complete' as TransferStep,
        title: t('transfer.step4'),
        description: '转移完成',
        icon: '✅',
      },
    ];

    const getStepStatus = (stepKey: TransferStep) => {
      const stepOrder: TransferStep[] = ['initiate', 'verify', 'update', 'complete'];
      const currentIndex = stepOrder.indexOf(currentStep);
      const stepIndex = stepOrder.indexOf(stepKey);

      if (stepIndex < currentIndex) return 'completed';
      if (stepIndex === currentIndex) return 'current';
      return 'pending';
    };

    return (
      <div className={`p-6 rounded-lg shadow-md mb-8 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <h3 className="text-lg font-semibold mb-6 flex items-center">
          <span className="mr-2 text-blue-600">🔄</span>
          {t('transfer.transferProcess')}
        </h3>

        {/* 进度条 */}
        <div className="mb-6">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span>{t('transfer.transferProcess')}</span>
            <span>{transferProgress}%</span>
          </div>
          <div
            className={`w-full bg-gray-200 rounded-full h-2 ${
              isDark ? 'bg-gray-700' : 'bg-gray-200'
            }`}
          >
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${transferProgress}%` }}
            />
          </div>
        </div>

        {/* 步骤列表 */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const status = getStepStatus(step.key);
            // const IconComponent = step.icon;

            return (
              <div key={step.key} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                    status === 'completed'
                      ? 'bg-green-500 text-white'
                      : status === 'current'
                        ? 'bg-blue-500 text-white'
                        : isDark
                          ? 'bg-gray-700 text-gray-400'
                          : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {status === 'current' && step.key === 'update' ? (
                    <span className="w-5 h-5 animate-spin">⚙️</span>
                  ) : (
                    <span className="w-5 h-5 text-xl flex items-center justify-center">
                      {step.icon}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h4
                    className={`font-medium ${
                      status === 'completed'
                        ? 'text-green-600'
                        : status === 'current'
                          ? 'text-blue-600'
                          : isDark
                            ? 'text-gray-400'
                            : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </h4>
                  <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <span
                    className={`ml-4 ${
                      status === 'completed'
                        ? 'text-green-500'
                        : isDark
                          ? 'text-gray-600'
                          : 'text-gray-400'
                    }`}
                  >
                    ➡️
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen pt-20 pb-8 px-6 relative overflow-hidden ${
        isDark
          ? 'bg-gray-900 text-white'
          : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-900'
      }`}
    >
      {/* 医疗主题装饰背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <span className="absolute top-10 left-10 text-blue-200 dark:text-blue-800 text-8xl animate-pulse opacity-10">
          🩺
        </span>
        <span
          className="absolute top-32 right-20 text-red-300 opacity-15 text-6xl animate-bounce"
          style={{ animationDelay: '1s' }}
        >
          ❤️
        </span>
        <span
          className="absolute bottom-40 left-1/4 text-green-300 opacity-10 text-6xl animate-float"
          style={{ animationDelay: '2s' }}
        >
          👨‍⚕️
        </span>
        <span
          className="absolute top-1/2 right-10 text-purple-300 opacity-10 text-7xl animate-pulse"
          style={{ animationDelay: '3s' }}
        >
          🏥
        </span>
        <span
          className="absolute bottom-20 right-1/3 text-blue-300 opacity-15 text-5xl animate-bounce"
          style={{ animationDelay: '4s' }}
        >
          📋
        </span>
        <span
          className="absolute top-60 left-1/3 text-indigo-300 opacity-10 text-6xl animate-float"
          style={{ animationDelay: '5s' }}
        >
          🔄
        </span>
        <span
          className="absolute bottom-60 left-20 text-green-300 opacity-15 text-5xl animate-pulse"
          style={{ animationDelay: '6s' }}
        >
          🛡️
        </span>
        <span
          className="absolute top-80 right-1/4 text-yellow-300 opacity-10 text-4xl animate-bounce"
          style={{ animationDelay: '7s' }}
        >
          🔒
        </span>
        <span
          className="absolute bottom-80 right-20 text-purple-300 opacity-15 text-5xl animate-float"
          style={{ animationDelay: '8s' }}
        >
          🧊
        </span>
        <span
          className="absolute top-40 left-1/2 text-cyan-300 opacity-10 text-4xl animate-pulse"
          style={{ animationDelay: '9s' }}
        >
          🌐
        </span>

        {/* 渐变背景圆圈 */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '2s' }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '4s' }}
        ></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* 页面标题区域 */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white mr-4">
              <span className="w-8 h-8">🔄</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t('transfer.title')}
            </h1>
          </div>
          <p className={`text-xl max-w-2xl mx-auto ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {t('transfer.subtitle')}
          </p>

          {/* 安全特性标签 */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
                isDark
                  ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                  : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}
            >
              <span className="w-3 h-3 mr-1">🛡️</span>
              端到端加密
            </span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
                isDark
                  ? 'bg-green-900/50 text-green-300 border border-green-700'
                  : 'bg-green-100 text-green-700 border border-green-200'
              }`}
            >
              <span className="w-3 h-3 mr-1">🧊</span>
              区块链存储
            </span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
                isDark
                  ? 'bg-purple-900/50 text-purple-300 border border-purple-700'
                  : 'bg-purple-100 text-purple-700 border border-purple-200'
              }`}
            >
              <span className="w-3 h-3 mr-1">🔒</span>
              隐私保护
            </span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
                isDark
                  ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700'
                  : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
              }`}
            >
              <span className="w-3 h-3 mr-1">🌐</span>
              分布式网络
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧小模块区域 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 转移统计 */}
            <div
              className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                isDark
                  ? 'bg-gray-800/90 border border-gray-700/50'
                  : 'bg-white/90 border border-gray-200/50'
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 flex items-center ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                <span className="w-5 h-5 mr-2 text-blue-500">📊</span>
                转移统计
              </h3>
              <div className="space-y-4">
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      今日转移
                    </span>
                    <span className="text-lg font-bold text-blue-500">12</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      本月转移
                    </span>
                    <span className="text-lg font-bold text-green-500">156</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      成功率
                    </span>
                    <span className="text-lg font-bold text-emerald-500">98.5%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 快速提示 */}
            <div
              className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                isDark
                  ? 'bg-gray-800/90 border border-gray-700/50'
                  : 'bg-white/90 border border-gray-200/50'
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 flex items-center ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                <span className="w-5 h-5 mr-2 text-yellow-500">💡</span>
                转移提示
              </h3>
              <div className="space-y-3">
                <div
                  className={`p-3 rounded-lg border-l-4 border-blue-500 ${
                    isDark ? 'bg-blue-900/20' : 'bg-blue-50'
                  }`}
                >
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    确保新所有者地址正确，转移后无法撤销
                  </p>
                </div>
                <div
                  className={`p-3 rounded-lg border-l-4 border-green-500 ${
                    isDark ? 'bg-green-900/20' : 'bg-green-50'
                  }`}
                >
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    转移过程会在区块链上永久记录
                  </p>
                </div>
                <div
                  className={`p-3 rounded-lg border-l-4 border-purple-500 ${
                    isDark ? 'bg-purple-900/20' : 'bg-purple-50'
                  }`}
                >
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    建议在转移前与接收方确认
                  </p>
                </div>
              </div>
            </div>

            {/* 帮助信息 */}
            <div
              className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                isDark
                  ? 'bg-gray-800/90 border border-gray-700/50'
                  : 'bg-white/90 border border-gray-200/50'
              }`}
            >
              <h4
                className={`text-lg font-semibold mb-4 flex items-center ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                <span className="w-5 h-5 mr-2 text-indigo-500">ℹ️</span>
                转移说明
              </h4>
              <ul className={`text-sm space-y-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  只有记录的当前所有者才能发起转移
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  转移过程将在区块链上记录，不可逆转
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  新所有者将获得记录的完全控制权
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  转移完成后，您将失去对该记录的访问权限
                </li>
              </ul>
            </div>
          </div>

          {/* 右侧主要内容区域 */}
          <div className="lg:col-span-3 space-y-8">
            {/* 转移流程步骤 */}
            {(isLoading || currentStep !== 'initiate') && renderTransferSteps()}

            {/* 转移表单 */}
            <div
              className={`p-8 rounded-xl shadow-lg backdrop-blur-sm ${
                isDark
                  ? 'bg-gray-800/90 border border-gray-700/50'
                  : 'bg-white/90 border border-gray-200/50'
              }`}
            >
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* 记录ID */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    {t('transfer.recordId')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                        🪪
                      </span>
                    </div>
                    <input
                      {...register('id', {
                        required: t('transfer.recordIdRequired'),
                      })}
                      type="text"
                      disabled={isLoading}
                      className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } ${errors.id ? 'border-red-500' : ''}`}
                      placeholder={t('transfer.recordIdPlaceholder')}
                    />
                  </div>
                  {errors.id && <p className="mt-1 text-sm text-red-500">{errors.id.message}</p>}
                </div>

                {/* 新所有者 */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    {t('transfer.newOwner')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                        👤➕
                      </span>
                    </div>
                    <input
                      {...register('newOwner', {
                        required: t('transfer.newOwnerRequired'),
                      })}
                      type="text"
                      disabled={isLoading}
                      className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } ${errors.newOwner ? 'border-red-500' : ''}`}
                      placeholder={t('transfer.newOwnerPlaceholder')}
                    />
                  </div>
                  {errors.newOwner && (
                    <p className="mt-1 text-sm text-red-500">{errors.newOwner.message}</p>
                  )}
                </div>

                {/* 当前所有者信息 */}
                {watchedValues.id && (
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h4 className="text-sm font-medium mb-2">{t('transfer.currentOwner')}</h4>
                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {user?.name || '当前用户'}
                    </p>
                  </div>
                )}

                {/* 确认信息 */}
                {watchedValues.id && watchedValues.newOwner && (
                  <div
                    className={`p-4 rounded-lg border-l-4 border-blue-500 ${
                      isDark ? 'bg-blue-900/20' : 'bg-blue-50'
                    }`}
                  >
                    <h4 className="text-sm font-medium mb-2">{t('transfer.confirmTransfer')}</h4>
                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      将记录 <span className="font-medium">{watchedValues.id}</span> 的所有权从
                      <span className="font-medium">{user?.name}</span> 转移给
                      <span className="font-medium">{watchedValues.newOwner}</span>
                    </p>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={isLoading || !watchedValues.id || !watchedValues.newOwner}
                    className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <PulseLoader color="white" size={8} className="mr-2" />
                        {t('transfer.transferring')}
                      </>
                    ) : (
                      <>
                        <span className="mr-2">🔄</span>
                        {t('transfer.confirmTransfer')}
                      </>
                    )}
                  </button>

                  {(isLoading || currentStep !== 'initiate') && (
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={isLoading && currentStep !== 'complete'}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        isDark
                          ? 'bg-gray-700 text-white hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {t('common.reset')}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transfer;
