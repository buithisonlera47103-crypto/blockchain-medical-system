/**
 * Fabric连接诊断和修复脚本
 * 用于诊断并修复区块链EMR系统与Hyperledger Fabric网络的连接问题
 */

import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import { config as dotenvConfig } from 'dotenv';
import { Gateway, Wallets, Contract } from 'fabric-network';


import { enhancedLogger } from '../utils/enhancedLogger';

// 加载环境变量
dotenvConfig();

const execAsync = promisify(exec);

/**
 * 诊断结果接口
 */
interface DiagnosticResult {
  component: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: unknown;
  timestamp: string;
}

/**
 * 诊断报告接口
 */
interface DiagnosticReport {
  overall_status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  results: DiagnosticResult[];
  recommendations: string[];
  summary: {
    total_checks: number;
    passed: number;
    warnings: number;
    errors: number;
  };
}

/**
 * Fabric连接诊断和修复类
 */
class FabricConnectionDiagnostics {
  private readonly logger: typeof enhancedLogger;
  private readonly walletPath: string;
  private readonly connectionProfilePath: string;
  private readonly channelName: string;
  private readonly chaincodeName: string;
  private readonly mspId: string;
  private readonly userId: string;
  private results: DiagnosticResult[] = [];

  constructor() {
    // 初始化日志记录器（统一使用 enhancedLogger）
    this.logger = enhancedLogger;

    // 从环境变量加载配置
    this.walletPath = process.env['FABRIC_WALLET_PATH'] ?? './wallet';
    this.connectionProfilePath =
      process.env['FABRIC_CONNECTION_PROFILE'] ?? './connection-org1.json';
    this.channelName = process.env['FABRIC_CHANNEL_NAME'] ?? 'mychannel';
    this.chaincodeName = process.env['FABRIC_CHAINCODE_NAME'] ?? 'emr';
    this.mspId = process.env['FABRIC_MSP_ID'] ?? 'Org1MSP';
    this.userId = process.env['FABRIC_USER_ID'] ?? 'admin';

    this.logger.info('Fabric诊断工具初始化完成', {
      walletPath: this.walletPath,
      connectionProfilePath: this.connectionProfilePath,
      channelName: this.channelName,
      chaincodeName: this.chaincodeName,
    });
  }

  /**
   * 添加诊断结果
   */
  private addResult(
    component: string,
    status: 'success' | 'warning' | 'error',
    message: string,
    details?: unknown
  ): void {
    const result: DiagnosticResult = {
      component,
      status,
      message,
      details,
      timestamp: new Date().toISOString(),
    };

    this.results.push(result);

    // 记录到日志
    let logLevel: 'error' | 'warn' | 'info';
    if (status === 'error') {
      logLevel = 'error';
    } else if (status === 'warning') {
      logLevel = 'warn';
    } else {
      logLevel = 'info';
    }
    this.logger[logLevel](`[${component}] ${message}`, details);
  }

  /**
   * 检查连接配置文件
   */
  // eslint-disable-next-line complexity
  async checkConnectionProfile(): Promise<boolean> {
    try {
      const fullPath = path.resolve(this.connectionProfilePath);

      if (!fs.existsSync(fullPath)) {
        this.addResult('连接配置', 'error', `连接配置文件不存在: ${fullPath}`);
        return false;
      }

      const configContent = fs.readFileSync(fullPath, 'utf8');
      const config = JSON.parse(configContent);

      // 验证配置结构
      const requiredFields = ['name', 'version', 'client', 'organizations', 'peers'];
      const missingFields = requiredFields.filter(field => !config[field]);

      if (missingFields.length > 0) {
        this.addResult('连接配置', 'error', `配置文件缺少必要字段: ${missingFields.join(', ')}`);
        return false;
      }

      // 检查组织配置
      const org = Object.values(config.organizations)[0] as { mspid?: string; peers?: unknown };
      if (!org?.mspid || !org.peers) {
        this.addResult('连接配置', 'error', '组织配置不完整');
        return false;
      }

      // 检查peer配置
      const peers = config.peers;
      if (!peers || Object.keys(peers).length === 0) {
        this.addResult('连接配置', 'error', 'Peer配置为空');
        return false;
      }

      // 验证peer URL
      for (const [peerName, peerConfig] of Object.entries(peers as Record<string, { url?: string }>)) {
        if (!peerConfig.url) {
          this.addResult('连接配置', 'warning', `Peer ${peerName} 缺少URL配置`);
        }
      }

      this.addResult('连接配置', 'success', '连接配置文件验证通过', {
        path: fullPath,
        name: config.name,
        organizations: Object.keys(config.organizations),
        peers: Object.keys(config.peers),
      });

      return true;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.addResult('连接配置', 'error', `连接配置文件解析失败: ${errMsg}`, error);
      return false;
    }
  }

  /**
   * 检查钱包和身份文件
   */
  async checkWalletAndIdentity(): Promise<boolean> {
    try {
      const fullWalletPath = path.resolve(this.walletPath);

      if (!fs.existsSync(fullWalletPath)) {
        this.addResult('钱包检查', 'error', `钱包目录不存在: ${fullWalletPath}`);
        return false;
      }

      // 检查钱包内容
      const walletFiles = fs.readdirSync(fullWalletPath);
      if (walletFiles.length === 0) {
        this.addResult('钱包检查', 'error', '钱包目录为空');
        return false;
      }

      // 检查admin身份
      const adminIdPath = path.join(fullWalletPath, `${this.userId}.id`);
      if (!fs.existsSync(adminIdPath)) {
        this.addResult('钱包检查', 'error', `管理员身份文件不存在: ${adminIdPath}`);
        return false;
      }

      // 验证身份文件内容
      const identityContent = fs.readFileSync(adminIdPath, 'utf8');
      const identity = JSON.parse(identityContent);

      if (!identity.credentials || !identity.mspId || !identity.type) {
        this.addResult('钱包检查', 'error', '身份文件格式不正确');
        return false;
      }

      if (identity.mspId !== this.mspId) {
        this.addResult(
          '钱包检查',
          'warning',
          `MSP ID不匹配: 期望 ${this.mspId}, 实际 ${identity.mspId}`
        );
      }

      this.addResult('钱包检查', 'success', '钱包和身份验证通过', {
        walletPath: fullWalletPath,
        identityFiles: walletFiles,
        mspId: identity.mspId,
        identityType: identity.type,
      });

      return true;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.addResult('钱包检查', 'error', `钱包检查失败: ${errMsg}`, error);
      return false;
    }
  }

  /**
   * 检查网络端点连通性
   */
  // eslint-disable-next-line complexity
  async checkNetworkEndpoints(): Promise<boolean> {
    try {
      const configPath = path.resolve(this.connectionProfilePath);
      if (!fs.existsSync(configPath)) {
        this.addResult('网络连通性', 'error', '无法读取连接配置文件');
        return false;
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const peers = config.peers ?? {};
      const orderers = config.orderers ?? {};

      let allEndpointsHealthy = true;

      // 检查peer端点与orderer端点
      const peersHealthy = await this.checkEndpointsGroup(peers as Record<string, { url?: string }>);
      const orderersHealthy = await this.checkEndpointsGroup(orderers as Record<string, { url?: string }>);
      allEndpointsHealthy = peersHealthy && orderersHealthy;

      if (allEndpointsHealthy) {
        this.addResult('网络连通性', 'success', '所有网络端点连通性正常');
      }

      return allEndpointsHealthy;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.addResult('网络连通性', 'error', `网络端点检查失败: ${errMsg}`, error);
      return false;
    }
  }

  /**
   * 检查单个端点
   */
  private async checkEndpoint(url: string, name: string): Promise<boolean> {
    try {
      // 解析URL获取主机和端口
      const urlObj = new URL(url.replace('grpc://', 'http://').replace('grpcs://', 'https://'));
      const host = urlObj.hostname;
      const port = urlObj.port;

      // 使用netcat检查端口连通性
      try {
        await execAsync(`timeout 5 nc -z ${host} ${port}`);
        this.addResult('网络连通性', 'success', `${name} (${url}) 连通性正常`);
        return true;
      } catch (ncError) {
        // 如果netcat失败，尝试ping
        this.logger.debug('netcat check failed', { error: String(ncError) });
        try {
          await execAsync(`ping -c 1 -W 3 ${host}`);
          this.addResult('网络连通性', 'warning', `${name} 主机可达但端口 ${port} 可能未开放`);
        } catch (pingError) {
          this.logger.debug('ping check failed', { error: String(pingError) });
          this.addResult('网络连通性', 'error', `${name} (${url}) 不可达`);
        }
        return false;
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.addResult('网络连通性', 'error', `检查端点 ${name} 时出错: ${errMsg}`);
      return false;
    }
  }

  private async checkEndpointsGroup(endpoints: Record<string, { url?: string }>): Promise<boolean> {
    let healthy = true;
    for (const [name, cfg] of Object.entries(endpoints)) {
      const url = cfg?.url;
      if (!url) continue;
      const isHealthy = await this.checkEndpoint(url, name);
      if (!isHealthy) healthy = false;
    }
    return healthy;
  }


  /**
   * 测试Fabric网络连接
   */
  // eslint-disable-next-line max-lines-per-function
  async testFabricConnection(): Promise<boolean> {
    let gateway: Gateway | null = null;

    try {
      // 创建钱包实例
      const wallet = await Wallets.newFileSystemWallet(this.walletPath);

      // 检查身份是否存在

      const identity = await wallet.get(this.userId);
      if (!identity) {
        this.addResult('Fabric连接', 'error', `身份 ${this.userId} 在钱包中不存在`);
        return false;
      }

      // 读取连接配置
      const connectionProfile = JSON.parse(fs.readFileSync(this.connectionProfilePath, 'utf8'));

      // 创建网关连接
      gateway = new Gateway();

      const connectionOptions = {
        wallet,
        identity: this.userId,
        discovery: { enabled: false, asLocalhost: true },
        eventHandlerOptions: {
          commitTimeout: parseInt(process.env['FABRIC_NETWORK_TIMEOUT'] ?? '30000'),
          strategy: null,
        },
      };

      await gateway.connect(connectionProfile, connectionOptions);

      this.addResult('Fabric连接', 'success', 'Gateway连接成功');

      // 获取网络
      const network = await gateway.getNetwork(this.channelName);
      this.addResult('Fabric连接', 'success', `成功连接到通道: ${this.channelName}`);

      // 获取合约
      const contract = network.getContract(this.chaincodeName);
      this.addResult('Fabric连接', 'success', `成功获取链码合约: ${this.chaincodeName}`);

      // 深度链码调用测试（可选，默认跳过以避免启动期错误日志）
      if (process.env.FABRIC_DIAGNOSTICS_DEEP === 'true') {
        await this.testChaincodeInvocation(contract);
      } else {
        this.addResult('链码测试', 'success', '已跳过深度链码调用测试（设置 FABRIC_DIAGNOSTICS_DEEP=true 可启用）');
      }

      return true;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.addResult('Fabric连接', 'error', `Fabric连接测试失败: ${errMsg}`, {
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });
      return false;
    } finally {
      if (gateway) {
        try {
          gateway.disconnect();
          this.addResult('Fabric连接', 'success', 'Gateway连接已正常断开');
        } catch (disconnectError: unknown) {
          const msg = disconnectError instanceof Error ? disconnectError.message : String(disconnectError);
          this.addResult(
            'Fabric连接',
            'warning',
            `Gateway断开连接时出现警告: ${msg}`
          );
        }
      }
    }
  }

  /**
   * 测试链码调用
   */
  // eslint-disable-next-line max-lines-per-function
  private async testChaincodeInvocation(contract: Contract): Promise<void> {
    try {
      this.logger.info('开始测试链码调用...');

      // 优先尝试读取元数据获取可用函数名
      const candidates: string[] = [];
      try {
        const metaBuf = await contract.evaluateTransaction('org.hyperledger.fabric:GetMetadata');
        const metaStr = metaBuf.toString();
        this.logger.info('已获取链码元数据');
        try {
          const meta = JSON.parse(metaStr) as { contracts?: Record<string, { transactions?: Array<{ name?: string } | string> }> };
          const contracts = meta?.contracts ?? {};
          for (const cname of Object.keys(contracts)) {
            const c = (contracts as Record<string, { transactions?: Array<{ name?: string } | string> } | undefined>)[cname];
            const txs = c?.transactions ?? [];
            for (const tx of txs) {
              const name = (typeof tx === 'string' ? tx : tx.name) ?? '';
              if (name) candidates.push(name);
            }
          }
        } catch {
          // 元数据非JSON时忽略
        }
      } catch {
        // 元数据不可用时使用常见候选
        candidates.push('GetContractInfo', 'GetAllRecords', 'QueryAll', 'GetAll', 'ReadAsset', 'GetMetadata');
      }

      // 去重并逐个尝试只读查询
      const tried = new Set<string>();
      let successName: string | null = null;
      let successResult: Buffer | null = null;
      for (const fn of candidates) {
        if (!fn || tried.has(fn)) continue;
        tried.add(fn);
        try {
          const res = await contract.evaluateTransaction(fn);
          successName = fn;
          successResult = res as Buffer;
          break;
        } catch {
          // 尝试下一个
        }
      }

      if (successName && successResult) {
        const sample = successResult.toString().slice(0, 200);
        this.logger.info(`链码只读调用成功: ${successName}, 结果长度: ${successResult.length}`);
        this.addResult('链码测试', 'success', '链码查询操作成功', {
          function: successName,
          resultLength: successResult.length,
          sample,
        });
      } else {
        this.addResult('链码测试', 'warning', '未找到可用的只读查询函数，跳过调用验证', {
          candidates: Array.from(tried),
        });
        return;
      }

      // 写入测试（可选），失败记为警告不阻塞
      try {
        const testRecordId = `test-record-${Date.now()}`;
        const testPatientId = 'patient123';
        const testData = JSON.stringify({ diagnosis: 'Test diagnosis', treatment: 'Test treatment', timestamp: new Date().toISOString() });
        await contract.submitTransaction('CreateMedicalRecord', testRecordId, testPatientId, testData);
        this.addResult('链码测试', 'success', '链码写入操作成功', { function: 'CreateMedicalRecord', recordId: testRecordId });
      } catch (createError: unknown) {
        const msg = createError instanceof Error ? createError.message : String(createError);
        this.addResult('链码测试', 'warning', `链码写入测试失败: ${msg}`);
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      // 将整体错误降级为警告，避免阻塞
      this.addResult('链码测试', 'warning', `链码测试遇到异常: ${errMsg}`);
    }
  }

  /**
   * 尝试修复常见问题
   */
  async attemptAutoFix(): Promise<void> {
    this.logger.info('开始尝试自动修复...');

    // 创建钱包目录（如果不存在）
    const walletPath = path.resolve(this.walletPath);
    if (!fs.existsSync(walletPath)) {
      try {
        fs.mkdirSync(walletPath, { recursive: true });
        this.addResult('自动修复', 'success', `创建钱包目录: ${walletPath}`);
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        this.addResult('自动修复', 'error', `无法创建钱包目录: ${errMsg}`);
      }
    }

    // 检查并复制连接配置文件
    await this.fixConnectionProfile();

    // 检查Docker容器状态
    await this.checkDockerContainers();
  }

  /**
   * 修复连接配置文件
   */
  private async fixConnectionProfile(): Promise<void> {
    const configPath = path.resolve(this.connectionProfilePath);

    if (!fs.existsSync(configPath)) {
      // 尝试从其他位置复制配置文件
      const possiblePaths = [
        '/home/enovocaohanwen/blockchain-project/simple-app/connection-org1.json',
        '/home/enovocaohanwen/blockchain-project/node-app/connection-org1.json',
        '/home/enovocaohanwen/blockchain-project/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json',
      ];

      for (const sourcePath of possiblePaths) {
        if (fs.existsSync(sourcePath)) {
          try {
            fs.copyFileSync(sourcePath, configPath);
            this.addResult('自动修复', 'success', `从 ${sourcePath} 复制连接配置文件`);
            break;
          } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error);
            this.addResult(
              '自动修复',
              'warning',
              `无法从 ${sourcePath} 复制配置文件: ${errMsg}`
            );
          }
        }
      }
    }
  }

  /**
   * 检查Docker容器状态
   */
  private async checkDockerContainers(): Promise<void> {
    try {
      const { stdout } = await execAsync(
        'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "peer|orderer|ca"'
      );

      if (stdout.trim()) {
        this.addResult('Docker检查', 'success', 'Fabric Docker容器运行状态', {
          containers: stdout.trim().split('\n'),
        });
      } else {
        this.addResult('Docker检查', 'warning', '未发现运行中的Fabric容器');

        // 提供启动建议
        this.addResult(
          '自动修复',
          'warning',
          '建议启动Fabric测试网络: cd fabric/fabric-samples/test-network && ./network.sh up createChannel'
        );
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.addResult('Docker检查', 'warning', `无法检查Docker容器状态: ${errMsg}`);
    }
  }

  /**
   * 生成诊断报告
   */
  generateReport(): DiagnosticReport {
    const summary = {
      total_checks: this.results.length,
      passed: this.results.filter(r => r.status === 'success').length,
      warnings: this.results.filter(r => r.status === 'warning').length,
      errors: this.results.filter(r => r.status === 'error').length,
    };

    let overall_status: 'healthy' | 'warning' | 'critical';
    if (summary.errors > 0) {
      overall_status = 'critical';
    } else if (summary.warnings > 0) {
      overall_status = 'warning';
    } else {
      overall_status = 'healthy';
    }

    const recommendations: string[] = [];

    if (summary.errors > 0) {
      recommendations.push('存在严重错误，需要立即修复');
    }
    if (summary.warnings > 0) {
      recommendations.push('存在警告项，建议检查和优化');
    }
    if (overall_status === 'healthy') {
      recommendations.push('所有检查项通过，系统状态良好');
    }

    // 添加具体建议
    const errorResults = this.results.filter(r => r.status === 'error');
    errorResults.forEach(result => {
      if (result.component === '连接配置') {
        recommendations.push('检查并修复connection-org1.json配置文件');
      }
      if (result.component === '钱包检查') {
        recommendations.push('重新生成或导入管理员身份到钱包');
      }
      if (result.component === '网络连通性') {
        recommendations.push('检查Fabric网络是否正常运行，确认端口开放');
      }
      if (result.component === 'Fabric连接') {
        recommendations.push('检查Fabric网络配置和身份认证');
      }
    });

    return {
      overall_status,
      timestamp: new Date().toISOString(),
      results: this.results,
      recommendations: [...new Set(recommendations)], // 去重
      summary,
    };
  }

  /**
   * 运行完整诊断
   */
  async runFullDiagnostics(): Promise<DiagnosticReport> {
    this.logger.info('开始Fabric连接诊断...');
    this.results = []; // 重置结果

    try {
      // 1. 检查连接配置文件
      await this.checkConnectionProfile();

      // 2. 检查钱包和身份
      await this.checkWalletAndIdentity();

      // 3. 检查网络端点
      await this.checkNetworkEndpoints();

      // 4. 尝试自动修复
      await this.attemptAutoFix();

      // 5. 测试Fabric连接
      await this.testFabricConnection();
    } catch (error: unknown) {
      this.logger.error('诊断过程中发生未预期错误:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      this.addResult('系统错误', 'error', `诊断过程异常: ${errMsg}`, error);
    }

    const report = this.generateReport();

    // 保存报告到文件
    const reportPath = path.join(__dirname, '../../logs/fabric-diagnostic-report.json');
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      this.logger.info(`诊断报告已保存到: ${reportPath}`);
    } catch (error: unknown) {
      this.logger.error('保存诊断报告失败:', error);
    }

    this.logger.info('Fabric连接诊断完成', {
      overall_status: report.overall_status,
      total_checks: report.summary.total_checks,
      errors: report.summary.errors,
      warnings: report.summary.warnings,
    });

    return report;
  }
}

/**
 * 主函数 - 当直接运行此脚本时执行
 */
async function main(): Promise<void> {
  const diagnostics = new FabricConnectionDiagnostics();

  try {
    const report = await diagnostics.runFullDiagnostics();

    console.log('\n=== Fabric连接诊断报告 ===');
    console.log(`整体状态: ${report.overall_status}`);
    console.log(`检查项总数: ${report.summary.total_checks}`);
    console.log(`通过: ${report.summary.passed}`);
    console.log(`警告: ${report.summary.warnings}`);
    console.log(`错误: ${report.summary.errors}`);

    if (report.recommendations.length > 0) {
      console.log('\n建议:');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    console.log('\n详细结果:');
    report.results.forEach(result => {
      let icon: string;
      if (result.status === 'success') {
        icon = '✅';
      } else if (result.status === 'warning') {
        icon = '⚠️';
      } else {
        icon = '❌';
      }
      console.log(`${icon} [${result.component}] ${result.message}`);
    });

    // 设置退出码
    process.exit(report.overall_status === 'critical' ? 1 : 0);
  } catch (error: unknown) {
    console.error('诊断执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  void main();
}

export { FabricConnectionDiagnostics, type DiagnosticResult, type DiagnosticReport };
