/**
 * Utilities and Models Tests for High Coverage
 * Tests all utility functions and model classes
 */

// @ts-nocheck - Disable TypeScript checking for Jest mock type issues
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock external dependencies
jest.mock('winston', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue(Buffer.from('test-random-bytes')),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mocked-hash'),
  }),
}));

describe('Utilities and Models Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up test environment
    process.env["NODE_ENV"] = 'test';
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('AppError Utility', () => {
    test('should create AppError with message and status code', async () => {
      const { AppError } = await import('../../src/utils/AppError');

      const error = new AppError('Test error message', 400);

      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    test('should create AppError with default status code', async () => {
      const { AppError } = await import('../../src/utils/AppError');

      const error = new AppError('Test error message');

      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(500);
    });

    test('should be instance of Error', async () => {
      const { AppError } = await import('../../src/utils/AppError');

      const error = new AppError('Test error message', 400);

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });
  });

  describe('EnhancedAppError Utility', () => {
    test('should create enhanced error with additional context', async () => {
      const { EnhancedAppError } = await import('../../src/utils/EnhancedAppError');

      const context = {
        userId: 'user-123',
        operation: 'createRecord',
        timestamp: new Date(),
      };

      const error = new EnhancedAppError('Enhanced error message', 400, context);

      expect(error.message).toBe('Enhanced error message');
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual(context);
    });

    test('should serialize error to JSON', async () => {
      const { EnhancedAppError } = await import('../../src/utils/EnhancedAppError');

      const error = new EnhancedAppError('Test error', 400, { userId: 'user-123' });
      const serialized = error.toJSON();

      expect(serialized.message).toBe('Test error');
      expect(serialized.statusCode).toBe(400);
      expect(serialized.context).toEqual({ userId: 'user-123' });
    });
  });

  describe('ApiResponseBuilder Utility', () => {
    test('should build success response', async () => {
      const { ApiResponseBuilder } = await import('../../src/utils/ApiResponseBuilder');

      const response = ApiResponseBuilder.success('Operation successful', { id: 123 });

      expect(response.success).toBe(true);
      expect(response.message).toBe('Operation successful');
      expect(response.data).toEqual({ id: 123 });
      expect(response.timestamp).toBeDefined();
    });

    test('should build error response', async () => {
      const { ApiResponseBuilder } = await import('../../src/utils/ApiResponseBuilder');

      const response = ApiResponseBuilder.error('Operation failed', 400);

      expect(response.success).toBe(false);
      expect(response.message).toBe('Operation failed');
      expect(response.statusCode).toBe(400);
      expect(response.timestamp).toBeDefined();
    });

    test('should build validation error response', async () => {
      const { ApiResponseBuilder } = await import('../../src/utils/ApiResponseBuilder');

      const errors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' },
      ];

      const response = ApiResponseBuilder.validationError(errors);

      expect(response.success).toBe(false);
      expect(response.statusCode).toBe(400);
      expect(response.errors).toEqual(errors);
    });

    test('should build paginated response', async () => {
      const { ApiResponseBuilder } = await import('../../src/utils/ApiResponseBuilder');

      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const pagination = {
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1,
      };

      const response = ApiResponseBuilder.paginated(data, pagination);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.pagination).toEqual(pagination);
    });
  });

  describe('InputSanitizer Utility', () => {
    test('should sanitize HTML input', async () => {
      const { InputSanitizer } = await import('../../src/utils/InputSanitizer');

      const dirtyInput = '<script>alert("xss")</script>Hello World';
      const sanitized = InputSanitizer.sanitizeHtml(dirtyInput);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello World');
    });

    test('should sanitize SQL input', async () => {
      const { InputSanitizer } = await import('../../src/utils/InputSanitizer');

      const dirtyInput = "'; DROP TABLE users; --";
      const sanitized = InputSanitizer.sanitizeSql(dirtyInput);

      expect(sanitized).not.toContain('DROP TABLE');
      expect(typeof sanitized).toBe('string');
    });

    test('should validate email format', async () => {
      const { InputSanitizer } = await import('../../src/utils/InputSanitizer');

      expect(InputSanitizer.isValidEmail('test@example.com')).toBe(true);
      expect(InputSanitizer.isValidEmail('invalid-email')).toBe(false);
      expect(InputSanitizer.isValidEmail('')).toBe(false);
    });

    test('should validate phone number format', async () => {
      const { InputSanitizer } = await import('../../src/utils/InputSanitizer');

      expect(InputSanitizer.isValidPhone('+1234567890')).toBe(true);
      expect(InputSanitizer.isValidPhone('123-456-7890')).toBe(true);
      expect(InputSanitizer.isValidPhone('invalid-phone')).toBe(false);
    });

    test('should escape special characters', async () => {
      const { InputSanitizer } = await import('../../src/utils/InputSanitizer');

      const input = 'Hello "World" & <Test>';
      const escaped = InputSanitizer.escapeSpecialChars(input);

      expect(escaped).toContain('&quot;');
      expect(escaped).toContain('&amp;');
      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
    });
  });

  describe('SecureQueryBuilder Utility', () => {
    test('should build secure SELECT query', async () => {
      const { SecureQueryBuilder } = await import('../../src/utils/SecureQueryBuilder');

      const query = SecureQueryBuilder.select(['id', 'name', 'email'])
        .from('users')
        .where('status = ?', ['active'])
        .build();

      expect(query.sql).toContain('SELECT id, name, email FROM users');
      expect(query.sql).toContain('WHERE status = ?');
      expect(query.params).toEqual(['active']);
    });

    test('should build secure INSERT query', async () => {
      const { SecureQueryBuilder } = await import('../../src/utils/SecureQueryBuilder');

      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        status: 'active',
      };

      const query = SecureQueryBuilder.insert('users', data).build();

      expect(query.sql).toContain('INSERT INTO users');
      expect(query.sql).toContain('(name, email, status)');
      expect(query.sql).toContain('VALUES (?, ?, ?)');
      expect(query.params).toEqual(['John Doe', 'john@example.com', 'active']);
    });

    test('should build secure UPDATE query', async () => {
      const { SecureQueryBuilder } = await import('../../src/utils/SecureQueryBuilder');

      const data = { name: 'Jane Doe', status: 'inactive' };

      const query = SecureQueryBuilder.update('users', data).where('id = ?', [123]).build();

      expect(query.sql).toContain('UPDATE users SET');
      expect(query.sql).toContain('name = ?, status = ?');
      expect(query.sql).toContain('WHERE id = ?');
      expect(query.params).toEqual(['Jane Doe', 'inactive', 123]);
    });

    test('should build secure DELETE query', async () => {
      const { SecureQueryBuilder } = await import('../../src/utils/SecureQueryBuilder');

      const query = SecureQueryBuilder.delete('users').where('status = ?', ['inactive']).build();

      expect(query.sql).toContain('DELETE FROM users');
      expect(query.sql).toContain('WHERE status = ?');
      expect(query.params).toEqual(['inactive']);
    });

    test('should prevent SQL injection', async () => {
      const { SecureQueryBuilder } = await import('../../src/utils/SecureQueryBuilder');

      const maliciousInput = "'; DROP TABLE users; --";

      const query = SecureQueryBuilder.select(['*'])
        .from('users')
        .where('name = ?', [maliciousInput])
        .build();

      expect(query.sql).not.toContain('DROP TABLE');
      expect(query.params).toEqual([maliciousInput]);
    });
  });

  describe('User Model', () => {
    test('should create user instance with valid data', async () => {
      const { User } = await import('../../src/models/User');

      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'doctor',
      };

      const user = new User(userData);

      expect(user.id).toBe('user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.getFullName()).toBe('John Doe');
    });

    test('should validate user data', async () => {
      const { User } = await import('../../src/models/User');

      const validData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'doctor',
      };

      const user = new User(validData);
      const isValid = user.validate();

      expect(isValid).toBe(true);
    });

    test('should serialize user to JSON', async () => {
      const { User } = await import('../../src/models/User');

      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'doctor',
      };

      const user = new User(userData);
      const json = user.toJSON();

      expect(json.id).toBe('user-123');
      expect(json.email).toBe('test@example.com');
      expect(json.password).toBeUndefined(); // Should not include password
    });
  });

  describe('MedicalRecord Model', () => {
    test('should create medical record instance', async () => {
      const { MedicalRecord } = await import('../../src/models/MedicalRecord');

      const recordData = {
        id: 'record-123',
        patientId: 'patient-456',
        doctorId: 'doctor-789',
        recordType: 'diagnosis',
        content: 'Patient diagnosis details',
      };

      const record = new MedicalRecord(recordData);

      expect(record.id).toBe('record-123');
      expect(record.patientId).toBe('patient-456');
      expect(record.recordType).toBe('diagnosis');
    });

    test('should validate medical record data', async () => {
      const { MedicalRecord } = await import('../../src/models/MedicalRecord');

      const validData = {
        patientId: 'patient-456',
        doctorId: 'doctor-789',
        recordType: 'diagnosis',
        content: 'Valid medical record content',
      };

      const record = new MedicalRecord(validData);
      const isValid = record.validate();

      expect(isValid).toBe(true);
    });

    test('should encrypt sensitive data', async () => {
      const { MedicalRecord } = await import('../../src/models/MedicalRecord');

      const recordData = {
        patientId: 'patient-456',
        doctorId: 'doctor-789',
        recordType: 'diagnosis',
        content: 'Sensitive medical information',
      };

      const record = new MedicalRecord(recordData);
      const encrypted = record.encrypt();

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(recordData.content);
    });
  });
});
