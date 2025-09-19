
import { Request, Response, NextFunction } from 'express';


import { AppError } from '../../src/utils/AppError';

describe('Middleware Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      body: {},
      params: {},
      query: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('Error Handling Middleware', () => {
    const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json({
          error: err.message,
          statusCode: err.statusCode,
        });
      }

      return res.status(500).json({
        error: 'Internal Server Error',
        statusCode: 500,
      });
    };

    it('should handle AppError correctly', () => {
      const error = new AppError('Test error', 400);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Test error',
        statusCode: 400,
      });
    });

    it('should handle generic errors', () => {
      const error = new Error('Generic error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        statusCode: 500,
      });
    });
  });

  describe('Authentication Middleware', () => {
    const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      if (token === 'valid-token') {
        (req as any).user = { id: 'user-1', username: 'testuser' };
        next();
        return;
      }

      res.status(401).json({ error: 'Invalid token' });
    };

    it('should reject requests without token', () => {
      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid token', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow requests with valid token', () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual({ id: 'user-1', username: 'testuser' });
    });
  });

  describe('Validation Middleware', () => {
    const validateBody = (requiredFields: string[]) => {
      return (req: Request, res: Response, next: NextFunction) => {
        const missingFields = requiredFields.filter(field => !req.body[field]);

        if (missingFields.length > 0) {
          res.status(400).json({
            error: 'Missing required fields',
            missingFields,
          });
          return;
        }

        next();
      };
    };

    it('should validate required fields', () => {
      const middleware = validateBody(['username', 'password']);
      mockRequest.body = { username: 'test' }; // missing password

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Missing required fields',
        missingFields: ['password'],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass validation with all required fields', () => {
      const middleware = validateBody(['username', 'password']);
      mockRequest.body = { username: 'test', password: 'password123' };

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('CORS Middleware', () => {
    const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      next();
    };

    beforeEach(() => {
      mockResponse.setHeader = jest.fn();
      mockResponse.end = jest.fn();
    });

    it('should set CORS headers', () => {
      mockRequest.method = 'GET';

      corsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle OPTIONS requests', () => {
      mockRequest.method = 'OPTIONS';

      corsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.end).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
