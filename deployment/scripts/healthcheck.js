/**
 * EMR区块链系统健康检查脚本
 * 检查后端、数据库、IPFS、区块链网络状态
 */

const http = require('http');
const https = require('https');
const mysql = require('mysql2/promise');
const { create } = require('ipfs-http-client');
const fs = require('fs').promises;
const path = require('path');

// 配置
const config = {
  backend: {
    host: process.env.BACKEND_HOST || 'localhost',
    port: process.env.BACKEND_PORT || 3001,
    path: '/health'
  },
  frontend: {
    host: process.env.FRONTEND_HOST || 'localhost',
    port: process.env.FRONTEND_PORT || 3004,
    path: '/health'
  },
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'password',
    database: process.env.MYSQL_DATABASE || 'emr_blockchain'
  },
  ipfs: {
    host: process.env.IPFS_HOST || 'localhost',
    port: process.env.IPFS_PORT || 5001,
    protocol: 'http'
  },
  domain: process.env.DOMAIN || 'emr.example.com'
};

/**
 * HTTP/HTTPS请求工具函数
 */
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const client = options.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

/**
 * 检查后端服务健康状态
 */
async function checkBackendHealth() {
  try {
    const options = {
      hostname: config.backend.host,
      port: config.backend.port,
      path: config.backend.path,
      method: 'GET',
      timeout: 5000
    };
    
    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      const healthData = JSON.parse(response.body);
      return {
        status: 'healthy',
        details: healthData,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        status: 'unhealthy',
        error: `HTTP ${response.statusCode}`,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 检查前端服务健康状态
 */
async function checkFrontendHealth() {
  try {
    const options = {
      hostname: config.frontend.host,
      port: config.frontend.port,
      path: config.frontend.path,
      method: 'GET',
      timeout: 5000
    };
    
    const response = await makeRequest(options);
    
    return {
      status: response.statusCode === 200 ? 'healthy' : 'unhealthy',
      statusCode: response.statusCode,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 检查MySQL数据库连接
 */
async function checkMySQLHealth() {
  let connection = null;
  try {
    connection = await mysql.createConnection({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      connectTimeout: 5000
    });
    
    // 执行简单查询测试连接
    const [rows] = await connection.execute('SELECT 1 as test, NOW() as current_time');
    
    // 检查表是否存在
    const [tables] = await connection.execute(
      "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = ?",
      [config.mysql.database]
    );
    
    return {
      status: 'healthy',
      details: {
        connection: 'success',
        testQuery: rows[0],
        tableCount: tables[0].table_count
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 检查IPFS节点状态
 */
async function checkIPFSHealth() {
  try {
    const ipfs = create({
      host: config.ipfs.host,
      port: config.ipfs.port,
      protocol: config.ipfs.protocol,
      timeout: 5000
    });
    
    // 获取节点信息
    const version = await ipfs.version();
    const id = await ipfs.id();
    
    // 检查节点连接数
    const peers = await ipfs.swarm.peers();
    
    return {
      status: 'healthy',
      details: {
        version: version.version,
        nodeId: id.id,
        peerCount: peers.length,
        addresses: id.addresses.slice(0, 3) // 只显示前3个地址
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 检查区块链网络状态
 */
async function checkBlockchainHealth() {
  try {
    // 检查连接配置文件是否存在
    const connectionProfilePath = process.env.FABRIC_CONNECTION_PROFILE || './connection-org1.json';
    
    try {
      await fs.access(connectionProfilePath);
    } catch {
      return {
        status: 'unhealthy',
        error: 'Connection profile not found',
        timestamp: new Date().toISOString()
      };
    }
    
    // 检查钱包目录
    const walletPath = process.env.FABRIC_WALLET_PATH || './wallet';
    
    try {
      const walletFiles = await fs.readdir(walletPath);
      const hasAdmin = walletFiles.some(file => file.includes('admin'));
      
      return {
        status: hasAdmin ? 'healthy' : 'warning',
        details: {
          connectionProfile: 'exists',
          walletPath: walletPath,
          walletFiles: walletFiles.length,
          hasAdminIdentity: hasAdmin
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: `Wallet access error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 检查SSL证书状态
 */
async function checkSSLHealth() {
  try {
    const options = {
      hostname: config.domain,
      port: 443,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };
    
    const response = await makeRequest(options);
    
    return {
      status: 'healthy',
      details: {
        domain: config.domain,
        statusCode: response.statusCode,
        hasSSL: true
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 执行完整的健康检查
 */
async function performHealthCheck() {
  console.log('🏥 EMR区块链系统健康检查开始...');
  console.log('=' .repeat(50));
  
  const startTime = Date.now();
  
  const checks = {
    backend: await checkBackendHealth(),
    frontend: await checkFrontendHealth(),
    mysql: await checkMySQLHealth(),
    ipfs: await checkIPFSHealth(),
    blockchain: await checkBlockchainHealth(),
    ssl: await checkSSLHealth()
  };
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // 计算整体健康状态
  const healthyCount = Object.values(checks).filter(check => check.status === 'healthy').length;
  const totalCount = Object.keys(checks).length;
  const overallStatus = healthyCount === totalCount ? 'healthy' : 
                       healthyCount > totalCount / 2 ? 'degraded' : 'unhealthy';
  
  const result = {
    overall: {
      status: overallStatus,
      healthyServices: healthyCount,
      totalServices: totalCount,
      checkDuration: `${duration}ms`
    },
    services: checks,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
  
  // 输出结果
  console.log('\n📊 健康检查结果:');
  console.log(`整体状态: ${getStatusEmoji(overallStatus)} ${overallStatus.toUpperCase()}`);
  console.log(`健康服务: ${healthyCount}/${totalCount}`);
  console.log(`检查耗时: ${duration}ms`);
  
  console.log('\n🔍 各服务状态:');
  Object.entries(checks).forEach(([service, check]) => {
    console.log(`  ${getStatusEmoji(check.status)} ${service.padEnd(12)}: ${check.status}`);
    if (check.error) {
      console.log(`    ❌ 错误: ${check.error}`);
    }
  });
  
  console.log('\n' + '='.repeat(50));
  
  return result;
}

/**
 * 获取状态对应的emoji
 */
function getStatusEmoji(status) {
  switch (status) {
    case 'healthy': return '✅';
    case 'warning': return '⚠️';
    case 'degraded': return '🟡';
    case 'unhealthy': return '❌';
    default: return '❓';
  }
}

/**
 * 保存健康检查结果到文件
 */
async function saveHealthCheckResult(result) {
  try {
    const logsDir = process.env.LOGS_DIR || './logs';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `health-check-${timestamp}.json`;
    const filepath = path.join(logsDir, filename);
    
    // 确保日志目录存在
    try {
      await fs.mkdir(logsDir, { recursive: true });
    } catch (error) {
      // 目录已存在，忽略错误
    }
    
    await fs.writeFile(filepath, JSON.stringify(result, null, 2));
    console.log(`\n💾 健康检查结果已保存到: ${filepath}`);
  } catch (error) {
    console.error(`❌ 保存健康检查结果失败: ${error.message}`);
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    const result = await performHealthCheck();
    
    // 保存结果到文件
    if (process.env.SAVE_RESULTS !== 'false') {
      await saveHealthCheckResult(result);
    }
    
    // 根据整体状态设置退出码
    const exitCode = result.overall.status === 'healthy' ? 0 : 1;
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ 健康检查执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

// 导出函数供其他模块使用
module.exports = {
  performHealthCheck,
  checkBackendHealth,
  checkFrontendHealth,
  checkMySQLHealth,
  checkIPFSHealth,
  checkBlockchainHealth,
  checkSSLHealth
};