/**
 * 访问控制策略引擎 - 实现BNF风格的访问控制模型
 * 支持实体、操作和资源的验证
 *
 * BNF语法定义:
 * <policy> ::= <subject> <action> <resource> <condition>?
 * <subject> ::= <entity_type>:<entity_id>
 * <action> ::= "read" | "write" | "delete" | "share" | "admin"
 * <resource> ::= <resource_type>:<resource_id>
 * <condition> ::= "if" <expression>
 * <expression> ::= <term> (<operator> <term>)*
 * <term> ::= <attribute> | <value>
 * <operator> ::= "=" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in"
 */

import { Pool, RowDataPacket } from 'mysql2/promise';

import { pool } from '../config/database-mysql';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

// 策略规则接口
export interface PolicyRule {
  id: string;
  name: string;
  description?: string;
  subject: PolicySubject;
  action: PolicyAction;
  resource: PolicyResource;
  condition?: PolicyCondition;
  effect: 'allow' | 'deny';
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 策略主体接口
export interface PolicySubject {
  entityType: 'user' | 'role' | 'group';
  entityId: string;
  attributes?: Record<string, unknown>;
}

// 策略操作接口
export interface PolicyAction {
  operation: 'read' | 'write' | 'delete' | 'share' | 'admin' | '*';
  scope?: string[];
}

// 策略资源接口
export interface PolicyResource {
  resourceType: string;
  resourceId: string;
  attributes?: Record<string, unknown>;
}

// 策略条件接口
export interface PolicyCondition {
  expression: string;
  parameters: Record<string, unknown>;
}

// 访问请求接口
export interface AccessRequest {
  subject: PolicySubject;
  action: PolicyAction;
  resource: PolicyResource;
  context?: Record<string, unknown>;
}

// 访问决策接口
export interface AccessDecision {
  decision: 'allow' | 'deny';
  reason: string;
  appliedRules: string[];
  conditions?: string[];
}

export class AccessControlPolicyEngine {
  private readonly policies: Map<string, PolicyRule> = new Map();
  private initialized = false;
  private readonly db: Pool;
  private rolesByUserId: Map<string, Set<string>> = new Map();


  constructor() {
    this.db = pool;
    logger.info('AccessControlPolicyEngine initialized');
  }

  /**
   * 初始化策略引擎
   */
  private async initializePolicies(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 从数据库加载策略规则
      await this.loadPoliciesFromDatabase();
      // 加载用户角色缓存（用于同步角色匹配）
      await this.loadUserRolesFromDatabase();

      // 加载默认策略规则
      this.loadDefaultPolicies();

      this.initialized = true;
      logger.info('策略引擎初始化完成', { policyCount: this.policies.size });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('策略引擎初始化失败', { error: errorMessage });
      throw new AppError(`策略引擎初始化失败: ${errorMessage}`, 500);
    }
  }

  /**
   * 从数据库加载策略规则
   */
  private async loadPoliciesFromDatabase(): Promise<void> {
    try {
      const connection = await this.db.getConnection();
      try {
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT * FROM ACCESS_POLICIES WHERE is_active = true ORDER BY priority DESC'
        );

        for (const row of rows) {
          const policy: PolicyRule = {
            id: row.id,
            name: row.name,
            description: row.description,
            subject: JSON.parse(row.subject),
            action: JSON.parse(row.action),
            resource: JSON.parse(row.resource),
            condition: row.condition ? JSON.parse(row.condition) : undefined,
            effect: row.effect,
            priority: row.priority,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };

          this.policies.set(policy.id, policy);
        }

        logger.info('从数据库加载策略规则', { count: rows.length });
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('从数据库加载策略失败', { error: errorMessage });
      // 不抛出错误，使用默认策略
    }
  }

  /**
   * 从数据库加载用户角色缓存
   */
  private async loadUserRolesFromDatabase(): Promise<void> {
    try {
      type UserRoleRow = { userId: string | number | null; roleName: string | null };
      const connection = await this.db.getConnection();
      try {
        const [rowsRaw] = await connection.execute<RowDataPacket[]>(
          `SELECT u.user_id AS userId, r.role_name AS roleName
           FROM USERS u
           LEFT JOIN ROLES r ON u.role_id = r.role_id`
        );
        const rows = rowsRaw as unknown as UserRoleRow[];
        const map = new Map<string, Set<string>>();
        for (const row of rows) {
          const uid = String(row.userId ?? '').trim();
          const rname = String(row.roleName ?? '').trim();
          if (!uid) continue;
          const set = map.get(uid) ?? new Set<string>();
          if (rname) set.add(rname);
          map.set(uid, set);
        }
        this.rolesByUserId = map;
        logger.info('用户角色缓存已加载', { users: this.rolesByUserId.size });
      } finally {
        connection.release();
      }
    } catch (e) {
      logger.warn('加载用户角色失败，继续使用空角色缓存', { error: e instanceof Error ? e.message : String(e) });
      this.rolesByUserId = new Map();
    }
  }

  /**
   * 加载默认策略规则
   */
  private loadDefaultPolicies(): void {
    const defaultPolicies: PolicyRule[] = [
      // 患者访问自己的记录
      {
        id: 'default_patient_own_records',
        name: '患者访问自己的记录',
        subject: { entityType: 'user', entityId: '*' },
        action: { operation: 'read' },
        resource: { resourceType: 'medical_record', resourceId: '*' },
        condition: {
          expression: 'subject.id = resource.patient_id',
          parameters: {},
        },
        effect: 'allow',
        priority: 100,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 医生访问患者记录（需要权限）
      {
        id: 'default_doctor_patient_records',
        name: '医生访问患者记录',
        subject: { entityType: 'role', entityId: 'doctor' },
        action: { operation: 'read' },
        resource: { resourceType: 'medical_record', resourceId: '*' },
        condition: {
          expression: 'has_permission(subject.id, resource.id, "read")',
          parameters: {},
        },
        effect: 'allow',
        priority: 90,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 管理员全权限
      {
        id: 'default_admin_full_access',
        name: '管理员全权限',
        subject: { entityType: 'role', entityId: 'admin' },
        action: { operation: 'admin' },
        resource: { resourceType: 'system', resourceId: '*' },
        effect: 'allow',
        priority: 200,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 默认拒绝策略
      {
        id: 'default_deny_all',
        name: '默认拒绝策略',
        subject: { entityType: 'user', entityId: '*' },
        action: { operation: '*' },
        resource: { resourceType: '*', resourceId: '*' },
        effect: 'deny',
        priority: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const policy of defaultPolicies) {
      if (!this.policies.has(policy.id)) {
        this.policies.set(policy.id, policy);
      }
    }

    logger.info('加载默认策略规则', { count: defaultPolicies.length });
  }

  /**
   * 评估访问请求
   * @param request 访问请求
   * @returns 访问决策
   */
  async evaluateAccess(request: AccessRequest): Promise<AccessDecision> {
    try {
      if (!this.initialized) {
        await this.initializePolicies();
      }

      logger.info('评估访问请求', {
        subject: `${request.subject.entityType}:${request.subject.entityId}`,
        action: request.action.operation,
        resource: `${request.resource.resourceType}:${request.resource.resourceId}`,
      });

      // 获取适用的策略规则
      const applicablePolicies = this.getApplicablePolicies(request);

      // 按优先级排序
      applicablePolicies.sort((a, b) => b.priority - a.priority);

      const appliedRules: string[] = [];
      const conditions: string[] = [];

      // 评估每个策略规则
      for (const policy of applicablePolicies) {
        const matches = await this.evaluatePolicy(policy, request);

        if (matches) {
          appliedRules.push(policy.id);

          if (policy.condition) {
            conditions.push(policy.condition.expression);
          }

          // 第一个匹配的规则决定结果
          const decision: AccessDecision = {
            decision: policy.effect,
            reason: `应用策略: ${policy.name}`,
            appliedRules,
            conditions,
          };

          logger.info('访问决策完成', {
            decision: decision.decision,
            reason: decision.reason,
            appliedRules: decision.appliedRules,
          });

          return decision;
        }
      }

      // 如果没有匹配的规则，默认拒绝
      const decision: AccessDecision = {
        decision: 'deny',
        reason: '没有匹配的访问策略',
        appliedRules: [],
      };

      logger.warn('访问被拒绝 - 无匹配策略', {
        subject: `${request.subject.entityType}:${request.subject.entityId}`,
        action: request.action.operation,
        resource: `${request.resource.resourceType}:${request.resource.resourceId}`,
      });

      return decision;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('访问评估失败', { error: errorMessage });
      return {
        decision: 'deny',
        reason: `访问评估失败: ${errorMessage}`,
        appliedRules: [],
      };
    }
  }

  /**
   * 获取适用的策略规则
   */
  private getApplicablePolicies(request: AccessRequest): PolicyRule[] {
    const applicable: PolicyRule[] = [];

    for (const policy of this.policies.values()) {
      if (!policy.isActive) {
        continue;
      }

      // 检查主体匹配
      if (!this.matchesSubject(policy.subject, request.subject)) {
        continue;
      }

      // 检查操作匹配
      if (!this.matchesAction(policy.action, request.action)) {
        continue;
      }

      // 检查资源匹配
      if (!this.matchesResource(policy.resource, request.resource)) {
        continue;
      }

      applicable.push(policy);
    }

    return applicable;
  }

  /**
   * 检查主体是否匹配
   */
  private matchesSubject(policySubject: PolicySubject, requestSubject: PolicySubject): boolean {
    // 通配符匹配
    if (policySubject.entityId === '*') {
      return (
        policySubject.entityType === requestSubject.entityType ||
        policySubject.entityType === 'user'
      );
    }

    // 精确匹配
    if (
      policySubject.entityType === requestSubject.entityType &&
      policySubject.entityId === requestSubject.entityId
    ) {
      return true;
    }

    // 角色匹配（支持基于属性的动态角色 + 用户角色缓存）
    if (policySubject.entityType === 'role' && requestSubject.entityType === 'user') {
      const attrs: Record<string, unknown> = requestSubject.attributes ?? {};
      const attrRole = typeof attrs['role'] === 'string' ? String(attrs['role']) : undefined;
      const attrRoles = Array.isArray(attrs['roles']) ? (attrs['roles'] as unknown[]).map(v => String(v)) : [];
      if (attrRole && attrRole === policySubject.entityId) return true;
      if (attrRoles.includes(policySubject.entityId)) return true;
      return this.userHasRole(requestSubject.entityId, policySubject.entityId);
    }

    return false;
  }

  /**
   * 检查操作是否匹配
   */
  private matchesAction(policyAction: PolicyAction, requestAction: PolicyAction): boolean {
    return policyAction.operation === '*' || policyAction.operation === requestAction.operation;
  }

  /**
   * 检查资源是否匹配
   */
  private matchesResource(
    policyResource: PolicyResource,
    requestResource: PolicyResource
  ): boolean {
    // 通配符匹配
    if (policyResource.resourceType === '*' || policyResource.resourceId === '*') {
      return (
        policyResource.resourceType === '*' ||
        policyResource.resourceType === requestResource.resourceType
      );
    }

    // 精确匹配
    return (
      policyResource.resourceType === requestResource.resourceType &&
      policyResource.resourceId === requestResource.resourceId
    );
  }

  /**
   * 评估策略规则
   */
  private async evaluatePolicy(policy: PolicyRule, request: AccessRequest): Promise<boolean> {
    try {
      // 如果没有条件，直接返回true
      if (!policy.condition) {
        return true;
      }

      // 评估条件表达式
      return await this.evaluateCondition(policy.condition, request);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('策略评估失败', { policyId: policy.id, error: errorMessage });
      return false;
    }
  }

  /**
   * 评估条件表达式
   */
  private async evaluateCondition(
    condition: PolicyCondition,
    request: AccessRequest
  ): Promise<boolean> {
    try {
      const expression = condition.expression.trim();

      // 检查患者所有权
      if (expression === 'subject.id = resource.patient_id') {
        return await this.checkPatientOwnership(
          request.subject.entityId,
          request.resource.resourceId
        );
      }

      // 检查权限
      if (expression.startsWith('has_permission(')) {
        const re = /has_permission\(([^,]+),\s*([^,]+),\s*"([^"]+)"\)/;
        const match = re.exec(expression);
        if (match) {
          const actionType = match[3] ?? '';
          if (!actionType) return false;
          return await this.checkPermission(
            request.subject.entityId,
            request.resource.resourceId,
            actionType
          );
        }
      }

      // 其他条件表达式的评估
      logger.warn('未支持的条件表达式', { expression });
      return false;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('条件评估失败', { error: errorMessage });
      return false;
    }
  }

  /**
   * 检查用户是否有指定角色
   */
  private userHasRole(userId: string, roleName: string): boolean {
    try {
      if (!userId || !roleName) return false;
      const roles = this.rolesByUserId.get(userId);
      if (roles?.has(roleName)) return true;
      return false;
    } catch (e) {
      logger.warn('userHasRole check failed', { error: e instanceof Error ? e.message : String(e) });
      return false;
    }
  }

  /**
   * 检查患者所有权
   */
  private async checkPatientOwnership(userId: string, recordId: string): Promise<boolean> {
    try {
      const connection = await this.db.getConnection();
      try {
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT patient_id FROM MEDICAL_RECORDS WHERE record_id = ?',
          [recordId]
        );

        if (rows.length === 0) {
          return false;
        }

        return (rows[0]?.patient_id) === userId;
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('检查患者所有权失败', { error: errorMessage });
      return false;
    }
  }

  /**
   * 检查用户权限
   */
  private async checkPermission(
    userId: string,
    resourceId: string,
    action: string
  ): Promise<boolean> {
    try {
      const connection = await this.db.getConnection();
      try {
        const [rows] = await connection.execute<RowDataPacket[]>(
          `SELECT COUNT(*) as count
           FROM PERMISSIONS
           WHERE (patient_id = ? OR doctor_id = ?)
             AND resource_id = ?
             AND permission_type = ?
             AND is_active = true
             AND (expires_at IS NULL OR expires_at > NOW())`,
          [userId, userId, resourceId, action]
        );

        return Number((rows[0])['count'] ?? 0) > 0;
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('检查用户权限失败', { error: errorMessage });
      return false;
    }
  }

  /**
   * 添加策略规则
   */
  async addPolicy(policy: Omit<PolicyRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const id = `policy_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const now = new Date();

      const fullPolicy: PolicyRule = {
        ...policy,
        id,
        createdAt: now,
        updatedAt: now,
      };

      // 保存到数据库
      const connection = await this.db.getConnection();
      try {
        await connection.execute(
          `INSERT INTO ACCESS_POLICIES
           (id, name, description, subject, action, resource, condition, effect, priority, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            policy.name,
            (policy.description ?? null),
            JSON.stringify(policy.subject),
            JSON.stringify(policy.action),
            JSON.stringify(policy.resource),
            policy.condition ? JSON.stringify(policy.condition) : null,
            policy.effect,
            policy.priority,
            policy.isActive,
            now,
            now,
          ]
        );
      } finally {
        connection.release();
      }

      // 添加到内存缓存
      this.policies.set(id, fullPolicy);

      logger.info('添加策略规则', { policyId: id, name: policy.name });
      return id;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('添加策略规则失败', { error: errorMessage });
      throw new AppError(`添加策略规则失败: ${errorMessage}`, 500);
    }
  }

  /**
   * 删除策略规则
   */
  async removePolicy(policyId: string): Promise<void> {
    try {
      // 从数据库删除
      const connection = await this.db.getConnection();
      try {
        await connection.execute('DELETE FROM ACCESS_POLICIES WHERE id = ?', [policyId]);
      } finally {
        connection.release();
      }

      // 从内存缓存删除
      this.policies.delete(policyId);

      logger.info('删除策略规则', { policyId });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('删除策略规则失败', { error: errorMessage });
      throw new AppError(`删除策略规则失败: ${errorMessage}`, 500);
    }
  }

  /**
   * 获取所有策略规则
   */
  getAllPolicies(): PolicyRule[] {
    return Array.from(this.policies.values());
  }

  /**
   * 更新策略规则
   */
  async updatePolicy(
    policyId: string,
    updates: Partial<Omit<PolicyRule, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    try {
      const existingPolicy = this.policies.get(policyId);
      if (!existingPolicy) {
        throw new AppError('策略规则不存在', 404);
      }

      const updatedPolicy: PolicyRule = {
        ...existingPolicy,
        ...updates,
        updatedAt: new Date(),
      };

      // 更新数据库
      const connection = await this.db.getConnection();
      try {
        await connection.execute(
          `UPDATE ACCESS_POLICIES
           SET name = ?, description = ?, subject = ?, action = ?, resource = ?,
               condition = ?, effect = ?, priority = ?, is_active = ?, updated_at = ?
           WHERE id = ?`,
          [
            updatedPolicy.name,
            (updatedPolicy.description ?? null),
            JSON.stringify(updatedPolicy.subject),
            JSON.stringify(updatedPolicy.action),
            JSON.stringify(updatedPolicy.resource),
            updatedPolicy.condition ? JSON.stringify(updatedPolicy.condition) : null,
            updatedPolicy.effect,
            updatedPolicy.priority,
            updatedPolicy.isActive,
            updatedPolicy.updatedAt,
            policyId,
          ]
        );
      } finally {
        connection.release();
      }

      // 更新内存缓存
      this.policies.set(policyId, updatedPolicy);

      logger.info('更新策略规则', { policyId, updates });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('更新策略规则失败', { error: errorMessage });
      throw new AppError(`更新策略规则失败: ${errorMessage}`, 500);
    }
  }

  /**
   * 重新加载策略规则
   */
  async reloadPolicies(): Promise<void> {
    try {
      this.policies.clear();
      this.initialized = false;
      await this.initializePolicies();
      logger.info('策略规则重新加载完成');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('重新加载策略规则失败', { error: errorMessage });
      throw new AppError(`重新加载策略规则失败: ${errorMessage}`, 500);
    }
  }
}

export default AccessControlPolicyEngine;
