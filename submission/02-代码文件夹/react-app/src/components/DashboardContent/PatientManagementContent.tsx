import { Users, Search, Filter, Eye, Phone, Mail, Calendar, FileText } from 'lucide-react';
import React, { useState } from 'react';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  phone: string;
  email: string;
  lastVisit: string;
  nextAppointment?: string;
  condition: string;
  status: 'stable' | 'critical' | 'recovering' | 'follow_up';
  recordsCount: number;
}

const PatientManagementContent: React.FC = () => {
  const [patients] = useState<Patient[]>([
    {
      id: 'P001234',
      name: '张三',
      age: 45,
      gender: 'male',
      phone: '138-0000-1234',
      email: 'zhang.san@email.com',
      lastVisit: '2024-01-15',
      nextAppointment: '2024-01-20',
      condition: '高血压',
      status: 'stable',
      recordsCount: 5,
    },
    {
      id: 'P001235',
      name: '李四',
      age: 38,
      gender: 'female',
      phone: '139-0000-5678',
      email: 'li.si@email.com',
      lastVisit: '2024-01-10',
      nextAppointment: '2024-01-18',
      condition: '糖尿病',
      status: 'follow_up',
      recordsCount: 8,
    },
    {
      id: 'P001236',
      name: '王五',
      age: 52,
      gender: 'male',
      phone: '137-0000-9012',
      email: 'wang.wu@email.com',
      lastVisit: '2024-01-08',
      condition: '心脏病',
      status: 'critical',
      recordsCount: 12,
    },
    {
      id: 'P001237',
      name: '赵六',
      age: 29,
      gender: 'female',
      phone: '136-0000-3456',
      email: 'zhao.liu@email.com',
      lastVisit: '2024-01-05',
      nextAppointment: '2024-01-22',
      condition: '术后恢复',
      status: 'recovering',
      recordsCount: 3,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const getStatusColor = (status: string) => {
    const colors = {
      stable: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      recovering: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      follow_up: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      stable: '稳定',
      critical: '危重',
      recovering: '恢复中',
      follow_up: '随访',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.condition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || patient.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              患者管理
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              管理您负责的患者信息和医疗记录
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>添加患者</span>
          </button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="搜索患者姓名、ID或病情..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">全部状态</option>
                <option value="stable">稳定</option>
                <option value="critical">危重</option>
                <option value="recovering">恢复中</option>
                <option value="follow_up">随访</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">总患者数</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{patients.length}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">今日预约</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {patients.filter(p => p.nextAppointment === '2024-01-20').length}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">医疗记录</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {patients.reduce((sum, p) => sum + p.recordsCount, 0)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <span className="text-red-600 dark:text-red-400 font-bold">!</span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">危重患者</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {patients.filter(p => p.status === 'critical').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 患者列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            患者列表 ({filteredPatients.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredPatients.map((patient) => (
            <div key={patient.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {patient.name}
                      </h4>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({patient.id})
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(patient.status)}`}>
                        {getStatusLabel(patient.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium">年龄:</span> {patient.age}岁 ({patient.gender === 'male' ? '男' : '女'})
                      </div>
                      <div>
                        <span className="font-medium">病情:</span> {patient.condition}
                      </div>
                      <div>
                        <span className="font-medium">上次就诊:</span> {patient.lastVisit}
                      </div>
                      <div>
                        <span className="font-medium">下次预约:</span> {patient.nextAppointment || '无'}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Phone className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                    <Mail className="w-4 h-4" />
                  </button>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>查看详情</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredPatients.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            暂无患者记录
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            没有找到符合条件的患者
          </p>
        </div>
      )}
    </div>
  );
};

export default PatientManagementContent;
