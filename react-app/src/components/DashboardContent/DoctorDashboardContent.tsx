import {
  Search,
  Eye,
  Download,
  Share2,
  FileText,
  CheckCircle,
  XCircle,
  Send,
  Stethoscope,
  User,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface PatientRecord {
  id: string;
  patientId: string;
  patientName: string;
  recordType: string;
  department: string;
  createdAt: string;
  status: 'active' | 'draft' | 'archived';
  fileSize: string;
  description: string;
  hasAccess: boolean;
  lastAccessed?: string;
}

interface AccessRequest {
  recordId: string;
  patientId: string;
  patientName: string;
  recordTitle: string;
  action: 'read' | 'write' | 'share';
  purpose: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
}

const DoctorDashboardContent: React.FC = () => {
  // const { user } = useAuth();
  // const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [patientRecords, setPatientRecords] = useState<PatientRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<PatientRecord[]>([]);
  const [showAccessRequestForm, setShowAccessRequestForm] = useState(false);
  // const [selectedRecord, setSelectedRecord] = useState<PatientRecord | null>(null);
  const [accessRequest, setAccessRequest] = useState<AccessRequest>({
    recordId: '',
    patientId: '',
    patientName: '',
    recordTitle: '',
    action: 'read',
    purpose: '',
    urgency: 'medium',
  });
  const [loading, setLoading] = useState(true);

  // Load patient records data
  useEffect(() => {
    // Mock data for demonstration
    const mockRecords: PatientRecord[] = [
      {
        id: 'rec_001',
        patientId: 'pat_001',
        patientName: '张三',
        recordType: '诊断报告',
        department: '内科',
        createdAt: '2024-01-15T09:00:00Z',
        status: 'active',
        fileSize: '2.3MB',
        description: '常规体检诊断报告',
        hasAccess: true,
        lastAccessed: '2024-01-20T10:30:00Z',
      },
      {
        id: 'rec_002',
        patientId: 'pat_002',
        patientName: '李四',
        recordType: '检查报告',
        department: '心内科',
        createdAt: '2024-01-10T11:30:00Z',
        status: 'active',
        fileSize: '1.8MB',
        description: '心电图检查报告',
        hasAccess: false,
      },
      {
        id: 'rec_003',
        patientId: 'pat_003',
        patientName: '王五',
        recordType: '处方记录',
        department: '内科',
        createdAt: '2024-01-08T16:45:00Z',
        status: 'active',
        fileSize: '0.5MB',
        description: '感冒药物处方',
        hasAccess: true,
        lastAccessed: '2024-01-18T14:20:00Z',
      },
      {
        id: 'rec_004',
        patientId: 'pat_004',
        patientName: '赵六',
        recordType: '影像资料',
        department: '放射科',
        createdAt: '2024-01-05T08:15:00Z',
        status: 'active',
        fileSize: '15.2MB',
        description: 'CT扫描影像',
        hasAccess: false,
      },
    ];

    setPatientRecords(mockRecords);
    setLoading(false);
  }, []);

  // Filter records based on search and filters
  useEffect(() => {
    let filtered = patientRecords.filter(record => {
      const matchesSearch =
        record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.recordType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment =
        selectedDepartment === 'all' || record.department === selectedDepartment;
      const matchesStatus = selectedStatus === 'all' || record.status === selectedStatus;

      return matchesSearch && matchesDepartment && matchesStatus;
    });

    setFilteredRecords(filtered);
  }, [searchTerm, selectedDepartment, selectedStatus, patientRecords]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleRequestAccess = (record: PatientRecord) => {
    // setSelectedRecord(record);
    setAccessRequest({
      recordId: record.id,
      patientId: record.patientId,
      patientName: record.patientName,
      recordTitle: `${record.recordType} - ${record.description}`,
      action: 'read',
      purpose: '',
      urgency: 'medium',
    });
    setShowAccessRequestForm(true);
  };

  const handleSubmitAccessRequest = async () => {
    try {
      // API call to submit access request
      console.log('Submitting access request:', accessRequest);

      // Reset form
      setShowAccessRequestForm(false);
      // setSelectedRecord(null);
      setAccessRequest({
        recordId: '',
        patientId: '',
        patientName: '',
        recordTitle: '',
        action: 'read',
        purpose: '',
        urgency: 'medium',
      });

      // Show success message
      alert('访问请求已提交，等待患者审批');
    } catch (error) {
      console.error('Failed to submit access request:', error);
      alert('提交失败，请重试');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'draft':
        return 'text-yellow-600 bg-yellow-50';
      case 'archived':
        return 'text-gray-600 bg-gray-50';
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
    <div className="doctor-dashboard space-y-6">
      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Stethoscope className="w-5 h-5 mr-2 text-blue-600" />
            患者病历查询
          </h2>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜索患者姓名、病历类型或描述..."
              value={searchTerm}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={e => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">所有科室</option>
            <option value="内科">内科</option>
            <option value="心内科">心内科</option>
            <option value="放射科">放射科</option>
            <option value="外科">外科</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">所有状态</option>
            <option value="active">活跃</option>
            <option value="draft">草稿</option>
            <option value="archived">已归档</option>
          </select>
        </div>
      </div>

      {/* Patient Records Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-green-600" />
            患者病历列表
          </h2>
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
            {filteredRecords.length} 条记录
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  患者
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  病历类型
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  科室
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  访问权限
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    暂无符合条件的病历记录
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {record.patientName}
                          </div>
                          <div className="text-sm text-gray-500">{record.patientId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{record.recordType}</div>
                      <div className="text-sm text-gray-500">{record.fileSize}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">{record.department}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {new Date(record.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}
                      >
                        {record.status === 'active'
                          ? '活跃'
                          : record.status === 'draft'
                            ? '草稿'
                            : '已归档'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {record.hasAccess ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          <span className="text-sm">有权限</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <XCircle className="w-4 h-4 mr-1" />
                          <span className="text-sm">无权限</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex space-x-2">
                        {record.hasAccess ? (
                          <>
                            <button className="p-1 text-gray-500 hover:text-blue-600" title="查看">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1 text-gray-500 hover:text-green-600" title="下载">
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1 text-gray-500 hover:text-purple-600"
                              title="分享"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRequestAccess(record)}
                            className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            title="申请访问权限"
                          >
                            <Send className="w-4 h-4 mr-1" />
                            申请权限
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Access Request Form Modal */}
      {showAccessRequestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">申请访问权限</h3>
              <button
                onClick={() => setShowAccessRequestForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">患者</label>
                <input
                  type="text"
                  value={accessRequest.patientName}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">病历</label>
                <input
                  type="text"
                  value={accessRequest.recordTitle}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">权限类型</label>
                <select
                  value={accessRequest.action}
                  onChange={e =>
                    setAccessRequest({ ...accessRequest, action: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="read">查看</option>
                  <option value="write">编辑</option>
                  <option value="share">分享</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">紧急程度</label>
                <select
                  value={accessRequest.urgency}
                  onChange={e =>
                    setAccessRequest({ ...accessRequest, urgency: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                  <option value="emergency">紧急</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">申请目的</label>
                <textarea
                  value={accessRequest.purpose}
                  onChange={e => setAccessRequest({ ...accessRequest, purpose: e.target.value })}
                  placeholder="请说明申请访问该病历的目的..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAccessRequestForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmitAccessRequest}
                disabled={!accessRequest.purpose.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                提交申请
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboardContent;
