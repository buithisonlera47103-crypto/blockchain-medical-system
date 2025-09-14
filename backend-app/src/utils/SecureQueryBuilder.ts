import { AuditService } from '../services/AuditService';



// Lightweight logger interface to avoid explicit any
type LoggerLike = {
  info: (message: string, meta?: unknown) => void;
  error: (message: string, meta?: unknown) => void;
  warn?: (message: string, meta?: unknown) => void;
};

// Minimal database interface to avoid sqlite3 dependency at compile-time
export interface DatabaseLike {
  all(sql: string, params: unknown[], callback: (err: Error | null, rows: Record<string, unknown>[]) => void): void;
  run(sql: string, params: unknown[], callback: (this: { changes: number; lastID?: number }, err: Error | null) => void): void;
}

// 查询操作类型枚举
export enum QueryType {
  SELECT = 'SELECT',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

// 比较操作符枚举
export enum ComparisonOperator {
  EQUALS = '=',
  NOT_EQUALS = '!=',
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_EQUAL = '>=',
  LESS_EQUAL = '<=',
  LIKE = 'LIKE',
  IN = 'IN',
  NOT_IN = 'NOT IN',
  IS_NULL = 'IS NULL',
  IS_NOT_NULL = 'IS NOT NULL',
}

// WHERE条件接口
export interface WhereCondition {
  column: string;
  operator: ComparisonOperator;
  value?: unknown;
  logicalOperator?: 'AND' | 'OR';
}

// 查询选项接口
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  groupBy?: string[];
  having?: WhereCondition[];
}

// 查询结果接口
export interface QueryResult<T = unknown> {
  data: T[];
  total?: number;
  hasMore?: boolean;
}

// 表访问权限接口
export interface TablePermission {
  tableName: string;
  allowedOperations: QueryType[];
  allowedColumns?: string[];
  restrictedColumns?: string[];
}

// 用户权限接口
export interface UserPermissions {
  userId: string;
  role: string;
  tablePermissions: TablePermission[];
}

/**
 * 安全查询构建器类
 * 提供类型安全的SQL查询构建功能，包含权限验证和SQL注入防护
 */
export class SecureQueryBuilder {
  private query: string = '';
  private params: unknown[] = [];
  private queryType: QueryType | null = null;
  private tableName: string = '';
  private whereConditions: WhereCondition[] = [];
  private joinClauses: string[] = [];
  private selectColumns: string[] = [];
  private updateData: Record<string, unknown> = {};
  private insertData: Record<string, unknown> = {};
  private options: QueryOptions = {};

  constructor(
    private readonly userPermissions: UserPermissions,
    private readonly logger: LoggerLike
  ) {}

  /**
   * 开始SELECT查询
   */
  select(columns: string[] = ['*']): this {
    this.queryType = QueryType.SELECT;
    this.selectColumns = columns;
    return this;
  }

  /**
   * 指定查询的表
   */
  from(table: string): this {
    if (!this.queryType) {
      throw new Error('必须先选择查询类型');
    }
    this.validateTableAccess(table, this.queryType);
    this.tableName = table;
    return this;
  }

  /**
   * 添加WHERE条件
   */
  where(column: string, operator: ComparisonOperator, value?: unknown): this {
    this.validateColumnAccess(column);
    this.whereConditions.push({
      column: this.sanitizeColumnName(column),
      operator,
      value,
      logicalOperator: this.whereConditions.length > 0 ? 'AND' : undefined,
    });
    return this;
  }

  /**
   * 添加OR WHERE条件
   */
  orWhere(column: string, operator: ComparisonOperator, value?: unknown): this {
    this.validateColumnAccess(column);
    this.whereConditions.push({
      column: this.sanitizeColumnName(column),
      operator,
      value,
      logicalOperator: 'OR',
    });
    return this;
  }

  /**
   * 添加JOIN子句
   */
  join(table: string, condition: string): this {
    this.validateTableAccess(table, QueryType.SELECT);
    this.joinClauses.push(`JOIN ${this.sanitizeTableName(table)} ON ${condition}`);
    return this;
  }

  /**
   * 设置查询选项
   */
  setOptions(options: QueryOptions): this {
    this.options = { ...this.options, ...options };
    return this;
  }

  /**
   * 开始INSERT查询
   */
  insert(data: Record<string, unknown>): this {
    this.queryType = QueryType.INSERT;
    this.insertData = data;
    return this;
  }

  /**
   * 指定INSERT的目标表
   */
  into(table: string): this {
    this.validateTableAccess(table, QueryType.INSERT);
    this.tableName = table;
    return this;
  }

  /**
   * 开始UPDATE查询
   */
  update(table: string): this {
    this.validateTableAccess(table, QueryType.UPDATE);
    this.queryType = QueryType.UPDATE;
    this.tableName = table;
    return this;
  }

  /**
   * 设置UPDATE的数据
   */
  set(data: Record<string, unknown>): this {
    Object.keys(data).forEach(column => {
      this.validateColumnAccess(column);
    });
    this.updateData = { ...this.updateData, ...data };
    return this;
  }

  /**
   * 开始DELETE查询
   */
  delete(): this {
    this.queryType = QueryType.DELETE;
    return this;
  }

  /**
   * 构建最终的SQL查询
   */
  build(): { sql: string; params: unknown[] } {
    this.params = [];

    switch (this.queryType) {
      case QueryType.SELECT:
        this.query = this.buildSelectQuery();
        break;
      case QueryType.INSERT:
        this.query = this.buildInsertQuery();
        break;
      case QueryType.UPDATE:
        this.query = this.buildUpdateQuery();
        break;
      case QueryType.DELETE:
        this.query = this.buildDeleteQuery();
        break;
      default:
        throw new Error('未指定查询类型');
    }

    this.logger.info('构建SQL查询', {
      sql: this.query,
      paramCount: this.params.length,
      queryType: this.queryType,
    });

    return {
      sql: this.query,
      params: this.params,
    };
  }

  /**
   * 构建SELECT查询
   */
  private buildSelectQuery(): string {
    const columns = this.selectColumns
      .map(col => (col === '*' ? '*' : this.sanitizeColumnName(col)))
      .join(', ');

    let query = `SELECT ${columns} FROM ${this.sanitizeTableName(this.tableName)}`;

    // 添加JOIN子句
    if (this.joinClauses.length > 0) {
      query += ` ${this.joinClauses.join(' ')}`;
    }

    // 添加WHERE条件
    query += this.buildWhereClause();

    // 添加GROUP BY
    if (this.options.groupBy && this.options.groupBy.length > 0) {
      const groupColumns = this.options.groupBy.map(col => this.sanitizeColumnName(col)).join(', ');
      query += ` GROUP BY ${groupColumns}`;
    }

    // 添加HAVING条件
    if (this.options.having && this.options.having.length > 0) {
      query += this.buildHavingClause();
    }

    // 添加ORDER BY
    if (this.options.orderBy) {
      const direction = this.options.orderDirection ?? 'ASC';
      query += ` ORDER BY ${this.sanitizeColumnName(this.options.orderBy)} ${direction}`;
    }

    // 添加LIMIT和OFFSET
    if (this.options.limit) {
      query += ` LIMIT ${this.options.limit}`;
      if (this.options.offset) {
        query += ` OFFSET ${this.options.offset}`;
      }
    }

    return query;
  }

  /**
   * 构建INSERT查询
   */
  private buildInsertQuery(): string {
    const columns = Object.keys(this.insertData).map(col => this.sanitizeColumnName(col));
    const placeholders = columns.map(() => '?');

    Object.values(this.insertData).forEach(value => {
      this.params.push(value);
    });

    return `INSERT INTO ${this.sanitizeTableName(this.tableName)} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
  }

  /**
   * 构建UPDATE查询
   */
  private buildUpdateQuery(): string {
    const setClauses = Object.keys(this.updateData).map(column => {
      this.params.push(this.updateData[column]);
      return `${this.sanitizeColumnName(column)} = ?`;
    });

    let query = `UPDATE ${this.sanitizeTableName(this.tableName)} SET ${setClauses.join(', ')}`;
    query += this.buildWhereClause();

    return query;
  }

  /**
   * 构建DELETE查询
   */
  private buildDeleteQuery(): string {
    let query = `DELETE FROM ${this.sanitizeTableName(this.tableName)}`;
    query += this.buildWhereClause();
    return query;
  }

  /**
   * 构建WHERE子句
   */
  private buildWhereClause(): string {
    if (this.whereConditions.length === 0) {
      return '';
    }

    const conditions = this.whereConditions.map((condition, index) => {
      let clause = '';

      if (index > 0 && condition.logicalOperator) {
        clause += ` ${condition.logicalOperator} `;
      }

      if (
        condition.operator === ComparisonOperator.IS_NULL ||
        condition.operator === ComparisonOperator.IS_NOT_NULL
      ) {
        clause += `${condition.column} ${condition.operator}`;
      } else if (
        condition.operator === ComparisonOperator.IN ||
        condition.operator === ComparisonOperator.NOT_IN
      ) {
        const placeholders = Array.isArray(condition.value)
          ? condition.value.map(() => '?').join(', ')
          : '?';
        clause += `${condition.column} ${condition.operator} (${placeholders})`;

        if (Array.isArray(condition.value)) {
          condition.value.forEach((val: unknown) => this.params.push(val));
        } else {
          this.params.push(condition.value);
        }
      } else {
        clause += `${condition.column} ${condition.operator} ?`;
        this.params.push(condition.value);
      }

      return clause;
    });

    return ` WHERE ${conditions.join('')}`;
  }

  /**
   * 构建HAVING子句
   */
  private buildHavingClause(): string {
    if (!this.options.having || this.options.having.length === 0) {
      return '';
    }

    const conditions = this.options.having.map((condition, index) => {
      let clause = '';

      if (index > 0 && condition.logicalOperator) {
        clause += ` ${condition.logicalOperator} `;
      }

      clause += `${condition.column} ${condition.operator} ?`;
      this.params.push(condition.value);

      return clause;
    });

    return ` HAVING ${conditions.join('')}`;
  }

  /**
   * 验证表访问权限
   */
  private validateTableAccess(tableName: string, operation: QueryType): void {
    const permission = this.userPermissions.tablePermissions.find(p => p.tableName === tableName);

    if (!permission) {
      throw new Error(`用户无权访问表: ${tableName}`);
    }

    if (!permission.allowedOperations.includes(operation)) {
      throw new Error(`用户无权对表 ${tableName} 执行 ${operation} 操作`);
    }
  }

  /**
   * 验证列访问权限
   */
  private validateColumnAccess(columnName: string): void {
    const permission = this.userPermissions.tablePermissions.find(
      p => p.tableName === this.tableName
    );

    if (!permission) {
      return;
    }

    if (permission.restrictedColumns?.includes(columnName)) {
      throw new Error(`用户无权访问列: ${columnName}`);
    }

    if (permission.allowedColumns && !permission.allowedColumns.includes(columnName)) {
      throw new Error(`用户无权访问列: ${columnName}`);
    }
  }

  /**
   * 清理表名，防止SQL注入
   */
  private sanitizeTableName(tableName: string): string {
    return tableName.replace(/[^a-zA-Z0-9_]/g, '');
  }

  /**
   * 清理列名，防止SQL注入
   */
  private sanitizeColumnName(columnName: string): string {
    return columnName.replace(/[^a-zA-Z0-9_.]/g, '');
  }

  /**
   * 重置查询构建器
   */
  reset(): this {
    this.query = '';
    this.params = [];
    this.queryType = null;
    this.tableName = '';
    this.whereConditions = [];
    this.joinClauses = [];
    this.selectColumns = [];
    this.updateData = {};
    this.insertData = {};
    this.options = {};
    return this;
  }
}

/**
 * 安全数据库服务类
 * 提供基于权限的数据库操作接口
 */
export class SecureDatabaseService {
  constructor(
    private readonly db: DatabaseLike,
    private readonly logger: LoggerLike,
    private readonly auditService: AuditService
  ) {}

  /**
   * 执行安全查询
   */
  async executeQuery<T = unknown>(
    userPermissions: UserPermissions,
    builderCallback: (builder: SecureQueryBuilder) => SecureQueryBuilder
  ): Promise<QueryResult<T>> {
    const builder = new SecureQueryBuilder(userPermissions, this.logger);
    const configuredBuilder = builderCallback(builder);
    const { sql, params } = configuredBuilder.build();

    try {
      // 记录查询审计
      await (this.auditService as { logDatabaseAccess?: (entry: unknown) => Promise<void> }).logDatabaseAccess?.({
        userId: userPermissions.userId,
        operation: 'QUERY',
        sql,
        timestamp: new Date(),
        success: true,
      });

      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err: Error | null, rows: Record<string, unknown>[]) => {
          if (err) {
            this.logger.error('数据库查询失败', { error: err.message, sql, params });
            reject(err);
          } else {
            resolve({
              data: rows as T[],
              total: rows.length,
            });
          }
        });
      });
    } catch (error) {
      // 记录失败的查询审计
      await (this.auditService as { logDatabaseAccess?: (entry: unknown) => Promise<void> }).logDatabaseAccess?.({
        userId: userPermissions.userId,
        operation: 'QUERY',
        sql,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 执行安全的数据修改操作
   */
  async executeModification(
    userPermissions: UserPermissions,
    builderCallback: (builder: SecureQueryBuilder) => SecureQueryBuilder
  ): Promise<{ changes: number; lastID?: number }> {
    const builder = new SecureQueryBuilder(userPermissions, this.logger);
    const configuredBuilder = builderCallback(builder);
    const { sql, params } = configuredBuilder.build();

    try {
      // 记录修改操作审计
      await (this.auditService as { logDatabaseAccess?: (entry: unknown) => Promise<void> }).logDatabaseAccess?.({
        userId: userPermissions.userId,
        operation: 'MODIFICATION',
        sql,
        timestamp: new Date(),
        success: true,
      });

      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function (this: { changes: number; lastID?: number }, err: Error | null) {
          if (err) {
            reject(err);
          } else {
            resolve({
              changes: this.changes,
              lastID: this.lastID,
            });
          }
        });
      });
    } catch (error) {
      // 记录失败的修改操作审计
      await (this.auditService as { logDatabaseAccess?: (entry: unknown) => Promise<void> }).logDatabaseAccess?.({
        userId: userPermissions.userId,
        operation: 'MODIFICATION',
        sql,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }
}
