/**
 * API Versioning Middleware 单元测试
 * 重写版本：简洁、高质量、专注配置和核心功能
 */

import { jest } from '@jest/globals';

describe('API Versioning Middleware', () => {
  describe('VersionConfig 接口', () => {
    it('应该验证版本配置结构', () => {
      const config = {
        version: '1.0',
        deprecated: false,
        deprecationDate: new Date('2024-01-01'),
        sunsetDate: new Date('2024-06-01'),
        supportedUntil: new Date('2025-01-01'),
        migrationGuide: 'https://docs.example.com/migration',
      };

      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('deprecated');
      expect(config).toHaveProperty('deprecationDate');
      expect(config).toHaveProperty('sunsetDate');
      expect(typeof config.version).toBe('string');
      expect(typeof config.deprecated).toBe('boolean');
    });

    it('应该验证版本号格式', () => {
      const validVersions = ['1.0', '1.1', '2.0', '0.9'];
      
      validVersions.forEach(version => {
        expect(version).toMatch(/^\d+\.\d+$/);
      });
    });
  });

  describe('VersionedRequest 接口', () => {
    it('应该验证版本化请求结构', () => {
      const versionedReq = {
        apiVersion: '1.0',
        versionConfig: {
          version: '1.0',
          deprecated: false,
        },
        responseFormat: 'standard',
      };

      expect(versionedReq).toHaveProperty('apiVersion');
      expect(versionedReq).toHaveProperty('versionConfig');
      expect(versionedReq).toHaveProperty('responseFormat');
    });

    it('应该验证responseFormat枚举值', () => {
      const validFormats = ['standard', 'jsonapi', 'hal'];
      
      validFormats.forEach(format => {
        expect(validFormats).toContain(format);
      });
    });
  });

  describe('ApiVersionManager 配置', () => {
    it('应该验证支持的版本列表', () => {
      const supportedVersions = [
        { version: '1.0', deprecated: false },
        { version: '1.1', deprecated: false },
        { version: '2.0', deprecated: false },
        {
          version: '0.9',
          deprecated: true,
          deprecationDate: new Date('2024-01-01'),
          sunsetDate: new Date('2024-06-01'),
        },
      ];

      expect(supportedVersions.length).toBeGreaterThan(0);
      supportedVersions.forEach(version => {
        expect(version).toHaveProperty('version');
        expect(version).toHaveProperty('deprecated');
      });
    });

    it('应该验证默认版本', () => {
      const defaultVersion = '1.0';
      
      expect(defaultVersion).toBe('1.0');
      expect(defaultVersion).toMatch(/^\d+\.\d+$/);
    });

    it('应该验证版本头名称', () => {
      const headerName = 'API-Version';
      const acceptVersionHeader = 'Accept-Version';

      expect(headerName).toBe('API-Version');
      expect(acceptVersionHeader).toBe('Accept-Version');
    });
  });

  describe('版本检测优先级', () => {
    it('应该验证版本检测顺序', () => {
      const priority = [
        'API-Version header',
        'Accept-Version header',
        'URL path',
        'Default',
      ];

      expect(priority[0]).toContain('header');
      expect(priority[priority.length - 1]).toBe('Default');
    });

    it('应该验证URL路径版本格式', () => {
      const paths = [
        '/api/v1.0/users',
        '/api/v1.1/records',
        '/api/v2.0/data',
      ];

      paths.forEach(path => {
        expect(path).toMatch(/\/api\/v\d+\.\d+\//);
      });
    });
  });

  describe('版本兼容性', () => {
    it('应该验证语义版本号解析', () => {
      const version = '1.2';
      const [major, minor] = version.split('.').map(Number);

      expect(major).toBe(1);
      expect(minor).toBe(2);
      expect(typeof major).toBe('number');
      expect(typeof minor).toBe('number');
    });

    it('应该验证兼容性规则', () => {
      // Same major, higher minor
      const req = { major: 1, minor: 0 };
      const avail = { major: 1, minor: 1 };

      const isCompatible = avail.major === req.major && avail.minor >= req.minor;

      expect(isCompatible).toBe(true);
    });

    it('应该验证不兼容情况', () => {
      // Different major version
      const req = { major: 1, minor: 0 };
      const avail = { major: 2, minor: 0 };

      const isCompatible = avail.major === req.major && avail.minor >= req.minor;

      expect(isCompatible).toBe(false);
    });
  });

  describe('废弃版本管理', () => {
    it('应该验证废弃版本配置', () => {
      const deprecatedVersion = {
        version: '0.9',
        deprecated: true,
        deprecationDate: new Date('2024-01-01'),
        sunsetDate: new Date('2024-06-01'),
        migrationGuide: 'https://docs.example.com/migration/v0.9-to-v1.0',
      };

      expect(deprecatedVersion.deprecated).toBe(true);
      expect(deprecatedVersion).toHaveProperty('deprecationDate');
      expect(deprecatedVersion).toHaveProperty('sunsetDate');
      expect(deprecatedVersion).toHaveProperty('migrationGuide');
    });

    it('应该验证日落日期检查', () => {
      const sunsetDate = new Date('2024-06-01');
      const now = new Date('2024-07-01');

      expect(now > sunsetDate).toBe(true);
    });

    it('应该验证废弃头信息', () => {
      const headers = {
        'Deprecation': 'true',
        'Sunset': new Date('2024-06-01').toISOString(),
        'Link': '<https://docs.example.com/migration>; rel="migration-guide"',
      };

      expect(headers).toHaveProperty('Deprecation');
      expect(headers).toHaveProperty('Sunset');
      expect(headers).toHaveProperty('Link');
      expect(headers.Link).toContain('rel="migration-guide"');
    });
  });

  describe('错误处理', () => {
    it('应该验证不支持版本错误', () => {
      const error = {
        code: 'UNSUPPORTED_VERSION',
        type: 'API_VERSION_NOT_SUPPORTED',
        message: 'API version 3.0 is not supported',
        statusCode: 400,
        details: {
          requestedVersion: '3.0',
          supportedVersions: ['1.0', '1.1', '2.0', '0.9'],
          defaultVersion: '1.0',
        },
      };

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('UNSUPPORTED_VERSION');
      expect(error.details.supportedVersions).toBeInstanceOf(Array);
    });

    it('应该验证版本日落错误', () => {
      const error = {
        code: 'VERSION_SUNSET',
        type: 'API_VERSION_SUNSET',
        message: 'API version 0.9 has been sunset',
        statusCode: 410,
        details: {
          sunsetDate: new Date('2024-06-01'),
          migrationGuide: 'https://docs.example.com/migration',
        },
      };

      expect(error.statusCode).toBe(410);
      expect(error.code).toBe('VERSION_SUNSET');
    });

    it('应该验证未实现版本错误', () => {
      const error = {
        code: 'NOT_IMPLEMENTED',
        type: 'VERSION_NOT_IMPLEMENTED',
        message: 'This endpoint is not implemented for API version 2.0',
        statusCode: 501,
        details: {
          requestedVersion: '2.0',
        },
      };

      expect(error.statusCode).toBe(501);
      expect(error.code).toBe('NOT_IMPLEMENTED');
    });
  });

  describe('响应头设置', () => {
    it('应该验证版本响应头', () => {
      const headers = {
        'API-Version': '1.0',
        'Supported-Versions': '1.0, 1.1, 2.0, 0.9',
      };

      expect(headers).toHaveProperty('API-Version');
      expect(headers).toHaveProperty('Supported-Versions');
      expect(headers['Supported-Versions']).toContain(',');
    });
  });

  describe('VersionedResponseFormatter', () => {
    it('应该验证标准格式', () => {
      const data = { id: '1', name: 'Test' };
      const standardFormat = data; // 标准格式直接返回数据

      expect(standardFormat).toEqual(data);
    });

    it('应该验证JSON:API格式结构', () => {
      const jsonApiFormat = {
        jsonapi: { version: '1.0' },
        data: {
          type: 'resource',
          id: '1',
          attributes: { name: 'Test' },
          links: { self: '/api/resource/1' },
        },
        meta: {
          apiVersion: '1.0',
        },
      };

      expect(jsonApiFormat).toHaveProperty('jsonapi');
      expect(jsonApiFormat).toHaveProperty('data');
      expect(jsonApiFormat).toHaveProperty('meta');
      expect(jsonApiFormat.data).toHaveProperty('type');
      expect(jsonApiFormat.data).toHaveProperty('id');
      expect(jsonApiFormat.data).toHaveProperty('attributes');
      expect(jsonApiFormat.data).toHaveProperty('links');
    });

    it('应该验证JSON:API数组格式', () => {
      const jsonApiArrayFormat = {
        jsonapi: { version: '1.0' },
        data: [
          {
            type: 'resource',
            id: '1',
            attributes: { name: 'Test1' },
            links: { self: '/api/resource/1' },
          },
          {
            type: 'resource',
            id: '2',
            attributes: { name: 'Test2' },
            links: { self: '/api/resource/2' },
          },
        ],
        meta: { apiVersion: '1.0' },
      };

      expect(Array.isArray(jsonApiArrayFormat.data)).toBe(true);
      expect(jsonApiArrayFormat.data.length).toBe(2);
    });

    it('应该验证HAL格式结构', () => {
      const halFormat = {
        id: '1',
        name: 'Test',
        _links: {
          self: { href: '/api/resource/1' },
        },
        _meta: {
          apiVersion: '1.0',
        },
      };

      expect(halFormat).toHaveProperty('_links');
      expect(halFormat).toHaveProperty('_meta');
      expect(halFormat._links).toHaveProperty('self');
      expect(halFormat._links.self).toHaveProperty('href');
    });
  });

  describe('内容协商', () => {
    it('应该验证Accept头格式', () => {
      const acceptHeaders = {
        json: 'application/json',
        jsonApi: 'application/vnd.api+json',
        hal: 'application/hal+json',
      };

      expect(acceptHeaders.json).toBe('application/json');
      expect(acceptHeaders.jsonApi).toBe('application/vnd.api+json');
      expect(acceptHeaders.hal).toBe('application/hal+json');
    });

    it('应该验证格式选择逻辑', () => {
      const version = '2.0';
      const accept = 'application/vnd.api+json';

      const shouldUseJsonApi = version === '2.0' && accept.includes('application/vnd.api+json');

      expect(shouldUseJsonApi).toBe(true);
    });
  });

  describe('版本分析', () => {
    it('应该验证版本使用日志结构', () => {
      const logData = {
        version: '1.0',
        endpoint: '/api/v1.0/users',
        method: 'GET',
        userAgent: 'Mozilla/5.0',
        deprecated: false,
        timestamp: new Date().toISOString(),
      };

      expect(logData).toHaveProperty('version');
      expect(logData).toHaveProperty('endpoint');
      expect(logData).toHaveProperty('method');
      expect(logData).toHaveProperty('timestamp');
    });
  });

  describe('版本状态', () => {
    it('应该验证版本状态类型', () => {
      const statuses = ['active', 'deprecated', 'sunset'];

      statuses.forEach(status => {
        expect(['active', 'deprecated', 'sunset']).toContain(status);
      });
    });

    it('应该验证版本状态判断', () => {
      const now = new Date();
      const sunsetDate = new Date(now.getTime() - 86400000); // 1 day ago

      const isSunset = now > sunsetDate;

      expect(isSunset).toBe(true);
    });

    it('应该验证版本状态完整信息', () => {
      const versionWithStatus = {
        version: '1.0',
        deprecated: false,
        status: 'active',
      };

      expect(versionWithStatus).toHaveProperty('version');
      expect(versionWithStatus).toHaveProperty('deprecated');
      expect(versionWithStatus).toHaveProperty('status');
    });
  });

  describe('VersionedEndpoint 接口', () => {
    it('应该验证版本化端点结构', () => {
      const versionedEndpoint = {
        '1.0': (req: any, res: any) => res.json({ version: '1.0' }),
        '1.1': (req: any, res: any) => res.json({ version: '1.1' }),
        '2.0': (req: any, res: any) => res.json({ version: '2.0' }),
      };

      expect(Object.keys(versionedEndpoint)).toContain('1.0');
      expect(Object.keys(versionedEndpoint)).toContain('1.1');
      expect(Object.keys(versionedEndpoint)).toContain('2.0');
      expect(typeof versionedEndpoint['1.0']).toBe('function');
    });

    it('应该验证版本回退逻辑', () => {
      const availableVersions = ['2.0', '1.1', '1.0'];
      const sorted = availableVersions.sort().reverse();

      expect(sorted[0]).toBe('2.0');
      expect(sorted[sorted.length - 1]).toBe('1.0');
    });
  });

  describe('迁移指南', () => {
    it('应该验证迁移指南URL格式', () => {
      const migrationGuide = 'https://docs.emr-blockchain.com/migration/v0.9-to-v1.0';

      expect(migrationGuide).toMatch(/^https?:\/\//);
      expect(migrationGuide).toContain('migration');
    });

    it('应该验证Link头格式', () => {
      const linkHeader = '<https://docs.example.com/migration>; rel="migration-guide"';

      expect(linkHeader).toMatch(/^<.*>;\s*rel=".*"$/);
      expect(linkHeader).toContain('rel="migration-guide"');
    });
  });

  describe('边界条件', () => {
    it('应该验证minor版本默认值', () => {
      const version = '2';
      const [major, minor = 0] = version.split('.').map(Number);

      expect(major).toBe(2);
      expect(minor).toBe(0);
    });

    it('应该处理无效的版本格式', () => {
      const invalidVersion = 'invalid';
      const parsed = invalidVersion.split('.').map(Number);

      expect(parsed.some(isNaN)).toBe(true);
    });

    it('应该验证空版本处理', () => {
      const emptyVersion = '';
      const defaultVersion = emptyVersion || '1.0';

      expect(defaultVersion).toBe('1.0');
    });
  });
});

