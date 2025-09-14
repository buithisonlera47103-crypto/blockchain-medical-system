/**
 * Authentication & Authorization middleware (compile-safe minimal implementation)
 */

import { Request, Response, NextFunction } from 'express';
import { verify, sign, TokenExpiredError, JsonWebTokenError, SignOptions } from 'jsonwebtoken';

import { enhancedLogger as logger } from '../utils/enhancedLogger';

// Local minimal types to avoid dependency on corrupted global types

export interface EnhancedUser {
  id: string;
  userId: string;
  username: string;
  role: string;
  email: string;
  permissions: string[];
  sessionId: string;
  lastActivity: Date;
}
export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  exp?: number;
  iat?: number;
}
export type AuthenticatedRequest = Request & {
  user?: EnhancedUser;
};

class AuthenticationError extends Error {}
class AuthorizationError extends Error {}

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'your-secret-key';
const JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] ?? '24h';

export function authenticateToken(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        throw new AuthenticationError('Authorization header missing or malformed');
      }
      const token = auth.substring('Bearer '.length);
      const decoded = verify(token, JWT_SECRET) as JWTPayload;

      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        throw new AuthenticationError('Token has expired');
      }

      const anyDecoded = decoded as unknown as { permissions?: string[]; sessionId?: string };
      req.user = {
        id: decoded.userId,
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        email: '',
        permissions: Array.isArray(anyDecoded.permissions) ? anyDecoded.permissions : [],
        sessionId: typeof anyDecoded.sessionId === 'string' && anyDecoded.sessionId.trim() !== '' ? anyDecoded.sessionId : '',
        lastActivity: new Date(),
      };

      logger.debug('Token authenticated successfully', {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
      });

      next();
    } catch (error: unknown) {
      if (error instanceof TokenExpiredError) {
        logger.warn('JWT expired', { error: error.message });
        res
          .status(401)
          .json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
      } else if (error instanceof JsonWebTokenError || error instanceof AuthenticationError) {
        logger.warn('Invalid JWT token', { error: error.message });
        res
          .status(401)
          .json({ success: false, message: 'Invalid token', code: 'INVALID_TOKEN' });
      }
      logger.error('Authentication failed', { error: error instanceof Error ? error.message : String(error) });
      res.status(401).json({ success: false, message: 'Authentication failed' });
    }
  };
}

export function optionalAuth(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
  const mw = authenticateToken();
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const auth = req.headers.authorization;
    if (!auth) { next(); return; }
    mw(req, res, next);
  };
}

export function authorizeRoles(roles: string[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) throw new AuthenticationError('Authentication required');
      if (!roles.includes(req.user.role)) {
        throw new AuthorizationError(`Access denied. Required roles: ${roles.join(', ')}`);
      }
      logger.debug('Role authorization successful', {
        userId: req.user.userId,
        role: req.user.role,
      });
      next();
    } catch (error: unknown) {
      if (error instanceof AuthorizationError) {
        res.status(403).json({ success: false, message: error.message, code: 'FORBIDDEN' });
        return;
      }
      res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  };
}

export function authorizeOwner(getOwnerIdFn: (req: AuthenticatedRequest) => string): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) throw new AuthenticationError('Authentication required');
      const ownerId = getOwnerIdFn(req);
      const isOwner = req.user.userId === ownerId;
      const isAdmin = req.user.role === 'SYSTEM_ADMIN' || req.user.role === 'HOSPITAL_ADMIN';

      if (!isOwner && !isAdmin) {
        throw new AuthorizationError('Access denied. Owner or admin required');
      }

      logger.debug('Owner authorization successful', {
        userId: req.user.userId,
        ownerId,
        isOwner,
        isAdmin,
      });

      next();
    } catch (error: unknown) {
      if (error instanceof AuthorizationError) {
        res.status(403).json({ success: false, message: error.message, code: 'FORBIDDEN' });
        return;
      }
      res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  };
}

export function authenticateApiKey(): (req: Request, res: Response, next: NextFunction) => void {
  const expected = process.env['API_KEY'];
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const apiKeyHeader = req.headers['x-api-key'];
      const apiKey = typeof apiKeyHeader === 'string' ? apiKeyHeader : '';
      if (apiKey === '') throw new AuthenticationError('API key is required');
      if (expected && apiKey !== expected) throw new AuthenticationError('Invalid API key');
      logger.debug('API key authenticated successfully', { maskedApiKey: `${apiKey.substring(0, 8)}...`, keyLength: apiKey.length });
      next();
    } catch (error: unknown) {
      res
        .status(401)
        .json({ success: false, message: error instanceof Error ? error.message : 'API key invalid', code: 'API_KEY_INVALID' });
    }
  };
}

export function generateToken(payload: Partial<JWTPayload>): string {
  const signOptions: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return sign(payload as object, JWT_SECRET, signOptions);
}

export function verifyToken(token: string): JWTPayload {
  return verify(token, JWT_SECRET) as JWTPayload;
}

export function refreshToken(token: string): string {
  const decoded = verify(token, JWT_SECRET, { ignoreExpiration: true }) as JWTPayload;
  const { userId, username, role } = decoded;
  const newPayload = { userId, username, role } as Partial<JWTPayload>;
  return generateToken(newPayload);
}

export default {
  authenticateToken,
  optionalAuth,
  authorizeRoles,
  authorizeOwner,
  authenticateApiKey,
  generateToken,
  verifyToken,
  refreshToken,
};
