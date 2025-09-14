import * as fs from 'fs';
import * as path from 'path';

import { Gateway, Wallets } from 'fabric-network';

import { logger } from '../utils/logger';

/**
 * Test chaincode functionality
 * This function tests the connection to Hyperledger Fabric network and chaincode operations
 */
async function testChaincode(): Promise<void> {
  try {
    logger.info('开始测试链码功能');

    // 读取连接配置文件
    const ccpPath = path.resolve(__dirname, '..', '..', 'config', 'connection-org1.json');
    if (!fs.existsSync(ccpPath)) {
      throw new Error(`连接配置文件不存在: ${ccpPath}`);
    }

    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    logger.info('连接配置文件读取成功');

    // 创建钱包
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    logger.info('钱包创建成功');

    // 检查管理员身份
    const identity = await wallet.get('admin');
    if (!identity) {
      logger.error('管理员身份不存在，请先注册管理员');
      throw new Error('管理员身份不存在');
    }
    logger.info('管理员身份验证成功');

    // 创建网关连接
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'admin',
      discovery: { enabled: true, asLocalhost: true },
    });
    logger.info('网关连接成功');

    try {
      // 获取网络
      const network = await gateway.getNetwork('mychannel');
      logger.info('获取网络成功');

      // 获取合约
      const contract = network.getContract('emr');
      logger.info('获取合约成功');

      // 测试查询
      logger.info('开始调用GetContractInfo...');
      const result = await contract.evaluateTransaction('GetContractInfo');
      logger.info('查询成功，结果:', result.toString());

      // 解析结果
      try {
        const contractInfo = JSON.parse(result.toString());
        logger.info('合约信息:', JSON.stringify(contractInfo, null, 2));
      } catch (parseError) {
        logger.warn('无法解析合约返回结果为JSON', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          raw: result.toString(),
        });
      }

      // 测试其他基本操作
      logger.info('测试基本查询操作...');

      // 可以添加更多测试操作
      logger.info('所有测试操作完成');
    } finally {
      // 断开连接
      gateway.disconnect();
      logger.info('网关连接已断开');
    }

    logger.info('测试完成');
  } catch (error) {
    logger.error('测试过程中发生错误:', error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    await testChaincode();
    process.exit(0);
  } catch (error) {
    logger.error('测试失败:', error);
    process.exit(1);
  }
}

// 执行测试
if (require.main === module) {
  void main();
}

export { testChaincode };
