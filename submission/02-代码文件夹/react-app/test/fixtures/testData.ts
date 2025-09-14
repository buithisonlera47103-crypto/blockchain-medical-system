/**
 * 测试数据fixtures
 * 提供测试中使用的模拟数据
 */

// 用户数据
export const mockUsers = {
  doctor: {
    id: 'doctor-1',
    username: 'dr_smith',
    email: 'dr.smith@hospital.com',
    firstName: 'John',
    lastName: 'Smith',
    role: 'doctor',
    department: '内科',
    hospital: '测试医院',
    licenseNumber: 'DOC123456',
    avatar: 'https://example.com/avatar-doctor.jpg',
    permissions: ['read', 'write', 'delete', 'transfer'],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  patient: {
    id: 'patient-1',
    username: 'patient_doe',
    email: 'john.doe@email.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'patient',
    dateOfBirth: '1990-01-01',
    gender: 'male',
    phone: '+1234567890',
    address: '123 Main St, City, State 12345',
    emergencyContact: {
      name: 'Jane Doe',
      relationship: 'spouse',
      phone: '+1234567891',
    },
    avatar: 'https://example.com/avatar-patient.jpg',
    permissions: ['read'],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  admin: {
    id: 'admin-1',
    username: 'admin',
    email: 'admin@hospital.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'transfer', 'admin'],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
};

// 医疗记录数据
export const mockMedicalRecords = [
  {
    id: 'record-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    title: '血液检查报告',
    description: '常规血液检查，所有指标正常',
    type: 'examination',
    status: 'active',
    fileUrl: 'https://example.com/records/blood-test-1.pdf',
    fileHash: 'abc123def456ghi789',
    fileName: 'blood_test_report.pdf',
    fileSize: 1024000,
    mimeType: 'application/pdf',
    metadata: {
      department: '内科',
      hospital: '测试医院',
      testDate: '2023-12-01',
      diagnosis: '健康',
      notes: '患者身体状况良好',
      labValues: {
        hemoglobin: '14.5 g/dL',
        whiteBloodCells: '7000/μL',
        platelets: '250000/μL',
      },
    },
    createdAt: '2023-12-01T10:00:00Z',
    updatedAt: '2023-12-01T10:00:00Z',
  },
  {
    id: 'record-2',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    title: 'X光检查报告',
    description: '胸部X光检查，未发现异常',
    type: 'imaging',
    status: 'active',
    fileUrl: 'https://example.com/records/xray-1.pdf',
    fileHash: 'def456ghi789jkl012',
    fileName: 'chest_xray_report.pdf',
    fileSize: 2048000,
    mimeType: 'application/pdf',
    metadata: {
      department: '放射科',
      hospital: '测试医院',
      examDate: '2023-11-15',
      diagnosis: '正常',
      radiologist: 'Dr. Johnson',
      technique: '胸部正位片',
    },
    createdAt: '2023-11-15T14:30:00Z',
    updatedAt: '2023-11-15T14:30:00Z',
  },
  {
    id: 'record-3',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    title: '处方记录',
    description: '感冒药物处方',
    type: 'prescription',
    status: 'active',
    fileUrl: 'https://example.com/records/prescription-1.pdf',
    fileHash: 'ghi789jkl012mno345',
    fileName: 'prescription.pdf',
    fileSize: 512000,
    mimeType: 'application/pdf',
    metadata: {
      department: '内科',
      hospital: '测试医院',
      prescriptionDate: '2023-12-10',
      medications: [
        {
          name: '阿莫西林',
          dosage: '500mg',
          frequency: '每日3次',
          duration: '7天',
        },
        {
          name: '布洛芬',
          dosage: '400mg',
          frequency: '每日2次',
          duration: '5天',
        },
      ],
      instructions: '饭后服用，多喝水',
    },
    createdAt: '2023-12-10T09:15:00Z',
    updatedAt: '2023-12-10T09:15:00Z',
  },
];

// 转移记录数据
export const mockTransferRecords = [
  {
    id: 'transfer-1',
    recordId: 'record-1',
    fromUserId: 'doctor-1',
    toUserId: 'doctor-2',
    reason: '患者转诊至专科医生',
    status: 'pending',
    requestedAt: '2023-12-15T10:00:00Z',
    approvedAt: null,
    rejectedAt: null,
    comments: '需要专科医生进一步诊断',
    metadata: {
      urgency: 'normal',
      department: '心血管科',
      expectedDate: '2023-12-20',
    },
  },
  {
    id: 'transfer-2',
    recordId: 'record-2',
    fromUserId: 'doctor-1',
    toUserId: 'doctor-3',
    reason: '第二意见咨询',
    status: 'approved',
    requestedAt: '2023-12-10T14:00:00Z',
    approvedAt: '2023-12-11T09:00:00Z',
    rejectedAt: null,
    comments: '已批准转移，请及时处理',
    metadata: {
      urgency: 'high',
      department: '肿瘤科',
      approvedBy: 'admin-1',
    },
  },
  {
    id: 'transfer-3',
    recordId: 'record-3',
    fromUserId: 'doctor-2',
    toUserId: 'doctor-1',
    reason: '患者要求转回原医生',
    status: 'rejected',
    requestedAt: '2023-12-05T16:00:00Z',
    approvedAt: null,
    rejectedAt: '2023-12-06T10:00:00Z',
    comments: '患者治疗尚未完成，暂不转移',
    metadata: {
      urgency: 'low',
      rejectedBy: 'doctor-2',
      rejectionReason: '治疗进行中',
    },
  },
];

// API响应数据
export const mockApiResponses = {
  loginSuccess: {
    success: true,
    data: {
      user: mockUsers.doctor,
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'refresh_token_here',
      expiresIn: 3600,
    },
    message: '登录成功',
    timestamp: '2023-12-15T10:00:00Z',
  },

  loginError: {
    success: false,
    error: {
      message: '用户名或密码错误',
      code: 401,
      details: 'Invalid credentials provided',
    },
    timestamp: '2023-12-15T10:00:00Z',
  },

  recordsSuccess: {
    success: true,
    data: {
      records: mockMedicalRecords,
      pagination: {
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1,
      },
    },
    message: '记录获取成功',
    timestamp: '2023-12-15T10:00:00Z',
  },

  recordCreateSuccess: {
    success: true,
    data: {
      record: mockMedicalRecords[0],
    },
    message: '记录创建成功',
    timestamp: '2023-12-15T10:00:00Z',
  },

  transferSuccess: {
    success: true,
    data: {
      transfer: mockTransferRecords[0],
    },
    message: '转移请求提交成功',
    timestamp: '2023-12-15T10:00:00Z',
  },

  serverError: {
    success: false,
    error: {
      message: '服务器内部错误',
      code: 500,
      details: 'Internal server error occurred',
    },
    timestamp: '2023-12-15T10:00:00Z',
  },

  validationError: {
    success: false,
    error: {
      message: '数据验证失败',
      code: 400,
      details: 'Validation failed',
      fields: {
        email: '邮箱格式不正确',
        password: '密码长度至少8位',
      },
    },
    timestamp: '2023-12-15T10:00:00Z',
  },

  unauthorizedError: {
    success: false,
    error: {
      message: '未授权访问',
      code: 403,
      details: 'Access denied',
    },
    timestamp: '2023-12-15T10:00:00Z',
  },
};

// 表单数据
export const mockFormData = {
  login: {
    valid: {
      username: 'dr_smith',
      password: 'SecurePass123!',
      role: 'doctor',
      rememberMe: true,
    },
    invalid: {
      username: '',
      password: '123',
      role: '',
      rememberMe: false,
    },
  },

  upload: {
    valid: {
      patientId: 'patient-1',
      title: '血液检查报告',
      description: '常规血液检查结果',
      type: 'examination',
      department: '内科',
      file: null, // 需要在测试中创建File对象
    },
    invalid: {
      patientId: '',
      title: '',
      description: '',
      type: '',
      department: '',
      file: null,
    },
  },

  transfer: {
    valid: {
      recordId: 'record-1',
      toUserId: 'doctor-2',
      reason: '患者转诊',
      urgency: 'normal',
      expectedDate: '2023-12-20',
    },
    invalid: {
      recordId: '',
      toUserId: '',
      reason: '',
      urgency: '',
      expectedDate: '',
    },
  },

  search: {
    valid: {
      query: 'blood test',
      type: 'examination',
      dateFrom: '2023-01-01',
      dateTo: '2023-12-31',
      status: 'active',
    },
    empty: {
      query: '',
      type: '',
      dateFrom: '',
      dateTo: '',
      status: '',
    },
  },
};

// 统计数据
export const mockStatistics = {
  dashboard: {
    totalRecords: 156,
    activeRecords: 142,
    archivedRecords: 14,
    pendingTransfers: 8,
    completedTransfers: 23,
    rejectedTransfers: 3,
    monthlyUploads: [
      { month: '1月', count: 12 },
      { month: '2月', count: 15 },
      { month: '3月', count: 18 },
      { month: '4月', count: 22 },
      { month: '5月', count: 19 },
      { month: '6月', count: 25 },
      { month: '7月', count: 28 },
      { month: '8月', count: 24 },
      { month: '9月', count: 21 },
      { month: '10月', count: 26 },
      { month: '11月', count: 23 },
      { month: '12月', count: 20 },
    ],
    recordTypes: [
      { type: '检查报告', count: 45, percentage: 28.8 },
      { type: '影像资料', count: 38, percentage: 24.4 },
      { type: '处方记录', count: 32, percentage: 20.5 },
      { type: '诊断报告', count: 28, percentage: 17.9 },
      { type: '其他', count: 13, percentage: 8.3 },
    ],
    recentActivity: [
      {
        id: 'activity-1',
        type: 'upload',
        description: '上传了新的血液检查报告',
        user: 'Dr. Smith',
        timestamp: '2023-12-15T10:30:00Z',
      },
      {
        id: 'activity-2',
        type: 'transfer',
        description: '转移记录给Dr. Johnson',
        user: 'Dr. Smith',
        timestamp: '2023-12-15T09:15:00Z',
      },
      {
        id: 'activity-3',
        type: 'view',
        description: '查看了患者记录',
        user: 'Dr. Brown',
        timestamp: '2023-12-15T08:45:00Z',
      },
    ],
  },
};

// 错误消息
export const mockErrorMessages = {
  validation: {
    required: '此字段为必填项',
    email: '请输入有效的邮箱地址',
    password: '密码长度至少8位',
    passwordMatch: '两次输入的密码不一致',
    fileSize: '文件大小不能超过10MB',
    fileType: '不支持的文件类型',
    dateRange: '结束日期不能早于开始日期',
  },
  api: {
    network: '网络连接失败，请检查网络设置',
    timeout: '请求超时，请稍后重试',
    server: '服务器错误，请联系管理员',
    unauthorized: '登录已过期，请重新登录',
    forbidden: '没有权限执行此操作',
    notFound: '请求的资源不存在',
    conflict: '数据冲突，请刷新后重试',
  },
  upload: {
    failed: '文件上传失败',
    corrupted: '文件已损坏',
    virus: '文件包含病毒',
    duplicate: '文件已存在',
  },
  transfer: {
    selfTransfer: '不能转移给自己',
    invalidUser: '目标用户不存在',
    noPermission: '没有转移权限',
    recordLocked: '记录已被锁定',
  },
};

// 成功消息
export const mockSuccessMessages = {
  auth: {
    loginSuccess: '登录成功',
    logoutSuccess: '已安全退出',
    registerSuccess: '注册成功，请验证邮箱',
    passwordReset: '密码重置邮件已发送',
  },
  record: {
    uploadSuccess: '文件上传成功',
    updateSuccess: '记录更新成功',
    deleteSuccess: '记录删除成功',
    archiveSuccess: '记录归档成功',
  },
  transfer: {
    requestSuccess: '转移请求提交成功',
    approveSuccess: '转移请求已批准',
    rejectSuccess: '转移请求已拒绝',
    completeSuccess: '转移完成',
  },
};

// 测试配置
export const testConfig = {
  api: {
    baseUrl: 'https://localhost:3001',
    timeout: 5000,
    retries: 3,
  },
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
    chunkSize: 1024 * 1024, // 1MB
  },
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
  },
  security: {
    sessionTimeout: 30 * 60 * 1000, // 30分钟
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15分钟
  },
};
