/**
 * IoTIntegrationService 单元测试
 */

import {
  IoTIntegrationService,
  IoTDevice,
  MedicalDeviceData,
  DeviceAlert,
  MeasurementData,
  DataQuality,
} from '../../src/services/IoTIntegrationService';
import { Pool, RowDataPacket } from 'mysql2/promise';
import winston from 'winston';
import NodeCache from 'node-cache';
import WebSocket from 'ws';
import { MedicalRecordService } from '../../src/services/MedicalRecordService';
import { AuditService } from '../../src/services/AuditService';
import { NotificationService } from '../../src/services/NotificationService';
import { CryptographyService } from '../../src/services/CryptographyService';

// Mock dependencies
jest.mock('mysql2/promise');
jest.mock('winston');
jest.mock('node-cache');
jest.mock('ws');
jest.mock('../../src/services/MedicalRecordService');
jest.mock('../../src/services/AuditService');
jest.mock('../../src/services/NotificationService');
jest.mock('../../src/services/CryptographyService');
// Mock UUID module globally
const mockUuid = 'test-uuid-1234';
jest.mock('uuid', () => ({
  v4: jest.fn(() => mockUuid),
}));

// Import the uuid mock for proper typing
import { v4 as uuidv4 } from 'uuid';
const mockedUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe('IoTIntegrationService', () => {
  let service: IoTIntegrationService;
  let mockDb: jest.Mocked<Pool>;
  let mockLogger: jest.Mocked<winston.Logger>;
  let mockCache: jest.Mocked<NodeCache>;
  let mockMedicalRecordService: jest.Mocked<MedicalRecordService>;
  let mockAuditService: jest.Mocked<AuditService>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockCryptoService: jest.Mocked<CryptographyService>;

  beforeEach(() => {
    // Reset UUID mock
    mockedUuidv4.mockReturnValue(mockUuid);

    // Mock database pool
    mockDb = {
      execute: jest.fn(),
      query: jest.fn(),
    } as any;

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    // Mock cache
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      has: jest.fn(),
    } as any;

    (NodeCache as unknown as jest.Mock).mockImplementation(() => mockCache);

    // Mock services
    mockMedicalRecordService = {
      createRecord: jest.fn(),
    } as any;

    mockAuditService = {
      logAction: jest.fn(),
      logDeviceCommand: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockNotificationService = {
      sendAlert: jest.fn(),
      sendTestNotification: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockCryptoService = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    } as any;

    service = new IoTIntegrationService(
      mockDb,
      mockLogger,
      mockMedicalRecordService,
      mockAuditService,
      mockNotificationService,
      mockCryptoService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with all required dependencies', () => {
      expect(service).toBeInstanceOf(IoTIntegrationService);
      expect(NodeCache).toHaveBeenCalledWith({ stdTTL: 3600 });
    });
  });

  describe('registerDevice', () => {
    const mockDeviceInfo = {
      deviceName: 'ECG Monitor 1',
      deviceType: 'ecg' as const,
      manufacturer: 'Philips',
      model: 'IntelliVue MX40',
      serialNumber: 'ECG001',
      firmwareVersion: '1.2.3',
      location: {
        hospital: 'General Hospital',
        department: 'Cardiology',
        room: 'Room 101',
      },
      networkInfo: {
        ipAddress: '192.168.1.100',
        macAddress: '00:11:22:33:44:55',
        protocol: 'MQTT' as const,
        port: 1883,
      },
      capabilities: [
        {
          name: 'Heart Rate',
          type: 'measurement' as const,
          dataType: 'numeric' as const,
          unit: 'bpm',
          range: { min: 30, max: 200 },
          description: 'Heart rate monitoring',
        },
      ],
      configuration: {
        samplingRate: 250,
        encryption: true,
        authentication: true,
        autoCalibration: true,
      },
    };

    it('should register a new device successfully', async () => {
      // Mock database calls: validation check + store device info
      mockDb.execute
        .mockResolvedValueOnce([[], []] as any) // validateDeviceRegistration - no existing device
        .mockResolvedValueOnce([{ insertId: 1 }, []] as any); // storeDeviceInfo - insert new device

      const deviceId = await service.registerDevice(mockDeviceInfo, 'admin-123');

      expect(mockedUuidv4).toHaveBeenCalled();
      expect(deviceId).toBe(mockUuid);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO IOT_DEVICES'),
        expect.arrayContaining([mockUuid, 'ECG Monitor 1', 'ecg', 'Philips'])
      );
      expect(mockAuditService.logDeviceCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          commandId: mockUuid,
          deviceId: mockUuid,
          deviceName: 'ECG Monitor 1',
          command: 'register_device',
          senderId: 'admin-123',
          status: 'sent',
          parameters: expect.objectContaining({
            deviceInfo: expect.objectContaining({
              deviceId: mockUuid,
              deviceName: 'ECG Monitor 1',
            }),
          }),
        })
      );
    });

    it('should handle device registration with missing optional fields', async () => {
      const minimalDeviceInfo = {
        deviceName: 'Simple Monitor',
        deviceType: 'monitor' as const,
        manufacturer: 'Generic',
        model: 'Basic',
        serialNumber: 'MON001',
        firmwareVersion: '1.0.0',
        location: {
          hospital: 'Test Hospital',
          department: 'ICU',
          room: 'Room 1',
        },
        networkInfo: {
          ipAddress: '192.168.1.101',
          macAddress: '00:11:22:33:44:56',
          protocol: 'HTTP' as const,
          port: 80,
        },
        capabilities: [],
        configuration: {
          encryption: false,
          authentication: false,
          autoCalibration: false,
        },
      };

      mockDb.execute.mockResolvedValue([{ insertId: 1 }, []] as any);

      const deviceId = await service.registerDevice(minimalDeviceInfo, 'admin-123');

      expect(deviceId).toBe(mockUuid);
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should handle database errors during registration', async () => {
      const dbError = new Error('Database connection failed');
      mockDb.execute.mockRejectedValue(dbError);

      await expect(service.registerDevice(mockDeviceInfo, 'admin-123')).rejects.toThrow(
        'Database connection failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith('设备注册失败:', dbError);
    });

    it('should validate device information before registration', async () => {
      const invalidDeviceInfo = {
        deviceName: '', // Invalid: empty name
        deviceType: 'invalid' as any,
        manufacturer: 'Test',
        model: 'Test',
        serialNumber: 'TEST001',
        firmwareVersion: '1.0.0',
      };

      await expect(service.registerDevice(invalidDeviceInfo, 'admin-123')).rejects.toThrow();
    });
  });

  describe('getDeviceStatus', () => {
    const mockDevice = {
      device_id: 'device-123',
      device_name: 'ECG Monitor 1',
      device_type: 'ecg',
      manufacturer: 'Philips',
      model: 'IntelliVue MX40',
      serial_number: 'ECG001',
      firmware_version: '1.2.3',
      patient_id: 'patient-123',
      location: JSON.stringify({
        hospital: 'General Hospital',
        department: 'Cardiology',
        room: 'Room 101',
      }),
      network_info: JSON.stringify({
        ipAddress: '192.168.1.100',
        macAddress: '00:11:22:33:44:55',
        protocol: 'MQTT',
        port: 1883,
      }),
      capabilities: JSON.stringify([]),
      configuration: JSON.stringify({}),
      last_heartbeat: new Date(),
      status: 'online',
      battery_level: 85,
      is_active: true,
      registered_by: 'admin-123',
      registered_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should return device status with recent data and alerts', async () => {
      // Seed device in registry (service gets device from registry, not DB)
      (service as any).deviceRegistry.set('device-123', {
        deviceId: 'device-123',
        deviceName: 'ECG Monitor 1',
        deviceType: 'ecg',
        manufacturer: 'Philips',
        model: 'IntelliVue MX40',
        serialNumber: 'ECG001',
        firmwareVersion: '1.2.3',
        location: { hospital: 'General', department: 'Cardiology', room: '101' },
        networkInfo: { ipAddress: '1.1.1.1', macAddress: 'aa', protocol: 'HTTP', port: 80 },
        capabilities: [],
        configuration: { encryption: true, authentication: true, autoCalibration: true },
        lastHeartbeat: new Date(),
        status: 'online',
        isActive: true,
        registeredBy: 'u',
        registeredAt: new Date(),
      });

      const mockRecentData = [
        {
          data_id: 'data-123',
          device_id: 'device-123',
          device_name: 'ECG Monitor 1',
          timestamp: new Date(),
          data_type: 'vitals',
          category: 'cardiac',
          measurements: JSON.stringify([]),
          patient_id: 'patient-123',
          quality: JSON.stringify({ overall: 'good', score: 85 }),
          metadata: JSON.stringify({}),
          is_processed: true,
          created_at: new Date(),
        },
      ];

      const mockAlerts = [
        {
          alert_id: 'alert-123',
          device_id: 'device-123',
          alert_type: 'technical',
          severity: 'warning',
          code: 'LOW_BATTERY',
          message: 'Battery level is low',
          timestamp: new Date(),
          acknowledged: false,
          created_at: new Date(),
        },
      ];

      mockDb.execute
        .mockResolvedValueOnce([mockRecentData, []] as any)
        .mockResolvedValueOnce([mockAlerts, []] as any);

      const result = await service.getDeviceStatus('device-123');

      expect(result).toBeDefined();
      expect(result!.device.deviceId).toBe('device-123');
      expect(result!.device.deviceName).toBe('ECG Monitor 1');
      expect(result!.recentData).toHaveLength(1);
      expect(result!.alerts).toHaveLength(1);
      expect(result!.healthScore).toBeGreaterThan(0);
      expect(result!.healthScore).toBeLessThanOrEqual(100);
    });

    it('should return null for non-existent device', async () => {
      // The service checks deviceRegistry first, which is empty in test setup
      const result = await service.getDeviceStatus('non-existent');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      // Place a device in the registry first so getDeviceStatus proceeds
      (service as any).deviceRegistry.set('device-123', {
        deviceId: 'device-123',
        deviceName: 'Test Device',
        deviceType: 'monitor',
        manufacturer: 'M',
        model: 'X',
        serialNumber: 'S',
        firmwareVersion: '1.0',
        location: { hospital: 'H', department: 'D', room: 'R' },
        networkInfo: { ipAddress: '1.1.1.1', macAddress: 'aa', protocol: 'HTTP', port: 80 },
        capabilities: [],
        configuration: { encryption: false, authentication: false, autoCalibration: false },
        lastHeartbeat: new Date(),
        status: 'online',
        isActive: true,
        registeredBy: 'u',
        registeredAt: new Date(),
      });

      const dbError = new Error('Database error');
      mockDb.execute.mockRejectedValue(dbError);

      // Should not throw - helper methods catch errors and return empty arrays
      const result = await service.getDeviceStatus('device-123');
      expect(result).not.toBeNull();
      expect(result?.recentData).toEqual([]);
      expect(result?.alerts).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getDeviceDataHistory', () => {
    it('should return device data history with pagination', async () => {
      const mockData = [
        {
          data_id: 'data-1',
          device_id: 'device-123',
          device_name: 'ECG Monitor 1',
          timestamp: new Date(),
          data_type: 'vitals',
          category: 'cardiac',
          measurements: JSON.stringify([]),
          quality: JSON.stringify({ overall: 'good', score: 85 }),
          metadata: JSON.stringify({}),
          is_processed: true,
          created_at: new Date(),
        },
      ];

      const mockCount = [{ total: 1 }];

      mockDb.execute
        .mockResolvedValueOnce([mockCount, []] as any)
        .mockResolvedValueOnce([mockData, []] as any);

      const result = await service.getDeviceDataHistory('device-123', {
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].dataId).toBe('data-1');
    });

    it('should apply time range filters', async () => {
      const startTime = new Date('2023-01-01');
      const endTime = new Date('2023-01-02');

      mockDb.execute
        .mockResolvedValueOnce([[{ total: 0 }], []] as any)
        .mockResolvedValueOnce([[], []] as any);

      await service.getDeviceDataHistory('device-123', {
        startTime,
        endTime,
        dataType: 'vitals',
      });

      // SQL is built incrementally; verify constraints are present and params align
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE device_id = ?'),
        expect.arrayContaining(['device-123'])
      );
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('timestamp >='),
        expect.arrayContaining([startTime])
      );
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('timestamp <='),
        expect.arrayContaining([endTime])
      );
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('data_type = ?'),
        expect.arrayContaining(['vitals'])
      );
    });
  });

  describe('sendDeviceCommand', () => {
    it('should send command to online device via WebSocket', async () => {
      // populate registry with online WS device
      (service as any).deviceRegistry.set('device-123', {
        deviceId: 'device-123',
        deviceName: 'ECG Monitor 1',
        deviceType: 'monitor',
        manufacturer: 'M',
        model: 'X',
        serialNumber: 'S',
        firmwareVersion: '1.0',
        location: { hospital: 'H', department: 'D', room: 'R' },
        networkInfo: {
          protocol: 'WebSocket',
          ipAddress: '192.168.1.100',
          macAddress: 'aa',
          port: 8080,
        },
        capabilities: [],
        configuration: { encryption: false, authentication: false, autoCalibration: false },
        lastHeartbeat: new Date(),
        status: 'online',
        isActive: true,
        registeredBy: 'u',
        registeredAt: new Date(),
      });

      const mockWebSocket = {
        send: jest.fn(),
        readyState: WebSocket.OPEN,
      };

      // Mock active connection
      (service as any).activeConnections.set('device-123', mockWebSocket);

      const command = {
        type: 'calibrate',
        parameters: { mode: 'auto' },
        priority: 'normal' as const,
      };

      const result = await service.sendDeviceCommand('device-123', command, 'admin-123');

      expect(result.status).toBe('sent');
      expect(result.commandId).toBe(mockUuid);
      expect(mockWebSocket.send).toHaveBeenCalled();
    });

    it('should handle device not found', async () => {
      const command = {
        type: 'test',
        parameters: {},
        priority: 'normal' as const,
      };

      const result = await service.sendDeviceCommand('non-existent', command, 'admin-123');

      expect(result.status).toBe('failed');
      expect(result.message).toContain('设备不存在: non-existent');
    });

    it('should handle offline device', async () => {
      // place an offline device in deviceRegistry (service uses registry)
      (service as any).deviceRegistry.set('device-123', {
        deviceId: 'device-123',
        deviceName: 'ECG Monitor 1',
        deviceType: 'monitor',
        manufacturer: 'M',
        model: 'X',
        serialNumber: 'S',
        firmwareVersion: '1.0',
        location: { hospital: 'H', department: 'D', room: 'R' },
        networkInfo: { ipAddress: '1.1.1.1', macAddress: 'aa', protocol: 'WebSocket', port: 8080 },
        capabilities: [],
        configuration: { encryption: false, authentication: false, autoCalibration: false },
        lastHeartbeat: new Date(),
        status: 'offline',
        isActive: true,
        registeredBy: 'u',
        registeredAt: new Date(),
      });

      const command = {
        type: 'test',
        parameters: {},
        priority: 'normal' as const,
      };

      const result = await service.sendDeviceCommand('device-123', command, 'admin-123');

      expect(result.status).toBe('failed');
      expect(result.message).toContain('设备离线');
    });
  });

  describe('getIoTStatistics', () => {
    it('should return comprehensive IoT statistics', async () => {
      // Create valid device objects using mockDeviceInfo as template
      const device1 = {
        deviceName: 'ECG Monitor 1',
        deviceType: 'ecg' as const,
        manufacturer: 'Philips',
        model: 'IntelliVue MX40',
        serialNumber: 'ECG001',
        firmwareVersion: '1.2.3',
        location: {
          hospital: 'General Hospital',
          department: 'Cardiology',
          room: 'Room 101',
        },
        networkInfo: {
          ipAddress: '192.168.1.100',
          macAddress: '00:11:22:33:44:55',
          protocol: 'MQTT' as const,
          port: 1883,
        },
        capabilities: [],
        configuration: {
          encryption: true,
          authentication: true,
          autoCalibration: true,
        },
      };

      const device2 = {
        ...device1,
        deviceName: 'ECG Monitor 2',
        serialNumber: 'ECG002',
      };

      const device3 = {
        ...device1,
        deviceName: 'Monitor 1',
        deviceType: 'monitor' as const,
        serialNumber: 'MON001',
      };

      // Mock getIoTStatistics DB calls (4 queries for statistics)
      mockDb.execute
        .mockResolvedValueOnce([
          [
            // data statistics query
            { data_type: 'vitals', count: 600 },
            { data_type: 'imaging', count: 400 },
          ],
          [],
        ] as any)
        .mockResolvedValueOnce([
          [
            // alerts query
            { alert_type: 'technical', count: 5 },
            { alert_type: 'clinical', count: 3 },
          ],
          [],
        ] as any)
        .mockResolvedValueOnce([
          [
            // data quality query
            { quality_level: '"excellent"', count: 70 },
            { quality_level: '"good"', count: 25 },
          ],
          [],
        ] as any)
        .mockResolvedValueOnce([
          [
            // top active devices query
            { device_id: 'device-1', device_name: 'ECG 1', data_count: 200 },
            { device_id: 'device-2', device_name: 'Monitor 1', data_count: 150 },
          ],
          [],
        ] as any);

      // Seed registry directly to ensure unique deviceIds (uuid is mocked to same value)
      (service as any).deviceRegistry.set('dev-1', {
        deviceId: 'dev-1',
        deviceName: device1.deviceName!,
        deviceType: device1.deviceType!,
        manufacturer: device1.manufacturer!,
        model: device1.model!,
        serialNumber: device1.serialNumber!,
        firmwareVersion: device1.firmwareVersion!,
        location: device1.location!,
        networkInfo: device1.networkInfo!,
        capabilities: [],
        configuration: device1.configuration!,
        lastHeartbeat: new Date(),
        status: 'online',
        isActive: true,
        registeredBy: 'test-admin',
        registeredAt: new Date(),
      });
      (service as any).deviceRegistry.set('dev-2', {
        ...(service as any).deviceRegistry.get('dev-1'),
        deviceId: 'dev-2',
        deviceName: device2.deviceName!,
        serialNumber: device2.serialNumber!,
      });
      (service as any).deviceRegistry.set('dev-3', {
        ...(service as any).deviceRegistry.get('dev-1'),
        deviceId: 'dev-3',
        deviceName: device3.deviceName!,
        deviceType: device3.deviceType!,
        serialNumber: device3.serialNumber!,
      });

      const result = await service.getIoTStatistics('day');

      expect(result.totalDevices).toBe(3); // Based on registry size
      expect(result.totalDataPoints).toBe(1000); // 600 + 400
      expect(result.dataByType).toEqual({ vitals: 600, imaging: 400 });
      expect(result.alertsByType).toEqual({ technical: 5, clinical: 3 });
      expect(result.topActiveDevices).toHaveLength(2);
    });

    it('should handle different timeframes', async () => {
      // Mock empty results for simplicity
      mockDb.execute.mockResolvedValue([[], []] as any);

      await service.getIoTStatistics('week');
      await service.getIoTStatistics('month');
      await service.getIoTStatistics('hour');

      expect(mockDb.execute).toHaveBeenCalledTimes(12); // 4 queries × 3 timeframes
    });
  });

  describe('data processing and validation', () => {
    it('should validate device data correctly', () => {
      const validData = {
        deviceId: 'device-123',
        timestamp: new Date().toISOString(),
        dataType: 'vitals',
        measurements: [
          {
            name: 'heart_rate',
            value: 75,
            unit: 'bpm',
            timestamp: new Date(),
          },
        ],
      };

      const isValid = (service as any).validateDeviceData(validData);
      expect(isValid).toBe(true);
    });

    it('should reject invalid device data', () => {
      const invalidData = {
        deviceId: '', // Invalid: empty device ID
        // No timestamp or measurements
        dataType: 'unknown',
      };

      const isValid = (service as any).validateDeviceData(invalidData);
      expect(isValid).toBe(false);
    });

    it('should assess data quality correctly', () => {
      const testData = {
        measurements: [
          {
            name: 'heart_rate',
            value: 75,
            quality: 'good',
            calibrationStatus: 'calibrated',
          },
        ],
        signalStrength: 85,
        batteryLevel: 90,
      };

      const quality = (service as any).assessDataQuality(testData);

      expect(quality.overall).toBeDefined();
      expect(quality.score).toBeGreaterThan(0);
      expect(quality.score).toBeLessThanOrEqual(100);
      expect(quality.factors).toBeDefined();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle WebSocket connection errors', async () => {
      const mockWebSocket = {
        send: jest.fn().mockImplementation(() => {
          throw new Error('Connection lost');
        }),
        readyState: WebSocket.OPEN,
      };

      (service as any).activeConnections.set('device-123', mockWebSocket);

      const mockDevice = {
        device_id: 'device-123',
        status: 'online',
        network_info: JSON.stringify({ protocol: 'WebSocket' }),
      };

      mockDb.execute.mockResolvedValue([[mockDevice], []] as any);

      const command = {
        type: 'test',
        parameters: {},
        priority: 'normal' as const,
      };

      const result = await service.sendDeviceCommand('device-123', command, 'admin-123');

      expect(result.status).toBe('failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle malformed JSON in database fields', async () => {
      // Since service.getDeviceStatus uses deviceRegistry and not DB for device, we'll invoke the private mapper indirectly
      const rowWithBadJson = {
        device_id: 'device-123',
        device_name: 'Test Device',
        device_type: 'monitor',
        manufacturer: 'M',
        model: 'X',
        serial_number: 'S',
        firmware_version: '1.0',
        location: 'invalid-json{',
        network_info: 'also-invalid}',
        capabilities: '[]',
        configuration: '{}',
        last_heartbeat: new Date().toISOString(),
        status: 'online',
        is_active: true,
        registered_by: 'u',
        registered_at: new Date().toISOString(),
      } as any;

      // Directly call private mapper via bracket notation to simulate DB row parsing
      expect(() => (service as any).mapRowToDevice(rowWithBadJson)).toThrow();
      expect(mockLogger.error).not.toHaveBeenCalledWith();
    });
  });
});
