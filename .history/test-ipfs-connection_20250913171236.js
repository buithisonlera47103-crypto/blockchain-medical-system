#!/usr/bin/env node

/**
 * IPFS连接测试脚本
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// IPFS配置
const ipfsConfig = {
  host: process.env.IPFS_HOST || 'localhost',
  port: parseInt(process.env.IPFS_PORT || '5001'),
  protocol: process.env.IPFS_PROTOCOL || 'http'
};

console.log('🔍 IPFS连接配置:');
console.log(`   节点: ${ipfsConfig.protocol}://${ipfsConfig.host}:${ipfsConfig.port}`);

// HTTP请求辅助函数
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const client = options.protocol === 'https:' ? https : http;

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.headers['content-type']?.includes('application/json')) {
            resolve(JSON.parse(body));
          } else {
            resolve(body);
          }
        } catch (e) {
          resolve(body);
        }
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

async function testIPFSConnection() {
  try {
    console.log('\n🔗 正在连接IPFS节点...');

    // 测试节点ID
    console.log('\n📊 获取节点信息...');
    const nodeId = await makeRequest({
      hostname: ipfsConfig.host,
      port: ipfsConfig.port,
      path: '/api/v0/id',
      method: 'POST'
    });

    console.log('✅ IPFS节点连接成功');
    console.log(`   节点ID: ${nodeId.ID}`);
    console.log(`   代理版本: ${nodeId.AgentVersion || 'N/A'}`);
    console.log(`   协议版本: ${nodeId.ProtocolVersion || 'N/A'}`);
    console.log(`   地址数量: ${nodeId.Addresses ? nodeId.Addresses.length : 0}`);

    // 测试版本信息
    const version = await makeRequest({
      hostname: ipfsConfig.host,
      port: ipfsConfig.port,
      path: '/api/v0/version',
      method: 'POST'
    });

    console.log(`   IPFS版本: ${version.Version}`);
    console.log(`   Commit: ${version.Commit ? version.Commit.substring(0, 8) : 'N/A'}`);
    console.log(`   Go版本: ${version.Golang || 'N/A'}`);

    return { nodeId, version };

  } catch (error) {
    console.error('❌ IPFS连接失败:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('   原因: 无法连接到IPFS节点');
      console.error('   建议: 检查IPFS daemon是否运行');
      console.error('   命令: ipfs daemon');
    } else if (error.message.includes('timeout')) {
      console.error('   原因: 连接超时');
      console.error('   建议: 检查网络连接和IPFS配置');
    }

    return null;
  }
}

async function testIPFSOperations(ipfs) {
  try {
    console.log('\n📁 测试文件操作...');
    
    // 创建测试文件
    const testContent = 'Hello IPFS! This is a test file from blockchain medical record system.';
    const testBuffer = Buffer.from(testContent);
    
    // 添加文件到IPFS
    console.log('   上传测试文件...');
    const addResult = await ipfs.add(testBuffer);
    const hash = addResult.cid.toString();
    console.log(`✅ 文件上传成功, Hash: ${hash}`);
    
    // 从IPFS获取文件
    console.log('   下载测试文件...');
    const chunks = [];
    for await (const chunk of ipfs.cat(hash)) {
      chunks.push(chunk);
    }
    const retrievedContent = Buffer.concat(chunks).toString();
    
    if (retrievedContent === testContent) {
      console.log('✅ 文件下载成功, 内容验证通过');
    } else {
      console.log('❌ 文件内容验证失败');
      return false;
    }
    
    // 测试文件信息
    console.log('   获取文件信息...');
    const stat = await ipfs.files.stat(`/ipfs/${hash}`);
    console.log(`✅ 文件大小: ${stat.size} bytes`);
    console.log(`   文件类型: ${stat.type}`);
    
    // 测试Pin操作
    console.log('   测试Pin操作...');
    await ipfs.pin.add(hash);
    console.log('✅ 文件Pin成功');
    
    const pins = [];
    for await (const pin of ipfs.pin.ls({ paths: [hash] })) {
      pins.push(pin);
    }
    
    if (pins.length > 0) {
      console.log('✅ Pin状态验证成功');
    }
    
    // 清理测试数据
    console.log('   清理测试数据...');
    await ipfs.pin.rm(hash);
    console.log('✅ 测试数据清理完成');
    
    return true;
    
  } catch (error) {
    console.error('❌ IPFS操作失败:', error.message);
    return false;
  }
}

async function testIPFSDirectory(ipfs) {
  try {
    console.log('\n📂 测试目录操作...');
    
    // 创建测试目录结构
    const files = [
      {
        path: 'test-dir/file1.txt',
        content: Buffer.from('Content of file 1')
      },
      {
        path: 'test-dir/file2.txt', 
        content: Buffer.from('Content of file 2')
      },
      {
        path: 'test-dir/subdir/file3.txt',
        content: Buffer.from('Content of file 3 in subdirectory')
      }
    ];
    
    // 添加目录到IPFS
    console.log('   上传测试目录...');
    const addResults = [];
    for await (const result of ipfs.addAll(files, { wrapWithDirectory: true })) {
      addResults.push(result);
    }
    
    const dirHash = addResults[addResults.length - 1].cid.toString();
    console.log(`✅ 目录上传成功, Hash: ${dirHash}`);
    
    // 列出目录内容
    console.log('   列出目录内容...');
    const dirContents = [];
    for await (const file of ipfs.ls(dirHash)) {
      dirContents.push(file);
    }
    
    console.log(`✅ 目录包含 ${dirContents.length} 个项目:`);
    dirContents.forEach((item, index) => {
      console.log(`     ${index + 1}. ${item.name} (${item.type}, ${item.size} bytes)`);
    });
    
    // 清理目录数据
    console.log('   清理目录数据...');
    await ipfs.pin.rm(dirHash);
    console.log('✅ 目录数据清理完成');
    
    return true;
    
  } catch (error) {
    console.error('❌ IPFS目录操作失败:', error.message);
    return false;
  }
}

async function testIPFSPerformance(ipfs) {
  try {
    console.log('\n🚀 IPFS性能测试...');
    
    const testSizes = [1024, 10240, 102400]; // 1KB, 10KB, 100KB
    const results = [];
    
    for (const size of testSizes) {
      console.log(`   测试 ${size} 字节文件...`);
      
      // 生成测试数据
      const testData = Buffer.alloc(size, 'x');
      
      // 上传性能测试
      const uploadStart = Date.now();
      const addResult = await ipfs.add(testData);
      const uploadTime = Date.now() - uploadStart;
      const hash = addResult.cid.toString();
      
      // 下载性能测试
      const downloadStart = Date.now();
      const chunks = [];
      for await (const chunk of ipfs.cat(hash)) {
        chunks.push(chunk);
      }
      const downloadTime = Date.now() - downloadStart;
      
      const result = {
        size,
        uploadTime,
        downloadTime,
        uploadSpeed: Math.round(size / (uploadTime / 1000)),
        downloadSpeed: Math.round(size / (downloadTime / 1000))
      };
      
      results.push(result);
      console.log(`     上传: ${uploadTime}ms (${result.uploadSpeed} bytes/sec)`);
      console.log(`     下载: ${downloadTime}ms (${result.downloadSpeed} bytes/sec)`);
      
      // 清理测试数据
      await ipfs.pin.rm(hash);
    }
    
    console.log('✅ 性能测试完成');
    return results;
    
  } catch (error) {
    console.error('❌ IPFS性能测试失败:', error.message);
    return [];
  }
}

async function main() {
  console.log('🚀 开始IPFS连接和功能测试...\n');
  
  // 1. 基本连接测试
  const connectionResult = await testIPFSConnection();
  
  if (connectionResult) {
    const { ipfs } = connectionResult;
    
    // 2. 文件操作测试
    const fileSuccess = await testIPFSOperations(ipfs);
    
    if (fileSuccess) {
      // 3. 目录操作测试
      await testIPFSDirectory(ipfs);
      
      // 4. 性能测试
      await testIPFSPerformance(ipfs);
    }
    
    console.log('\n🎉 IPFS连接和功能测试完成!');
    console.log('✅ IPFS已准备就绪，可以开始使用');
  } else {
    console.log('\n❌ IPFS连接失败，请检查配置和服务状态');
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
  testIPFSConnection,
  testIPFSOperations,
  testIPFSDirectory,
  testIPFSPerformance
};
