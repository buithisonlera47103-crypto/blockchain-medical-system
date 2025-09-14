// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireRole as authorizeRoles } from '../../../src/middleware/auth';
import { AppError } from '../../../src/utils/AppError';

// Extend Request interface for testing
interface AuthenticatedRequest extends Request {
  user?: any;
}

// Mock jwt
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Middleware Tests', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', () => {
      const mockUser = { id: '1', username: 'testuser', role: 'doctor' };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockedJwt.verify.mockReturnValue(mockUser as any);

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without token', () => {
      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '访问令牌缺失',
          statusCode: 401,
        })
      );
    });

    it('should reject invalid token format', () => {
      mockRequest.headers = { authorization: 'InvalidFormat' };

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should reject expired token', () => {
      mockRequest.headers = { authorization: 'Bearer expired-token' };
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should reject malformed token', () => {
      mockRequest.headers = { authorization: 'Bearer malformed-token' };
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('authorizeRoles', () => {
    beforeEach(() => {
      mockRequest.user = { id: '1', username: 'testuser', role: 'doctor' };
    });

    it('should authorize user with correct role', () => {
      const middleware = authorizeRoles(['doctor', 'admin']);

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject user with incorrect role', () => {
      const middleware = authorizeRoles(['admin']);

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '权限不足',
          statusCode: 403,
        })
      );
    });

    it('should reject request without user', () => {
      mockRequest.user = undefined;
      const middleware = authorizeRoles(['doctor']);

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should handle multiple allowed roles', () => {
      const middleware = authorizeRoles(['doctor', 'nurse', 'admin']);

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle empty roles array', () => {
      const middleware = authorizeRoles([]);

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should be case sensitive for roles', () => {
      mockRequest.user = { id: '1', username: 'testuser', role: 'Doctor' };
      const middleware = authorizeRoles(['doctor']);

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('Integration Tests', () => {
    it('should work with both middleware in sequence', () => {
      const mockUser = { id: '1', username: 'testuser', role: 'doctor' };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockedJwt.verify.mockReturnValue(mockUser as any);

      // First authenticate
      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
      expect(mockRequest.user).toEqual(mockUser);

      // Then authorize
      const authorizeMiddleware = authorizeRoles(['doctor']);
      authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(2);
      expect(mockNext).toHaveBeenLastCalledWith();
    });
  });
});
