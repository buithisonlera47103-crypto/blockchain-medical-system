/**
 * TLS 1.3 Configuration for EMR Blockchain System
 * Provides secure TLS configuration compliant with healthcare standards
 * Implements read111.md TLS 1.3 requirements
 */

import fs from 'fs';
import path from 'path';

import { ValidationError } from '../utils/EnhancedAppError';
import { logger } from '../utils/logger';

class ConfigurationError extends ValidationError {
  constructor(code: string, message: string) {
    super(message, { code });
  }
}


export interface TLSConfig {
  enabled: boolean;
  cert: string;
  key: string;
  ca?: string;
  passphrase?: string;
  minVersion: string;
  maxVersion: string;
  ciphers: string[];
  honorCipherOrder: boolean;
  secureProtocol: string;
  dhparam?: string;
  requestCert: boolean;
  rejectUnauthorized: boolean;
}

export interface TLSOptions {
  cert: Buffer;
  key: Buffer;
  ca?: Buffer;
  passphrase?: string;
  minVersion: string;
  maxVersion: string;
  ciphers: string;
  honorCipherOrder: boolean;
  secureProtocol: string;
  dhparam?: Buffer;
  requestCert: boolean;
  rejectUnauthorized: boolean;
}

/**
 * TLS Configuration Manager
 * Handles TLS 1.3 configuration for production healthcare compliance
 */
class TLSConfigManager {
  private static instance: TLSConfigManager;
  private readonly config: TLSConfig;

  private constructor() {
    this.config = this.loadTLSConfig();
    this.validateTLSConfig();
  }

  public static getInstance(): TLSConfigManager {
    if (!TLSConfigManager.instance) {
      TLSConfigManager.instance = new TLSConfigManager();
    }
    return TLSConfigManager.instance;
  }

  /**
   * Load TLS configuration from environment variables
   */
  private loadTLSConfig(): TLSConfig {
    const isProduction = process.env["NODE_ENV"] === 'production';

    return {
      enabled: process.env["TLS_ENABLED"] !== 'false',
      cert:
        process.env["TLS_CERT_PATH"] ??
        (isProduction ? '/etc/ssl/certs/emr-blockchain.crt' : './certs/localhost.crt'),
      key:
        process.env["TLS_KEY_PATH"] ??
        (isProduction ? '/etc/ssl/private/emr-blockchain.key' : './certs/localhost.key'),
      ca: process.env["TLS_CA_PATH"],
      passphrase: process.env["TLS_PASSPHRASE"],
      minVersion: 'TLSv1.3',
      maxVersion: 'TLSv1.3',
      ciphers: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-CHACHA20-POLY1305',
        'ECDHE-RSA-AES128-GCM-SHA256',
      ],
      honorCipherOrder: true,
      secureProtocol: 'TLSv1_3_method',
      dhparam: process.env["TLS_DHPARAM_PATH"],
      requestCert: process.env["TLS_REQUEST_CERT"] === 'true',
      rejectUnauthorized: process.env["TLS_REJECT_UNAUTHORIZED"] !== 'false',
    };
  }

  /**
   * Validate TLS configuration
   */
  // eslint-disable-next-line max-lines-per-function, complexity
  private validateTLSConfig(): void {
    if (!this.config.enabled) {
      logger.warn('TLS is disabled - not recommended for production');
      return;
    }

    // Check certificate files exist
    if (!fs.existsSync(this.config.cert)) {
      throw new ConfigurationError(
        'TLS_CERT_NOT_FOUND',
        `TLS certificate file not found: ${this.config.cert}`
      );
    }

    if (!fs.existsSync(this.config.key)) {
      throw new ConfigurationError(
        'TLS_KEY_NOT_FOUND',
        `TLS private key file not found: ${this.config.key}`
      );
    }

    // Check CA file if specified
    if (this.config.ca && !fs.existsSync(this.config.ca)) {
      throw new ConfigurationError('TLS_CA_NOT_FOUND', `TLS CA file not found: ${this.config.ca}`);
    }

    // Check DH parameters file if specified
    if (this.config.dhparam && !fs.existsSync(this.config.dhparam)) {
      throw new ConfigurationError(
        'TLS_DHPARAM_NOT_FOUND',
        `TLS DH parameters file not found: ${this.config.dhparam}`
      );
    }

    // Validate certificate
    try {
      const certContent = fs.readFileSync(this.config.cert, 'utf8');
      const keyContent = fs.readFileSync(this.config.key, 'utf8');

      // Basic certificate validation
      if (!certContent.includes('BEGIN CERTIFICATE')) {
        throw new ConfigurationError('INVALID_TLS_CERT', 'Invalid TLS certificate format');
      }

      if (
        !keyContent.includes('BEGIN PRIVATE KEY') &&
        !keyContent.includes('BEGIN RSA PRIVATE KEY')
      ) {
        throw new ConfigurationError('INVALID_TLS_KEY', 'Invalid TLS private key format');
      }

      logger.info('TLS configuration validated successfully', {
        certPath: this.config.cert,
        keyPath: this.config.key,
        minVersion: this.config.minVersion,
        maxVersion: this.config.maxVersion,
      });
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ConfigurationError(
        'TLS_VALIDATION_ERROR',
        `Failed to validate TLS configuration: ${errorMessage}`
      );
    }
  }

  /**
   * Get TLS options for Node.js HTTPS server
   */
  public getTLSOptions(): TLSOptions | null {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const options: TLSOptions = {
        cert: fs.readFileSync(this.config.cert),
        key: fs.readFileSync(this.config.key),
        minVersion: this.config.minVersion,
        maxVersion: this.config.maxVersion,
        ciphers: this.config.ciphers.join(':'),
        honorCipherOrder: this.config.honorCipherOrder,
        secureProtocol: this.config.secureProtocol,
        requestCert: this.config.requestCert,
        rejectUnauthorized: this.config.rejectUnauthorized,
      };

      // Add optional files
      if (this.config.ca) {
        options.ca = fs.readFileSync(this.config.ca);
      }

      if (this.config.passphrase) {
        options.passphrase = this.config.passphrase;
      }

      if (this.config.dhparam) {
        options.dhparam = fs.readFileSync(this.config.dhparam);
      }

      return options;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ConfigurationError(
        'TLS_OPTIONS_ERROR',
        `Failed to load TLS options: ${errorMessage}`
      );
    }
  }

  /**
   * Get TLS configuration
   */
  public getTLSConfig(): TLSConfig {
    return { ...this.config };
  }

  /**
   * Check if TLS is enabled
   */
  public isTLSEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Generate self-signed certificate for development
   */
  public async generateSelfSignedCert(certDir: string = './certs'): Promise<void> {
    if (process.env["NODE_ENV"] === 'production') {
      throw new ConfigurationError(
        'SELF_SIGNED_IN_PRODUCTION',
        'Self-signed certificates are not allowed in production'
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require('child_process');

    try {
      // Create certs directory
      if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
      }

      const certPath = path.join(certDir, 'localhost.crt');
      const keyPath = path.join(certDir, 'localhost.key');

      // Generate self-signed certificate
      const opensslCmd = `openssl req -x509 -newkey rsa:4096 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj "/C=US/ST=State/L=City/O=EMR-Blockchain/CN=localhost"`;

      execSync(opensslCmd, { stdio: 'inherit' });

      logger.info('Self-signed certificate generated', {
        certPath,
        keyPath,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ConfigurationError(
        'CERT_GENERATION_ERROR',
        `Failed to generate self-signed certificate: ${errorMessage}`
      );
    }
  }

  /**
   * Validate certificate expiration
   */
  public validateCertificateExpiration(): { valid: boolean; daysUntilExpiry: number } {
    if (!this.config.enabled) {
      return { valid: true, daysUntilExpiry: Infinity };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { execSync } = require('child_process');

      // Get certificate expiration date
      const expiryCmd = `openssl x509 -in ${this.config.cert} -noout -enddate`;
      const expiryOutput = execSync(expiryCmd, { encoding: 'utf8' });

      // Parse expiry date
      const expiryMatch = expiryOutput.match(/notAfter=(.+)/);
      if (!expiryMatch) {
        throw new Error('Could not parse certificate expiry date');
      }

      const expiryDate = new Date(expiryMatch[1]);
      const currentDate = new Date();
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const valid = daysUntilExpiry > 0;

      if (daysUntilExpiry <= 30) {
        logger.warn('TLS certificate expires soon', {
          expiryDate: expiryDate.toISOString(),
          daysUntilExpiry,
        });
      }

      return { valid, daysUntilExpiry };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to validate certificate expiration', { error: errorMessage });
      return { valid: false, daysUntilExpiry: 0 };
    }
  }
}

// Export singleton instance
export const tlsConfig = TLSConfigManager.getInstance();

// Export convenience functions
export const getTLSOptions = (): TLSOptions | null => tlsConfig.getTLSOptions();
export const getTLSConfig = (): TLSConfig => tlsConfig.getTLSConfig();
export const isTLSEnabled = (): boolean => tlsConfig.isTLSEnabled();
export const validateCertificateExpiration = (): { valid: boolean; daysUntilExpiry: number } =>
  tlsConfig.validateCertificateExpiration();
export const generateSelfSignedCert = (certDir?: string): Promise<void> =>
  tlsConfig.generateSelfSignedCert(certDir);
