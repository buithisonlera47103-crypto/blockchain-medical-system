import { Application } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

export interface SecurityConfig {
  globalLimit: {
    windowMs: number;
    max: number;
  };
  apiLimit: {
    windowMs: number;
    max: number;
  };
  authLimit: {
    windowMs: number;
    max: number;
  };
}

export class TestSecurityConfig {
  /**
   * Configure security middleware for testing environment
   */
  public static configureTestSecurity(app: Application): void {
    // Configure Helmet for basic security headers
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
        crossOriginEmbedderPolicy: false,
      })
    );

    // Global rate limiter
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(limiter);

    // API rate limiter
    const apiLimiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100, // Limit each IP to 100 API requests per minute
      message: {
        error: 'Too many API requests, please slow down.',
        code: 'API_RATE_LIMIT_EXCEEDED',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use('/api/', apiLimiter);

    // Auth rate limiter
    const authLimiter = rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 10, // Limit each IP to 10 auth requests per 5 minutes
      message: {
        error: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(['/api/auth/login', '/api/auth/register'], authLimiter);
  }

  /**
   * Get production security configuration
   */
  public static getProductionSecurityConfig(): SecurityConfig {
    return {
      globalLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Stricter limit for production
      },
      apiLimit: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 50, // Stricter API limit
      },
      authLimit: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 5, // Very strict auth limit
      },
    };
  }

  /**
   * Get test security configuration
   */
  public static getTestSecurityConfig(): SecurityConfig {
    return {
      globalLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // More lenient for testing
      },
      apiLimit: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 100, // More lenient API limit
      },
      authLimit: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 20, // More lenient auth limit for testing
      },
    };
  }

  /**
   * Configure CORS for testing environment
   */
  public static configureCORS(app: Application): void {
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, Content-Length, X-Requested-With'
      );

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  /**
   * Disable security features for testing
   */
  public static disableSecurityForTesting(app: Application): void {
    // Disable CSRF protection for testing
    app.use((req, _res, next) => {
      req.headers['x-csrf-token'] = 'test-token';
      next();
    });
  }
}

export default TestSecurityConfig;
