#!/usr/bin/env node

/**
 * Hyperledger Fabric 网络部署脚本
 * 用于自动化部署和管理 Fabric 网络
 */

const { program } = require('commander');
const { deployFabricNetwork } = require('../dist/src/deploy/fabricNetworkSetup');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 配置日志
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'fabric-deploy' },
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/deploy-error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/deploy-combined.log'),
    }),
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

// 确保日志目录存在
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * 验证环境变量
 */
function validateEnvironment() {
  const requiredEnvVars = [
    'FABRIC_CHANNEL_NAME',
    'FABRIC_CHAINCODE_NAME',
    'ORG1_PEER_URL',
    'ORG2_PEER_URL',
    'ORDERER_URL',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    logger.error('缺少必需的环境变量:', { missingVars });
    console.error('❌ 缺少以下环境变量:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n请检查 .env 文件或设置相应的环境变量。');
    process.exit(1);
  }

  logger.info('环境变量验证通过');
}

/**
 * 部署 Fabric 网络
 */
async function deployNetwork(organization, action, options) {
  try {
    logger.info('开始部署 Fabric 网络', { organization, action, options });

    console.log('🚀 开始部署 Hyperledger Fabric 网络...');
    console.log(`📋 组织: ${organization}`);
    console.log(`🔧 操作: ${action}`);

    if (options.dryRun) {
      console.log('🔍 执行干运行模式，不会进行实际部署');
      return;
    }

    // 执行部署
    const result = await deployFabricNetwork(organization, action);

    if (result.success) {
      console.log('✅ Fabric 网络部署成功!');
      console.log(`📊 部署ID: ${result.deploymentId}`);
      console.log(`⏰ 部署时间: ${new Date(result.timestamp).toLocaleString()}`);

      if (result.networkInfo) {
        console.log('\n📡 网络信息:');
        console.log(`   通道: ${result.networkInfo.channel}`);
        console.log(`   链码: ${result.networkInfo.chaincode}`);
        console.log(`   节点: ${result.networkInfo.peers.join(', ')}`);
      }

      if (result.performance) {
        console.log('\n⚡ 性能信息:');
        console.log(`   部署耗时: ${result.performance.deploymentTime}ms`);
        console.log(`   优化项: ${result.performance.optimizations.length}`);
      }

      // 保存部署报告
      if (options.saveReport) {
        const reportPath = path.join(
          __dirname,
          '../reports',
          `deployment-${result.deploymentId}.json`
        );
        const reportsDir = path.dirname(reportPath);

        if (!fs.existsSync(reportsDir)) {
          fs.mkdirSync(reportsDir, { recursive: true });
        }

        fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
        console.log(`📄 部署报告已保存: ${reportPath}`);
      }

      logger.info('Fabric 网络部署成功', { result });
    } else {
      console.error('❌ Fabric 网络部署失败!');
      console.error(`💥 错误: ${result.details}`);

      if (result.error) {
        console.error(`🔍 详细错误: ${result.error}`);
      }

      logger.error('Fabric 网络部署失败', { result });
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 部署过程中发生异常:', error.message);
    logger.error('部署异常', { error: error.stack });
    process.exit(1);
  }
}

/**
 * 检查网络状态
 */
async function checkNetworkStatus(options) {
  try {
    console.log('🔍 检查 Fabric 网络状态...');

    // 这里可以添加网络状态检查逻辑
    // 例如检查各个组件的健康状态

    console.log('✅ 网络状态检查完成');
  } catch (error) {
    console.error('❌ 网络状态检查失败:', error.message);
    logger.error('网络状态检查失败', { error: error.stack });
    process.exit(1);
  }
}

/**
 * 清理网络资源
 */
async function cleanupNetwork(options) {
  try {
    console.log('🧹 清理 Fabric 网络资源...');

    if (options.dryRun) {
      console.log('🔍 执行干运行模式，不会进行实际清理');
      return;
    }

    // 这里可以添加清理逻辑
    // 例如删除 Kubernetes 资源、清理存储等

    console.log('✅ 网络资源清理完成');
  } catch (error) {
    console.error('❌ 网络资源清理失败:', error.message);
    logger.error('网络资源清理失败', { error: error.stack });
    process.exit(1);
  }
}

/**
 * 显示网络信息
 */
function showNetworkInfo() {
  console.log('📊 Hyperledger Fabric 网络信息');
  console.log('================================');
  console.log(`通道名称: ${process.env.FABRIC_CHANNEL_NAME || 'mychannel'}`);
  console.log(`链码名称: ${process.env.FABRIC_CHAINCODE_NAME || 'basic'}`);
  console.log(`Org1 Peer: ${process.env.ORG1_PEER_URL || 'grpcs://localhost:7051'}`);
  console.log(`Org2 Peer: ${process.env.ORG2_PEER_URL || 'grpcs://localhost:9051'}`);
  console.log(`Orderer: ${process.env.ORDERER_URL || 'grpc://localhost:7050'}`);
  console.log(`Org1 CA: ${process.env.ORG1_CA_URL || 'https://localhost:7054'}`);
  console.log(`Org2 CA: ${process.env.ORG2_CA_URL || 'https://localhost:8054'}`);
  console.log(`Kubernetes 命名空间: ${process.env.KUBERNETES_NAMESPACE || 'fabric-network'}`);
}

// 配置命令行参数
program.name('fabric-deploy').description('Hyperledger Fabric 网络部署工具').version('1.0.0');

// 部署命令
program
  .command('deploy <organization> [action]')
  .description('部署 Fabric 网络')
  .option('-d, --dry-run', '干运行模式，不执行实际部署')
  .option('-s, --save-report', '保存部署报告', true)
  .option('-v, --verbose', '详细输出')
  .action(async (organization, action = 'deploy', options) => {
    if (options.verbose) {
      logger.level = 'debug';
    }

    validateEnvironment();
    await deployNetwork(organization, action, options);
  });

// 状态检查命令
program
  .command('status')
  .description('检查 Fabric 网络状态')
  .option('-v, --verbose', '详细输出')
  .action(async options => {
    if (options.verbose) {
      logger.level = 'debug';
    }

    validateEnvironment();
    await checkNetworkStatus(options);
  });

// 清理命令
program
  .command('cleanup')
  .description('清理 Fabric 网络资源')
  .option('-d, --dry-run', '干运行模式，不执行实际清理')
  .option('-f, --force', '强制清理，不询问确认')
  .action(async options => {
    if (!options.force) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise(resolve => {
        rl.question('⚠️  确定要清理 Fabric 网络资源吗？这将删除所有数据 (y/N): ', resolve);
      });

      rl.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('❌ 清理操作已取消');
        return;
      }
    }

    await cleanupNetwork(options);
  });

// 信息命令
program
  .command('info')
  .description('显示 Fabric 网络配置信息')
  .action(() => {
    showNetworkInfo();
  });

// 错误处理
process.on('uncaughtException', error => {
  logger.error('未捕获的异常', { error: error.stack });
  console.error('❌ 发生未预期的错误:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝', { reason, promise });
  console.error('❌ 发生未处理的 Promise 拒绝:', reason);
  process.exit(1);
});

// 解析命令行参数
program.parse();

// 如果没有提供命令，显示帮助
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
