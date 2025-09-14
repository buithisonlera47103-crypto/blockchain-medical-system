/**
 * API Versioning Middleware
 * Provides comprehensive API versioning with backward compatibility and deprecation management
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

import { ApiResponseBuilder } from '../utils/ApiResponseBuilder';

export interface VersionConfig {
  version: string;
  deprecated?: boolean;
  deprecationDate?: Date;
  sunsetDate?: Date;
  supportedUntil?: Date;
  migrationGuide?: string;
}

export interface VersionedRequest extends Request {
  apiVersion?: string;
  versionConfig?: VersionConfig;
  responseFormat?: 'standard' | 'jsonapi' | 'hal';
}

export interface VersionedEndpoint {
  [version: string]: RequestHandler;
}

export class ApiVersionManager {
  private static readonly SUPPORTED_VERSIONS: VersionConfig[] = [
    {
      version: '1.0',
      deprecated: false,
    },
    {
      version: '1.1',
      deprecated: false,
    },
    {
      version: '2.0',
      deprecated: false,
    },
    {
      version: '0.9',
      deprecated: true,
      deprecationDate: new Date('2024-01-01'),
      sunsetDate: new Date('2024-06-01'),
      migrationGuide: 'https://docs.emr-blockchain.com/migration/v0.9-to-v1.0',
    },
  ];

  private static readonly DEFAULT_VERSION = '1.0';
  private static readonly HEADER_NAME = 'API-Version';
  private static readonly ACCEPT_VERSION_HEADER = 'Accept-Version';

  /**
   * Gets the requested API version from request
   */
  static getRequestedVersion(req: Request): string {
    // Priority order: Header > Accept-Version > URL path > Default

    // 1. Check API-Version header
    const headerVersion = req.headers[this.HEADER_NAME.toLowerCase()] as string;
    if (headerVersion && this.isVersionSupported(headerVersion)) {
      return headerVersion;
    }

    // 2. Check Accept-Version header
    const acceptVersion = req.headers[this.ACCEPT_VERSION_HEADER.toLowerCase()] as string;
    if (acceptVersion && this.isVersionSupported(acceptVersion)) {
      return acceptVersion;
    }

    // 3. Check URL path (/api/v1.0/, /api/v1.1/, etc.)
    const pathVersionMatch = req.path.match(/^\/api\/v(\d+\.\d+)\//);
    if (pathVersionMatch) {
      const pathVersion = pathVersionMatch[1];
      if (pathVersion && this.isVersionSupported(pathVersion)) {
        return pathVersion;
      }
    }

    // 4. Return default version
    return this.DEFAULT_VERSION;
  }

  /**
   * Checks if a version is supported
   */
  static isVersionSupported(version: string): boolean {
    return this.SUPPORTED_VERSIONS.some(v => v.version === version);
  }

  /**
   * Gets version configuration
   */
  static getVersionConfig(version: string): VersionConfig | undefined {
    return this.SUPPORTED_VERSIONS.find(v => v.version === version);
  }

  /**
   * Checks if a version is deprecated
   */
  static isVersionDeprecated(version: string): boolean {
    const config = this.getVersionConfig(version);
    return config?.deprecated ?? false;
  }

  /**
   * Gets deprecation information for a version
   */
  static getDeprecationInfo(version: string): {
    isDeprecated: boolean;
    deprecationDate?: Date;
    sunsetDate?: Date;
    migrationGuide?: string;
  } {
    const config = this.getVersionConfig(version);
    return {
      isDeprecated: config?.deprecated ?? false,
      deprecationDate: config?.deprecationDate,
      sunsetDate: config?.sunsetDate,
      migrationGuide: config?.migrationGuide,
    };
  }

  /**
   * Creates versioning middleware
   */
  static createVersioningMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void | Response => {
      const requestedVersion = this.getRequestedVersion(req);

      // Validate version support
      if (!this.isVersionSupported(requestedVersion)) {
        return res.status(400).json(
          ApiResponseBuilder.genericError(
            'UNSUPPORTED_VERSION',
            'API_VERSION_NOT_SUPPORTED',
            `API version ${requestedVersion} is not supported`,
            {
              requestedVersion,
              supportedVersions: this.SUPPORTED_VERSIONS.map(v => v.version),
              defaultVersion: this.DEFAULT_VERSION,
            }
          )
        );
      }

      // Check if version is sunset
      const config = this.getVersionConfig(requestedVersion);
      if (config?.sunsetDate && new Date() > config.sunsetDate) {
        return res.status(410).json(
          ApiResponseBuilder.genericError(
            'VERSION_SUNSET',
            'API_VERSION_SUNSET',
            `API version ${requestedVersion} has been sunset and is no longer available`,
            {
              sunsetDate: config.sunsetDate,
              migrationGuide: config.migrationGuide,
            }
          )
        );
      }

      // Set version information in request
      (req as VersionedRequest).apiVersion = requestedVersion;
      (req as VersionedRequest).versionConfig = config;

      // Set response headers
      res.set('API-Version', requestedVersion);
      res.set('Supported-Versions', this.SUPPORTED_VERSIONS.map(v => v.version).join(', '));

      // Add deprecation headers if applicable
      if (config?.deprecated) {
        res.set('Deprecation', 'true');
        if (config.sunsetDate) {
          res.set('Sunset', config.sunsetDate.toISOString());
        }
        if (config.migrationGuide) {
          res.set('Link', `<${config.migrationGuide}>; rel="migration-guide"`);
        }
      }

      return next();
    };
  }

  /**
   * Creates a versioned route handler
   */
  static createVersionedHandler(handlers: VersionedEndpoint): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      const version = (req as VersionedRequest).apiVersion ?? this.DEFAULT_VERSION;

      // Find the best matching handler
      let handler = handlers[version];

      // If exact version not found, try to find compatible version
      if (!handler) {
        // Try to find the highest compatible version
        const availableVersions = Object.keys(handlers).sort().reverse();
        for (const availableVersion of availableVersions) {
          if (this.isVersionCompatible(version, availableVersion)) {
            handler = handlers[availableVersion];
            break;
          }
        }
      }

      // If still no handler found, use default
      handler ??= handlers[this.DEFAULT_VERSION];

      if (!handler) {
        return res
          .status(501)
          .json(
            ApiResponseBuilder.genericError(
              'NOT_IMPLEMENTED',
              'VERSION_NOT_IMPLEMENTED',
              `This endpoint is not implemented for API version ${version}`,
              { requestedVersion: version }
            )
          );
      }

      // Execute the handler
      return handler(req, res, next);
    };
  }

  /**
   * Checks version compatibility (semantic versioning)
   */
  private static isVersionCompatible(requestedVersion: string, availableVersion: string): boolean {
    const [reqMajor, reqMinor = 0] = requestedVersion.split('.').map(Number);
    const [availMajor, availMinor = 0] = availableVersion.split('.').map(Number);

    // Same major version and available minor >= requested minor
    return availMajor === reqMajor && (availMinor ?? 0) >= (reqMinor ?? 0);
  }

  /**
   * Creates middleware to log version usage for analytics
   */
  static createVersionAnalyticsMiddleware(): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction): void => {
      const version = (req as VersionedRequest).apiVersion;
      const config = (req as VersionedRequest).versionConfig;

      // Log version usage (could be sent to analytics service)
      console.log(`API Version Usage: ${version}`, {
        endpoint: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        deprecated: config?.deprecated,
        timestamp: new Date().toISOString(),
      });

      next();
    };
  }

  /**
   * Creates content negotiation middleware for different response formats
   */
  static createContentNegotiationMiddleware(): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction): void => {
      const version = (req as VersionedRequest).apiVersion;
      const acceptHeader = req.get('Accept') ?? 'application/json';

      // Set response format based on version and accept header
      if (version === '2.0' && acceptHeader.includes('application/vnd.api+json')) {
        (req as VersionedRequest).responseFormat = 'jsonapi';
      } else if (acceptHeader.includes('application/hal+json')) {
        (req as VersionedRequest).responseFormat = 'hal';
      } else {
        (req as VersionedRequest).responseFormat = 'standard';
      }

      next();
    };
  }

  /**
   * Gets all supported versions with their status
   */
  static getVersionsWithStatus(): Array<VersionConfig & { status: string }> {
    const now = new Date();

    return this.SUPPORTED_VERSIONS.map(config => ({
      ...config,
      status: this.getVersionStatus(config, now),
    }));
  }

  private static getVersionStatus(config: VersionConfig, now: Date): string {
    if (config.sunsetDate && now > config.sunsetDate) {
      return 'sunset';
    }
    if (config.deprecated) {
      return 'deprecated';
    }
    return 'active';
  }
}

/**
 * Utility functions for version-specific response formatting
 */
export class VersionedResponseFormatter {
  static formatResponse(data: unknown, version: string, format: string = 'standard'): unknown {
    switch (format) {
      case 'jsonapi':
        return this.formatJsonApi(data, version);
      case 'hal':
        return this.formatHal(data as Record<string, unknown>, version);
      default:
        return this.formatStandard(data, version);
    }
  }

  private static formatStandard(data: unknown, _version: string): unknown {
    // Standard format used by ApiResponseBuilder
    return data;
  }

  private static formatJsonApi(data: unknown, version: string): unknown {
    // JSON:API specification format
    return {
      jsonapi: { version: '1.0' },
      data: Array.isArray(data)
        ? (data as unknown[]).map(item => this.formatJsonApiResource(item as Record<string, unknown>))
        : this.formatJsonApiResource((data as Record<string, unknown>) ?? {}),
      meta: {
        apiVersion: version,
      },
    };
  }

  private static formatJsonApiResource(item: Record<string, unknown>): Record<string, unknown> {
    const { id, type, ...attributes } = item;
    return {
      type: (type as string) ?? 'resource',
      id: id as string,
      attributes,
      links: {
        self: `/api/resource/${id}`,
      },
    };
  }

  private static formatHal(data: Record<string, unknown>, version: string): Record<string, unknown> {
    // HAL (Hypertext Application Language) format
    return {
      ...data,
      _links: {
        self: { href: (data as { selfLink?: string }).selfLink ?? '#' },
      },
      _meta: {
        apiVersion: version,
      },
    };
  }
}

// Extend Express Request interface using module augmentation to avoid namespaces
declare module 'express-serve-static-core' {
  interface Request {
    apiVersion?: string;
    versionConfig?: VersionConfig;
    responseFormat?: string;
  }
}

export default ApiVersionManager;
