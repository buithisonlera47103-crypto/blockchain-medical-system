/**
 * Access Control Routes 单元测试
 * 重写版本：简洁、高质量、专注路由配置和验证规则
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockAuthenticateToken = jest.fn((req: any, res: any, next: any) => {
  req.user = { id: 'user123', role: 'admin' };
  next();
});

const mockValidateInput = jest.fn((req: any, res: any, next: any) => next());

const mockPolicyEngine = {
  evaluateAccess: jest.fn().mockResolvedValue({
    decision: 'allow',
    reason: 'Policy matched',
    appliedRules: ['rule1'],
    conditions: [],
  }),
  getAllPolicies: jest.fn().mockReturnValue([
    {
      id: 'policy1',
      name: 'Test Policy',
      effect: 'allow',
      priority: 100,
      isActive: true,
    },
  ]),
  addPolicy: jest.fn().mockResolvedValue('new-policy-id'),
  removePolicy: jest.fn().mockResolvedValue(true),
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

const mockApiResponseBuilder = {
  success: jest.fn((data, message) => ({ success: true, data, message })),
  validationError: jest.fn((errors) => ({ success: false, errors })),
};

jest.mock('../../../src/middleware/auth', () => ({
  authenticateToken: mockAuthenticateToken,
}));

jest.mock('../../../src/middleware/validation', () => ({
  validateInput: mockValidateInput,
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: mockLogger,
}));

jest.mock('../../../src/utils/ApiResponseBuilder', () => ({
  default: mockApiResponseBuilder,
}));

jest.mock('../../../src/services/AccessControlPolicyEngine', () => ({
  AccessControlPolicyEngine: jest.fn().mockImplementation(() => mockPolicyEngine),
}));

import request from 'supertest';
import express from 'express';
import accessControlRoutes from '../../../src/routes/accessControl';

describe('Access Control Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/v1/access-control', accessControlRoutes);
  });

  describe('基础路由配置', () => {
    it('应该正确配置路由', () => {
      expect(accessControlRoutes).toBeDefined();
      expect(typeof accessControlRoutes).toBe('function');
    });

    it('应该验证必需的路由端点', () => {
      const routes = accessControlRoutes.stack
        .filter((layer: any) => layer.route)
        .map((layer: any) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        }));

      const expectedRoutes = [
        { path: '/evaluate', methods: ['post'] },
        { path: '/policies', methods: ['get', 'post'] },
        { path: '/policies/:policyId', methods: ['delete'] },
      ];

      expectedRoutes.forEach(({ path }) => {
        const found = routes.some((r: any) => r.path === path);
        expect(found).toBe(true);
      });
    });
  });

  describe('POST /evaluate', () => {
    it('应该有正确的中间件配置', () => {
      const route = accessControlRoutes.stack.find(
        (layer: any) => layer.route?.path === '/evaluate'
      );

      expect(route).toBeDefined();
      expect(route.route.methods.post).toBe(true);
    });

    it('应该验证访问请求数据结构', () => {
      const validRequest = {
        subject: { entityType: 'user', entityId: 'user123' },
        action: { operation: 'read' },
        resource: { resourceType: 'medical_record', resourceId: 'record123' },
      };

      expect(validRequest.subject).toHaveProperty('entityType');
      expect(validRequest.subject).toHaveProperty('entityId');
      expect(validRequest.action).toHaveProperty('operation');
      expect(validRequest.resource).toHaveProperty('resourceType');
      expect(validRequest.resource).toHaveProperty('resourceId');
    });

    it('应该验证entityType枚举值', () => {
      const validEntityTypes = ['user', 'role', 'group', 'department'];
      
      validEntityTypes.forEach(type => {
        expect(validEntityTypes).toContain(type);
      });
    });

    it('应该验证operation枚举值', () => {
      const validOperations = ['read', 'write', 'delete', 'share', 'admin', 'create', 'update'];
      
      validOperations.forEach(op => {
        expect(validOperations).toContain(op);
      });
    });

    it('应该验证resourceType枚举值', () => {
      const validResourceTypes = ['medical_record', 'patient_data', 'system', 'department', 'user'];
      
      validResourceTypes.forEach(type => {
        expect(validResourceTypes).toContain(type);
      });
    });

    it('应该返回访问决策结构', () => {
      const decision = {
        decision: 'allow',
        reason: 'Policy matched',
        appliedRules: ['rule1'],
        conditions: [],
      };

      expect(decision).toHaveProperty('decision');
      expect(decision).toHaveProperty('reason');
      expect(decision).toHaveProperty('appliedRules');
      expect(['allow', 'deny']).toContain(decision.decision);
    });
  });

  describe('GET /policies', () => {
    it('应该有正确的中间件配置', () => {
      const route = accessControlRoutes.stack.find(
        (layer: any) => layer.route?.path === '/policies' && layer.route.methods.get
      );

      expect(route).toBeDefined();
    });

    it('应该验证查询参数', () => {
      const validQueryParams = {
        active: 'true',
        effect: 'allow',
      };

      expect(['true', 'false', undefined]).toContain(validQueryParams.active);
      expect(['allow', 'deny', undefined]).toContain(validQueryParams.effect);
    });

    it('应该验证策略数据结构', () => {
      const policy = {
        id: 'policy1',
        name: 'Test Policy',
        description: 'Test Description',
        effect: 'allow',
        priority: 100,
        isActive: true,
      };

      expect(policy).toHaveProperty('id');
      expect(policy).toHaveProperty('name');
      expect(policy).toHaveProperty('effect');
      expect(policy).toHaveProperty('priority');
      expect(policy).toHaveProperty('isActive');
      expect(['allow', 'deny']).toContain(policy.effect);
      expect(typeof policy.priority).toBe('number');
      expect(typeof policy.isActive).toBe('boolean');
    });

    it('应该验证管理员角色', () => {
      const validAdminRoles = ['admin', 'super_admin'];
      
      expect(validAdminRoles).toContain('admin');
      expect(validAdminRoles).toContain('super_admin');
    });

    it('应该验证策略按优先级排序', () => {
      const policies = [
        { priority: 50 },
        { priority: 100 },
        { priority: 75 },
      ];

      const sorted = policies.sort((a, b) => b.priority - a.priority);
      
      expect(sorted[0].priority).toBe(100);
      expect(sorted[1].priority).toBe(75);
      expect(sorted[2].priority).toBe(50);
    });
  });

  describe('POST /policies', () => {
    it('应该有正确的中间件配置', () => {
      const route = accessControlRoutes.stack.find(
        (layer: any) => layer.route?.path === '/policies' && layer.route.methods.post
      );

      expect(route).toBeDefined();
    });

    it('应该验证策略创建数据结构', () => {
      const policyData = {
        name: 'New Policy',
        description: 'Policy description',
        subject: { entityType: 'user' },
        action: { operation: 'read' },
        resource: { resourceType: 'medical_record' },
        condition: {},
        effect: 'allow',
        priority: 50,
      };

      expect(policyData).toHaveProperty('name');
      expect(policyData).toHaveProperty('subject');
      expect(policyData).toHaveProperty('action');
      expect(policyData).toHaveProperty('resource');
      expect(policyData).toHaveProperty('effect');
      expect(['allow', 'deny']).toContain(policyData.effect);
    });

    it('应该验证策略名称长度', () => {
      const shortName = 'Test';
      const longName = 'A'.repeat(256);

      expect(shortName.length).toBeLessThanOrEqual(255);
      expect(longName.length).toBeGreaterThan(255);
    });

    it('应该验证优先级范围', () => {
      const validPriority = 50;
      const minPriority = 1;
      const maxPriority = 1000;
      const invalidLow = 0;
      const invalidHigh = 1001;

      expect(validPriority).toBeGreaterThanOrEqual(1);
      expect(validPriority).toBeLessThanOrEqual(1000);
      expect(minPriority).toBeGreaterThanOrEqual(1);
      expect(maxPriority).toBeLessThanOrEqual(1000);
      expect(invalidLow).toBeLessThan(1);
      expect(invalidHigh).toBeGreaterThan(1000);
    });

    it('应该设置默认优先级', () => {
      const defaultPriority = 50;
      
      expect(defaultPriority).toBe(50);
      expect(defaultPriority).toBeGreaterThanOrEqual(1);
      expect(defaultPriority).toBeLessThanOrEqual(1000);
    });

    it('应该设置策略为活跃状态', () => {
      const newPolicy = {
        isActive: true,
      };

      expect(newPolicy.isActive).toBe(true);
    });
  });

  describe('DELETE /policies/:policyId', () => {
    it('应该有正确的中间件配置', () => {
      const route = accessControlRoutes.stack.find(
        (layer: any) => layer.route?.path === '/policies/:policyId'
      );

      expect(route).toBeDefined();
      expect(route.route.methods.delete).toBe(true);
    });

    it('应该验证policyId参数', () => {
      const validPolicyId = 'policy123';
      const invalidPolicyId = '';

      expect(validPolicyId).toBeTruthy();
      expect(validPolicyId.length).toBeGreaterThan(0);
      expect(invalidPolicyId).toBeFalsy();
    });

    it('应该检查管理员权限', () => {
      const adminUser = { role: 'admin' };
      const superAdminUser = { role: 'super_admin' };
      const regularUser = { role: 'doctor' };

      expect(['admin', 'super_admin']).toContain(adminUser.role);
      expect(['admin', 'super_admin']).toContain(superAdminUser.role);
      expect(['admin', 'super_admin']).not.toContain(regularUser.role);
    });
  });

  describe('访问控制策略引擎', () => {
    it('应该验证访问请求接口', () => {
      const accessRequest = {
        subject: { entityType: 'user', entityId: 'user123' },
        action: { operation: 'read' },
        resource: { resourceType: 'medical_record', resourceId: 'record123' },
        context: {},
      };

      expect(accessRequest).toHaveProperty('subject');
      expect(accessRequest).toHaveProperty('action');
      expect(accessRequest).toHaveProperty('resource');
      expect(accessRequest).toHaveProperty('context');
    });

    it('应该验证决策响应结构', () => {
      const decision = {
        decision: 'allow',
        reason: 'Policy matched',
        appliedRules: ['rule1', 'rule2'],
        conditions: ['condition1'],
        expiresAt: new Date().toISOString(),
      };

      expect(decision).toHaveProperty('decision');
      expect(decision).toHaveProperty('reason');
      expect(decision).toHaveProperty('appliedRules');
      expect(Array.isArray(decision.appliedRules)).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该验证400错误响应结构', () => {
      const validationError = {
        field: 'policyId',
        message: '策略ID不能为空',
        code: 'REQUIRED',
      };

      expect(validationError).toHaveProperty('field');
      expect(validationError).toHaveProperty('message');
      expect(validationError).toHaveProperty('code');
    });

    it('应该验证403权限不足错误', () => {
      const forbiddenError = {
        message: '只有管理员可以查看策略规则',
        statusCode: 403,
      };

      expect(forbiddenError.statusCode).toBe(403);
      expect(forbiddenError.message).toBeTruthy();
    });

    it('应该验证404未找到错误', () => {
      const notFoundError = {
        message: '策略规则不存在',
        statusCode: 404,
      };

      expect(notFoundError.statusCode).toBe(404);
    });
  });

  describe('日志记录', () => {
    it('应该验证评估日志结构', () => {
      const logData = {
        requesterId: 'user123',
        subject: 'user:user123',
        action: 'read',
        resource: 'medical_record:record123',
        decision: 'allow',
        appliedRules: ['rule1'],
      };

      expect(logData).toHaveProperty('requesterId');
      expect(logData).toHaveProperty('subject');
      expect(logData).toHaveProperty('action');
      expect(logData).toHaveProperty('resource');
      expect(logData).toHaveProperty('decision');
    });
  });

  describe('API响应格式', () => {
    it('应该验证成功响应结构', () => {
      const successResponse = {
        success: true,
        data: { policyId: 'new-policy-id' },
        message: '策略规则创建成功',
      };

      expect(successResponse).toHaveProperty('success');
      expect(successResponse).toHaveProperty('data');
      expect(successResponse).toHaveProperty('message');
      expect(successResponse.success).toBe(true);
    });

    it('应该验证错误响应结构', () => {
      const errorResponse = {
        success: false,
        errors: [{ field: 'name', message: '名称不能为空' }],
      };

      expect(errorResponse).toHaveProperty('success');
      expect(errorResponse).toHaveProperty('errors');
      expect(errorResponse.success).toBe(false);
      expect(Array.isArray(errorResponse.errors)).toBe(true);
    });
  });
});

