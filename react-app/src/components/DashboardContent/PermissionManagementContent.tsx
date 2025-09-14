import { Shield, Users, Lock, Key, Plus, Edit, Trash2, Search } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  isSystem: boolean;
}

// interface RolePermission {
//   roleId: string;
//   permissionId: string;
//   grantedAt: string;
//   grantedBy: string;
// }

const PermissionManagementContent: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  // const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'assignments'>('roles');
  const [searchTerm, setSearchTerm] = useState('');
  // const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  // const [showRoleModal, setShowRoleModal] = useState(false);
  // const [showPermissionModal, setShowPermissionModal] = useState(false);

  // 模拟权限数据
  useEffect(() => {
    const mockPermissions: Permission[] = [
      {
        id: 'p1',
        name: 'user.read',
        displayName: '查看用户',
        description: '查看用户信息和列表',
        category: '用户管理',
        isSystem: true,
      },
      {
        id: 'p2',
        name: 'user.write',
        displayName: '编辑用户',
        description: '创建、编辑和删除用户',
        category: '用户管理',
        isSystem: true,
      },
      {
        id: 'p3',
        name: 'medical.read',
        displayName: '查看病历',
        description: '查看患者病历信息',
        category: '医疗管理',
        isSystem: true,
      },
      {
        id: 'p4',
        name: 'medical.write',
        displayName: '编辑病历',
        description: '创建和编辑患者病历',
        category: '医疗管理',
        isSystem: true,
      },
      {
        id: 'p5',
        name: 'hospital.manage',
        displayName: '医院管理',
        description: '管理医院信息和科室',
        category: '医院管理',
        isSystem: true,
      },
      {
        id: 'p6',
        name: 'system.admin',
        displayName: '系统管理',
        description: '系统设置和配置管理',
        category: '系统管理',
        isSystem: true,
      },
      {
        id: 'p7',
        name: 'audit.read',
        displayName: '查看审计日志',
        description: '查看系统审计日志',
        category: '审计管理',
        isSystem: true,
      },
      {
        id: 'p8',
        name: 'report.generate',
        displayName: '生成报告',
        description: '生成各类统计报告',
        category: '报告管理',
        isSystem: true,
      },
    ];

    const mockRoles: Role[] = [
      {
        id: 'r1',
        name: 'super_admin',
        displayName: '超级管理员',
        description: '拥有系统所有权限的超级管理员',
        permissions: mockPermissions.map(p => p.id),
        userCount: 2,
        isSystem: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
      {
        id: 'r2',
        name: 'admin',
        displayName: '管理员',
        description: '系统管理员，拥有大部分管理权限',
        permissions: ['p1', 'p2', 'p3', 'p5', 'p7', 'p8'],
        userCount: 5,
        isSystem: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-15',
      },
      {
        id: 'r3',
        name: 'hospital_admin',
        displayName: '医院管理员',
        description: '医院级别的管理员',
        permissions: ['p1', 'p3', 'p5', 'p8'],
        userCount: 8,
        isSystem: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-10',
      },
      {
        id: 'r4',
        name: 'doctor',
        displayName: '医生',
        description: '医生角色，可以查看和编辑病历',
        permissions: ['p3', 'p4'],
        userCount: 150,
        isSystem: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-12',
      },
      {
        id: 'r5',
        name: 'patient',
        displayName: '患者',
        description: '患者角色，只能查看自己的信息',
        permissions: ['p3'],
        userCount: 2000,
        isSystem: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-08',
      },
    ];

    // const mockRolePermissions: RolePermission[] = [];
    // mockRoles.forEach(role => {
    //   role.permissions.forEach(permissionId => {
    //     mockRolePermissions.push({
    //       roleId: role.id,
    //       permissionId,
    //       grantedAt: role.updatedAt,
    //       grantedBy: 'system'
    //     });
    //   });
    // });

    setTimeout(() => {
      setPermissions(mockPermissions);
      setRoles(mockRoles);
      // setRolePermissions(mockRolePermissions);
      setLoading(false);
    }, 1000);
  }, []);

  const getPermissionsByCategory = () => {
    const categories: { [key: string]: Permission[] } = {};
    permissions.forEach(permission => {
      if (!categories[permission.category]) {
        categories[permission.category] = [];
      }
      categories[permission.category].push(permission);
    });
    return categories;
  };

  const getRolePermissions = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return [];
    return permissions.filter(p => role.permissions.includes(p.id));
  };

  const handleEditRole = (role: Role) => {
    // setSelectedRole(role);
    // setShowRoleModal(true);
    console.log('Edit role:', role);
  };

  const handleDeleteRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.isSystem) {
      toast.error('系统角色不能删除');
      return;
    }
    if (window.confirm('确定要删除这个角色吗？')) {
      setRoles(prev => prev.filter(r => r.id !== roleId));
      toast.success('角色删除成功');
    }
  };

  const handleTogglePermission = (roleId: string, permissionId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.isSystem) {
      toast.error('系统角色权限不能修改');
      return;
    }

    setRoles(prev =>
      prev.map(role => {
        if (role.id === roleId) {
          const hasPermission = role.permissions.includes(permissionId);
          return {
            ...role,
            permissions: hasPermission
              ? role.permissions.filter(p => p !== permissionId)
              : [...role.permissions, permissionId],
            updatedAt: new Date().toISOString().split('T')[0],
          };
        }
        return role;
      })
    );

    toast.success('权限更新成功');
  };

  const filteredRoles = roles.filter(
    role =>
      role.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // const filteredPermissions = permissions.filter(permission =>
  //   permission.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //   permission.description.toLowerCase().includes(searchTerm.toLowerCase())
  // );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载权限数据中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">权限管理</h1>
          <p className="text-gray-600">管理系统角色和权限分配</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => console.log('Add role')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            添加角色
          </button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('roles')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'roles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            角色管理
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'permissions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            权限列表
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assignments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            权限分配
          </button>
        </nav>
      </div>

      {/* 搜索框 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={`搜索${activeTab === 'roles' ? '角色' : '权限'}...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 角色管理 */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRoles.map(role => (
            <div
              key={role.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{role.displayName}</h3>
                      <p className="text-sm text-gray-500">{role.name}</p>
                    </div>
                  </div>
                  {!role.isSystem && (
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditRole(role)}
                        className="text-blue-600 hover:text-blue-900"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="text-red-600 hover:text-red-900"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {role.isSystem && (
                    <div className="flex items-center text-xs text-gray-500">
                      <Lock className="w-3 h-3 mr-1" />
                      系统角色
                    </div>
                  )}
                </div>

                <p className="text-gray-600 text-sm mb-4">{role.description}</p>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">用户数量</span>
                    <span className="font-semibold text-blue-600">{role.userCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">权限数量</span>
                    <span className="font-semibold text-green-600">{role.permissions.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">更新时间</span>
                    <span className="text-sm text-gray-500">{role.updatedAt}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-2">权限预览</div>
                  <div className="flex flex-wrap gap-1">
                    {getRolePermissions(role.id)
                      .slice(0, 3)
                      .map(permission => (
                        <span
                          key={permission.id}
                          className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                        >
                          {permission.displayName}
                        </span>
                      ))}
                    {role.permissions.length > 3 && (
                      <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        +{role.permissions.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 权限列表 */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          {Object.entries(getPermissionsByCategory()).map(([category, categoryPermissions]) => (
            <div key={category} className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryPermissions
                    .filter(
                      permission =>
                        permission.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        permission.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(permission => (
                      <div key={permission.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center">
                            <Key className="w-4 h-4 text-blue-600 mr-2" />
                            <h4 className="font-medium text-gray-900">{permission.displayName}</h4>
                          </div>
                          {permission.isSystem && <Lock className="w-3 h-3 text-gray-400" />}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{permission.description}</p>
                        <div className="text-xs text-gray-500">权限标识: {permission.name}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 权限分配 */}
      {activeTab === 'assignments' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    角色 \ 权限
                  </th>
                  {Object.entries(getPermissionsByCategory()).map(
                    ([category, categoryPermissions]) => (
                      <th
                        key={category}
                        className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200"
                      >
                        <div className="transform -rotate-45 origin-center whitespace-nowrap">
                          {category}
                        </div>
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roles.map(role => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 text-blue-600 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {role.displayName}
                          </div>
                          <div className="text-xs text-gray-500">{role.userCount} 用户</div>
                        </div>
                        {role.isSystem && <Lock className="w-3 h-3 text-gray-400 ml-2" />}
                      </div>
                    </td>
                    {Object.entries(getPermissionsByCategory()).map(
                      ([category, categoryPermissions]) => (
                        <td
                          key={category}
                          className="px-3 py-4 text-center border-l border-gray-200"
                        >
                          <div className="space-y-1">
                            {categoryPermissions.map(permission => (
                              <div key={permission.id} className="flex justify-center">
                                <input
                                  type="checkbox"
                                  checked={role.permissions.includes(permission.id)}
                                  onChange={() => handleTogglePermission(role.id, permission.id)}
                                  disabled={role.isSystem}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                  title={permission.displayName}
                                />
                              </div>
                            ))}
                          </div>
                        </td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-blue-600">{roles.length}</div>
          <div className="text-sm text-gray-600">角色总数</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-green-600">{permissions.length}</div>
          <div className="text-sm text-gray-600">权限总数</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-yellow-600">
            {roles.reduce((sum, role) => sum + role.userCount, 0)}
          </div>
          <div className="text-sm text-gray-600">用户总数</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-purple-600">
            {roles.filter(r => !r.isSystem).length}
          </div>
          <div className="text-sm text-gray-600">自定义角色</div>
        </div>
      </div>
    </div>
  );
};

export default PermissionManagementContent;
