import {
  Bell,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Share2,
  Shield,
  User,
  Calendar,
  FileText,
  Download,
  Lock,
  Unlock,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../hooks/useAuth';

interface AccessRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterRole: string;
  recordId: string;
  recordTitle: string;
  action: 'read' | 'write' | 'share';
  purpose: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  expiresAt?: string;
}

interface MedicalRecord {
  id: string;
  title: string;
  type: string;
  department: string;
  doctor: string;
  createdAt: string;
  status: 'active' | 'draft' | 'archived';
  fileSize: string;
  description: string;
  accessCount: number;
}

interface Permission {
  id: string;
  recordId: string;
  recordTitle: string;
  granteeId: string;
  granteeName: string;
  granteeRole: string;
  action: 'read' | 'write' | 'share';
  grantedAt: string;
  expiresAt?: string;
  isActive: boolean;
  accessCount: number;
}

const PatientDashboardContent: React.FC = () => {
  const { user } = useAuth();
  // const { t } = useTranslation();
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<MedicalRecord[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  // Load patient data
  useEffect(() => {
    if (!user) return;

    // Mock data for demonstration
    const mockAccessRequests: AccessRequest[] = [
      {
        id: 'req_001',
        requesterId: 'doc_123',
        requesterName: '张医生',
        requesterRole: 'doctor',
        recordId: 'rec_001',
        recordTitle: '心电图检查报告',
        action: 'read',
        purpose: '诊疗需要',
        urgency: 'medium',
        requestedAt: '2024-01-20T10:30:00Z',
        status: 'pending',
      },
      {
        id: 'req_002',
        requesterId: 'doc_456',
        requesterName: '李医生',
        requesterRole: 'doctor',
        recordId: 'rec_002',
        recordTitle: '血液检查报告',
        action: 'read',
        purpose: '会诊需要',
        urgency: 'high',
        requestedAt: '2024-01-19T14:15:00Z',
        status: 'pending',
      },
    ];

    const mockMedicalHistory: MedicalRecord[] = [
      {
        id: 'rec_001',
        title: '心电图检查报告',
        type: '检查报告',
        department: '心内科',
        doctor: '王医生',
        createdAt: '2024-01-15T09:00:00Z',
        status: 'active',
        fileSize: '2.3MB',
        description: '心电图检查结果正常',
        accessCount: 3,
      },
      {
        id: 'rec_002',
        title: '血液检查报告',
        type: '检查报告',
        department: '内科',
        doctor: '李医生',
        createdAt: '2024-01-10T11:30:00Z',
        status: 'active',
        fileSize: '1.8MB',
        description: '血常规检查结果',
        accessCount: 2,
      },
      {
        id: 'rec_003',
        title: '处方记录',
        type: '处方',
        department: '内科',
        doctor: '张医生',
        createdAt: '2024-01-08T16:45:00Z',
        status: 'active',
        fileSize: '0.5MB',
        description: '感冒药物处方',
        accessCount: 1,
      },
    ];

    const mockPermissions: Permission[] = [
      {
        id: 'perm_001',
        recordId: 'rec_001',
        recordTitle: '心电图检查报告',
        granteeId: 'doc_789',
        granteeName: '赵医生',
        granteeRole: 'doctor',
        action: 'read',
        grantedAt: '2024-01-16T10:00:00Z',
        expiresAt: '2024-02-16T10:00:00Z',
        isActive: true,
        accessCount: 2,
      },
      {
        id: 'perm_002',
        recordId: 'rec_002',
        recordTitle: '血液检查报告',
        granteeId: 'nurse_001',
        granteeName: '护士小王',
        granteeRole: 'nurse',
        action: 'read',
        grantedAt: '2024-01-12T14:30:00Z',
        expiresAt: '2024-01-22T14:30:00Z',
        isActive: false,
        accessCount: 1,
      },
    ];

    setAccessRequests(mockAccessRequests);
    setMedicalHistory(mockMedicalHistory);
    setPermissions(mockPermissions);
    setLoading(false);
  }, [user]);

  const handleApproveRequest = async (requestId: string) => {
    try {
      // API call to approve request
      setAccessRequests(prev =>
        prev.map(req => (req.id === requestId ? { ...req, status: 'approved' as const } : req))
      );
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      // API call to reject request
      setAccessRequests(prev =>
        prev.map(req => (req.id === requestId ? { ...req, status: 'rejected' as const } : req))
      );
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const handleRevokePermission = async (permissionId: string) => {
    try {
      // API call to revoke permission
      setPermissions(prev =>
        prev.map(perm => (perm.id === permissionId ? { ...perm, isActive: false } : perm))
      );
    } catch (error) {
      console.error('Failed to revoke permission:', error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'approved':
        return 'text-green-600 bg-green-50';
      case 'rejected':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="patient-dashboard space-y-6">
      {/* Access Requests Section */}
      <div className="access-requests bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Bell className="w-5 h-5 mr-2 text-blue-600" />
            访问请求
          </h2>
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
            {accessRequests.filter(req => req.status === 'pending').length} 待处理
          </span>
        </div>

        <div className="space-y-3">
          {accessRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无访问请求</p>
          ) : (
            accessRequests.map(request => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-800">{request.requesterName}</span>
                      <span className="text-sm text-gray-500">({request.requesterRole})</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(request.urgency)}`}
                      >
                        {request.urgency}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{request.recordTitle}</span>
                      <span className="text-sm text-gray-500">({request.action})</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{request.purpose}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(request.requestedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}
                    >
                      {request.status === 'pending'
                        ? '待处理'
                        : request.status === 'approved'
                          ? '已批准'
                          : '已拒绝'}
                    </span>
                    {request.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveRequest(request.id)}
                          className="flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          批准
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          拒绝
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Medical History Section */}
      <div className="medical-history bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-green-600" />
            医疗记录
          </h2>
          <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
            {medicalHistory.length} 条记录
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {medicalHistory.map(record => (
            <div
              key={record.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-medium text-gray-800 text-sm">{record.title}</h3>
                <span className="text-xs text-gray-500">{record.fileSize}</span>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <span className="w-16 text-gray-500">类型:</span>
                  <span>{record.type}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-16 text-gray-500">科室:</span>
                  <span>{record.department}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-16 text-gray-500">医生:</span>
                  <span>{record.doctor}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-16 text-gray-500">日期:</span>
                  <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-16 text-gray-500">访问:</span>
                  <span>{record.accessCount} 次</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{record.description}</p>

              <div className="flex items-center justify-between mt-4">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    record.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : record.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {record.status === 'active'
                    ? '活跃'
                    : record.status === 'draft'
                      ? '草稿'
                      : '已归档'}
                </span>

                <div className="flex space-x-2">
                  <button className="p-1 text-gray-500 hover:text-blue-600">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-gray-500 hover:text-green-600">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-gray-500 hover:text-purple-600">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Permission Control Section */}
      <div className="permission-control bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-purple-600" />
            权限管理
          </h2>
          <span className="bg-purple-100 text-purple-800 text-sm font-medium px-2.5 py-0.5 rounded">
            {permissions.filter(perm => perm.isActive).length} 个活跃权限
          </span>
        </div>

        <div className="space-y-3">
          {permissions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无权限记录</p>
          ) : (
            permissions.map(permission => (
              <div key={permission.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-800">{permission.granteeName}</span>
                      <span className="text-sm text-gray-500">({permission.granteeRole})</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          permission.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {permission.isActive ? '活跃' : '已撤销'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{permission.recordTitle}</span>
                      <span className="text-sm text-gray-500">({permission.action})</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>授权: {new Date(permission.grantedAt).toLocaleDateString()}</span>
                      </div>
                      {permission.expiresAt && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>过期: {new Date(permission.expiresAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>访问: {permission.accessCount} 次</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {permission.isActive ? (
                      <button
                        onClick={() => handleRevokePermission(permission.id)}
                        className="flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        <Lock className="w-4 h-4 mr-1" />
                        撤销
                      </button>
                    ) : (
                      <span className="flex items-center px-3 py-1 bg-gray-100 text-gray-500 text-sm rounded">
                        <Unlock className="w-4 h-4 mr-1" />
                        已撤销
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboardContent;
