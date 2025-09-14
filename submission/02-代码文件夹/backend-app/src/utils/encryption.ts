/**
 * Encryption Utilities
 * Provides comprehensive cryptographic functions for the blockchain EMR system
 */

import * as crypto from 'crypto';

import * as bcrypt from 'bcrypt';

// Constants
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  authTag: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * Generate a random encryption key
 */
export function generateKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Generate a cryptographically secure salt
 */
export function generateSalt(): string {
  return crypto.randomBytes(SALT_LENGTH).toString('hex');
}

/**
 * Generate cryptographically secure random bytes
 */
export function secureRandomBytes(length: number): Buffer {
  return crypto.randomBytes(length);
}

/**
 * Derive a key from password using PBKDF2
 */
export function deriveKey(password: string, salt: string, iterations: number = 100000): string {
  return crypto.pbkdf2Sync(password, salt, iterations, KEY_LENGTH, 'sha256').toString('hex');
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(data: string, key: string): EncryptionResult {
  const keyBuffer = Buffer.from(key, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(data, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(encryptedData: string, key: string, iv: string, authTag: string): string {
  const keyBuffer = Buffer.from(key, 'hex');
  const ivBuffer = Buffer.from(iv, 'hex');
  const authTagBuffer = Buffer.from(authTag, 'hex');
  const encryptedBuffer = Buffer.from(encryptedData, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
  decipher.setAuthTag(authTagBuffer);

  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Generate RSA key pair
 */
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return { publicKey, privateKey };
}

/**
 * Encrypt data with RSA public key
 */
export function encryptWithPublicKey(data: string, publicKey: string): string {
  const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(data, 'utf8'));
  return encrypted.toString('base64');
}

/**
 * Decrypt data with RSA private key
 */
export function decryptWithPrivateKey(encryptedData: string, privateKey: string): string {
  const decrypted = crypto.privateDecrypt(privateKey, Buffer.from(encryptedData, 'base64'));
  return decrypted.toString('utf8');
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string, saltRounds: number = 12): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create HMAC signature
 */
export function createHMAC(data: string, secret: string, algorithm: string = 'sha256'): string {
  return crypto.createHmac(algorithm, secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyHMAC(
  data: string,
  secret: string,
  signature: string,
  algorithm: string = 'sha256'
): boolean {
  const expectedSignature = createHMAC(data, secret, algorithm);
  return constantTimeCompare(signature, expectedSignature);
}

/**
 * Constant time string comparison to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
