/* eslint-disable import/order */

/**
 * Test Data Generator - Generates test data for integration tests
 */


import crypto from 'crypto';

export interface TestUser {
  userId: string;
  patientId: string;
  email: string;
  role: string;
  token: string;
}

export interface TestFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface TestMedicalRecord {
  recordId: string;
  patientId: string;
  creatorId: string;
  recordType: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
}

export interface TestBlockchainTransaction {
  txId: string;
  blockNumber: number;
  gasUsed: number;
  status: string;
}

export interface TestIPFSMetadata {
  cid: string;
  size: number;
  pinned: boolean;
  uploadedAt: string;
}

/**
 * Generate test user data
 */
export async function generateTestUser(role: string = 'patient'): Promise<TestUser> {
  const userId = `test-user-${Date.now()}`;
  const patientId = `test-patient-${Date.now()}`;
  const email = `test-${Date.now()}@example.com`;
  const token = generateTestJWT(userId, role);

  // Mock user creation in database (no-op)

  return {
    userId,
    patientId,
    email,
    role,
    token,
  };
}

/**
 * Generate test file data
 */
export function generateTestFile(
  filename: string = 'test-file.txt',
  mimetype: string = 'text/plain'
): TestFile {
  const content = `Test file content for ${filename} - ${Date.now()}`;
  const buffer = Buffer.from(content, 'utf8');

  return {
    buffer,
    originalname: filename,
    mimetype,
    size: buffer.length,
  };
}

/**
 * Generate test JWT token
 */
export function generateTestJWT(userId: string, role: string): string {
  const header = Buffer.from(
    JSON.stringify({
      alg: 'HS256',
      typ: 'JWT',
    })
  ).toString('base64');

  const payload = Buffer.from(
    JSON.stringify({
      userId,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString('base64');

  const signature = crypto
    .createHmac('sha256', 'test-jwt-secret')
    .update(`${header}.${payload}`)
    .digest('base64');

  return `${header}.${payload}.${signature}`;
}

/**
 * Generate test medical record data
 */
export function generateTestMedicalRecord(
  options: Partial<TestMedicalRecord> = {}
): TestMedicalRecord {
  const recordId = options.recordId ?? `test-record-${Date.now()}`;
  const patientId = options.patientId ?? `test-patient-${Date.now()}`;
  const creatorId = options.creatorId ?? `test-doctor-${Date.now()}`;

  return {
    recordId,
    patientId,
    creatorId,
    recordType: options.recordType ?? 'diagnosis',
    title: options.title ?? 'Test Medical Record',
    description: options.description ?? 'Generated test medical record',
    status: options.status ?? 'active',
    createdAt: options.createdAt ?? new Date().toISOString(),
  };
}

/**
 * Generate test blockchain transaction data
 */
export function generateTestBlockchainTransaction(): TestBlockchainTransaction {
  return {
    txId: `0xtest${crypto.randomBytes(16).toString('hex')}`,
    blockNumber: Math.floor(Math.random() * 1000000),
    gasUsed: Math.floor(Math.random() * 100000),
    status: 'confirmed',
  };
}

/**
 * Generate test IPFS metadata
 */
export function generateTestIPFSMetadata(): TestIPFSMetadata {
  return {
    cid: `QmTest${crypto.randomBytes(16).toString('hex')}`,
    size: Math.floor(Math.random() * 1000000),
    pinned: true,
    uploadedAt: new Date().toISOString(),
  };
}

interface TestDatabasePool {
  execute: jest.Mock;
  query: jest.Mock;
  getConnection: jest.Mock;
  end: jest.Mock;
}

/**
 * Generate test database connection pool mock
 */
export function generateTestDatabasePool(): TestDatabasePool {
  return {
    execute: jest.fn(),
    query: jest.fn(),
    getConnection: jest.fn(),
    end: jest.fn(),
  };
}

interface TestError extends Error {
  code: string;
  statusCode: number;
}

/**
 * Generate test error object
 */
export function generateTestError(
  message: string = 'Test error',
  code: string = 'TEST_ERROR'
): TestError {
  const error = new Error(message) as TestError;
  error.code = code;
  error.statusCode = 500;
  return error;
}

interface TestPaginationOptions {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Generate test pagination options
 */
export function generateTestPaginationOptions(page: number = 1, limit: number = 10): TestPaginationOptions {
  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

interface TestSearchFilters {
  patientId: string;
  recordType: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

/**
 * Generate test search filters
 */
export function generateTestSearchFilters(): TestSearchFilters {
  return {
    patientId: `test-patient-${Date.now()}`,
    recordType: 'diagnosis',
    status: 'active',
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    dateTo: new Date().toISOString(),
  };
}

/**
 * Clean up test data
 */
export async function cleanupTestData(): Promise<void> {
  // Implementation for cleaning up test data
  console.log('Cleaning up test data...');
}
