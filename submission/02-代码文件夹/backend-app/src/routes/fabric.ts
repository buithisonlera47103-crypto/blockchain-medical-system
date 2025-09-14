/**
 * Fabric网络状态和诊断API路由
 */

import { Router, Request, Response } from 'express';

import { deployFabricNetwork } from '../deploy/fabricNetworkSetup';
import { FabricConnectionDiagnostics } from '../diagnostics/fabricConnectionFix';
import { asyncHandler } from '../middleware/asyncHandler';
import { BlockchainService } from '../services/BlockchainService';
import { FabricDiagnosticsService } from '../services/FabricDiagnosticsService';
import { FabricOptimizationService } from '../services/FabricOptimizationService';
import { enhancedLogger as logger } from '../utils/enhancedLogger';

const router = Router();

/**
 * GET /api/v1/fabric/status
 * 获取Fabric网络连接状态
 */
router.get('/status', asyncHandler(async (_req: Request, res: Response) => {
  try {
    logger.info('收到Fabric状态查询请求');

    const diagnosticsService = FabricDiagnosticsService.getInstance(logger);
    const blockchainService = BlockchainService.getInstance(logger);

    // 获取基础状态
    const fabricStatus = await diagnosticsService.getFabricStatus();
    const connectionStatus = blockchainService.getConnectionStatus();

    // 构建响应
    const isHealthy = fabricStatus.status === 'healthy';
    const response = {
      status: isHealthy ? 'connected' : 'disconnected',
      details: {
        fabric: {
          connected: isHealthy,
          gateway: connectionStatus.isConnected,
          network: connectionStatus.isConnected,
          contract: connectionStatus.isConnected,
          channel: connectionStatus.config.channelName,
          chaincode: connectionStatus.config.chaincodeName,
          mspId: connectionStatus.config.mspId,
          userId: connectionStatus.config.userId,
          status: fabricStatus.status,
        },
        connection: {
          retries: connectionStatus.retries,
          lastCheck: fabricStatus.last_check ?? fabricStatus.timestamp,
          details: fabricStatus.details,
        },
        diagnostics: { summary: fabricStatus.summary, recommendations: fabricStatus.recommendations },
      },
      timestamp: new Date().toISOString(),
    };

    // 根据连接状态返回相应的HTTP状态码
    const statusCode = isHealthy ? 200 : 503;

    logger.info('Fabric状态查询完成', {
      status: fabricStatus.status,
      statusCode,
    });

    res.status(statusCode).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('获取Fabric状态失败:', error);

    res.status(500).json({
      status: 'error',
      details: `获取状态失败: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * GET /api/v1/fabric/diagnose
 * 运行完整的Fabric网络诊断
 */
router.get('/diagnose', asyncHandler(async (_req: Request, res: Response) => {
  try {
    logger.info('收到Fabric诊断请求');

    const diagnosticsService = FabricDiagnosticsService.getInstance(logger);

    // 运行完整诊断
    const diagnosticReport = await diagnosticsService.runFullDiagnostics();

    logger.info('Fabric诊断完成', {
      status: diagnosticReport.summary.overall_status,
      issuesFound: diagnosticReport.summary.errors,
    });

    res.status(200).json({
      status: 'completed',
      report: diagnosticReport,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Fabric诊断失败:', error);

    res.status(500).json({
      status: 'error',
      details: `诊断失败: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * POST /api/v1/fabric/fix
 * 尝试自动修复Fabric连接问题
 */
router.post('/fix', asyncHandler(async (_req: Request, res: Response) => {
  try {
    logger.info('收到Fabric自动修复请求');

    const diagnostics = new FabricConnectionDiagnostics();

    // 运行诊断和修复
    const diagnosticReport = await diagnostics.runFullDiagnostics();

    if (diagnosticReport.overall_status !== 'healthy') {
      // 尝试自动修复
      logger.info('开始自动修复流程');
      await diagnostics.attemptAutoFix();

      // 重新运行诊断验证修复结果
      const postFixReport = await diagnostics.runFullDiagnostics();

      res.status(200).json({
        status: 'completed',
        fixed: postFixReport.overall_status === 'healthy',
        beforeFix: diagnosticReport,
        afterFix: postFixReport,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(200).json({
        status: 'no_fix_needed',
        report: diagnosticReport,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Fabric自动修复失败:', error);

    res.status(500).json({
      status: 'error',
      details: `自动修复失败: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * POST /api/v1/fabric/reset
 * 重置Fabric连接
 */
router.post('/reset', asyncHandler(async (_req: Request, res: Response) => {
  try {
    logger.info('收到Fabric连接重置请求');

    const blockchainService = BlockchainService.getInstance(logger);

    // 重置连接
    const resetResult = await blockchainService.reset();

    logger.info('Fabric连接重置完成', { success: resetResult.success });

    res.status(200).json({
      status: 'completed',
      success: resetResult.success,
      details: resetResult.error ?? 'Connection reset successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Fabric连接重置失败:', error);

    res.status(500).json({
      status: 'error',
      details: `重置失败: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * GET /api/v1/fabric/test
 * 测试Fabric网络连接和链码调用
 */
router.get('/test', asyncHandler(async (_req: Request, res: Response) => {
  try {
    logger.info('收到Fabric连接测试请求');

    const blockchainService = BlockchainService.getInstance(logger);

    // 确保连接
    const connectionResult = await blockchainService.ensureConnection();

    if (!connectionResult.success) {
      return res.status(503).json({
        status: 'connection_failed',
        details: connectionResult.error,
        timestamp: new Date().toISOString(),
      });
    }

    // 测试链码调用
    const testResults = {
      connection: true,
      chaincode: false,
      error: null as string | null,
    };

    try {
      // 尝试查询所有记录
      const queryResult = await blockchainService.getAllRecords();
      testResults.chaincode = queryResult.success;

      if (!queryResult.success) {
        testResults.error = queryResult.error ?? 'Unknown chaincode error';
      }
    } catch (chaincodeError) {
      const errorMessage = chaincodeError instanceof Error ? chaincodeError.message : String(chaincodeError);
      testResults.error = `链码调用失败: ${errorMessage}`;
    }

    logger.info('Fabric连接测试完成', testResults);

    return res.status(200).json({
      status: 'completed',
      results: testResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Fabric连接测试失败:', error);
    return res.status(500).json({
      status: 'error',
      message: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * GET /api/v1/fabric/config
 * 获取当前Fabric配置信息
 */
router.get('/config', asyncHandler(async (_req: Request, res: Response) => {
  try {
    logger.info('收到Fabric配置查询请求');

    const blockchainService = BlockchainService.getInstance(logger);
    const connectionStatus = blockchainService.getConnectionStatus();

    // 返回配置信息（敏感信息已过滤）
    const configInfo = {
      channel: connectionStatus.config.channelName,
      chaincode: connectionStatus.config.chaincodeName,
      mspId: connectionStatus.config.mspId,
      userId: connectionStatus.config.userId,
      walletPath: connectionStatus.config.walletPath,
      connectionProfilePath: connectionStatus.config.connectionProfilePath,
      networkTimeout: connectionStatus.config.networkTimeout,
    };

    logger.info('Fabric配置查询完成');

    res.status(200).json({
      status: 'success',
      config: configInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('获取Fabric配置失败:', error);

    res.status(500).json({
      status: 'error',
      details: `获取配置失败: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * POST /api/v1/fabric/deploy
 * 部署或升级Fabric网络
 */
router.post('/deploy', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { org, action } = req.body;

    logger.info('收到Fabric网络部署请求', { org, action });

    // 验证请求参数
    if (!org || !action) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数',
        details: 'org和action参数是必需的',
        timestamp: new Date().toISOString(),
      });
    }

    if (!['org1', 'org2'].includes(org)) {
      return res.status(400).json({
        success: false,
        error: '无效的组织',
        details: '组织必须是org1或org2',
        timestamp: new Date().toISOString(),
      });
    }

    if (!['deploy', 'upgrade'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: '无效的操作',
        details: '操作必须是deploy或upgrade',
        timestamp: new Date().toISOString(),
      });
    }

    // 执行部署
    const deploymentResult = await deployFabricNetwork(org, action);

    if (deploymentResult.success) {
      return res.status(200).json({
        status: deploymentResult.status,
        details: deploymentResult.details,
        deploymentId: deploymentResult.deploymentId,
        networkInfo: deploymentResult.networkInfo,
        performance: deploymentResult.performance,
        timestamp: deploymentResult.timestamp,
      });
    } else {
      return res.status(500).json({
        status: deploymentResult.status,
        details: deploymentResult.details,
        deploymentId: deploymentResult.deploymentId,
        timestamp: deploymentResult.timestamp,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Fabric网络部署异常', { error: errorMessage });

    return res.status(500).json({
      status: 'error',
      details: `部署过程中发生异常: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * GET /api/v1/fabric/optimization/metrics
 * 获取性能优化指标
 */
router.get('/optimization/metrics', asyncHandler(async (_req: Request, res: Response) => {
  try {
    logger.info('收到性能指标查询请求');

    const optimizationService = FabricOptimizationService.getInstance(logger);
    const metrics = optimizationService.getPerformanceMetrics();
    const config = optimizationService.getOptimizationConfig();

    res.json({
      success: true,
      data: {
        metrics,
        config,
      },
      timestamp: new Date().toISOString(),
    });

    logger.info('性能指标查询完成', { metrics });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('性能指标查询失败', { error: errorMessage });

    res.status(500).json({
      success: false,
      error: '性能指标查询失败',
      details: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * POST /api/v1/fabric/optimization/batch
 * 执行批量交易处理
 */
router.post('/optimization/batch', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { operations } = req.body;

    logger.info('收到批量交易处理请求', { operationCount: operations?.length });

    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({
        success: false,
        error: '无效的操作列表',
        details: 'operations必须是一个数组',
        timestamp: new Date().toISOString(),
      });
    }

    const optimizationService = FabricOptimizationService.getInstance(logger);
    const batchResult = await optimizationService.processBatch(operations);
    const allSuccess = batchResult.results.every(r => r.success);

    logger.info('批量交易处理完成', {
      success: allSuccess,
      operationCount: operations.length,
      executionTime: batchResult.executionTime,
    });

    return res.json({
      success: allSuccess,
      data: batchResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('批量交易处理失败', { error: errorMessage });

    return res.status(500).json({
      success: false,
      error: '批量交易处理失败',
      details: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}));


/**
 * GET /api/v1/fabric/contract-info
 * 返回链码合约元数据（由 GetContractInfo 提供）
 */
router.get('/contract-info', asyncHandler(async (_req: Request, res: Response) => {
  const bc = BlockchainService.getInstance(logger);
  const info = await bc.getContractInfo();
  const status = info.success ? 200 : 503;
  res.status(status).json(info);
}));

/**
 * GET /api/v1/fabric/permission/check?recordId=...&userId=...
 * 校验某用户对某记录的访问权限（CheckAccess）
 */
router.get('/permission/check', asyncHandler(async (req: Request, res: Response) => {
  const { recordId, userId } = req.query as { recordId?: string; userId?: string };
  if (!recordId || !userId) {
    res.status(400).json({ success: false, error: 'MISSING_QUERY', details: 'recordId and userId are required', timestamp: new Date().toISOString() });
    return;
  }
  const bc = BlockchainService.getInstance(logger);
  const allowed = await bc.checkAccess(String(recordId), String(userId));
  res.json({ success: true, recordId, userId, allowed, timestamp: new Date().toISOString() });
}));

export default router;
