#!/usr/bin/env node

const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testBlockchain() {
  console.log('🔗 测试区块链连接...\n');

  try {
    // 测试后端的区块链状态
    const result = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    });

    console.log('✅ 后端健康检查:', result.status === 200 ? '正常' : '失败');
    
    if (result.data && result.data.services) {
      console.log('📊 服务状态:');
      Object.entries(result.data.services).forEach(([service, status]) => {
        const icon = status === 'healthy' ? '✅' : status === 'degraded' ? '⚠️' : '❌';
        console.log(`   ${icon} ${service}: ${status}`);
      });
    }

    // 检查区块链特定的健康状态
    if (result.data && result.data.blockchain) {
      console.log('\n🔗 区块链状态:');
      console.log(`   连接状态: ${result.data.blockchain.connected ? '✅ 已连接' : '❌ 未连接'}`);
      if (result.data.blockchain.peer) {
        console.log(`   Peer状态: ${result.data.blockchain.peer.status || 'N/A'}`);
      }
      if (result.data.blockchain.orderer) {
        console.log(`   Orderer状态: ${result.data.blockchain.orderer.status || 'N/A'}`);
      }
    }

  } catch (error) {
    console.log('❌ 区块链连接测试失败:', error.message);
  }

  // 测试Docker容器状态
  console.log('\n🐳 Docker容器状态:');
  try {
    const { exec } = require('child_process');
    
    exec('docker ps --format "table {{.Names}}\\t{{.Status}}" | grep -E "(peer0|orderer|cli)"', (error, stdout, stderr) => {
      if (error) {
        console.log('   ❌ 无法获取Docker状态');
      } else {
        console.log(stdout || '   ❌ 没有运行的Fabric容器');
      }
    });
  } catch (error) {
    console.log('   ❌ Docker检查失败');
  }

  console.log('\n🎯 区块链测试完成');
}

testBlockchain().catch(console.error);
