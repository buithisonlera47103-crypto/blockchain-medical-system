import { Search, Plus, Edit, Trash2, UserCheck, UserX, Download, RefreshCw } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast, Toaster } from 'sonner';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin' | 'super_admin' | 'hospital_admin';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLogin: string;
  hospital?: string;
  department?: string;
}

const UserManagementContent: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  // const [showAddModal, setShowAddModal] = useState(false); // 暂时不使用添加模态框
  // const [showEditModal, setShowEditModal] = useState(false); // 暂时不使用编辑模态框
  // const [editingUser, setEditingUser] = useState<User | null>(null); // 暂时不使用编辑用户

  // 模拟用户数据
  useEffect(() => {
    const mockUsers: User[] = [
      {
        id: '1',
        username: 'admin001',
        email: 'admin@hospital.com',
        role: 'admin',
        status: 'active',
        createdAt: '2024-01-15',
        lastLogin: '2024-01-20 10:30',
        hospital: '中心医院',
        department: '管理部',
      },
      {
        id: '2',
        username: 'doctor_zhang',
        email: 'zhang@hospital.com',
        role: 'doctor',
        status: 'active',
        createdAt: '2024-01-10',
        lastLogin: '2024-01-20 09:15',
        hospital: '中心医院',
        department: '内科',
      },
      {
        id: '3',
        username: 'patient_li',
        email: 'li@email.com',
        role: 'patient',
        status: 'active',
        createdAt: '2024-01-12',
        lastLogin: '2024-01-19 14:20',
        hospital: '中心医院',
      },
      {
        id: '4',
        username: 'doctor_wang',
        email: 'wang@hospital.com',
        role: 'doctor',
        status: 'inactive',
        createdAt: '2024-01-08',
        lastLogin: '2024-01-18 16:45',
        hospital: '中心医院',
        department: '外科',
      },
    ];

    setTimeout(() => {
      setUsers(mockUsers);
      setLoading(false);
    }, 1000);
  }, []);

  const getRoleLabel = (role: string) => {
    const roleMap = {
      patient: '患者',
      doctor: '医生',
      admin: '管理员',
      super_admin: '超级管理员',
      hospital_admin: '医院管理员',
    };
    return roleMap[role as keyof typeof roleMap] || role;
  };

  const getStatusLabel = (status: string) => {
    const statusMap = {
      active: '活跃',
      inactive: '非活跃',
      suspended: '已暂停',
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  const handleEditUser = (user: User) => {
    // setEditingUser(user);
    // setShowEditModal(true);
    toast.info(`编辑用户功能开发中: ${user.username}`);
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('确定要删除这个用户吗？')) {
      setUsers(prev => prev.filter(user => user.id !== userId));
      toast.success('用户删除成功');
    }
  };

  const handleBatchAction = (action: string) => {
    if (selectedUsers.length === 0) {
      toast.error('请先选择用户');
      return;
    }

    switch (action) {
      case 'activate':
        setUsers(prev =>
          prev.map(user =>
            selectedUsers.includes(user.id) ? { ...user, status: 'active' as const } : user
          )
        );
        toast.success(`已激活 ${selectedUsers.length} 个用户`);
        break;
      case 'deactivate':
        setUsers(prev =>
          prev.map(user =>
            selectedUsers.includes(user.id) ? { ...user, status: 'inactive' as const } : user
          )
        );
        toast.success(`已停用 ${selectedUsers.length} 个用户`);
        break;
      case 'delete':
        if (window.confirm(`确定要删除选中的 ${selectedUsers.length} 个用户吗？`)) {
          setUsers(prev => prev.filter(user => !selectedUsers.includes(user.id)));
          toast.success(`已删除 ${selectedUsers.length} 个用户`);
        }
        break;
    }
    setSelectedUsers([]);
  };

  const handleExport = () => {
    const csvContent = [
      ['用户名', '邮箱', '角色', '状态', '创建时间', '最后登录', '医院', '科室'],
      ...filteredUsers.map(user => [
        user.username,
        user.email,
        getRoleLabel(user.role),
        getStatusLabel(user.status),
        user.createdAt,
        user.lastLogin,
        user.hospital || '',
        user.department || '',
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `用户列表_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('用户列表导出成功');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载用户数据中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="text-gray-600">管理系统中的所有用户账户</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setLoading(true)}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </button>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            导出
          </button>
          <button
            onClick={() => toast.info('添加用户功能开发中')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            添加用户
          </button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索用户名或邮箱..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">所有角色</option>
              <option value="patient">患者</option>
              <option value="doctor">医生</option>
              <option value="admin">管理员</option>
              <option value="super_admin">超级管理员</option>
              <option value="hospital_admin">医院管理员</option>
            </select>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">所有状态</option>
              <option value="active">活跃</option>
              <option value="inactive">非活跃</option>
              <option value="suspended">已暂停</option>
            </select>
          </div>
        </div>
      </div>

      {/* 批量操作 */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800">已选择 {selectedUsers.length} 个用户</span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBatchAction('activate')}
                className="flex items-center px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                <UserCheck className="w-4 h-4 mr-1" />
                激活
              </button>
              <button
                onClick={() => handleBatchAction('deactivate')}
                className="flex items-center px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
              >
                <UserX className="w-4 h-4 mr-1" />
                停用
              </button>
              <button
                onClick={() => handleBatchAction('delete')}
                className="flex items-center px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 用户列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedUsers.length === filteredUsers.length && filteredUsers.length > 0
                    }
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最后登录
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.username}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {user.hospital && (
                        <div className="text-xs text-gray-400">
                          {user.hospital} {user.department && `- ${user.department}`}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}
                    >
                      {getStatusLabel(user.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{user.lastLogin}</td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">没有找到匹配的用户</div>
          </div>
        )}
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-blue-600">{users.length}</div>
          <div className="text-sm text-gray-600">总用户数</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-green-600">
            {users.filter(u => u.status === 'active').length}
          </div>
          <div className="text-sm text-gray-600">活跃用户</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-yellow-600">
            {users.filter(u => u.role === 'doctor').length}
          </div>
          <div className="text-sm text-gray-600">医生用户</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-purple-600">
            {users.filter(u => u.role === 'patient').length}
          </div>
          <div className="text-sm text-gray-600">患者用户</div>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default UserManagementContent;
