#!/usr/bin/env node

/**
 * 区块链服务连接测试脚本
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 区块链服务配置检查:');
console.log('   网络: Hyperledger Fabric');
console.log('   通道: emr-channel');
console.log('   链码: medical-record-chaincode');

async function execCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: 30000, ...options }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed: ${error.message}\nStderr: ${stderr}`));
      } else {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      }
    });
  });
}

async function checkDockerStatus() {
  try {
    console.log('\n🐳 检查Docker服务状态...');
    
    // 检查Docker是否运行
    const { stdout } = await execCommand('docker --version');
    console.log(`✅ Docker版本: ${stdout}`);
    
    // 检查Docker daemon是否运行
    await execCommand('docker ps');
    console.log('✅ Docker daemon运行正常');
    
    // 检查Docker Compose
    const { stdout: composeVersion } = await execCommand('docker-compose --version');
    console.log(`✅ Docker Compose版本: ${composeVersion}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Docker检查失败:', error.message);
    
    if (error.message.includes('Cannot connect to the Docker daemon')) {
      console.error('   原因: Docker daemon未运行');
      console.error('   建议: 启动Docker服务');
    } else if (error.message.includes('command not found')) {
      console.error('   原因: Docker未安装');
      console.error('   建议: 安装Docker和Docker Compose');
    }
    
    return false;
  }
}

async function checkFabricBinaries() {
  try {
    console.log('\n🔧 检查Hyperledger Fabric工具...');
    
    // 检查peer命令
    try {
      const { stdout } = await execCommand('peer version');
      console.log('✅ Peer工具可用');
      console.log(`   版本信息: ${stdout.split('\n')[0]}`);
    } catch (e) {
      console.log('⚠️  Peer工具不可用，将使用Docker容器');
    }
    
    // 检查orderer命令
    try {
      const { stdout } = await execCommand('orderer version');
      console.log('✅ Orderer工具可用');
    } catch (e) {
      console.log('⚠️  Orderer工具不可用，将使用Docker容器');
    }
    
    // 检查configtxgen命令
    try {
      const { stdout } = await execCommand('configtxgen --version');
      console.log('✅ Configtxgen工具可用');
    } catch (e) {
      console.log('⚠️  Configtxgen工具不可用，将使用Docker容器');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Fabric工具检查失败:', error.message);
    return false;
  }
}

async function checkFabricNetwork() {
  try {
    console.log('\n🌐 检查Fabric网络状态...');
    
    // 检查是否有运行的Fabric容器
    const { stdout } = await execCommand('docker ps --filter "name=peer" --filter "name=orderer" --filter "name=ca" --format "table {{.Names}}\\t{{.Status}}"');
    
    if (stdout.includes('peer') || stdout.includes('orderer')) {
      console.log('✅ 发现运行中的Fabric容器:');
      console.log(stdout);
      
      // 检查网络连通性
      try {
        const { stdout: peerList } = await execCommand('docker exec peer0.org1.example.com peer channel list');
        console.log('✅ Peer节点响应正常');
        if (peerList.includes('emr-channel')) {
          console.log('✅ EMR通道已存在');
        } else {
          console.log('⚠️  EMR通道不存在');
        }
      } catch (e) {
        console.log('⚠️  无法连接到Peer节点');
      }
      
      return true;
    } else {
      console.log('ℹ️  没有运行中的Fabric容器');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Fabric网络检查失败:', error.message);
    return false;
  }
}

async function checkChaincodeStatus() {
  try {
    console.log('\n📜 检查智能合约状态...');
    
    // 检查链码目录
    const chaincodePath = path.join(__dirname, 'fabric', 'medical-record-chaincode');
    if (fs.existsSync(chaincodePath)) {
      console.log('✅ 智能合约源码存在');
      
      // 检查Go模块
      const goModPath = path.join(chaincodePath, 'go.mod');
      if (fs.existsSync(goModPath)) {
        console.log('✅ Go模块配置存在');
      } else {
        console.log('⚠️  Go模块配置缺失');
      }
      
      // 检查主文件
      const mainGoPath = path.join(chaincodePath, 'main.go');
      if (fs.existsSync(mainGoPath)) {
        console.log('✅ 智能合约主文件存在');
      } else {
        console.log('⚠️  智能合约主文件缺失');
      }
    } else {
      console.log('❌ 智能合约源码目录不存在');
      return false;
    }
    
    // 如果网络运行，检查已部署的链码
    try {
      const { stdout } = await execCommand('docker exec peer0.org1.example.com peer lifecycle chaincode queryinstalled');
      if (stdout.includes('emr-chaincode')) {
        console.log('✅ 智能合约已安装');
        
        // 检查链码是否已提交
        const { stdout: committed } = await execCommand('docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted -C emr-channel');
        if (committed.includes('emr-chaincode')) {
          console.log('✅ 智能合约已提交到通道');
        } else {
          console.log('⚠️  智能合约未提交到通道');
        }
      } else {
        console.log('⚠️  智能合约未安装');
      }
    } catch (e) {
      console.log('ℹ️  无法查询链码状态（网络可能未运行）');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ 智能合约检查失败:', error.message);
    return false;
  }
}

async function testBasicChaincode() {
  try {
    console.log('\n🧪 测试智能合约基本功能...');
    
    // 尝试调用链码查询
    const { stdout } = await execCommand(`docker exec peer0.org1.example.com peer chaincode query -C emr-channel -n emr-chaincode -c '{"function":"GetAllRecords","Args":[]}'`);
    
    console.log('✅ 智能合约查询成功');
    console.log(`   返回结果: ${stdout.substring(0, 100)}${stdout.length > 100 ? '...' : ''}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ 智能合约测试失败:', error.message);
    
    if (error.message.includes('chaincode emr-chaincode not found')) {
      console.error('   原因: 智能合约未部署');
      console.error('   建议: 运行 ./network.sh chaincode 部署智能合约');
    } else if (error.message.includes('channel emr-channel not found')) {
      console.error('   原因: 通道不存在');
      console.error('   建议: 运行 ./network.sh channel 创建通道');
    }
    
    return false;
  }
}

async function generateNetworkReport() {
  try {
    console.log('\n📊 生成网络状态报告...');
    
    const report = {
      timestamp: new Date().toISOString(),
      docker: false,
      fabricTools: false,
      network: false,
      chaincode: false,
      containers: [],
      recommendations: []
    };
    
    // Docker状态
    try {
      await execCommand('docker ps');
      report.docker = true;
    } catch (e) {
      report.recommendations.push('启动Docker服务');
    }
    
    // 容器列表
    try {
      const { stdout } = await execCommand('docker ps --filter "name=peer" --filter "name=orderer" --filter "name=ca" --format "{{.Names}}"');
      report.containers = stdout.split('\n').filter(name => name.trim());
    } catch (e) {
      // 忽略错误
    }
    
    // 网络状态
    report.network = report.containers.length > 0;
    
    // 生成建议
    if (!report.docker) {
      report.recommendations.push('安装并启动Docker');
    }
    
    if (!report.network) {
      report.recommendations.push('启动Fabric网络: cd fabric && ./network.sh up createChannel');
    }
    
    if (!report.chaincode) {
      report.recommendations.push('部署智能合约: cd fabric && ./network.sh chaincode');
    }
    
    // 保存报告
    fs.writeFileSync('blockchain-status-report.json', JSON.stringify(report, null, 2));
    console.log('✅ 状态报告已保存到 blockchain-status-report.json');
    
    return report;
    
  } catch (error) {
    console.error('❌ 生成报告失败:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 开始区块链服务连接和状态检查...\n');
  
  let allChecksPass = true;
  
  // 1. Docker检查
  const dockerOk = await checkDockerStatus();
  if (!dockerOk) allChecksPass = false;
  
  // 2. Fabric工具检查
  const toolsOk = await checkFabricBinaries();
  if (!toolsOk) allChecksPass = false;
  
  // 3. 网络状态检查
  const networkOk = await checkFabricNetwork();
  if (!networkOk) allChecksPass = false;
  
  // 4. 智能合约检查
  const chaincodeOk = await checkChaincodeStatus();
  if (!chaincodeOk) allChecksPass = false;
  
  // 5. 如果网络运行，测试智能合约
  if (networkOk) {
    const testOk = await testBasicChaincode();
    if (!testOk) allChecksPass = false;
  }
  
  // 6. 生成状态报告
  await generateNetworkReport();
  
  if (allChecksPass && networkOk) {
    console.log('\n🎉 区块链服务检查完成!');
    console.log('✅ Hyperledger Fabric网络已准备就绪');
  } else {
    console.log('\n⚠️  区块链服务需要配置');
    console.log('📋 请查看 blockchain-status-report.json 获取详细建议');
    
    if (!dockerOk) {
      console.log('\n🔧 快速修复建议:');
      console.log('   1. 启动Docker服务');
      console.log('   2. cd fabric && ./network.sh up createChannel');
      console.log('   3. cd fabric && ./network.sh chaincode');
    }
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 测试过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = {
  checkDockerStatus,
  checkFabricBinaries,
  checkFabricNetwork,
  checkChaincodeStatus,
  testBasicChaincode
};
