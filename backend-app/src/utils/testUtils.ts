/**
 * Test Utilities
 * Provides common testing utilities and mocks for the blockchain EMR system
 */

import { Pool, PoolConnection } from 'mysql2/promise';

// Mock interfaces
interface MockTrainingData {
  features: number[][];
  labels: number[];
}

interface MockModelWeights {
  layers: number[][][];
}

interface MockPrivacyConfig {
  differentialPrivacy: {
    epsilon: number;
    delta: number;
  };
  homomorphicEncryption: {
    keySize: number;
    scheme: string;
  };
}

interface MockAggregationConfig {
  threshold: number;
  participants: string[];
  protocol: string;
}

interface MockPerformanceMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  application: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

interface MockSecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  source: string;
  details: {
    userId: string;
    ipAddress: string;
    userAgent: string;
  };
}

interface MockAuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  details: {
    recordType: string;
    accessReason: string;
  };
}

interface MockBlockchainTransaction {
  transactionId: string;
  blockNumber: number;
  timestamp: Date;
  gasUsed: number;
  status: 'pending' | 'confirmed' | 'failed';
}

interface MockFHIRResource {
  resourceType: string;
  id: string;
  meta: {
    versionId: string;
    lastUpdated: string;
  };
  [key: string]: unknown;
}

interface MockCrossChainTransaction {
  id: string;
  sourceChain: string;
  targetChain: string;
  sourceTransactionHash: string;
  targetTransactionHash: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
}

interface MockHSMConfig {
  provider: string;
  keyId: string;
  algorithm: string;
  keySize: number;
}

interface TestDataOptions {
  seed?: number;
  size?: number;
  dimensions?: number;
}

interface FloatArrayComparisonOptions {
  precision?: number;
}

/**
 * Create a mock database pool for testing
 */
export function createMockPool(): Pool {
  const mockConnection = {
    execute: jest.fn().mockResolvedValue([[], {}]),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  } as unknown as PoolConnection;

  const mockPool = {
    getConnection: jest.fn().mockResolvedValue(mockConnection),
    execute: jest.fn().mockResolvedValue([[], {}]),
    end: jest.fn().mockResolvedValue(undefined),
    config: {
      connectionLimit: 10,
    },
    pool: {
      _allConnections: [],
      _freeConnections: [],
      _connectionQueue: [],
    },
  } as unknown as Pool;

  return mockPool;
}

/**
 * Create mock federated learning data
 */
export function createMockTrainingData(options: TestDataOptions = {}): MockTrainingData {
  const { size = 100, dimensions = 3 } = options;
  const features: number[][] = [];
  const labels: number[] = [];

  for (let i = 0; i < size; i++) {
    const feature = Array.from({ length: dimensions }, () => Math.random());
    features.push(feature);
    labels.push(Math.random() > 0.5 ? 1 : 0);
  }

  return { features, labels };
}

/**
 * Create mock model weights
 */
export function createMockModelWeights(layers: number = 3): MockModelWeights {
  const weights: number[][][] = [];

  for (let i = 0; i < layers; i++) {
    const layerSize = Math.floor(Math.random() * 10) + 5;
    const inputSize = Math.floor(Math.random() * 10) + 5;
    const layerWeights: number[][] = [];

    for (let j = 0; j < layerSize; j++) {
      const neuronWeights = Array.from({ length: inputSize }, () => Math.random() - 0.5);
      layerWeights.push(neuronWeights);
    }

    weights.push(layerWeights);
  }

  return { layers: weights };
}

/**
 * Create mock privacy configuration
 */
export function createMockPrivacyConfig(): MockPrivacyConfig {
  return {
    differentialPrivacy: {
      epsilon: 0.1,
      delta: 1e-5,
    },
    homomorphicEncryption: {
      keySize: 2048,
      scheme: 'CKKS',
    },
  };
}

/**
 * Create mock secure aggregation configuration
 */
export function createMockAggregationConfig(): MockAggregationConfig {
  return {
    threshold: 3,
    participants: ['participant1', 'participant2', 'participant3', 'participant4'],
    protocol: 'SecAgg',
  };
}

/**
 * Generate deterministic test data for reproducible tests
 */
export function generateDeterministicTestData(options: TestDataOptions = {}): MockTrainingData {
  const { seed = 12345, size = 100, dimensions = 3 } = options;

  // Simple linear congruential generator for deterministic randomness
  let currentSeed = seed;
  const random = (): number => {
    currentSeed = (currentSeed * 1664525 + 1013904223) % Math.pow(2, 32);
    return currentSeed / Math.pow(2, 32);
  };

  const features: number[][] = [];
  const labels: number[] = [];

  for (let i = 0; i < size; i++) {
    const feature = Array.from({ length: dimensions }, () => random());
    features.push(feature);
    labels.push(random() > 0.5 ? 1 : 0);
  }

  return { features, labels };
}

/**
 * Assert that two Float32Arrays are approximately equal
 */
export function expectFloat32ArraysToBeClose(
  actual: Float32Array,
  expected: Float32Array,
  options: FloatArrayComparisonOptions = {}
): void {
  const { precision = 5 } = options;

  expect(actual).toHaveLength(expected.length);

  for (let i = 0; i < actual.length; i++) {
    expect(actual[i]).toBeCloseTo(expected[i] ?? 0, precision);
  }
}

/**
 * Create mock blockchain transaction
 */
export function createMockBlockchainTransaction(): MockBlockchainTransaction {
  return {
    transactionId: `mock-tx-${Math.random().toString(36).substr(2, 9)}`,
    blockNumber: Math.floor(Math.random() * 1000000),
    timestamp: new Date(),
    gasUsed: Math.floor(Math.random() * 100000),
    status: 'confirmed' as const,
  };
}

/**
 * Create mock FHIR resource
 */
export function createMockFHIRResource(resourceType: string = 'Patient'): MockFHIRResource {
  const baseResource: MockFHIRResource = {
    resourceType,
    id: `mock-${resourceType.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`,
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
    },
  };

  switch (resourceType) {
    case 'Patient':
      return {
        ...baseResource,
        name: [
          {
            use: 'official',
            family: 'Doe',
            given: ['John'],
          },
        ],
        gender: 'male',
        birthDate: '1990-01-01',
      };

    case 'Observation':
      return {
        ...baseResource,
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '8480-6',
              display: 'Systolic blood pressure',
            },
          ],
        },
        valueQuantity: {
          value: 120,
          unit: 'mmHg',
        },
      };

    default:
      return baseResource;
  }
}

/**
 * Create mock HSM configuration
 */
export function createMockHSMConfig(): MockHSMConfig {
  return {
    provider: 'AWS CloudHSM',
    keyId: `hsm-key-${Math.random().toString(36).substr(2, 9)}`,
    algorithm: 'RSA',
    keySize: 2048,
  };
}

/**
 * Create mock cross-chain bridge transaction
 */
export function createMockCrossChainTransaction(): MockCrossChainTransaction {
  return {
    id: `bridge-tx-${Math.random().toString(36).substr(2, 9)}`,
    sourceChain: 'ethereum',
    targetChain: 'polygon',
    sourceTransactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    targetTransactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    amount: Math.floor(Math.random() * 1000000),
    status: 'completed' as const,
    timestamp: new Date(),
  };
}

/**
 * Wait for a specified amount of time (for async testing)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create mock performance metrics
 */
export function createMockPerformanceMetrics(): MockPerformanceMetrics {
  return {
    cpu: {
      usage: Math.floor(Math.random() * 100),
      cores: 4,
    },
    memory: {
      used: Math.floor(Math.random() * 8000000000), // 8GB max
      total: 8000000000,
      percentage: Math.floor(Math.random() * 100),
    },
    application: {
      requestsPerSecond: Math.floor(Math.random() * 1000),
      averageResponseTime: Math.floor(Math.random() * 500),
      errorRate: Math.random() * 0.05, // 0-5% error rate
    },
  };
}

/**
 * Create mock security event
 */
export function createMockSecurityEvent(): MockSecurityEvent {
  return {
    id: `security-event-${Math.random().toString(36).substr(2, 9)}`,
    type: 'authentication_failure',
    severity: 'medium' as const,
    timestamp: new Date(),
    source: 'auth-service',
    details: {
      userId: `user-${Math.random().toString(36).substr(2, 9)}`,
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Test Browser)',
    },
  };
}

/**
 * Mock environment variables for testing
 */
export function mockEnvironmentVariables(envVars: Record<string, string>): void {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      ...envVars,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });
}

/**
 * Create mock audit log entry
 */
export function createMockAuditLogEntry(): MockAuditLogEntry {
  return {
    id: `audit-${Math.random().toString(36).substr(2, 9)}`,
    userId: `user-${Math.random().toString(36).substr(2, 9)}`,
    action: 'READ_MEDICAL_RECORD',
    resource: `medical-record-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
    userAgent: 'Mozilla/5.0 (Test Browser)',
    success: true,
    details: {
      recordType: 'patient_data',
      accessReason: 'routine_care',
    },
  };
}

// Export all utility functions as default
export default {
  createMockPool,
  createMockTrainingData,
  createMockModelWeights,
  createMockPrivacyConfig,
  createMockAggregationConfig,
  generateDeterministicTestData,
  expectFloat32ArraysToBeClose,
  createMockBlockchainTransaction,
  createMockFHIRResource,
  createMockHSMConfig,
  createMockCrossChainTransaction,
  wait,
  createMockPerformanceMetrics,
  createMockSecurityEvent,
  mockEnvironmentVariables,
  createMockAuditLogEntry,
};

// Export types
export type {
  MockTrainingData,
  MockModelWeights,
  MockPrivacyConfig,
  MockAggregationConfig,
  MockPerformanceMetrics,
  MockSecurityEvent,
  MockAuditLogEntry,
  MockBlockchainTransaction,
  MockFHIRResource,
  MockCrossChainTransaction,
  MockHSMConfig,
  TestDataOptions,
  FloatArrayComparisonOptions,
};
