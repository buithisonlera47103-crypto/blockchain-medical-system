import {
  Eye,
  Download,
  Search,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

interface AuditStats {
  totalLogs: number;
  todayLogs: number;
  successRate: number;
  criticalEvents: number;
  topUsers: { userId: string; userName: string; count: number }[];
  topActions: { action: string; count: number }[];
}

const AuditLogContent: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // 模拟审计日志数据
  useEffect(() => {
    const generateMockLogs = (): AuditLog[] => {
      const actions = [
        { action: '用户登录', resource: 'auth', category: '认证' },
        { action: '用户登出', resource: 'auth', category: '认证' },
        { action: '查看病历', resource: 'medical_record', category: '医疗数据' },
        { action: '编辑病历', resource: 'medical_record', category: '医疗数据' },
        { action: '创建用户', resource: 'user', category: '用户管理' },
        { action: '删除用户', resource: 'user', category: '用户管理' },
        { action: '修改权限', resource: 'permission', category: '权限管理' },
        { action: '导出数据', resource: 'data', category: '数据操作' },
        { action: '系统配置', resource: 'system', category: '系统管理' },
        { action: '密码重置', resource: 'auth', category: '认证' },
      ];

      const users = [
        { id: 'u1', name: '张医生', role: 'doctor' },
        { id: 'u2', name: '李管理员', role: 'admin' },
        { id: 'u3', name: '王患者', role: 'patient' },
        { id: 'u4', name: '陈护士', role: 'nurse' },
        { id: 'u5', name: '刘院长', role: 'hospital_admin' },
      ];

      const statuses: ('success' | 'failure' | 'warning')[] = ['success', 'failure', 'warning'];
      const severities: ('low' | 'medium' | 'high' | 'critical')[] = [
        'low',
        'medium',
        'high',
        'critical',
      ];

      const mockLogs: AuditLog[] = [];

      for (let i = 0; i < 200; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const actionData = actions[Math.floor(Math.random() * actions.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const severity = severities[Math.floor(Math.random() * severities.length)];

        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        date.setHours(Math.floor(Math.random() * 24));
        date.setMinutes(Math.floor(Math.random() * 60));

        mockLogs.push({
          id: `log_${i + 1}`,
          timestamp: date.toISOString(),
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: actionData.action,
          resource: actionData.resource,
          resourceId: `res_${Math.floor(Math.random() * 1000)}`,
          details: `${user.name}执行了${actionData.action}操作`,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status,
          severity,
          category: actionData.category,
        });
      }

      return mockLogs.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    };

    const mockLogs = generateMockLogs();

    // 计算统计数据
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = mockLogs.filter(log => log.timestamp.startsWith(today));
    const successLogs = mockLogs.filter(log => log.status === 'success');
    const criticalLogs = mockLogs.filter(log => log.severity === 'critical');

    // 统计用户活动
    const userCounts: { [key: string]: { userName: string; count: number } } = {};
    mockLogs.forEach(log => {
      if (!userCounts[log.userId]) {
        userCounts[log.userId] = { userName: log.userName, count: 0 };
      }
      userCounts[log.userId].count++;
    });

    const topUsers = Object.entries(userCounts)
      .map(([userId, data]) => ({ userId, userName: data.userName, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 统计操作类型
    const actionCounts: { [key: string]: number } = {};
    mockLogs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const mockStats: AuditStats = {
      totalLogs: mockLogs.length,
      todayLogs: todayLogs.length,
      successRate: Math.round((successLogs.length / mockLogs.length) * 100),
      criticalEvents: criticalLogs.length,
      topUsers,
      topActions,
    };

    setTimeout(() => {
      setLogs(mockLogs);
      setStats(mockStats);
      setLoading(false);
    }, 1000);
  }, []);

  // 过滤日志
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress.includes(searchTerm);

    const matchesStatus = selectedStatus === 'all' || log.status === selectedStatus;
    const matchesSeverity = selectedSeverity === 'all' || log.severity === selectedSeverity;
    const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;

    let matchesDateRange = true;
    if (dateRange.start && dateRange.end) {
      const logDate = log.timestamp.split('T')[0];
      matchesDateRange = logDate >= dateRange.start && logDate <= dateRange.end;
    }

    return matchesSearch && matchesStatus && matchesSeverity && matchesCategory && matchesDateRange;
  });

  // 分页
  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failure':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['时间', '用户', '角色', '操作', '资源', '状态', '严重程度', 'IP地址', '详情'].join(','),
      ...filteredLogs.map(log =>
        [
          log.timestamp,
          log.userName,
          log.userRole,
          log.action,
          log.resource,
          log.status,
          log.severity,
          log.ipAddress,
          `"${log.details}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('审计日志导出成功');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载审计日志中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">审计日志</h1>
          <p className="text-gray-600">系统操作记录和安全审计</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          导出日志
        </button>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalLogs}</div>
                <div className="text-sm text-gray-600">总日志数</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.todayLogs}</div>
                <div className="text-sm text-gray-600">今日日志</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.successRate}%</div>
                <div className="text-sm text-gray-600">成功率</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.criticalEvents}</div>
                <div className="text-sm text-gray-600">严重事件</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 过滤器 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* 搜索框 */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索用户、操作、IP地址..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 状态筛选 */}
          <div>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">所有状态</option>
              <option value="success">成功</option>
              <option value="failure">失败</option>
              <option value="warning">警告</option>
            </select>
          </div>

          {/* 严重程度筛选 */}
          <div>
            <select
              value={selectedSeverity}
              onChange={e => setSelectedSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">所有级别</option>
              <option value="critical">严重</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>

          {/* 分类筛选 */}
          <div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">所有分类</option>
              <option value="认证">认证</option>
              <option value="医疗数据">医疗数据</option>
              <option value="用户管理">用户管理</option>
              <option value="权限管理">权限管理</option>
              <option value="数据操作">数据操作</option>
              <option value="系统管理">系统管理</option>
            </select>
          </div>
        </div>

        {/* 日期范围 */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  资源
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  严重程度
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP地址
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.timestamp).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                        <div className="text-xs text-gray-500">{log.userRole}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.action}</div>
                    <div className="text-xs text-gray-500">{log.category}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.resource}
                    {log.resourceId && (
                      <div className="text-xs text-gray-500">{log.resourceId}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(log.status)}
                      <span className="ml-2 text-sm text-gray-900 capitalize">{log.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(log.severity)}`}
                    >
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.ipAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button className="text-blue-600 hover:text-blue-900" title="查看详情">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                下一页
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  显示 <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> 到{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, filteredLogs.length)}
                  </span>{' '}
                  共 <span className="font-medium">{filteredLogs.length}</span> 条记录
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    上一页
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + Math.max(1, currentPage - 2);
                    if (page > totalPages) return null;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    下一页
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 统计图表区域 */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 活跃用户 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">活跃用户 TOP 5</h3>
            <div className="space-y-3">
              {stats.topUsers.map((user, index) => (
                <div key={user.userId} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3 ${
                        index === 0
                          ? 'bg-yellow-500'
                          : index === 1
                            ? 'bg-gray-400'
                            : index === 2
                              ? 'bg-orange-500'
                              : 'bg-blue-500'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{user.userName}</span>
                  </div>
                  <span className="text-sm text-gray-600">{user.count} 次操作</span>
                </div>
              ))}
            </div>
          </div>

          {/* 热门操作 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">热门操作 TOP 5</h3>
            <div className="space-y-3">
              {stats.topActions.map((action, index) => (
                <div key={action.action} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3 ${
                        index === 0
                          ? 'bg-yellow-500'
                          : index === 1
                            ? 'bg-gray-400'
                            : index === 2
                              ? 'bg-orange-500'
                              : 'bg-blue-500'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{action.action}</span>
                  </div>
                  <span className="text-sm text-gray-600">{action.count} 次</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogContent;
