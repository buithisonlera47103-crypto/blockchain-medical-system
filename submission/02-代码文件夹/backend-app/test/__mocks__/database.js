/**
 * 数据库Mock - 用于测试环境
 */

const mockPool = {
  execute: jest.fn().mockResolvedValue([[], {}]),
  query: jest.fn().mockResolvedValue([[], {}]),
  getConnection: jest.fn().mockResolvedValue({
    execute: jest.fn().mockResolvedValue([[], {}]),
    query: jest.fn().mockResolvedValue([[], {}]),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  }),
  end: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};

// 模拟数据存储
const mockUsers = new Map();
const mockRoles = new Map([
  ['patient', { role_id: 'role-patient-id', role_name: 'patient' }],
  ['doctor', { role_id: 'role-doctor-id', role_name: 'doctor' }],
  ['admin', { role_id: 'role-admin-id', role_name: 'admin' }],
]);
const mockMedicalRecords = new Map();
const mockEnvelopeKeys = new Map();
const mockAccessPermissions = new Map();
const mockAccessRequests = new Map();

// 预设测试用户
const testUser = {
  id: 'test-user-id',
  user_id: 'test-user-id',
  username: 'testuser',
  email: 'test@example.com',
  password_hash: '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjPFmcxLzaFvY16lnAOuO0krHxDu', // bcrypt hash for 'password123'
  role: 'patient',
  role_name: 'patient',
  first_name: 'Test',
  last_name: 'User',
  mfa_enabled: false,
  mfa_secret: null,
};
mockUsers.set('testuser', testUser);
mockUsers.set('test@example.com', testUser);

// 重写execute方法以提供基本的数据库操作模拟
mockPool.execute = jest.fn().mockImplementation(async (sql, params = []) => {
  const sqlLower = sql.toLowerCase().trim();
  
  // 角色查询
  if (sqlLower.includes('select role_id from roles')) {
    const roleName = params[0];
    const role = mockRoles.get(roleName);
    return [role ? [role] : [], {}];
  }
  
  // 插入角色
  if (sqlLower.includes('insert into roles')) {
    const [roleId, roleName, description] = params;
    mockRoles.set(roleName, { role_id: roleId, role_name: roleName, description });
    return [{ insertId: roleId }, {}];
  }
  
  // 插入用户
  if (sqlLower.includes('insert into users')) {
    const [userId, username] = params;
    mockUsers.set(username, { user_id: userId, username, ...params });
    return [{ insertId: userId }, {}];
  }
  
  // 用户查询 - 支持登录验证
  if (sqlLower.includes('select') && sqlLower.includes('users')) {
    if (sqlLower.includes('where u.username') || sqlLower.includes('where username')) {
      const username = params[0];
      const email = params[1] || params[0]; // 支持用户名或邮箱登录
      const user = mockUsers.get(username) || mockUsers.get(email);
      if (user) {
        // 返回与实际SQL查询匹配的字段结构
        const userWithRole = {
          id: user.user_id,
          username: user.username,
          email: user.email,
          password_hash: user.password_hash,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role_name || user.role,
          mfa_enabled: user.mfa_enabled,
          mfa_secret: user.mfa_secret,
        };
        return [[userWithRole], {}];
      }
      return [[], {}];
    }
    if (sqlLower.includes('where user_id')) {
      const userId = params[0];
      const user = Array.from(mockUsers.values()).find(u => u.user_id === userId);
      return [user ? [user] : [], {}];
    }
  }
  
  // 插入病历记录
  if (sqlLower.includes('insert into medical_records')) {
    const recordId = params[0] || `record-${Date.now()}`;
    const recordData = {
      record_id: recordId,
      patient_id: params[1],
      creator_id: params[2],
      title: params[3],
      record_type: params[4],
      file_type: params[5],
      file_size: params[6],
      content_hash: params[7],
      status: params[8] || 'ACTIVE',
      created_at: new Date()
    };
    mockMedicalRecords.set(recordId, recordData);
    return [{ insertId: recordId }, {}];
  }
  
  // 查询病历记录
  if (sqlLower.includes('select') && sqlLower.includes('medical_records')) {
    if (sqlLower.includes('where record_id')) {
      const recordId = params[0];
      const record = mockMedicalRecords.get(recordId);
      return [record ? [record] : [], {}];
    }
    // 返回所有记录
    return [Array.from(mockMedicalRecords.values()), {}];
  }
  
  // 插入信封密钥
  if (sqlLower.includes('insert into envelope_keys')) {
    const keyId = params[0] || `key-${Date.now()}`;
    const keyData = {
      key_id: keyId,
      record_id: params[1],
      encrypted_key: params[2],
      key_type: params[3] || 'AES',
      created_at: new Date()
    };
    mockEnvelopeKeys.set(keyId, keyData);
    return [{ insertId: keyId }, {}];
  }
  
  // 查询信封密钥
  if (sqlLower.includes('select') && sqlLower.includes('envelope_keys')) {
    if (sqlLower.includes('where record_id')) {
      const recordId = params[0];
      const keys = Array.from(mockEnvelopeKeys.values()).filter(k => k.record_id === recordId);
      return [keys, {}];
    }
    return [Array.from(mockEnvelopeKeys.values()), {}];
  }
  
  // 插入访问权限
  if (sqlLower.includes('insert into access_permissions')) {
    const permissionId = params[0] || `perm-${Date.now()}`;
    const permissionData = {
      permission_id: permissionId,
      record_id: params[1],
      grantee_id: params[2],
      grantor_id: params[3],
      action_type: params[4] || 'read',
      expires_at: params[5],
      is_active: true,
      granted_at: new Date()
    };
    mockAccessPermissions.set(permissionId, permissionData);
    return [{ insertId: permissionId }, {}];
  }
  
  // 查询访问权限
  if (sqlLower.includes('select') && sqlLower.includes('access_permissions')) {
    return [Array.from(mockAccessPermissions.values()), {}];
  }
  
  // 插入访问请求
  if (sqlLower.includes('insert into access_requests')) {
    const requestId = params[0] || `req-${Date.now()}`;
    const requestData = {
      request_id: requestId,
      record_id: params[1],
      requester_id: params[2],
      action: params[3] || 'read',
      purpose: params[4],
      urgency: params[5] || 'medium',
      requested_duration: params[6] || 24,
      expires_at: params[7],
      status: params[8] || 'pending',
      created_at: new Date()
    };
    mockAccessRequests.set(requestId, requestData);
    return [{ insertId: requestId }, {}];
  }
  
  // 查询访问请求
  if (sqlLower.includes('select') && sqlLower.includes('access_requests')) {
    return [Array.from(mockAccessRequests.values()), {}];
  }
  
  // 更新用户最后登录时间
  if (sqlLower.includes('update users set last_login_at')) {
    return [{ affectedRows: 1 }, {}];
  }
  
  // 删除操作
  if (sqlLower.includes('delete')) {
    return [{ affectedRows: 1 }, {}];
  }
  
  // 其他操作默认返回成功
  return [[], {}];
});

// query方法使用与execute相同的逻辑
mockPool.query = mockPool.execute;

// 连接mock也使用相同的逻辑
mockPool.getConnection = jest.fn().mockResolvedValue({
  execute: mockPool.execute,
  query: mockPool.execute,
  beginTransaction: jest.fn().mockResolvedValue(undefined),
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
});

module.exports = {
  pool: mockPool,
};