import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

// 类型定义
interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // 持续时间（秒）
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  description?: string;
  notificationChannels: string[];
  createdAt: string;
  updatedAt: string;
}

interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'webhook';
  config: {
    email?: {
      to: string[];
      subject?: string;
    };
    sms?: {
      to: string[];
    };
    webhook?: {
      url: string;
      method: 'POST' | 'PUT';
      headers?: Record<string, string>;
    };
  };
  enabled: boolean;
}

interface AlertConfigFormData {
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  notificationChannels: string[];
}

const AlertConfig: React.FC = () => {
  // const { t } = useTranslation();
  // const { user } = useAuth();
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [formData, setFormData] = useState<AlertConfigFormData>({
    name: '',
    metric: 'cpu_usage',
    operator: 'gt',
    threshold: 80,
    duration: 300, // 5分钟
    severity: 'medium',
    description: '',
    notificationChannels: [],
  });

  // 可用的监控指标
  const availableMetrics = [
    { value: 'cpu_usage', label: 'CPU使用率 (%)' },
    { value: 'memory_usage', label: '内存使用率 (%)' },
    { value: 'api_response_time', label: 'API响应时间 (ms)' },
    { value: 'api_error_rate', label: 'API错误率 (%)' },
    { value: 'blockchain_transaction_delay', label: '区块链交易延迟 (ms)' },
    { value: 'blockchain_network_latency', label: '区块链网络延迟 (ms)' },
  ];

  // 操作符选项
  const operatorOptions = [
    { value: 'gt', label: '大于 (>)' },
    { value: 'gte', label: '大于等于 (>=)' },
    { value: 'lt', label: '小于 (<)' },
    { value: 'lte', label: '小于等于 (<=)' },
    { value: 'eq', label: '等于 (=)' },
  ];

  // 严重程度选项
  const severityOptions = [
    { value: 'low', label: '低', color: 'text-green-600' },
    { value: 'medium', label: '中', color: 'text-yellow-600' },
    { value: 'high', label: '高', color: 'text-orange-600' },
    { value: 'critical', label: '严重', color: 'text-red-600' },
  ];

  // 获取告警规则列表
  const fetchAlertRules = async () => {
    try {
      const token = localStorage.getItem('emr_token');
      const response = await axios.get('/api/v1/monitoring/alert-rules', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setAlertRules(response.data.data);
      } else {
        setError(response.data.message || '获取告警规则失败');
      }
    } catch (err) {
      console.error('获取告警规则失败:', err);
      setError('获取告警规则失败');
    }
  };

  // 获取通知渠道列表
  const fetchNotificationChannels = async () => {
    try {
      const token = localStorage.getItem('emr_token');
      const response = await axios.get('/api/v1/monitoring/notification-channels', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setNotificationChannels(response.data.data);
      }
    } catch (err) {
      console.error('获取通知渠道失败:', err);
    }
  };

  // 初始化数据
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await Promise.all([fetchAlertRules(), fetchNotificationChannels()]);
      setLoading(false);
    };

    initData();
  }, []);

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('emr_token');
      const url = editingRule
        ? `/api/v1/monitoring/alert-rules/${editingRule.id}`
        : '/api/v1/monitoring/alert-rules';

      const method = editingRule ? 'put' : 'post';

      const response = await axios[method](url, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data.success) {
        toast.success(editingRule ? '告警规则更新成功' : '告警规则创建成功');
        await fetchAlertRules();
        handleCancel();
      } else {
        toast.error(response.data.message || '操作失败');
      }
    } catch (err) {
      console.error('提交告警规则失败:', err);
      toast.error('操作失败');
    }
  };

  // 删除告警规则
  const handleDelete = async (ruleId: string) => {
    if (!window.confirm('确定要删除这个告警规则吗？')) {
      return;
    }

    try {
      const token = localStorage.getItem('emr_token');
      const response = await axios.delete(`/api/v1/monitoring/alert-rules/${ruleId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('告警规则删除成功');
        await fetchAlertRules();
      } else {
        toast.error(response.data.message || '删除失败');
      }
    } catch (err) {
      console.error('删除告警规则失败:', err);
      toast.error('删除失败');
    }
  };

  // 切换告警规则状态
  const toggleRuleStatus = async (ruleId: string, enabled: boolean) => {
    try {
      const token = localStorage.getItem('emr_token');
      const response = await axios.patch(
        `/api/v1/monitoring/alert-rules/${ruleId}/toggle`,
        { enabled },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        toast.success(`告警规则已${enabled ? '启用' : '禁用'}`);
        await fetchAlertRules();
      } else {
        toast.error(response.data.message || '操作失败');
      }
    } catch (err) {
      console.error('切换告警规则状态失败:', err);
      toast.error('操作失败');
    }
  };

  // 开始编辑
  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      metric: rule.metric,
      operator: rule.operator,
      threshold: rule.threshold,
      duration: rule.duration,
      severity: rule.severity,
      description: rule.description || '',
      notificationChannels: rule.notificationChannels,
    });
    setShowForm(true);
  };

  // 取消编辑
  const handleCancel = () => {
    setShowForm(false);
    setEditingRule(null);
    setFormData({
      name: '',
      metric: 'cpu_usage',
      operator: 'gt',
      threshold: 80,
      duration: 300,
      severity: 'medium',
      description: '',
      notificationChannels: [],
    });
  };

  // 格式化持续时间
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
    return `${Math.floor(seconds / 3600)}小时`;
  };

  // 获取通知渠道图标
  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <span className="text-blue-500">📧</span>;
      case 'sms':
        return <span className="text-green-500">📱</span>;
      case 'webhook':
        return <span className="text-purple-500">🌐</span>;
      default:
        return <span className="text-gray-500">🔔</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">加载告警配置...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <span className="mr-3 text-blue-500">⚙️</span>
              告警规则配置
            </h2>
            <p className="text-gray-600 mt-1">管理系统监控告警规则和通知设置</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors flex items-center"
          >
            <span className="mr-2">➕</span>
            新建规则
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-500 mr-3">⚠️</span>
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* 告警规则表单 */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">
              {editingRule ? '编辑告警规则' : '新建告警规则'}
            </h3>
            <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700">
              <span>❌</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 规则名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">规则名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入告警规则名称"
                  required
                />
              </div>

              {/* 监控指标 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">监控指标 *</label>
                <select
                  value={formData.metric}
                  onChange={e => setFormData({ ...formData, metric: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {availableMetrics.map(metric => (
                    <option key={metric.value} value={metric.value}>
                      {metric.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 操作符 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">条件 *</label>
                <select
                  value={formData.operator}
                  onChange={e => setFormData({ ...formData, operator: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {operatorOptions.map(op => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 阈值 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">阈值 *</label>
                <input
                  type="number"
                  value={formData.threshold}
                  onChange={e =>
                    setFormData({ ...formData, threshold: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入阈值"
                  step="0.01"
                  required
                />
              </div>

              {/* 持续时间 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  持续时间（秒）*
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入持续时间"
                  min="1"
                  required
                />
              </div>

              {/* 严重程度 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">严重程度 *</label>
                <select
                  value={formData.severity}
                  onChange={e => setFormData({ ...formData, severity: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {severityOptions.map(severity => (
                    <option key={severity.value} value={severity.value}>
                      {severity.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入告警规则描述"
                rows={3}
              />
            </div>

            {/* 通知渠道 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">通知渠道</label>
              <div className="space-y-2">
                {notificationChannels.map(channel => (
                  <label key={channel.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.notificationChannels.includes(channel.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            notificationChannels: [...formData.notificationChannels, channel.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            notificationChannels: formData.notificationChannels.filter(
                              id => id !== channel.id
                            ),
                          });
                        }
                      }}
                      className="mr-3"
                    />
                    <div className="flex items-center">
                      {getChannelIcon(channel.type)}
                      <span className="ml-2">{channel.name}</span>
                      <span className="ml-2 text-sm text-gray-500">({channel.type})</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors flex items-center"
              >
                <span className="mr-2">💾</span>
                {editingRule ? '更新' : '创建'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 告警规则列表 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">现有告警规则</h3>

        {alertRules.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl text-gray-400 mx-auto mb-3">🔔</span>
            <p className="text-gray-600">暂无告警规则</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-blue-500 hover:text-blue-600"
            >
              创建第一个告警规则
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {alertRules.map(rule => (
              <div
                key={rule.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="font-medium text-gray-800">{rule.name}</h4>
                      <span
                        className={`ml-3 inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          rule.severity === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : rule.severity === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : rule.severity === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {severityOptions.find(s => s.value === rule.severity)?.label}
                      </span>
                      <span
                        className={`ml-2 inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {rule.enabled ? '启用' : '禁用'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {availableMetrics.find(m => m.value === rule.metric)?.label}{' '}
                      {operatorOptions.find(o => o.value === rule.operator)?.label} {rule.threshold}{' '}
                      持续 {formatDuration(rule.duration)}
                    </p>
                    {rule.description && (
                      <p className="text-sm text-gray-500 mt-1">{rule.description}</p>
                    )}
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-gray-500 mr-4">
                        创建时间: {new Date(rule.createdAt).toLocaleString()}
                      </span>
                      {rule.notificationChannels.length > 0 && (
                        <div className="flex items-center">
                          <span className="text-xs text-gray-400 mr-1">🔔</span>
                          <span className="text-xs text-gray-500">
                            {rule.notificationChannels.length} 个通知渠道
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleRuleStatus(rule.id, !rule.enabled)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        rule.enabled
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {rule.enabled ? '禁用' : '启用'}
                    </button>
                    <button
                      onClick={() => handleEdit(rule)}
                      className="text-blue-500 hover:text-blue-700 p-2"
                    >
                      <span>✏️</span>
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      <span>🗑️</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertConfig;
