/**
 * Environment Configuration Management
 * Provides secure environment variable handling with validation and defaults
 */

import { logger } from '../utils/logger';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  pool: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  encryptionKey: string;
  allowedOrigins: string[];
  sessionSecret: string;
  bcryptRounds: number;
}

export interface BlockchainConfig {
  networkId: string;
  channelName: string;
  chaincodeName: string;
  peerUrl: string;
  caUrl: string;
  walletPath: string;
  connectionProfile: string;
}

export interface IPFSConfig {
  apiUrl: string;
  gatewayUrl: string;
  timeout: number;
  retries: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  ttl: number;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  logLevel: string;
  apiVersion: string;
  maxRequestSize: string;
  enableSwagger: boolean;
  enableMetrics: boolean;
}

/**
 * Validates and parses environment variables
 */
class EnvironmentManager {
  private static instance: EnvironmentManager;
  private config: {
    app: AppConfig;
    database: DatabaseConfig;
    security: SecurityConfig;
    blockchain: BlockchainConfig;
    ipfs: IPFSConfig;
    redis: RedisConfig;
  };

  private constructor() {
    this.validateRequiredEnvVars();
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  /**
   * Validates that all required environment variables are present
   */
  private validateRequiredEnvVars(): void {
    const requiredVars = ['NODE_ENV', 'JWT_SECRET', 'ENCRYPTION_KEY'];

    // Check for either MySQL or generic DB environment variables
    const hasMySQLConfig =
      Boolean(process.env["MYSQL_HOST"]) &&
      Boolean(process.env["MYSQL_DATABASE"]) &&
      Boolean(process.env["MYSQL_USER"]) &&
      Boolean(process.env["MYSQL_PASSWORD"]);

    const hasGenericDbConfig =
      Boolean(process.env["DB_HOST"]) &&
      Boolean(process.env["DB_NAME"]) &&
      Boolean(process.env["DB_USER"]) &&
      Boolean(process.env["DB_PASSWORD"]);

    const hasDbConfig = hasMySQLConfig || hasGenericDbConfig;

    if (!hasDbConfig) {
      requiredVars.push('MYSQL_HOST', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD');
    }

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Production-specific validations
    if (process.env["NODE_ENV"] === 'production') {
      const productionRequiredVars = [
        'JWT_REFRESH_SECRET',
        'SESSION_SECRET',
        'ALLOWED_ORIGINS',
        'BLOCKCHAIN_NETWORK_ID',
        'IPFS_API_URL',
      ];

      const missingProdVars = productionRequiredVars.filter(varName => !process.env[varName]);

      if (missingProdVars.length > 0) {
        throw new Error(`Missing production environment variables: ${missingProdVars.join(', ')}`);
      }
    }
  }

  /**
   * Loads and parses configuration from environment variables
   */
  private loadConfiguration(): { app: AppConfig; database: DatabaseConfig; security: SecurityConfig; blockchain: BlockchainConfig; ipfs: IPFSConfig; redis: RedisConfig } {
    return {
      app: this.loadAppConfig(),
      database: this.loadDatabaseConfig(),
      security: this.loadSecurityConfig(),
      blockchain: this.loadBlockchainConfig(),
      ipfs: this.loadIPFSConfig(),
      redis: this.loadRedisConfig(),
    };
  }

  private loadAppConfig(): AppConfig {
    return {
      nodeEnv: process.env["NODE_ENV"] ?? 'development',
      port: parseInt(process.env["PORT"] ?? '3001', 10),
      logLevel: process.env["LOG_LEVEL"] ?? 'info',
      apiVersion: process.env["API_VERSION"] ?? 'v1',
      maxRequestSize: process.env["MAX_REQUEST_SIZE"] ?? '10mb',
      enableSwagger: process.env["ENABLE_SWAGGER"] !== 'false',
      enableMetrics: process.env["ENABLE_METRICS"] !== 'false',
    };
  }

  private loadDatabaseConfig(): DatabaseConfig {
    return {
      host: process.env["MYSQL_HOST"] ?? process.env["DB_HOST"] ?? 'localhost',
      port: parseInt(process.env["MYSQL_PORT"] ?? process.env["DB_PORT"] ?? '3306', 10),
      database: process.env["MYSQL_DATABASE"] ?? process.env["DB_NAME"] ?? 'emr_blockchain',
      username: process.env["MYSQL_USER"] ?? process.env["DB_USER"] ?? 'root',
      password: process.env["MYSQL_PASSWORD"] ?? process.env["DB_PASSWORD"] ?? 'password',
      ssl: process.env["DB_SSL"] === 'true',
      pool: {
        max: parseInt(process.env["DB_POOL_MAX"] ?? '10', 10),
        min: parseInt(process.env["DB_POOL_MIN"] ?? '0', 10),
        acquire: parseInt(process.env["DB_POOL_ACQUIRE"] ?? '30000', 10),
        idle: parseInt(process.env["DB_POOL_IDLE"] ?? '10000', 10),
      },
    };
  }

  private loadSecurityConfig(): SecurityConfig {
    const jwtSecretRaw = process.env["JWT_SECRET"];
    const encryptionKeyRaw = process.env["ENCRYPTION_KEY"];

    const jwtSecret = jwtSecretRaw != null && String(jwtSecretRaw).trim() !== ''
      ? String(jwtSecretRaw)
      : '';
    const encryptionKey = encryptionKeyRaw != null && String(encryptionKeyRaw).trim() !== ''
      ? String(encryptionKeyRaw)
      : '';

    // Validate secret lengths
    if (jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    if (encryptionKey.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }

    return {
      jwtSecret,
      jwtRefreshSecret: process.env["JWT_REFRESH_SECRET"] ?? jwtSecret,
      encryptionKey,
      allowedOrigins: process.env["ALLOWED_ORIGINS"]?.split(',') ?? ['http://localhost:3000'],
      sessionSecret: process.env["SESSION_SECRET"] ?? jwtSecret,
      bcryptRounds: parseInt(process.env["BCRYPT_ROUNDS"] ?? '12', 10),
    };
  }

  private loadBlockchainConfig(): BlockchainConfig {
    return {
      networkId: process.env["BLOCKCHAIN_NETWORK_ID"] ?? 'dev',
      channelName: process.env["FABRIC_CHANNEL_NAME"] ?? 'mychannel',
      chaincodeName: process.env["FABRIC_CHAINCODE_NAME"] ?? 'emr',
      peerUrl: process.env["FABRIC_PEER_URL"] ?? 'grpc://localhost:7051',
      caUrl: process.env["FABRIC_CA_URL"] ?? 'http://localhost:7054',
      walletPath: process.env["FABRIC_WALLET_PATH"] ?? './wallet',
      connectionProfile: process.env["FABRIC_CONNECTION_PROFILE"] ?? './connection-profile.json',
    };
  }

  private loadIPFSConfig(): IPFSConfig {
    return {
      apiUrl: process.env["IPFS_API_URL"] ?? 'http://localhost:5001',
      gatewayUrl: process.env["IPFS_GATEWAY_URL"] ?? 'http://localhost:8080',
      timeout: parseInt(process.env["IPFS_TIMEOUT"] ?? '30000', 10),
      retries: parseInt(process.env["IPFS_RETRIES"] ?? '3', 10),
    };
  }

  private loadRedisConfig(): RedisConfig {
    return {
      host: process.env["REDIS_HOST"] ?? 'localhost',
      port: parseInt(process.env["REDIS_PORT"] ?? '6379', 10),
      password: process.env["REDIS_PASSWORD"],
      db: parseInt(process.env["REDIS_DB"] ?? '0', 10),
      ttl: parseInt(process.env["REDIS_TTL"] ?? '3600', 10),
    };
  }

  /**
   * Validates the loaded configuration
   */
  private validateConfiguration(): void {
    // Validate port ranges
    if (this.config.app.port < 1 || this.config.app.port > 65535) {
      throw new Error('Port must be between 1 and 65535');
    }

    if (this.config.database.port < 1 || this.config.database.port > 65535) {
      throw new Error('Database port must be between 1 and 65535');
    }

    // Validate bcrypt rounds
    if (this.config.security.bcryptRounds < 10 || this.config.security.bcryptRounds > 15) {
      throw new Error('Bcrypt rounds must be between 10 and 15');
    }

    // Validate allowed origins in production
    if (this.config.app.nodeEnv === 'production') {
      const hasInsecureOrigins = this.config.security.allowedOrigins.some(
        origin => origin.includes('localhost') || origin.includes('127.0.0.1')
      );

      if (hasInsecureOrigins) {
        logger.warn('Production environment contains localhost origins', {
          allowedOrigins: this.config.security.allowedOrigins,
        });
      }
    }

    logger.info('Configuration validated successfully', {
      nodeEnv: this.config.app.nodeEnv,
      port: this.config.app.port,
      databaseHost: this.config.database.host,
      blockchainNetwork: this.config.blockchain.networkId,
    });
  }

  // Getter methods
  public getAppConfig(): AppConfig {
    return { ...this.config.app };
  }

  public getDatabaseConfig(): DatabaseConfig {
    return { ...this.config.database };
  }

  public getSecurityConfig(): SecurityConfig {
    // Return a copy without exposing sensitive data
    return {
      ...this.config.security,
      jwtSecret: '[REDACTED]',
      jwtRefreshSecret: '[REDACTED]',
      encryptionKey: '[REDACTED]',
      sessionSecret: '[REDACTED]',
    } as SecurityConfig;
  }

  public getSecurityConfigRaw(): SecurityConfig {
    return { ...this.config.security };
  }

  public getBlockchainConfig(): BlockchainConfig {
    return { ...this.config.blockchain };
  }

  public getIPFSConfig(): IPFSConfig {
    return { ...this.config.ipfs };
  }

  public getRedisConfig(): RedisConfig {
    return { ...this.config.redis };
  }

  /**
   * Check if running in production
   */
  public isProduction(): boolean {
    return this.config.app.nodeEnv === 'production';
  }

  /**
   * Check if running in development
   */
  public isDevelopment(): boolean {
    return this.config.app.nodeEnv === 'development';
  }

  /**
   * Check if running in test
   */
  public isTest(): boolean {
    return this.config.app.nodeEnv === 'test';
  }
}

// Export singleton instance
export const envConfig = EnvironmentManager.getInstance();

// Export individual config getters for convenience
export const getAppConfig = (): AppConfig => envConfig.getAppConfig();
export const getDatabaseConfig = (): DatabaseConfig => envConfig.getDatabaseConfig();
export const getSecurityConfig = (): SecurityConfig => envConfig.getSecurityConfig();
export const getSecurityConfigRaw = (): SecurityConfig => envConfig.getSecurityConfigRaw();
export const getBlockchainConfig = (): BlockchainConfig => envConfig.getBlockchainConfig();
export const getIPFSConfig = (): IPFSConfig => envConfig.getIPFSConfig();
export const getRedisConfig = (): RedisConfig => envConfig.getRedisConfig();
