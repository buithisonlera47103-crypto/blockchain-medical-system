/**
 * 数据库连接池 - 最小化导出
 * 用于避免循环依赖问题
 */

import { createPool, type PoolOptions, type RowDataPacket } from 'mysql2/promise';

// 使用 mysql2 PoolOptions 作为配置类型
type MySQLConfig = PoolOptions;

// 获取MySQL配置
// eslint-disable-next-line complexity
const getMySQLConfig = (): MySQLConfig => {
  return {
    host: process.env['MYSQL_HOST'] ?? process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['MYSQL_PORT'] ?? process.env['DB_PORT'] ?? '3306', 10),
    user: process.env['MYSQL_USER'] ?? process.env['DB_USER'] ?? 'root',
    password: process.env['MYSQL_PASSWORD'] ?? process.env['DB_PASSWORD'] ?? 'password',
    database: process.env['MYSQL_DATABASE'] ?? process.env['DB_NAME'] ?? 'emr_blockchain',
    connectionLimit: parseInt(process.env['DB_POOL_MAX'] ?? '10', 10),
    ssl: process.env['DB_SSL'] === 'true' ? { rejectUnauthorized: false } : false,
  } as PoolOptions;
};

// 创建MySQL连接池
const mysqlConfig = getMySQLConfig();
export const pool = createPool(mysqlConfig);

// 导出类型定义
export type DatabasePool = typeof pool;
export type QueryResult = RowDataPacket[];
