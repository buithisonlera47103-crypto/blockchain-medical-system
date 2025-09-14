// @ts-nocheck
/**
 * 认证路由测试
 * 测试用户注册、登录等认证相关API
 */

import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
// 不要完全mock路由，我们需要测试实际的路由代码
import authRouter from '../../src/routes/auth';
const { UserService } = require('../../src/services/UserService');

// 只mock UserService的实现，不mock整个模块
jest.mock('../../src/services/UserService', () => {
  return {
    UserService: jest.fn().mockImplementation(() => ({
      register: jest.fn(),
      login: jest.fn(),
      getUserById: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
    })),
  };
});

describe('认证路由测试', () => {
  let app: express.Application;
  let mockUserService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // 创建Express应用
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRouter);

    // 获取mock实例
    mockUserService = new UserService();
  });

  describe('POST /api/v1/auth/register', () => {
    it('应该成功注册新用户', async () => {
      const userData = {
        username: 'testuser',
        password: 'SecurePass123!',
        email: 'test@example.com',
        role: 'patient',
      };

      const mockServiceResponse = {
        userId: 'user123',
        message: '用户注册成功',
      };

      const expectedResponse = {
        success: true,
        user: {
          username: 'testuser',
          roles: ['patient'],
        },
      };

      mockUserService.register = jest.fn().mockResolvedValue(mockServiceResponse);

      const response = await request(app).post('/api/v1/auth/register').send(userData).expect(201);

      expect(response.body).toMatchObject(expectedResponse);
      expect(mockUserService.register).toHaveBeenCalledWith(userData);
    });

    it('应该拒绝无效的注册数据', async () => {
      const invalidData = {
        username: '', // 空用户名
        password: '123', // 密码太短
        role: 'patient',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('应该处理注册错误', async () => {
      const userData = {
        username: 'existinguser',
        password: 'SecurePass123!',
        email: 'test@example.com',
        role: 'patient',
      };

      mockUserService.register = jest.fn().mockRejectedValue(new Error('用户名已存在'));

      const response = await request(app).post('/api/v1/auth/register').send(userData).expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('应该成功登录用户', async () => {
      const loginData = {
        username: 'testuser',
        password: 'SecurePass123!',
      };

      const expectedResponse = {
        token: 'jwt-token-here',
        user: {
          userId: 'user123',
          username: 'testuser',
          role: 'patient',
        },
      };

      mockUserService.login = jest.fn().mockResolvedValue(expectedResponse);

      const response = await request(app).post('/api/v1/auth/login').send(loginData).expect(200);

      expect(response.body).toMatchObject(expectedResponse);
      expect(mockUserService.login).toHaveBeenCalledWith(loginData.username, loginData.password);
    });

    it('应该拒绝无效的登录凭据', async () => {
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      mockUserService.login = jest.fn().mockRejectedValue(new Error('用户名或密码错误'));

      const response = await request(app).post('/api/v1/auth/login').send(loginData).expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('应该拒绝空的登录数据', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({}).expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('应该成功注销用户', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    it('应该获取用户档案', async () => {
      const expectedProfile = {
        userId: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'patient',
      };

      mockUserService.getUserById = jest.fn().mockResolvedValue(expectedProfile);

      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject(expectedProfile);
    });

    it('应该拒绝无认证的请求', async () => {
      const response = await request(app).get('/api/v1/auth/profile').expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/auth/profile', () => {
    it('应该更新用户档案', async () => {
      const updateData = {
        email: 'newemail@example.com',
      };

      const expectedResponse = {
        ...updateData,
        userId: 'user123',
        message: '档案更新成功',
      };

      mockUserService.updateProfile = jest.fn().mockResolvedValue(expectedResponse);

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject(expectedResponse);
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('应该成功更改密码', async () => {
      const passwordData = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
      };

      mockUserService.changePassword = jest.fn().mockResolvedValue({ message: '密码更改成功' });

      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send(passwordData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('应该拒绝无效的当前密码', async () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'NewPass123!',
      };

      mockUserService.changePassword = jest.fn().mockRejectedValue(new Error('当前密码错误'));

      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send(passwordData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
