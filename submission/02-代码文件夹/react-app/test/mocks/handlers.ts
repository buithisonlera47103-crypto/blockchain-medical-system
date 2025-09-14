import { rest } from 'msw';
import {
  ApiResponse,
  MedicalRecord,
  User,
  TransferRecord,
  HistoryRecord,
  Notification,
} from '../../src/types';

const API_BASE_URL = 'https://localhost:3001/api';

// 模拟用户数据
const mockUsers: User[] = [
  {
    id: '1',
    username: 'test_doctor',
    name: 'Dr. Test',
    email: 'doctor@test.com',
    role: 'doctor',
    roles: ['doctor'],
    token: 'mock-doctor-token',
  },
  {
    id: '2',
    username: 'test_patient',
    name: 'Patient Test',
    email: 'patient@test.com',
    role: 'patient',
    roles: ['patient'],
    token: 'mock-patient-token',
  },
  {
    id: '3',
    username: 'test_admin',
    name: 'Admin Test',
    email: 'admin@test.com',
    role: 'admin',
    roles: ['admin'],
    token: 'mock-admin-token',
  },
];

// 模拟医疗记录数据
const mockRecords: MedicalRecord[] = [
  {
    id: 'record-1',
    patientId: 'patient-1',
    owner: 'test_doctor',
    record: 'Test medical record 1',
    color: 'blue',
    size: 'large',
    appraisedValue: 1000,
    timestamp: '2023-01-01T00:00:00Z',
    status: 'approved',
  },
  {
    id: 'record-2',
    patientId: 'patient-2',
    owner: 'test_doctor',
    record: 'Test medical record 2',
    color: 'red',
    size: 'medium',
    appraisedValue: 500,
    timestamp: '2023-01-02T00:00:00Z',
    status: 'pending',
  },
];

// 模拟转移记录数据
const mockTransfers: TransferRecord[] = [
  {
    id: 'transfer-1',
    fromOwner: 'test_doctor',
    toOwner: 'test_patient',
    assetId: 'record-1',
    timestamp: '2023-01-03T00:00:00Z',
    status: 'completed',
  },
];

// 模拟历史记录数据
const mockHistory: HistoryRecord[] = [
  {
    id: 'history-1',
    action: 'CREATE_RECORD',
    timestamp: new Date('2023-01-01T00:00:00Z'),
    userId: '1',
    userName: 'Dr. Test',
    details: 'Created medical record',
    recordId: 'record-1',
    status: 'SUCCESS',
  },
];

// 模拟通知数据
const mockNotifications: Notification[] = [
  {
    id: 'notification-1',
    title: 'Test Notification',
    message: 'This is a test notification',
    type: 'info',
    timestamp: '2023-01-01T00:00:00Z',
    read: false,
  },
];

export const handlers = [
  // 认证相关
  rest.post(`${API_BASE_URL}/auth/login`, (req, res, ctx) => {
    const { username, password } = req.body as { username: string; password: string };

    const user = mockUsers.find(u => u.username === username);

    if (user && password === 'test_password_123') {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          data: {
            user,
            token: user.token,
          },
          message: 'Login successful',
        } as ApiResponse)
      );
    }

    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        error: 'Invalid credentials',
      } as ApiResponse)
    );
  }),

  rest.post(`${API_BASE_URL}/auth/logout`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Logout successful',
      } as ApiResponse)
    );
  }),

  // 医疗记录相关
  rest.get(`${API_BASE_URL}/records`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockRecords,
      } as ApiResponse<MedicalRecord[]>)
    );
  }),

  rest.post(`${API_BASE_URL}/records`, (req, res, ctx) => {
    const newRecord = req.body as Omit<MedicalRecord, 'id' | 'timestamp' | 'status'>;
    const record: MedicalRecord = {
      ...newRecord,
      id: `record-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    mockRecords.push(record);

    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: record,
        message: 'Record created successfully',
      } as ApiResponse<MedicalRecord>)
    );
  }),

  rest.get(`${API_BASE_URL}/records/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const record = mockRecords.find(r => r.id === id);

    if (record) {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          data: record,
        } as ApiResponse<MedicalRecord>)
      );
    }

    return res(
      ctx.status(404),
      ctx.json({
        success: false,
        error: 'Record not found',
      } as ApiResponse)
    );
  }),

  rest.put(`${API_BASE_URL}/records/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const updates = req.body as Partial<MedicalRecord>;
    const recordIndex = mockRecords.findIndex(r => r.id === id);

    if (recordIndex !== -1) {
      mockRecords[recordIndex] = { ...mockRecords[recordIndex], ...updates };
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          data: mockRecords[recordIndex],
          message: 'Record updated successfully',
        } as ApiResponse<MedicalRecord>)
      );
    }

    return res(
      ctx.status(404),
      ctx.json({
        success: false,
        error: 'Record not found',
      } as ApiResponse)
    );
  }),

  rest.delete(`${API_BASE_URL}/records/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const recordIndex = mockRecords.findIndex(r => r.id === id);

    if (recordIndex !== -1) {
      mockRecords.splice(recordIndex, 1);
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          message: 'Record deleted successfully',
        } as ApiResponse)
      );
    }

    return res(
      ctx.status(404),
      ctx.json({
        success: false,
        error: 'Record not found',
      } as ApiResponse)
    );
  }),

  // 转移相关
  rest.post(`${API_BASE_URL}/transfer`, (req, res, ctx) => {
    const { id, newOwner } = req.body as { id: string; newOwner: string };

    const transfer: TransferRecord = {
      id: `transfer-${Date.now()}`,
      fromOwner: 'current_owner',
      toOwner: newOwner,
      assetId: id,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    mockTransfers.push(transfer);

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: transfer,
        message: 'Transfer initiated successfully',
      } as ApiResponse<TransferRecord>)
    );
  }),

  rest.get(`${API_BASE_URL}/transfer/history`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockTransfers,
      } as ApiResponse<TransferRecord[]>)
    );
  }),

  // 历史记录相关
  rest.get(`${API_BASE_URL}/history`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockHistory,
      } as ApiResponse<HistoryRecord[]>)
    );
  }),

  // 通知相关
  rest.get(`${API_BASE_URL}/notifications`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockNotifications,
      } as ApiResponse<Notification[]>)
    );
  }),

  rest.put(`${API_BASE_URL}/notifications/:id/read`, (req, res, ctx) => {
    const { id } = req.params;
    const notification = mockNotifications.find(n => n.id === id);

    if (notification) {
      notification.read = true;
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          message: 'Notification marked as read',
        } as ApiResponse)
      );
    }

    return res(
      ctx.status(404),
      ctx.json({
        success: false,
        error: 'Notification not found',
      } as ApiResponse)
    );
  }),

  rest.put(`${API_BASE_URL}/notifications/read-all`, (req, res, ctx) => {
    mockNotifications.forEach(n => (n.read = true));
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'All notifications marked as read',
      } as ApiResponse)
    );
  }),

  rest.delete(`${API_BASE_URL}/notifications/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const notificationIndex = mockNotifications.findIndex(n => n.id === id);

    if (notificationIndex !== -1) {
      mockNotifications.splice(notificationIndex, 1);
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          message: 'Notification deleted successfully',
        } as ApiResponse)
      );
    }

    return res(
      ctx.status(404),
      ctx.json({
        success: false,
        error: 'Notification not found',
      } as ApiResponse)
    );
  }),
];
