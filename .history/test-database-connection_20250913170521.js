#!/usr/bin/env node

/**
 * 数据库连接测试脚本
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 加载环境变量
require('dotenv').config();

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'blockchain_db',
  connectTimeout: 10000,
  acquireTimeout: 10000,
  timeout: 10000
};

console.log('🔍 数据库连接配置:');
console.log(`   主机: ${dbConfig.host}:${dbConfig.port}`);
console.log(`   用户: ${dbConfig.user}`);
console.log(`   数据库: ${dbConfig.database}`);
console.log(`   密码: ${dbConfig.password ? '***' : '(空)'}`);

async function testDatabaseConnection() {
  let connection = null;
  
  try {
    console.log('\n🔗 正在连接数据库...');
    
    // 创建连接
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 测试基本查询
    console.log('\n📊 执行测试查询...');
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ 测试查询成功:', rows[0]);

    // 获取MySQL版本
    const [versionRows] = await connection.execute('SELECT VERSION() as mysql_version');
    console.log('   MySQL版本:', versionRows[0].mysql_version);
    
    // 检查数据库是否存在
    console.log('\n🗄️ 检查数据库状态...');
    const [databases] = await connection.execute('SHOW DATABASES');
    const dbExists = databases.some(db => db.Database === dbConfig.database);
    console.log(`   数据库 "${dbConfig.database}" ${dbExists ? '存在' : '不存在'}`);
    
    if (dbExists) {
      // 切换到目标数据库
      await connection.execute(`USE ${dbConfig.database}`);
      
      // 检查表
      const [tables] = await connection.query('SHOW TABLES');
      console.log(`   表数量: ${tables.length}`);

      if (tables.length > 0) {
        console.log('   现有表:');
        tables.forEach((table, index) => {
          const tableName = Object.values(table)[0];
          console.log(`     ${index + 1}. ${tableName}`);
        });
      } else {
        console.log('   ⚠️  数据库中没有表');
      }
    }
    
    // 测试连接池
    console.log('\n🏊 测试连接池...');
    const pool = mysql.createPool({
      ...dbConfig,
      connectionLimit: 5,
      queueLimit: 0
    });
    
    const poolConnection = await pool.getConnection();
    const [poolTest] = await poolConnection.execute('SELECT CONNECTION_ID() as connection_id');
    console.log('✅ 连接池测试成功, 连接ID:', poolTest[0].connection_id);
    poolConnection.release();
    await pool.end();
    
    return true;
    
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   原因: 无法连接到MySQL服务器');
      console.error('   建议: 检查MySQL服务是否运行');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   原因: 用户名或密码错误');
      console.error('   建议: 检查数据库凭据');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('   原因: 数据库不存在');
      console.error('   建议: 创建数据库或检查数据库名称');
    }
    
    return false;
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

async function createDatabaseIfNotExists() {
  let connection = null;
  
  try {
    console.log('\n🏗️ 尝试创建数据库...');
    
    // 连接到MySQL服务器（不指定数据库）
    const serverConfig = { ...dbConfig };
    delete serverConfig.database;
    
    connection = await mysql.createConnection(serverConfig);
    
    // 创建数据库
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 数据库 "${dbConfig.database}" 已创建或已存在`);
    
    return true;
    
  } catch (error) {
    console.error('❌ 创建数据库失败:', error.message);
    return false;
    
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function initializeBasicTables() {
  let connection = null;
  
  try {
    console.log('\n📋 初始化基础表结构...');
    
    connection = await mysql.createConnection(dbConfig);
    
    // 创建用户表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        user_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role ENUM('patient', 'doctor', 'nurse', 'admin', 'researcher') NOT NULL DEFAULT 'patient',
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 用户表已创建');
    
    // 创建医疗记录表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS medical_records (
        record_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        patient_id VARCHAR(36) NOT NULL,
        creator_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        record_type VARCHAR(50) NOT NULL,
        ipfs_cid VARCHAR(255),
        blockchain_tx_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_patient_id (patient_id),
        INDEX idx_creator_id (creator_id),
        INDEX idx_record_type (record_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 医疗记录表已创建');
    
    // 创建访问权限表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS access_permissions (
        permission_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        record_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        permission_type ENUM('read', 'write', 'admin') NOT NULL,
        granted_by VARCHAR(36) NOT NULL,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        INDEX idx_record_id (record_id),
        INDEX idx_user_id (user_id),
        INDEX idx_permission_type (permission_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 访问权限表已创建');
    
    return true;
    
  } catch (error) {
    console.error('❌ 初始化表结构失败:', error.message);
    return false;
    
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function main() {
  console.log('🚀 开始数据库连接和初始化测试...\n');
  
  // 1. 测试基本连接
  let success = await testDatabaseConnection();
  
  if (!success) {
    // 2. 尝试创建数据库
    success = await createDatabaseIfNotExists();
    
    if (success) {
      // 3. 重新测试连接
      success = await testDatabaseConnection();
    }
  }
  
  if (success) {
    // 4. 初始化基础表结构
    await initializeBasicTables();
    
    // 5. 最终验证
    console.log('\n🎉 数据库连接和初始化完成!');
    console.log('✅ 数据库已准备就绪，可以开始使用');
  } else {
    console.log('\n❌ 数据库连接失败，请检查配置和服务状态');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 测试过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = {
  testDatabaseConnection,
  createDatabaseIfNotExists,
  initializeBasicTables
};
