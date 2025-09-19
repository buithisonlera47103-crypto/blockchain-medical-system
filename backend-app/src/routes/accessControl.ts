/**
 * 访问控制路由 - 处理访问控制策略相关的API端点
 */

import express, { Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';

import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken } from '../middleware/auth';
import { validateInput } from '../middleware/validation';
import { AccessControlPolicyEngine, AccessRequest } from '../services/AccessControlPolicyEngine';
import { EnhancedAuthRequest } from '../types/express-extensions';
import ApiResponseBuilder from '../utils/ApiResponseBuilder';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

const router = express.Router();

// Using global AuthenticatedRequest interface from express-extensions

// 初始化策略引擎
const policyEngine = new AccessControlPolicyEngine();

/**
 * @swagger
 * /api/v1/access-control/evaluate:
 *   post:
 *     summary: 评估访问请求
 *     description: 根据BNF风格的访问控制策略评估访问请求
 *     tags: [Access Control]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - action
 *               - resource
 *             properties:
 *               subject:
 *                 type: object
 *                 properties:
 *                   entityType:
 *                     type: string
 *                     enum: [user, role, group, department]
 *                   entityId:
 *                     type: string
 *               action:
 *                 type: object
 *                 properties:
 *                   operation:
 *                     type: string
 *                     enum: [read, write, delete, share, admin, create, update]
 *               resource:
 *                 type: object
 *                 properties:
 *                   resourceType:
 *                     type: string
 *                     enum: [medical_record, patient_data, system, department, user]
 *                   resourceId:
 *                     type: string
 *               context:
 *                 type: object
 *                 description: 额外的上下文信息
 *     responses:
 *       200:
 *         description: 访问决策结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 decision:
 *                   type: string
 *                   enum: [allow, deny]
 *                 reason:
 *                   type: string
 *                 appliedRules:
 *                   type: array
 *                   items:
 *                     type: string
 *                 conditions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.post(
  '/evaluate',
  authenticateToken,
  [
    body('subject.entityType')
      .isIn(['user', 'role', 'group', 'department'])
      .withMessage('主体类型必须是user、role、group或department'),
    body('subject.entityId').notEmpty().withMessage('主体ID不能为空'),
    body('action.operation')
      .isIn(['read', 'write', 'delete', 'share', 'admin', 'create', 'update'])
      .withMessage('操作类型无效'),
    body('resource.resourceType')
      .isIn(['medical_record', 'patient_data', 'system', 'department', 'user'])
      .withMessage('资源类型无效'),
    body('resource.resourceId').notEmpty().withMessage('资源ID不能为空'),
  ],
  validateInput,
  asyncHandler(
  async (req: EnhancedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { subject, action, resource, context } = req.body;

      logger.info('评估访问控制请求', {
        requesterId: req.user?.id,
        subject: `${subject.entityType}:${subject.entityId}`,
        action: action.operation,
        resource: `${resource.resourceType}:${resource.resourceId}`,
      });

      const accessRequest: AccessRequest = {
        subject,
        action,
        resource,
        context,
      };

      const decision = await policyEngine.evaluateAccess(accessRequest);

      // 记录评估结果
      await logPolicyEvaluation(accessRequest, decision, req.user?.id ?? 'unknown');

      res.json(ApiResponseBuilder.success(decision, '访问控制评估完成'));
    } catch (error: unknown) {
      logger.error('访问控制评估失败', {
        requesterId: req.user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/access-control/policies:
 *   get:
 *     summary: 获取所有策略规则
 *     description: 获取系统中的所有访问控制策略规则
 *     tags: [Access Control]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: 是否只返回活跃的策略
 *       - in: query
 *         name: effect
 *         schema:
 *           type: string
 *           enum: [allow, deny]
 *         description: 策略效果过滤
 *     responses:
 *       200:
 *         description: 策略规则列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   effect:
 *                     type: string
 *                   priority:
 *                     type: number
 *                   isActive:
 *                     type: boolean
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/policies',
  authenticateToken,
  [
    query('active').optional().isBoolean().withMessage('active参数必须是布尔值'),
    query('effect').optional().isIn(['allow', 'deny']).withMessage('effect参数必须是allow或deny'),
  ],
  validateInput,
  asyncHandler(
  async (req: EnhancedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 检查管理员权限
      if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
        throw new AppError('只有管理员可以查看策略规则', 403);
      }

      const { active, effect } = req.query;

      let policies = policyEngine.getAllPolicies();

      // 应用过滤条件
      if (active !== undefined) {
        const isActive = active === 'true';
        policies = policies.filter(p => p.isActive === isActive);
      }

      if (effect) {
        policies = policies.filter(p => p.effect === effect);
      }

      // 按优先级排序
      policies.sort((a, b) => b.priority - a.priority);

      logger.info('获取策略规则列表', {
        requesterId: req.user.id,
        totalPolicies: policies.length,
        filters: { active, effect },
      });

      res.json(ApiResponseBuilder.success(policies, '策略规则获取成功'));
    } catch (error: unknown) {
      logger.error('获取策略规则失败', {
        requesterId: req.user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/access-control/policies:
 *   post:
 *     summary: 添加策略规则
 *     description: 添加新的访问控制策略规则
 *     tags: [Access Control]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - subject
 *               - action
 *               - resource
 *               - effect
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               subject:
 *                 type: object
 *               action:
 *                 type: object
 *               resource:
 *                 type: object
 *               condition:
 *                 type: object
 *               effect:
 *                 type: string
 *                 enum: [allow, deny]
 *               priority:
 *                 type: number
 *     responses:
 *       201:
 *         description: 策略规则创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 policyId:
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
router.post(
  '/policies',
  authenticateToken,
  [
    body('name')
      .notEmpty()
      .withMessage('策略名称不能为空')
      .isLength({ max: 255 })
      .withMessage('策略名称不能超过255字符'),
    body('effect').isIn(['allow', 'deny']).withMessage('策略效果必须是allow或deny'),
    body('priority')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('优先级必须是1-1000之间的整数'),
  ],
  validateInput,
  asyncHandler(
  async (req: EnhancedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 检查管理员权限
      if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
        throw new AppError('只有管理员可以添加策略规则', 403);
      }

      const {
        name,
        description,
        subject,
        action,
        resource,
        condition,
        effect,
        priority = 50,
      } = req.body;

      const policyData = {
        name,
        description,
        subject,
        action,
        resource,
        condition,
        effect,
        priority,
        isActive: true,
      };

      const policyId = await policyEngine.addPolicy(policyData);

      logger.info('添加策略规则', {
        requesterId: req.user.id,
        policyId,
        name,
      });

      res.status(201).json(ApiResponseBuilder.success({ policyId }, '策略规则创建成功'));
    } catch (error: unknown) {
      logger.error('添加策略规则失败', {
        requesterId: req.user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/access-control/policies/{policyId}:
 *   delete:
 *     summary: 删除策略规则
 *     description: 删除指定的访问控制策略规则
 *     tags: [Access Control]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: policyId
 *         required: true
 *         schema:
 *           type: string
 *         description: 策略ID
 *     responses:
 *       200:
 *         description: 策略规则删除成功
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 策略规则不存在
 *       500:
 *         description: 服务器内部错误
 */
router.delete(
  '/policies/:policyId',
  authenticateToken,
  [param('policyId').notEmpty().withMessage('策略ID不能为空')],
  validateInput,
  asyncHandler(
  async (req: EnhancedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 检查管理员权限
      if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
        throw new AppError('只有管理员可以删除策略规则', 403);
      }

      const { policyId } = req.params;
      if (!policyId) {
        res
          .status(400)
          .json(
            ApiResponseBuilder.validationError([
              { field: 'policyId', message: '策略ID不能为空', code: 'REQUIRED' },
            ])
          );
        return;
      }

      await policyEngine.removePolicy(policyId);

      logger.info('删除策略规则', {
        requesterId: req.user.id,
        policyId,
      });

      res.json(ApiResponseBuilder.success(null, '策略规则删除成功'));
    } catch (error: unknown) {
      logger.error('删除策略规则失败', {
        requesterId: req.user?.id,
        policyId: req.params?.policyId,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
  )
);

/**
 * 记录策略评估日志
 */
async function logPolicyEvaluation(
  request: AccessRequest,
  decision: { decision: string; appliedRules: unknown[] },
  requesterId: string
): Promise<void> {
  try {
    // 这里应该记录到数据库
    logger.info('策略评估日志', {
      requesterId,
      subject: `${request.subject.entityType}:${request.subject.entityId}`,
      action: request.action.operation,
      resource: `${request.resource.resourceType}:${request.resource.resourceId}`,
      decision: decision.decision,
      appliedRules: decision.appliedRules,
    });
  } catch (error: unknown) {
    logger.error('记录策略评估日志失败', error);
    // 不抛出错误，避免影响主要功能
  }
}

export default router;
