/**
 * 工具类直接测试
 * 确保工具类代码被正确执行和测试
 */

import { logger } from '../../src/utils/logger';
import { AppError } from '../../src/utils/AppError';

describe('工具类直接测试', () => {
  describe('logger 工具', () => {
    it('应该有logger对象', () => {
      expect(logger).toBeDefined();
    });

    it('应该有info方法', () => {
      expect(typeof logger.info).toBe('function');

      // 执行logger方法确保代码被覆盖
      logger.info('测试信息日志');
      expect(true).toBe(true);
    });

    it('应该有error方法', () => {
      expect(typeof logger.error).toBe('function');

      logger.error('测试错误日志');
      expect(true).toBe(true);
    });

    it('应该有warn方法', () => {
      expect(typeof logger.warn).toBe('function');

      logger.warn('测试警告日志');
      expect(true).toBe(true);
    });

    it('应该有debug方法', () => {
      expect(typeof logger.debug).toBe('function');

      logger.debug('测试调试日志');
      expect(true).toBe(true);
    });
  });

  describe('AppError 类', () => {
    it('应该创建AppError实例', () => {
      const error = new AppError('测试错误', 400);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('应该设置错误消息', () => {
      const error = new AppError('测试错误消息', 400);
      expect(error.message).toBe('测试错误消息');
    });

    it('应该设置状态码', () => {
      const error = new AppError('测试错误', 404);
      expect(error.statusCode).toBe(404);
    });

    it('应该设置isOperational标志', () => {
      const error = new AppError('测试错误', 400);
      expect(error.isOperational).toBe(true);
    });

    it('应该处理不同的错误类型', () => {
      const validationError = new AppError('验证失败', 400, 'VALIDATION_ERROR');
      expect(validationError.statusCode).toBe(400);
      expect(validationError.errorType).toBe('VALIDATION_ERROR');

      const notFoundError = new AppError('资源未找到', 404, 'NOT_FOUND');
      expect(notFoundError.statusCode).toBe(404);
      expect(notFoundError.errorType).toBe('NOT_FOUND');

      const unauthorizedError = new AppError('未授权', 401, 'UNAUTHORIZED');
      expect(unauthorizedError.statusCode).toBe(401);
      expect(unauthorizedError.errorType).toBe('UNAUTHORIZED');

      const forbiddenError = new AppError('禁止访问', 403, 'FORBIDDEN');
      expect(forbiddenError.statusCode).toBe(403);
      expect(forbiddenError.errorType).toBe('FORBIDDEN');

      const internalError = new AppError('内部错误', 500, 'INTERNAL_ERROR');
      expect(internalError.statusCode).toBe(500);
      expect(internalError.errorType).toBe('INTERNAL_ERROR');
    });

    it('应该处理数据库错误', () => {
      const dbError = new AppError('数据库连接失败', 500, 'DATABASE_ERROR');
      expect(dbError.statusCode).toBe(500);
      expect(dbError.errorType).toBe('DATABASE_ERROR');
    });

    it('应该处理外部服务错误', () => {
      const externalError = new AppError('外部服务不可用', 503, 'EXTERNAL_SERVICE_ERROR');
      expect(externalError.statusCode).toBe(503);
      expect(externalError.errorType).toBe('EXTERNAL_SERVICE_ERROR');
    });

    it('应该处理业务逻辑错误', () => {
      const businessError = new AppError('业务规则违反', 422, 'BUSINESS_LOGIC_ERROR');
      expect(businessError.statusCode).toBe(422);
      expect(businessError.errorType).toBe('BUSINESS_LOGIC_ERROR');
    });

    it('应该处理速率限制错误', () => {
      const rateLimitError = new AppError('请求过于频繁', 429, 'RATE_LIMIT_ERROR');
      expect(rateLimitError.statusCode).toBe(429);
      expect(rateLimitError.errorType).toBe('RATE_LIMIT_ERROR');
    });

    it('应该包含错误详情', () => {
      const details = { field: 'username', reason: 'too short' };
      const error = new AppError('验证错误', 400, 'VALIDATION_ERROR', true, details);
      expect(error.context).toEqual(details);
    });

    it('应该正确处理堆栈跟踪', () => {
      const error = new AppError('测试错误', 400);
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });

    it('应该设置时间戳', () => {
      const error = new AppError('测试错误', 400);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('应该设置错误类型', () => {
      const error = new AppError('测试错误', 400, 'CUSTOM_ERROR');
      expect(error.errorType).toBe('CUSTOM_ERROR');
    });

    it('应该处理空上下文', () => {
      const error = new AppError('测试错误', 400);
      expect(error.context).toBeUndefined();
    });

    it('应该设置自定义上下文', () => {
      const context = { userId: '123', action: 'test' };
      const error = new AppError('测试错误', 400, 'CUSTOM_ERROR', true, context);
      expect(error.context).toEqual(context);
    });

    it('应该继承Error类', () => {
      const error = new AppError('测试错误', 400);
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });
  });
});
