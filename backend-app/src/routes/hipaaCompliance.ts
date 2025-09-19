/**
 * HIPAA合规路由 - 处理HIPAA合规相关的API端点
 */

import express, { Response, NextFunction } from 'express';
import { body, query } from 'express-validator';

import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken } from '../middleware/auth';
import { validateInput } from '../middleware/validation';
import { HIPAAComplianceService } from '../services/HIPAAComplianceService';
import { AuthenticatedRequest } from '../types/express-extensions';
import ApiResponseBuilder from '../utils/ApiResponseBuilder';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

const router = express.Router();

// 初始化HIPAA合规服务
const hipaaService = new HIPAAComplianceService();

/**
 * HIPAA审计数据接口
 */
interface HIPAAAuditData {
  action: string;
  resourceType: 'PHI' | 'EPHI' | 'SYSTEM' | 'USER';
  resourceId: string;
  patientId?: string;
  accessMethod: 'WEB' | 'API' | 'MOBILE' | 'SYSTEM';
  outcome: 'SUCCESS' | 'FAILURE' | 'UNAUTHORIZED';
  reasonCode?: string;
  details?: Record<string, unknown>;
  userId: string;
  userRole: string;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
}

/**
 * HIPAA违规记录接口
 */
interface HIPAAViolation {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DETECTED' | 'INVESTIGATING' | 'RESOLVED' | 'REPORTED';
  description: string;
  detectedAt: string;
  resolvedAt?: string;
  userId?: string;
  resourceId?: string;
  details: Record<string, unknown>;
}

/**
 * @swagger
 * /api/v1/hipaa/audit-log:
 *   post:
 *     summary: 记录HIPAA审计日志
 *     description: 记录对PHI的访问和操作审计日志
 *     tags: [HIPAA Compliance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - resourceType
 *               - resourceId
 *               - accessMethod
 *               - outcome
 *             properties:
 *               action:
 *                 type: string
 *                 description: 执行的操作
 *               resourceType:
 *                 type: string
 *                 enum: [PHI, EPHI, SYSTEM, USER]
 *               resourceId:
 *                 type: string
 *                 description: 资源ID
 *               patientId:
 *                 type: string
 *                 description: 患者ID（如果适用）
 *               accessMethod:
 *                 type: string
 *                 enum: [WEB, API, MOBILE, SYSTEM]
 *               outcome:
 *                 type: string
 *                 enum: [SUCCESS, FAILURE, UNAUTHORIZED]
 *               reasonCode:
 *                 type: string
 *                 description: 原因代码
 *               details:
 *                 type: object
 *                 description: 详细信息
 *     responses:
 *       201:
 *         description: 审计日志记录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 auditId:
 *                   type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.post(
  '/audit-log',
  authenticateToken,
  [
    body('action')
      .notEmpty()
      .withMessage('操作不能为空')
      .isLength({ max: 100 })
      .withMessage('操作描述不能超过100字符'),
    body('resourceType')
      .isIn(['PHI', 'EPHI', 'SYSTEM', 'USER'])
      .withMessage('资源类型必须是PHI、EPHI、SYSTEM或USER'),
    body('resourceId').notEmpty().withMessage('资源ID不能为空'),
    body('accessMethod')
      .isIn(['WEB', 'API', 'MOBILE', 'SYSTEM'])
      .withMessage('访问方式必须是WEB、API、MOBILE或SYSTEM'),
    body('outcome')
      .isIn(['SUCCESS', 'FAILURE', 'UNAUTHORIZED'])
      .withMessage('操作结果必须是SUCCESS、FAILURE或UNAUTHORIZED'),
  ],
  validateInput,
  asyncHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          throw new AppError('用户未认证', 401);
        }

        const {
          action,
          resourceType,
          resourceId,
          patientId,
          accessMethod,
          outcome,
          reasonCode,
          details,
        } = req.body;

        const auditData: HIPAAAuditData = {
          action,
          resourceType,
          resourceId,
          patientId,
          accessMethod,
          outcome,
          reasonCode,
          details,
          userId: req.user.userId,
          userRole: req.user.role,
          ipAddress: req.ip ?? 'unknown',
          userAgent: req.get('User-Agent') ?? 'unknown',
          sessionId: (req as Express.Request & { sessionID?: string }).sessionID ?? (req.headers['x-session-id'] as string) ?? 'unknown',
        };

        const auditId = await hipaaService.logHIPAAAudit({ ...auditData, details: auditData.details ?? {} });

        logger.info('HIPAA审计日志记录成功', {
          auditId,
          userId: req.user.userId,
          action,
          resourceType,
          outcome,
        });

        res.status(201).json(ApiResponseBuilder.success({ auditId }, 'HIPAA审计日志记录成功'));
      } catch (error: unknown) {
        logger.error('HIPAA审计日志记录失败', {
          error: error instanceof Error ? error.message : String(error),
          userId: req.user?.userId,
        });
        next(error);
      }
    }
  )
);

/**
 * @swagger
 * /api/v1/hipaa/compliance-report:
 *   get:
 *     summary: 生成HIPAA合规报告
 *     description: 生成指定时间范围的HIPAA合规报告
 *     tags: [HIPAA Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *     responses:
 *       200:
 *         description: 合规报告
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reportPeriod:
 *                   type: object
 *                 auditStatistics:
 *                   type: object
 *                 violationStatistics:
 *                   type: object
 *                 privacyControls:
 *                   type: array
 *                 complianceStatus:
 *                   type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/compliance-report',
  authenticateToken,
  [
    query('startDate').isISO8601().withMessage('开始日期格式错误'),
    query('endDate').isISO8601().withMessage('结束日期格式错误'),
  ],
  validateInput,
  asyncHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          throw new AppError('用户未认证', 401);
        }

        // 检查管理员权限
        if (req.user.role !== 'admin' && req.user.role !== 'compliance_officer') {
          throw new AppError('只有管理员可以生成合规报告', 403);
        }

        const startDate = new Date(req.query.startDate as string);
        const endDate = new Date(req.query.endDate as string);

        if (startDate >= endDate) {
          throw new AppError('开始日期必须早于结束日期', 400);
        }

        logger.info('生成HIPAA合规报告', {
          userId: req.user.userId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        const report = await hipaaService.generateComplianceReport(startDate, endDate);

        // 记录审计日志
        await hipaaService.logHIPAAAudit({
          action: 'GENERATE_COMPLIANCE_REPORT',
          resourceType: 'SYSTEM',
          resourceId: 'compliance_report',
          accessMethod: 'API',
          outcome: 'SUCCESS',
          userId: req.user.userId,
          userRole: req.user.role,
          ipAddress: req.ip ?? 'unknown',
          userAgent: req.get('User-Agent') ?? 'unknown',
          sessionId: ((req as Express.Request & { sessionID?: string }).sessionID ?? (req.headers['x-session-id'] as string)) ?? 'unknown',
          details: { startDate, endDate },
        });

        res.json(ApiResponseBuilder.success(report, 'HIPAA合规报告生成成功'));
      } catch (error: unknown) {
        logger.error('HIPAA合规报告生成失败', {
          error: error instanceof Error ? error.message : String(error),
          userId: req.user?.userId,
        });
        next(error);
      }
    }
  )
);

/**
 * @swagger
 * /api/v1/hipaa/data-retention:
 *   post:
 *     summary: 执行数据保留策略
 *     description: 手动触发数据保留策略执行
 *     tags: [HIPAA Compliance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 数据保留策略执行成功
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器内部错误
 */
router.post(
  '/data-retention',
  authenticateToken,
  asyncHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          throw new AppError('用户未认证', 401);
        }

        // 检查管理员权限
        if (req.user.role !== 'admin' && req.user.role !== 'compliance_officer') {
          throw new AppError('只有管理员可以执行数据保留策略', 403);
        }

        logger.info('手动执行数据保留策略', {
          requesterId: req.user.userId,
        });

        const result = await hipaaService.enforceDataRetentionPolicies();

        // 记录审计日志
        await hipaaService.logHIPAAAudit({
          action: 'EXECUTE_DATA_RETENTION',
          resourceType: 'SYSTEM',
          resourceId: 'data_retention_policy',
          accessMethod: 'API',
          outcome: 'SUCCESS',
          userId: req.user.userId,
          userRole: req.user.role,
          ipAddress: req.ip ?? 'unknown',
          userAgent: req.get('User-Agent') ?? 'unknown',
          sessionId: ((req as Express.Request & { sessionID?: string }).sessionID ?? (req.headers['x-session-id'] as string)) ?? 'unknown',
          details: { status: 'executed' },
        });

        res.json(ApiResponseBuilder.success(result, '数据保留策略执行成功'));
      } catch (error: unknown) {
        logger.error('数据保留策略执行失败', {
          error: error instanceof Error ? error.message : String(error),
          userId: req.user?.userId,
        });
        next(error);
      }
    }
  )
);

/**
 * @swagger
 * /api/v1/hipaa/validate-data-minimization:
 *   post:
 *     summary: 验证数据最小化原则
 *     description: 验证请求的数据是否符合最小必要原则
 *     tags: [HIPAA Compliance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestedData
 *             properties:
 *               requestedData:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 请求的数据字段列表
 *     responses:
 *       200:
 *         description: 验证结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isValid:
 *                   type: boolean
 *                 violations:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.post(
  '/validate-data-minimization',
  authenticateToken,
  [
    body('requestedData')
      .isArray()
      .withMessage('请求的数据必须是数组')
      .notEmpty()
      .withMessage('请求的数据不能为空'),
  ],
  validateInput,
  asyncHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          throw new AppError('用户未认证', 401);
        }

        const { requestedData } = req.body;

        logger.info('验证数据最小化原则', {
          userId: req.user.userId,
          requestedFields: requestedData.length,
        });

        const isValid = await hipaaService.validateDataMinimization(req.user.userId, requestedData);

        // 记录验证结果
        await hipaaService.logHIPAAAudit({
          action: 'VALIDATE_DATA_MINIMIZATION',
          resourceType: 'SYSTEM',
          resourceId: 'data_minimization_check',
          accessMethod: 'API',
          outcome: isValid ? 'SUCCESS' : 'FAILURE',
          userId: req.user.userId,
          userRole: req.user.role,
          ipAddress: req.ip ?? 'unknown',
          userAgent: req.get('User-Agent') ?? 'unknown',
          sessionId: (req as Express.Request & { sessionID?: string }).sessionID ?? (req.headers['x-session-id'] as string) ?? 'unknown',
          details: { requestedData, isValid },
        });

        const result = {
          isValid,
          violations: isValid ? [] : ['请求的数据超出最小必要范围'],
        };

        res.json(ApiResponseBuilder.success(result, '数据最小化验证完成'));
      } catch (error: unknown) {
        logger.error('数据最小化验证失败', {
          error: error instanceof Error ? error.message : String(error),
          userId: req.user?.userId,
        });
        next(error);
      }
    }
  )
);

/**
 * @swagger
 * /api/v1/hipaa/violations:
 *   get:
 *     summary: 获取HIPAA违规记录
 *     description: 获取系统中的HIPAA违规记录
 *     tags: [HIPAA Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *         description: 严重程度过滤
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DETECTED, INVESTIGATING, RESOLVED, REPORTED]
 *         description: 状态过滤
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 返回记录数限制
 *     responses:
 *       200:
 *         description: 违规记录列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/violations',
  authenticateToken,
  [
    query('severity')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .withMessage('严重程度必须是LOW、MEDIUM、HIGH或CRITICAL'),
    query('status')
      .optional()
      .isIn(['DETECTED', 'INVESTIGATING', 'RESOLVED', 'REPORTED'])
      .withMessage('状态必须是DETECTED、INVESTIGATING、RESOLVED或REPORTED'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('限制数量必须是1-100之间的整数'),
  ],
  validateInput,
  asyncHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          throw new AppError('用户未认证', 401);
        }

        // 检查管理员权限
        if (req.user.role !== 'admin' && req.user.role !== 'compliance_officer') {
          throw new AppError('只有管理员可以查看违规记录', 403);
        }

        const { severity, status, limit = '50' } = req.query;
        const limitNum = parseInt(limit as string, 10);

        // 模拟违规记录数据
        const violations: HIPAAViolation[] = [
          {
            id: 'violation_001',
            type: 'UNAUTHORIZED_ACCESS',
            severity: 'HIGH',
            status: 'INVESTIGATING',
            description: '未授权访问患者健康信息',
            detectedAt: new Date(Date.now() - 86400000).toISOString(), // 1天前
            userId: 'user_123',
            resourceId: 'patient_456',
            details: {
              accessAttempts: 3,
              ipAddress: '192.168.1.100',
              userAgent: 'Mozilla/5.0...',
            },
          },
          {
            id: 'violation_002',
            type: 'DATA_BREACH',
            severity: 'CRITICAL',
            status: 'RESOLVED',
            description: '数据泄露事件',
            detectedAt: new Date(Date.now() - 172800000).toISOString(), // 2天前
            resolvedAt: new Date(Date.now() - 86400000).toISOString(), // 1天前
            details: {
              affectedRecords: 150,
              breachType: 'SYSTEM_VULNERABILITY',
            },
          },
        ];

        // 应用过滤器
        let filteredViolations = violations;
        if (severity) {
          filteredViolations = filteredViolations.filter(v => v.severity === severity);
        }
        if (status) {
          filteredViolations = filteredViolations.filter(v => v.status === status);
        }

        // 应用限制
        const result = filteredViolations.slice(0, limitNum);

        logger.info('获取HIPAA违规记录', {
          requesterId: req.user.userId,
          filters: { severity, status, limit: limitNum },
          resultCount: result.length,
        });

        // 记录审计日志
        await hipaaService.logHIPAAAudit({
          action: 'VIEW_VIOLATIONS',
          resourceType: 'SYSTEM',
          resourceId: 'violation_records',
          accessMethod: 'API',
          outcome: 'SUCCESS',
          userId: req.user.userId,
          userRole: req.user.role,
          ipAddress: req.ip ?? 'unknown',
          userAgent: req.get('User-Agent') ?? 'unknown',
          sessionId: ((req as Express.Request & { sessionID?: string }).sessionID ?? (req.headers['x-session-id'] as string)) ?? 'unknown',
          details: { filters: req.query, resultCount: result.length },
        });

        res.json(ApiResponseBuilder.success(result, '违规记录获取成功'));
      } catch (error: unknown) {
        logger.error('获取违规记录失败', {
          error: error instanceof Error ? error.message : String(error),
          userId: req.user?.userId,
        });
        next(error);
      }
    }
  )
);

export default router;
