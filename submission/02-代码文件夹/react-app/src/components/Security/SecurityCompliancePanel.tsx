import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Download,
  FileText,
  Activity,
  RefreshCw,
  ExternalLink,
  Database
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { apiRequest } from '../../utils/api';

interface SecurityEvent {
  id: string;
  eventType: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'UNAUTHORIZED_ACCESS' | 'DATA_BREACH' | 'PRIVACY_VIOLATION' | 'SUSPICIOUS_ACTIVITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId: string;
  userInfo: {
    username: string;
    role: string;
    department?: string;
  };
  ipAddress: string;
  userAgent: string;
  resource: string;
  action: string;
  timestamp: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  notes?: string;
  geolocation?: {
    country: string;
    city: string;
    coordinates: [number, number];
  };
}

interface ComplianceStatus {
  framework: 'HIPAA' | 'GDPR' | 'SOC2' | 'ISO27001';
  score: number;
  lastAudit: string;
  nextAudit: string;
  status: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
  requirements: Array<{
    id: string;
    name: string;
    status: 'MET' | 'PARTIAL' | 'NOT_MET';
    description: string;
    evidence?: string;
  }>;
}

interface ThreatIntelligence {
  id: string;
  type: 'MALWARE' | 'PHISHING' | 'BRUTE_FORCE' | 'DDoS' | 'DATA_EXFILTRATION';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  indicators: string[];
  mitigation: string[];
  lastSeen: string;
  affectedSystems: string[];
}

const SecurityCompliancePanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'events' | 'compliance' | 'threats' | 'audit'>('dashboard');
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus[]>([]);
  const [threatIntelligence, setThreatIntelligence] = useState<ThreatIntelligence[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    severity: '',
    eventType: '',
    dateRange: '7d',
    resolved: ''
  });

  // 获取安全数据
  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const [eventsRes, complianceRes, threatsRes] = await Promise.all([
        apiRequest('/api/v1/security/events'),
        apiRequest('/api/v1/security/compliance'),
        apiRequest('/api/v1/security/threats')
      ]);

      setSecurityEvents(eventsRes.events || []);
      setComplianceStatus(complianceRes.frameworks || []);
      setThreatIntelligence(threatsRes.threats || []);
    } catch (error) {
      console.error('获取安全数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  // 解决安全事件
  const resolveSecurityEvent = async (eventId: string, notes: string) => {
    try {
      await apiRequest(`/api/v1/security/events/${eventId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      fetchSecurityData();
    } catch (error) {
      console.error('解决安全事件失败:', error);
    }
  };

  // 生成合规报告
  const generateComplianceReport = async (framework: string) => {
    try {
      const response = await apiRequest(`/api/v1/security/compliance/${framework}/report`);
      // 下载报告
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${framework}-compliance-report.pdf`;
      a.click();
    } catch (error) {
      console.error('生成合规报告失败:', error);
    }
  };

  // 渲染仪表板
  const renderDashboard = () => {
    const recentEvents = securityEvents.slice(0, 10);
    const criticalEvents = securityEvents.filter(e => e.severity === 'CRITICAL').length;
    const unresolvedEvents = securityEvents.filter(e => !e.resolved).length;
    const avgComplianceScore = complianceStatus.reduce((sum, c) => sum + c.score, 0) / complianceStatus.length;

    return (
      <div className="space-y-6">
        {/* 安全概览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">关键事件</p>
                <p className="text-2xl font-bold text-red-600">{criticalEvents}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">未解决事件</p>
                <p className="text-2xl font-bold text-orange-600">{unresolvedEvents}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">合规评分</p>
                <p className="text-2xl font-bold text-blue-600">{avgComplianceScore.toFixed(1)}%</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">威胁数量</p>
                <p className="text-2xl font-bold text-purple-600">{threatIntelligence.length}</p>
              </div>
              <Database className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* 最近安全事件 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">最近安全事件</h3>
            <button
              onClick={() => setActiveTab('events')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              查看全部 <ExternalLink className="inline ml-1" size={14} />
            </button>
          </div>
          
          <div className="space-y-3">
            {recentEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    event.severity === 'CRITICAL' ? 'bg-red-500' :
                    event.severity === 'HIGH' ? 'bg-orange-500' :
                    event.severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div>
                    <p className="font-medium text-sm">{event.eventType.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">{event.userInfo.username} • {event.ipAddress}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleString()}</p>
                  {event.resolved ? (
                    <CheckCircle className="h-4 w-4 text-green-500 ml-auto mt-1" />
                  ) : (
                    <Clock className="h-4 w-4 text-orange-500 ml-auto mt-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 合规状态概览 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">合规框架状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {complianceStatus.map((framework) => (
              <div key={framework.framework} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{framework.framework}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    framework.status === 'COMPLIANT' ? 'bg-green-100 text-green-800' :
                    framework.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {framework.status === 'COMPLIANT' ? '合规' :
                     framework.status === 'PARTIAL' ? '部分合规' : '不合规'}
                  </span>
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>评分</span>
                    <span>{framework.score}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        framework.score >= 80 ? 'bg-green-500' :
                        framework.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${framework.score}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  下次审计: {new Date(framework.nextAudit).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 渲染安全事件列表
  const renderSecurityEvents = () => (
    <div className="space-y-6">
      {/* 过滤器 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">安全事件</h3>
          <button
            onClick={fetchSecurityData}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
          >
            <RefreshCw size={16} />
            <span>刷新</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.severity}
            onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">所有严重程度</option>
            <option value="CRITICAL">关键</option>
            <option value="HIGH">高</option>
            <option value="MEDIUM">中</option>
            <option value="LOW">低</option>
          </select>

          <select
            value={filters.eventType}
            onChange={(e) => setFilters(prev => ({ ...prev, eventType: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">所有事件类型</option>
            <option value="LOGIN_FAILED">登录失败</option>
            <option value="UNAUTHORIZED_ACCESS">未授权访问</option>
            <option value="DATA_BREACH">数据泄露</option>
            <option value="PRIVACY_VIOLATION">隐私违规</option>
            <option value="SUSPICIOUS_ACTIVITY">可疑活动</option>
          </select>

          <select
            value={filters.resolved}
            onChange={(e) => setFilters(prev => ({ ...prev, resolved: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">所有状态</option>
            <option value="true">已解决</option>
            <option value="false">未解决</option>
          </select>

          <select
            value={filters.dateRange}
            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1d">过去1天</option>
            <option value="7d">过去7天</option>
            <option value="30d">过去30天</option>
            <option value="90d">过去90天</option>
          </select>
        </div>
      </div>

      {/* 事件列表 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  事件
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  位置
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {securityEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        event.severity === 'CRITICAL' ? 'bg-red-500' :
                        event.severity === 'HIGH' ? 'bg-orange-500' :
                        event.severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {event.eventType.replace(/_/g, ' ')}
                        </div>
                        <div className="text-sm text-gray-500">{event.severity}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{event.userInfo.username}</div>
                    <div className="text-sm text-gray-500">{event.userInfo.role}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{event.ipAddress}</div>
                    {event.geolocation && (
                      <div className="text-sm text-gray-500">
                        {event.geolocation.city}, {event.geolocation.country}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {event.resolved ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        已解决
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        未解决
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye size={16} />
                      </button>
                      {!event.resolved && (
                        <button 
                          onClick={() => resolveSecurityEvent(event.id, '管理员手动解决')}
                          className="text-green-600 hover:text-green-900"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // 渲染合规管理
  const renderComplianceManagement = () => (
    <div className="space-y-6">
      {complianceStatus.map((framework) => (
        <div key={framework.framework} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">{framework.framework} 合规状态</h3>
              <p className="text-gray-600">评分: {framework.score}% • 状态: {
                framework.status === 'COMPLIANT' ? '合规' :
                framework.status === 'PARTIAL' ? '部分合规' : '不合规'
              }</p>
            </div>
            <button
              onClick={() => generateComplianceReport(framework.framework)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Download size={16} />
              <span>生成报告</span>
            </button>
          </div>

          <div className="space-y-4">
            {framework.requirements.map((req) => (
              <div key={req.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{req.name}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    req.status === 'MET' ? 'bg-green-100 text-green-800' :
                    req.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {req.status === 'MET' ? '已满足' :
                     req.status === 'PARTIAL' ? '部分满足' : '未满足'}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-2">{req.description}</p>
                {req.evidence && (
                  <div className="text-xs text-gray-500">
                    证据: {req.evidence}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="mr-3 text-blue-600" size={28} />
            企业安全合规中心
          </h1>
          <p className="text-gray-600 mt-2">
            全面的安全监控、威胁检测和合规管理
          </p>
        </div>

        {/* 标签导航 */}
        <div className="flex border-b border-gray-200">
          {[
            { key: 'dashboard', label: '安全概览', icon: Activity },
            { key: 'events', label: '安全事件', icon: AlertTriangle },
            { key: 'compliance', label: '合规管理', icon: Shield },
            { key: 'threats', label: '威胁情报', icon: Database },
            { key: 'audit', label: '审计日志', icon: FileText }
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
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'events' && renderSecurityEvents()}
            {activeTab === 'compliance' && renderComplianceManagement()}
            {activeTab === 'threats' && (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">威胁情报功能开发中...</p>
              </div>
            )}
            {activeTab === 'audit' && (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">审计日志功能开发中...</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SecurityCompliancePanel;