import {
  Search,
  Plus,
  Edit,
  Trash2,
  Building,
  MapPin,
  Phone,
  Mail,
  Users,
  Settings,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Hospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  type: 'general' | 'specialized' | 'clinic' | 'emergency';
  level: '一级' | '二级' | '三级' | '特级';
  status: 'active' | 'inactive' | 'maintenance';
  establishedDate: string;
  totalBeds: number;
  totalDoctors: number;
  totalPatients: number;
  departments: Department[];
}

interface Department {
  id: string;
  name: string;
  description: string;
  head: string;
  doctorCount: number;
  bedCount: number;
  status: 'active' | 'inactive';
}

const HospitalManagementContent: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  // const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  // const [showAddModal, setShowAddModal] = useState(false);
  // const [showEditModal, setShowEditModal] = useState(false);
  // const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'hospitals' | 'departments'>('hospitals');

  // 模拟医院数据
  useEffect(() => {
    const mockHospitals: Hospital[] = [
      {
        id: '1',
        name: '中心医院',
        address: '北京市朝阳区建国路88号',
        phone: '010-12345678',
        email: 'info@central-hospital.com',
        website: 'www.central-hospital.com',
        type: 'general',
        level: '三级',
        status: 'active',
        establishedDate: '1985-06-15',
        totalBeds: 1200,
        totalDoctors: 350,
        totalPatients: 2800,
        departments: [
          {
            id: 'd1',
            name: '内科',
            description: '内科疾病诊疗',
            head: '张主任',
            doctorCount: 25,
            bedCount: 80,
            status: 'active',
          },
          {
            id: 'd2',
            name: '外科',
            description: '外科手术治疗',
            head: '李主任',
            doctorCount: 30,
            bedCount: 100,
            status: 'active',
          },
          {
            id: 'd3',
            name: '儿科',
            description: '儿童疾病诊疗',
            head: '王主任',
            doctorCount: 20,
            bedCount: 60,
            status: 'active',
          },
        ],
      },
      {
        id: '2',
        name: '人民医院',
        address: '上海市浦东新区世纪大道123号',
        phone: '021-87654321',
        email: 'contact@peoples-hospital.com',
        website: 'www.peoples-hospital.com',
        type: 'general',
        level: '二级',
        status: 'active',
        establishedDate: '1992-03-20',
        totalBeds: 800,
        totalDoctors: 200,
        totalPatients: 1500,
        departments: [
          {
            id: 'd4',
            name: '急诊科',
            description: '急诊医疗服务',
            head: '赵主任',
            doctorCount: 15,
            bedCount: 40,
            status: 'active',
          },
          {
            id: 'd5',
            name: '妇产科',
            description: '妇科产科诊疗',
            head: '陈主任',
            doctorCount: 18,
            bedCount: 50,
            status: 'active',
          },
        ],
      },
      {
        id: '3',
        name: '专科医院',
        address: '广州市天河区珠江路456号',
        phone: '020-11223344',
        email: 'info@specialty-hospital.com',
        type: 'specialized',
        level: '二级',
        status: 'maintenance',
        establishedDate: '2000-09-10',
        totalBeds: 300,
        totalDoctors: 80,
        totalPatients: 600,
        departments: [
          {
            id: 'd6',
            name: '心血管科',
            description: '心血管疾病专科',
            head: '刘主任',
            doctorCount: 12,
            bedCount: 30,
            status: 'active',
          },
        ],
      },
    ];

    setTimeout(() => {
      setHospitals(mockHospitals);
      setLoading(false);
    }, 1000);
  }, []);

  const getTypeLabel = (type: string) => {
    const typeMap = {
      general: '综合医院',
      specialized: '专科医院',
      clinic: '诊所',
      emergency: '急救中心',
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  const getStatusLabel = (status: string) => {
    const statusMap = {
      active: '正常运营',
      inactive: '暂停服务',
      maintenance: '维护中',
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredHospitals = hospitals.filter(hospital => {
    const matchesSearch =
      hospital.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hospital.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || hospital.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || hospital.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleEditHospital = (hospital: Hospital) => {
    // setSelectedHospital(hospital);
    // setShowEditModal(true);
    console.log('Edit hospital:', hospital);
  };

  const handleDeleteHospital = (hospitalId: string) => {
    if (window.confirm('确定要删除这家医院吗？')) {
      setHospitals(prev => prev.filter(hospital => hospital.id !== hospitalId));
      toast.success('医院删除成功');
    }
  };

  const handleManageDepartments = (hospital: Hospital) => {
    // setSelectedHospital(hospital);
    // setShowDepartmentModal(true);
    console.log('Manage departments for:', hospital);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载医院数据中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">医院管理</h1>
          <p className="text-gray-600">管理系统中的医院信息和科室设置</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => console.log('Add hospital')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            添加医院
          </button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('hospitals')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'hospitals'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building className="w-4 h-4 inline mr-2" />
            医院列表
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'departments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            科室管理
          </button>
        </nav>
      </div>

      {activeTab === 'hospitals' && (
        <>
          {/* 搜索和筛选 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="搜索医院名称或地址..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">所有类型</option>
                  <option value="general">综合医院</option>
                  <option value="specialized">专科医院</option>
                  <option value="clinic">诊所</option>
                  <option value="emergency">急救中心</option>
                </select>
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">所有状态</option>
                  <option value="active">正常运营</option>
                  <option value="inactive">暂停服务</option>
                  <option value="maintenance">维护中</option>
                </select>
              </div>
            </div>
          </div>

          {/* 医院列表 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredHospitals.map(hospital => (
              <div
                key={hospital.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{hospital.name}</h3>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(hospital.status)}`}
                      >
                        {getStatusLabel(hospital.status)}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditHospital(hospital)}
                        className="text-blue-600 hover:text-blue-900"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteHospital(hospital.id)}
                        className="text-red-600 hover:text-red-900"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      {hospital.address}
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      {hospital.phone}
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      {hospital.email}
                    </div>
                    <div className="flex items-center">
                      <Building className="w-4 h-4 mr-2" />
                      {getTypeLabel(hospital.type)} · {hospital.level}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-600">
                        {hospital.totalBeds}
                      </div>
                      <div className="text-xs text-gray-500">床位数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">
                        {hospital.totalDoctors}
                      </div>
                      <div className="text-xs text-gray-500">医生数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-purple-600">
                        {hospital.totalPatients}
                      </div>
                      <div className="text-xs text-gray-500">患者数</div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleManageDepartments(hospital)}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      科室管理
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredHospitals.length === 0 && (
            <div className="text-center py-12">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-500">没有找到匹配的医院</div>
            </div>
          )}
        </>
      )}

      {activeTab === 'departments' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">科室统计</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {hospitals.map(hospital => (
                <div key={hospital.id} className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">{hospital.name}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">科室数量:</span>
                      <span className="font-medium">{hospital.departments.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">医生总数:</span>
                      <span className="font-medium">
                        {hospital.departments.reduce((sum, dept) => sum + dept.doctorCount, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">床位总数:</span>
                      <span className="font-medium">
                        {hospital.departments.reduce((sum, dept) => sum + dept.bedCount, 0)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleManageDepartments(hospital)}
                    className="w-full mt-3 px-3 py-1 bg-blue-50 text-blue-600 rounded text-sm hover:bg-blue-100"
                  >
                    管理科室
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-blue-600">{hospitals.length}</div>
          <div className="text-sm text-gray-600">医院总数</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-green-600">
            {hospitals.filter(h => h.status === 'active').length}
          </div>
          <div className="text-sm text-gray-600">正常运营</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-yellow-600">
            {hospitals.reduce((sum, h) => sum + h.totalBeds, 0)}
          </div>
          <div className="text-sm text-gray-600">总床位数</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-purple-600">
            {hospitals.reduce((sum, h) => sum + h.departments.length, 0)}
          </div>
          <div className="text-sm text-gray-600">科室总数</div>
        </div>
      </div>
    </div>
  );
};

export default HospitalManagementContent;
