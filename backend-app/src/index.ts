/**
 * EMR区块链系统后端应用入口文件
 */

import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';


import compression from 'compression';
import cors from 'cors';
import { config as dotenvConfig } from 'dotenv';
import express from 'express';
import { Gateway } from 'fabric-network';
import helmet from 'helmet';
import type { Pool as MySQLPool } from 'mysql2/promise';
import swaggerUi from 'swagger-ui-express';
import { WebSocketServer } from 'ws';

import { initializeDatabase, testConnection } from './config/database-mysql';
import { swaggerSpec, swaggerUiOptions } from './config/swagger';
import {
  requestLogger,
  // errorHandler as legacyErrorHandler, // Unused
  corsOptions,
  validateRequestSize,
  healthCheck,
  logger,
  helmetOptions,
} from './middleware';
import abacEnforce from './middleware/abac';
import {
  requestIdMiddleware,
  errorHandler,
  notFoundHandler,
  setupGlobalErrorHandlers,
} from './middleware/errorHandler';
import { performanceMonitor } from './middleware/performanceMonitor';
import { apiRateLimit } from './middleware/rateLimiting';
import { initTracing } from './observability/tracing';
import accessControlRoutes from './routes/accessControl';
import analyticsRoutes from './routes/analytics';
import authRoutes from './routes/auth';
import backupRoutes from './routes/backup';
import bridgeRoutes from './routes/bridge';
import chatRoutes from './routes/chat';
import encryptedSearchRoutes from './routes/encryptedSearch';
import enhancedFhirRoutes from './routes/enhancedFhir';
import externalRoutes from './routes/external';
import fabricRoutes from './routes/fabric';
import federatedRoutes from './routes/federated';
import fhirRoutes from './routes/fhir';
import hipaaComplianceRoutes from './routes/hipaaCompliance';
import ipfsRoutes from './routes/ipfs';
import logsRoutes from './routes/logs';
import { createMigrationRoutes } from './routes/migration';
import monitoringRoutes, { recordApiMetrics, getMonitoringService } from './routes/monitoring';
import performanceRoutes from './routes/performance';
import permissionsRoutes from './routes/permissions';
import policiesRoutes from './routes/policies';
import recordsRoutes from './routes/records';
import recoveryRoutes from './routes/recovery';
import searchRoutes from './routes/search';
import securityRoutes from './routes/security';
import storageRoutes from './routes/storage';
import systemRoutes from './routes/system';
import tokensRoutes from './routes/tokens';
import usersRoutes from './routes/users';
import { TestSecurityConfig } from './security/testSecurityConfig';
import { AuditService } from './services/AuditService';
import { BlockchainService } from './services/BlockchainService';
import { BridgeService } from './services/BridgeService';
import { cacheService } from './services/CacheService';
import { CryptographyService } from './services/CryptographyService';
import { FabricDiagnosticsService } from './services/FabricDiagnosticsService';
import { FabricServiceAdapter } from './services/FabricServiceAdapter';
import { IPFSService } from './services/IPFSService';
import { MedicalRecordService } from './services/MedicalRecordService';
import { MerkleTreeService } from './services/MerkleTreeService';
import MetricsService from './services/MetricsService';
import { MigrationService } from './services/MigrationService';
import { SocketService } from './services/SocketService';
import { TLSConfigService } from './services/TLSConfigService';
import { ExternalIntegrationService } from './services/ExternalIntegrationService';
import { resourceCleanupManager } from './utils/ResourceCleanupManager';
// 加载环境变量
dotenvConfig();
// 初始化分布式追踪（可选）
if ((process.env.OTEL_ENABLED ?? 'false').toLowerCase() === 'true') {
  initTracing();
}


// 定义事件payload类型
interface ChainCodeEventPayload {
  patientId?: string;
  creatorId?: string;
  recordId?: string;
  granteeId?: string;
  action?: string;
  [key: string]: unknown;
}

// 创建Express应用
const app = express();
const PORT = process.env['PORT'] ?? 3001;
const HTTPS_PORT = process.env['HTTPS_PORT'] ?? 3443;

// 初始化TLS配置服务
const tlsConfigService = TLSConfigService.getInstance();

// 创建服务器（HTTP或HTTPS根据配置）
const server: http.Server | https.Server = ((): http.Server | https.Server => {
  if (tlsConfigService.isTLSEnabled()) {
    try {
      const httpsOptions = tlsConfigService.createHTTPSOptions();
      logger.info('HTTPS服务器已配置，使用TLS 1.3');
      return https.createServer(httpsOptions, app);
    } catch (error) {
      logger.error('HTTPS配置失败，回退到HTTP:', error);
      return http.createServer(app);
    }
  }
  logger.info('TLS未启用，使用HTTP服务器（不推荐用于生产环境）');
  return http.createServer(app);
})();

// 创建WebSocket服务器（保留原有的ws服务器用于兼容）
const wss = new WebSocketServer({ server, path: '/monitor' });

// 创建Socket.IO服务器
let socketService: SocketService;

// Lightweight perf endpoint that bypasses all later middlewares and rate limits
app.get('/perf/ping', (_req, res) => {
  // Minimal response body to reduce serialization overhead
  res.status(200).type('text/plain').send('pong');
});

// Alias for benchmarking convenience
app.get('/bench/ping', (_req, res) => {
  res.status(200).type('text/plain').send('pong');
});

// Fast-only Fabric mirror endpoints declared early to bypass heavy middlewares
const fastBackground = (fn: () => Promise<unknown>): void => { setImmediate(() => { void fn().catch(() => undefined); }); };

app.get('/fabricz/ping', (_req, res) => {
  res.status(200).json({ ok: true, ts: new Date().toISOString() });
});

app.get('/fabricz/status', (_req, res) => {
  try {
    const diag = FabricDiagnosticsService.getInstance(logger);
    const bc = BlockchainService.getInstance(logger);

    const last = diag.getLastReport();
    const immediate = last ? {
      status: last.summary.overall_status,
      message: '返回上次诊断结果（快速路径）',
      details: '快速返回：读取缓存结果',
      timestamp: new Date().toISOString(),
      last_check: last.timestamp,
      summary: last.summary,
      critical_issues: [],
      recommendations: last.recommendations,
    } : {
      status: 'warning', message: '快速返回（冷启动）', details: '暂无线上次诊断结果', timestamp: new Date().toISOString(), last_check: 'N/A',
      summary: { total_checks: 0, passed: 0, warnings: 0, errors: 0 }, critical_issues: [], recommendations: []
    };

    // Fire-and-forget refresh without blocking response
    fastBackground(async () => { await diag.getFabricStatus(true); });

    res.status(200).json({ status: 'ok', fabricStatus: immediate, connection: bc.getConnectionStatus(), timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(200).json({ status: 'error', message: (e as Error)?.message ?? String(e) });
  }
});

app.get('/fabricz/contract-info', (_req, res) => {
  try {
    const bc = BlockchainService.getInstance(logger);
    const conn = bc.getConnectionStatus();

    // Immediate minimal info; background fetch of real contract info
    fastBackground(async () => { await bc.getContractInfo(); });

    res.status(200).json({
      success: true,
      fast: true,
      connection: conn,
      contract: { channelName: conn.config.channelName, chaincodeName: conn.config.chaincodeName },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(200).json({ success: false, fast: true, error: (e as Error)?.message ?? String(e), timestamp: new Date().toISOString() });
  }
});

  // Fast chaincode query endpoint (no heavy middlewares): GetAllAssets
  app.get('/fabricz/assets', async (_req, res) => {
    try {
      const bc = BlockchainService.getInstance(logger);
      const conn = bc.getConnectionStatus();
      // Execute a real evaluate of GetAllAssets with a short timeout using Promise.race
      const withTimeout = async <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> => {
        let t: NodeJS.Timeout | undefined;
        try {
          return await Promise.race([
            p,
            new Promise<T>(resolve => { t = setTimeout(() => resolve(fallback), ms); }),
          ]);
        } finally { if (t) clearTimeout(t); }
      };
      const r = await withTimeout(
        (bc.evaluateTransaction('GetAllAssets') as unknown as Promise<any>),
        4000,
        { success: false, error: 'TIMEOUT' } as any
      );
      if ((r as any).success) {
        try {
          const data = JSON.parse((r as any).data ?? '[]');
          res.status(200).json({ success: true, chaincode: conn.config.chaincodeName, channel: conn.config.channelName, data, timestamp: new Date().toISOString() });
        } catch {
          res.status(200).json({ success: true, chaincode: conn.config.chaincodeName, channel: conn.config.channelName, raw: (r as any).data, timestamp: new Date().toISOString() });
        }
      } else {
        res.status(200).json({ success: false, error: (r as any).error ?? 'UNKNOWN', timestamp: new Date().toISOString() });
      }
    } catch (e) {
      res.status(200).json({ success: false, error: (e as Error)?.message ?? String(e), timestamp: new Date().toISOString() });
    }
  });


app.get('/fabricz/test', (_req, res) => {
  try {
    const bc = BlockchainService.getInstance(logger);
    const conn = bc.getConnectionStatus();

    // Schedule background connectivity + light query without blocking
    fastBackground(async () => {
      const c = await bc.ensureConnection();
      if ((c as any).success) {
        await bc.getContractInfo().catch(() => undefined);
      }
    });

    res.status(200).json({ status: 'queued', results: { connection: conn.isConnected, chaincode: false, error: null }, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(200).json({ status: 'error', message: (e as Error)?.message ?? String(e) });
  }
});



/**
 * 中间件配置
 */

// 设置全局错误处理器
setupGlobalErrorHandlers();

// 请求ID中间件（必须在最前面）
app.use(requestIdMiddleware);

// TLS 1.3安全头中间件 (read111.md compliant)
app.use((_req, res, next) => {
  const securityHeaders = tlsConfigService.getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  next();
});

// 应用测试环境安全中间件（放宽速率限制）
TestSecurityConfig.configureTestSecurity(app);

// 安全头（Helmet）
app.use(helmet(helmetOptions));
app.disable('x-powered-by');

// CORS配置
app.use(cors(corsOptions));

// HTTP 响应压缩（带智能过滤，避免压缩已压缩内容）
const shouldCompress: compression.CompressionFilter = (req, res) => {
  const ct = String(res.getHeader('Content-Type') ?? '').toLowerCase();
  if (/^(image|video|audio)\//.test(ct)) return false;
  if (/(zip|gzip|x-gzip|application\/octet-stream)/.test(ct)) return false;
  return compression.filter(req, res);
};
app.use(compression({ filter: shouldCompress, threshold: 1024 }));

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求大小验证
app.use(validateRequestSize);

// 全局API速率限制
const enableRateLimit = (process.env.ENABLE_RATE_LIMIT ?? 'true').toLowerCase() === 'true';
if (enableRateLimit) {
  app.use(apiRateLimit);
} else {
  logger.info('Rate limiting disabled via ENABLE_RATE_LIMIT=false (benchmarks/dev only)');
}

// 请求日志
app.use(requestLogger);

// 性能监控中间件
app.use(performanceMonitor);

// 使用API指标记录中间件
app.use(recordApiMetrics);

// 集成增强的指标收集服务

const metricsService = MetricsService.getInstance();
app.use(metricsService.requestMetricsMiddleware());

// Apply runtime throttling defaults when LIGHT_MODE is enabled
if ((process.env['LIGHT_MODE'] ?? 'false').toLowerCase() === 'true') {
  logger.info('LIGHT_MODE enabled: applying runtime throttling defaults');
  const current = parseInt(process.env['METRICS_INTERVAL_MS'] ?? '120000');
  process.env['METRICS_INTERVAL_MS'] = String(Math.max(current, 300000));
}

/**
 * API路由配置
 */

// 健康检查
app.get('/health', healthCheck);

// 指标端点
app.get('/metrics', (_req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(metricsService.getPrometheusMetrics());
});

// 健康检查增强版
app.get('/health/detailed', (_req, res) => {
  res.json(metricsService.getHealthMetrics());
});

// 完整的服务健康检查
app.get('/health/services', (_req, res): void => {
  void (async (): Promise<void> => {
    try {
      const { performHealthCheck } = await import('./middleware/healthCheck');
      const healthResult = await performHealthCheck();
      res.json(healthResult);
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  })();
});

// 业务指标端点
app.get('/metrics/business', (_req, res): void => {
  void (async (): Promise<void> => {
    try {
      const businessMetrics = await metricsService.collectBusinessMetrics();
      res.json(businessMetrics);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to collect business metrics', { error: errMsg });
      res.status(500).json({ error: 'Failed to collect business metrics' });
    }
  })();
});

// 告警检查端点
app.get('/alerts', (_req, res) => {
  const alerts = metricsService.checkAlerts();
  res.json({ alerts, count: alerts.length });
});

// API文档
// Swagger UI 设置 - 使用类型断言避免类型冲突
app.use('/api-docs', swaggerUi.serve as unknown as express.RequestHandler);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions) as unknown as express.RequestHandler);

// 路由配置
app.use('/api/v1/auth', authRoutes);

// 病历记录路由
app.use('/api/v1/records', recordsRoutes);

// 权限管理路由
app.use('/api/v1/permissions', permissionsRoutes);
app.use('/api/v1/permissions', tokensRoutes);

// 用户角色/权限路由
app.use('/api/v1/users', usersRoutes);

// FHIR 路由
app.use('/api/v1/fhir', abacEnforce(), fhirRoutes);
app.use('/api/v1/fhir/r4', abacEnforce(), enhancedFhirRoutes);

// 搜索路由
app.use('/api/v1/records/search', searchRoutes);
app.use('/api/v1/search', encryptedSearchRoutes);

// 策略管理路由（策略规则的增删改查与重载）
app.use('/api/v1/policies', policiesRoutes);

// 访问控制路由
app.use('/api/v1/access-control', accessControlRoutes);

// HIPAA合规路由
app.use('/api/v1/hipaa', hipaaComplianceRoutes);

// 分层存储路由
app.use('/api/v1/storage', storageRoutes);

// 安全测试路由
app.use('/api/v1/security', securityRoutes);

// 聊天路由
app.use('/api/v1/chat', chatRoutes);

// Fabric网络路由
app.use('/api/v1/fabric', fabricRoutes);

// 分析路由
app.use('/api/v1/analytics', analyticsRoutes);

// 桥接路由
app.use('/api/v1/bridge', bridgeRoutes);

// 外部集成路由（OAuth2 SSO、生物识别等）
app.use('/api/v1/external', externalRoutes);

// 联邦学习路由
app.use('/api/v1/federated', federatedRoutes);

// 性能路由
app.use('/api/v1/performance', performanceRoutes);

// 监控路由
app.use('/api/v1/monitoring', monitoringRoutes);

  // Fast non-API mirror endpoints to guarantee no timeouts
  const withTimeout = async <T>(p: Promise<T>, ms: number, onTimeout: () => T | Promise<T>): Promise<T> => {
    let t: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        p,
        new Promise<T>(resolve => {
          t = setTimeout(() => { void Promise.resolve(onTimeout()).then(resolve); }, ms);
        }),
      ]);
    } finally { if (t) clearTimeout(t); }
  };

  // Lightweight ping under /fabricz to verify route reachability without touching Fabric
  app.get('/fabricz/ping', (_req, res) => {
    res.status(200).json({ ok: true, ts: new Date().toISOString() });
  });

  app.get('/fabricz/status', async (_req, res) => {
    try {
      const diag = FabricDiagnosticsService.getInstance(logger);
      const bc = BlockchainService.getInstance(logger);

      const fabricStatus = await withTimeout(
        diag.getFabricStatus(false),
        4000,
        () => {
          const last = diag.getLastReport();
          if (last) {
            return {
              status: last.summary.overall_status,
              message: '返回上次诊断结果（超时快速返回）',
              details: '快速路径：诊断超时超过阈值',
              timestamp: new Date().toISOString(),
              last_check: last.timestamp,
              summary: last.summary,
              critical_issues: [],
              recommendations: last.recommendations,
            } as any;
          }
          return {
            status: 'warning', message: '快速返回', details: '诊断超时', timestamp: new Date().toISOString(), last_check: 'N/A',
            summary: { total_checks: 0, passed: 0, warnings: 0, errors: 0 }, critical_issues: [], recommendations: []
          } as any;
        }
      );

      res.status(200).json({
        status: 'ok',
        fabricStatus,
        connection: bc.getConnectionStatus(),
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      res.status(200).json({ status: 'error', message: (e as Error)?.message ?? String(e) });
    }
  });

  app.get('/fabricz/contract-info', async (_req, res) => {
    const bc = BlockchainService.getInstance(logger);
    const info = await withTimeout(
      bc.getContractInfo(),
      4000,
      () => ({ success: false, error: 'TIMEOUT', message: 'contract-info timeout fast-return', timestamp: new Date().toISOString() }) as any
    );
    res.status(200).json(info);
  });

  app.get('/fabricz/test', async (_req, res) => {
    try {
      const bc = BlockchainService.getInstance(logger);
      const conn = await withTimeout(bc.ensureConnection(), 4000, () => ({ success: false, error: 'TIMEOUT: ensureConnection' } as any));
      const result: { connection: boolean; chaincode: boolean; error: string | null } = {
        connection: !!(conn as any).success,
        chaincode: false,
        error: (conn as any).success ? null : ((conn as any).error ?? 'connection timeout')
      };
      if ((conn as any).success) {
        const q = await withTimeout(bc.getContractInfo(), 4000, () => ({ success: false, error: 'TIMEOUT: getContractInfo' } as any));
        result.chaincode = !!(q as any).success;
        if (!(q as any).success) result.error = (q as any).error ?? 'Unknown chaincode error';
      }
      res.status(200).json({ status: 'completed', results: result, timestamp: new Date().toISOString() });
    } catch (e) {
      res.status(200).json({ status: 'error', message: (e as Error)?.message ?? String(e) });
    }
  });

// 添加健康检查路由
app.get('/api/v1/health', healthCheck);
app.get('/health', healthCheck);

// 系统状态/健康路由
app.use('/api/v1/system', systemRoutes);

// 日志管理路由
app.use('/api/v1/logs', logsRoutes);

// 备份管理路由
app.use('/api/v1/backup', backupRoutes);

// 灾难恢复路由

app.use('/api/v1/recovery', recoveryRoutes);

// IPFS Cluster 路由
app.use('/api/v1/ipfs', ipfsRoutes);

// 数据迁移路由将在服务初始化后设置

/**
 * 初始化服务
 */
// eslint-disable-next-line max-lines-per-function, @typescript-eslint/explicit-function-return-type
async function initializeServices(): Promise<void> {
  try {
    // 获取数据库连接池
    const { pool } = await import('./config/database-mysql');
    // 类型适配：将PostgreSQL pool适配为mysql2 Pool类型
    // const mysqlCompatiblePool = pool as any; // not needed currently

    // 注册数据库连接池到资源清理管理器
    resourceCleanupManager.registerDatabasePool('main', pool, 1);

    // 初始化加密服务（包含HSM支持）
    try {
      const cryptographyService = CryptographyService.getInstance();
      await cryptographyService.initialize();
      logger.info('加密服务初始化成功');
    } catch (cryptoError) {
      logger.error('加密服务初始化失败:', cryptoError);
      throw cryptoError; // 加密服务是关键服务，失败则停止启动
    }

    // 初始化区块链服务（允许失败）
    let blockchainService: BlockchainService | undefined;
    try {
      blockchainService = BlockchainService.getInstance(logger);
      const blockchainResult = await blockchainService.initialize();
      if (blockchainResult.success) {
        logger.info('区块链服务初始化成功');
      } else {
        logger.info('区块链服务初始化失败，将在后台尝试重连:', blockchainResult.error);
      }
    } catch (blockchainError) {
      logger.info('区块链服务初始化异常，跳过区块链相关功能:', blockchainError);
      blockchainService = undefined;
    }

    // 缓存预热服务已移除，使用基础缓存即可
    logger.info('使用基础缓存服务，无需预热');

    // 初始化Fabric诊断服务（LIGHT_MODE 下跳过）
    const LIGHT_MODE = (process.env.LIGHT_MODE ?? 'false').toLowerCase() === 'true';
    let fabricDiagnosticsService: FabricDiagnosticsService | undefined;
    if (!LIGHT_MODE) {
      fabricDiagnosticsService = FabricDiagnosticsService.getInstance(logger);
      logger.info('Fabric诊断服务初始化成功');
    } else {
      logger.info('LIGHT_MODE 启用，跳过 Fabric 诊断服务初始化');
    }

    // 初始化Fabric网络连接
    const gateway = new Gateway();

    // 初始化服务实例
    const ipfsService = new IPFSService();
    const merkleService = new MerkleTreeService();
    const auditService = new AuditService();

    const medicalRecordService = new MedicalRecordService();

    // 初始化桥接服务
    const bridgeService = new BridgeService(pool as unknown as MySQLPool, gateway, medicalRecordService, logger);
    const _fabricServiceAdapter = new FabricServiceAdapter(gateway, logger);
    // 桥接优化服务已移除，使用基础桥接服务

    // Fabric网络初始化已由相关服务内部处理（如适用）

    // 初始化Socket.IO服务
    socketService = new SocketService(server);

    // 启动链码事件监听并通过 Socket 广播
    try {
      if (blockchainService) {
        // eslint-disable-next-line complexity

        await blockchainService.startEventListeners(async evt => {
          const { name, payload } = evt;
          // 全量广播（便于调试）
          socketService.broadcast('chaincode-event', { name, payload });

          // 定向通知路由
          try {
            if (name === 'RecordCreated' && payload) {
              const p = payload as ChainCodeEventPayload;
              const targets = [p.patientId, p.creatorId].filter(Boolean);
              for (const userId of targets) {
                socketService.emitToUser(String(userId), 'system-notification', {
                  id: String(Date.now()),
                  type: 'info',
                  title: '病历已创建',
                  message: `记录 ${p.recordId ?? ''} 已创建`,
                  timestamp: new Date(),
                  priority: 'low',
                });
              }
            }

            if (name === 'AccessGranted' && payload) {
              const p = payload as ChainCodeEventPayload;
              if (p.granteeId) {
                socketService.emitToUser(String(p.granteeId), 'system-notification', {
                  id: String(Date.now()),
                  type: 'info',
                  title: '获得访问权限',
                  message: `你已获得记录 ${p.recordId ?? ''} 的 ${p.action ?? 'read'} 权限`,
                  timestamp: new Date(),
                  priority: 'low',
                });
              }
            }

            if (name === 'AccessRevoked' && payload) {
              const p = payload as ChainCodeEventPayload;
              if (p.granteeId) {
                socketService.emitToUser(String(p.granteeId), 'system-notification', {
                  id: String(Date.now()),
                  type: 'warning',
                  title: '访问权限被撤销',
                  message: `你对记录 ${p.recordId ?? ''} 的访问已撤销`,
                  timestamp: new Date(),
                  priority: 'medium',
                });
              }
            }
          } catch (routeErr) {
            logger.info('链码事件定向通知路由失败（忽略继续）：', (routeErr as Error)?.message);
          }
        });
        logger.info('链码事件监听已接入 Socket 广播与定向通知');
      } else {
        logger.info('区块链服务未初始化，跳过事件监听');
      }
    } catch (e) {
      logger.info('链码事件监听接入失败（可继续运行）:', (e as Error)?.message);
    }
    logger.info('Socket.IO service initialized successfully');

    // 将服务实例存储到app.locals中，供路由使用
    app.locals.db = pool;
    app.locals.gateway = gateway;
    app.locals.medicalRecordService = medicalRecordService;
    app.locals.ipfsService = ipfsService;
    app.locals.merkleService = merkleService;
    app.locals.auditService = auditService;
    app.locals.socketService = socketService;
    app.locals.bridgeService = bridgeService;

    app.locals.blockchainService = blockchainService;
    app.locals.fabricDiagnosticsService = fabricDiagnosticsService;

    // 初始化外部集成服务
    const externalIntegrationService = new ExternalIntegrationService({
      enabled: true,
      oauth2: {
        enabled: (process.env.OAUTH2_ENABLED ?? 'false').toLowerCase() === 'true',
        providers: {
          // 示例配置，实际应从环境变量读取
          hospital_a: {
            clientId: process.env.OAUTH2_HOSPITAL_A_CLIENT_ID ?? '',
            clientSecret: process.env.OAUTH2_HOSPITAL_A_CLIENT_SECRET ?? '',
            authUrl: process.env.OAUTH2_HOSPITAL_A_AUTH_URL ?? '',
            tokenUrl: process.env.OAUTH2_HOSPITAL_A_TOKEN_URL ?? '',
            userInfoUrl: process.env.OAUTH2_HOSPITAL_A_USER_INFO_URL ?? '',
            scope: ['openid', 'profile', 'email']
          }
        }
      },
      federatedLearning: {
        enabled: (process.env.FEDERATED_LEARNING_ENABLED ?? 'false').toLowerCase() === 'true',
        endpoints: (process.env.FEDERATED_LEARNING_ENDPOINTS ?? '').split(',').filter(Boolean),
        encryptionKey: process.env.FEDERATED_LEARNING_ENCRYPTION_KEY
      },
      biometrics: {
        enabled: (process.env.BIOMETRICS_ENABLED ?? 'false').toLowerCase() === 'true',
        providers: (process.env.BIOMETRIC_PROVIDERS ?? 'fingerprint,face').split(','),
        threshold: parseFloat(process.env.BIOMETRIC_THRESHOLD ?? '0.85')
      },
      sso: {
        enabled: (process.env.SSO_ENABLED ?? 'false').toLowerCase() === 'true',
        samlEndpoint: process.env.SSO_SAML_ENDPOINT,
        oidcEndpoint: process.env.SSO_OIDC_ENDPOINT
      }
    }, pool);

    await externalIntegrationService.initialize();
    app.locals.externalIntegrationService = externalIntegrationService;




    // 初始化数据迁移路由
    const migrationService = new MigrationService(
      pool as unknown as MySQLPool,
      logger,
      cacheService,
      ipfsService,
      auditService,
      blockchainService ?? BlockchainService.getInstance(logger)
    );
    const migrationRoutes = createMigrationRoutes(migrationService);
    app.use('/api/v1/migration', migrationRoutes);

    logger.info('所有服务初始化完成');
  } catch (error) {
    logger.error('服务初始化失败:', error);
    throw error;
// eslint-disable-next-line max-lines-per-function

  }
}

/**
 * WebSocket连接处理
 */
// eslint-disable-next-line max-lines-per-function

wss.on('connection', (ws, req): void => {
  const clientIp = req.socket.remoteAddress;
  const url = req.url || '';
  logger.info(`WebSocket客户端连接: ${clientIp}${url ? ` ${url}` : ''}`);

  // 发送欢迎消息
  ws.send(
    JSON.stringify({
      type: 'welcome',
      message: '欢迎连接到EMR区块链系统',
      timestamp: new Date().toISOString(),
    })
  );

  // 监控服务事件监听
  const monitoringService = getMonitoringService();

  const handleMetricsUpdate = (data: unknown): void => {
    ws.send(JSON.stringify(data));
  };

  const handleAlertFired = (data: unknown): void => {
    ws.send(JSON.stringify(data));
  };

  const handleAlertResolved = (data: unknown): void => {
    ws.send(JSON.stringify(data));
  };

  // 注册监控事件监听器
  monitoringService.on('metrics_update', handleMetricsUpdate);
  monitoringService.on('alert_fired', handleAlertFired);
  monitoringService.on('alert_resolved', handleAlertResolved);

  // 处理客户端消息
  ws.on('message', (data: unknown): void => {
    try {
      const message = JSON.parse(String(data));
      logger.info('收到WebSocket消息', { message, clientIp });

      // 处理不同类型的消息
      if (message && message.type === 'subscribe_monitoring') {
        // 客户端订阅监控数据
        ws.send(
          JSON.stringify({
            type: 'subscription_confirmed',
            message: '已订阅监控数据推送',
            timestamp: new Date().toISOString(),
          })
        );
      } else {
        // 回显消息（示例）
        ws.send(
          JSON.stringify({
            type: 'echo',
            data: message,
            timestamp: new Date().toISOString(),
          })
        );
      }
    } catch (error) {
      logger.error('WebSocket消息解析失败', { error, clientIp });
      ws.send(
        JSON.stringify({
          type: 'error',
          message: '消息格式错误',
          timestamp: new Date().toISOString(),
        })
      );
    }
  });

  // 处理连接关闭
  ws.on('close', (): void => {
    // 移除监控事件监听器
    monitoringService.off('metrics_update', handleMetricsUpdate);
    monitoringService.off('alert_fired', handleAlertFired);
    monitoringService.off('alert_resolved', handleAlertResolved);

    logger.info(`WebSocket客户端断开连接: ${clientIp}`);
  });

  // 处理连接错误
  ws.on('error', error => {
    logger.error('WebSocket连接错误', { error, clientIp });
  });
});

/**
 * 广播消息到所有WebSocket客户端
 */
export function broadcastMessage(message: unknown): void {
  const payload = typeof message === 'object' && message !== null ? (message as Record<string, unknown>) : { data: message };
  const messageString = JSON.stringify({
    ...payload,
    timestamp: new Date().toISOString(),
  });

  wss.clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(messageString);
    }
  });
}

/**
 * 错误处理中间件（必须放在最后）
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * 应用启动函数
 */
// eslint-disable-next-line max-lines-per-function

async function startApplication(): Promise<void> {
  try {
    // 创建日志目录
    const logsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // 测试数据库连接
    logger.info('正在测试数据库连接...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.info('数据库连接失败，应用将在有限功能模式下运行');
    } else {
      // 初始化数据库
      logger.info('正在初始化数据库...');
      await initializeDatabase();
      logger.info('数据库初始化完成');

      // 初始化所有服务（允许失败）
      try {
        await initializeServices();
        logger.info('服务初始化完成');
      } catch (serviceError) {
        logger.info('服务初始化失败，应用将在有限功能模式下运行:', serviceError);
      }
    }

    // 启动服务器（测试模式下不监听端口，避免占用资源/端口冲突）
    const preferredPort = Number(tlsConfigService.isTLSEnabled() ? HTTPS_PORT : PORT) || 3001;
    const shouldListen = (process.env['NODE_ENV'] ?? 'development') !== 'test' && (process.env['START_SERVER'] ?? 'true') !== 'false';

    // 固定监听端口（不再动态漂移），优先 PORT 环境变量，否则使用首选端口
    if (shouldListen) {
      const envPort = Number(process.env['PORT']);
      const portToUse = !Number.isNaN(envPort) && envPort > 0 ? envPort : preferredPort;

      server.listen(portToUse, '0.0.0.0', () => {
        logger.info(`EMR区块链系统后端服务启动成功`);

        if (tlsConfigService.isTLSEnabled()) {
          logger.info(`HTTPS服务器运行在: https://localhost:${portToUse} (TLS 1.3)`);
          logger.info(`WebSocket服务器运行在: wss://localhost:${portToUse} (TLS 1.3)`);

          // 验证TLS配置
          tlsConfigService
            .validateConfiguration()
            .then(validation => {
              if (validation.valid) {
                logger.info('✅ TLS 1.3配置验证通过');
              } else {
                logger.info('⚠️ TLS配置验证提醒:', validation.errors);
              }
            })
            .catch(error => {
              logger.error('❌ TLS配置验证失败:', error);
            });
        } else {
          logger.info(`HTTP服务器运行在: http://localhost:${portToUse}`);
          logger.info(`WebSocket服务器运行在: ws://localhost:${portToUse}`);
          logger.info('⚠️ 当前使用HTTP协议，生产环境建议启用TLS 1.3');
        }
        logger.info(`API文档地址: http://localhost:${portToUse}/api-docs`);
        logger.info(`健康检查地址: http://localhost:${portToUse}/health`);
        logger.info(`环境: ${process.env['NODE_ENV'] ?? 'development'}`);
      });
    } else {
      logger.info('测试模式或START_SERVER=false，跳过 server.listen()');
    }
  } catch (error) {
    logger.error('应用启动失败', { error });
    // 不强制退出，允许进程继续运行以便后续重试或调试
  }
}

/**
 * 优雅关闭处理
 */
process.on('SIGTERM', (): void => {
  void (async (): Promise<void> => {
    logger.info('收到SIGTERM信号，正在优雅关闭服务器...');

    // 关闭Socket.IO服务器
    if (socketService) {
      await socketService.close();
      logger.info('Socket.IO服务器已关闭');
    }

    server.close(() => {
      logger.info('HTTP服务器已关闭');
    });

    // 关闭所有WebSocket连接
    wss.clients.forEach(client => {
      client.terminate();
    });

    wss.close(() => {
      logger.info('WebSocket服务器已关闭');
    });

    // 关闭数据库连接
    try {
      const { closePool } = await import('./config/database-mysql');
      await closePool();
    } catch (error) {
      logger.error('关闭数据库连接失败', { error });
    }

    process.exit(0);
  })();
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在优雅关闭服务器...');

  server.close(() => {
    logger.info('HTTP服务器已关闭');
    process.exit(0);
  });
});

// 处理未捕获的异常
process.on('uncaughtException', error => {
  logger.error('未捕获的异常', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝', { reason, promise });
  process.exit(1);
});

// 启动应用
if (require.main === module) {
  void startApplication();
}

// 测试环境初始化函数
export async function initializeForTesting(): Promise<void> {
  if (process.env['NODE_ENV'] === 'test' || process.env['NODE_ENV'] === 'testing') {
    try {
      // 测试数据库连接
      const dbConnected = await testConnection();
      if (dbConnected) {
        // 初始化数据库
        await initializeDatabase();
        // 初始化服务
        await initializeServices();
        logger.info('测试环境服务初始化完成');
      } else {
        logger.info('测试环境数据库连接失败');
      }
    } catch (error) {
      logger.error('测试环境初始化失败:', error);
      throw error;
    }
  }
}

export default app;
export { app, server, wss };
