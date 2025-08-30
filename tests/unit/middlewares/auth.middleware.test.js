// Jest globals are available automatically
const { mockJWT, resetAllMocks } = require('../../setup/mocks');

// Mock jsonwebtoken before importing
jest.mock('jsonwebtoken', () => mockJWT);

const authMiddleware = require('../../../src/middlewares/auth.middleware');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    resetAllMocks();

    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('successful authentication', () => {
    it('should authenticate user with valid Bearer token', () => {
      req.headers.authorization = 'Bearer valid-jwt-token';
      mockJWT.verify.mockReturnValue({ userId: 1 });

      authMiddleware(req, res, next);

      expect(mockJWT.verify).toHaveBeenCalledWith('valid-jwt-token', process.env.JWT_SECRET);
      expect(req.userId).toBe(1);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle different user IDs correctly', () => {
      req.headers.authorization = 'Bearer valid-jwt-token';
      mockJWT.verify.mockReturnValue({ userId: 42 });

      authMiddleware(req, res, next);

      expect(req.userId).toBe(42);
      expect(next).toHaveBeenCalled();
    });

    it('should handle JWT payload with additional fields', () => {
      req.headers.authorization = 'Bearer valid-jwt-token';
      mockJWT.verify.mockReturnValue({ 
        userId: 1, 
        iat: 1672531200, 
        exp: 1672617600,
        email: 'test@example.com'
      });

      authMiddleware(req, res, next);

      expect(req.userId).toBe(1);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('authentication failures', () => {
    it('should return 401 if Authorization header is missing', () => {
      // No authorization header
      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
      expect(mockJWT.verify).not.toHaveBeenCalled();
    });

    it('should return 401 if Authorization header is empty', () => {
      req.headers.authorization = '';

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if Authorization header does not start with Bearer', () => {
      req.headers.authorization = 'Basic invalid-format';

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
      expect(mockJWT.verify).not.toHaveBeenCalled();
    });

    it('should return 401 if Bearer token is empty', () => {
      req.headers.authorization = 'Bearer ';

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
      expect(mockJWT.verify).not.toHaveBeenCalled();
    });

    it('should return 401 if Bearer token is missing', () => {
      req.headers.authorization = 'Bearer';

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
      expect(mockJWT.verify).not.toHaveBeenCalled();
    });
  });

  describe('JWT verification failures', () => {
    it('should return 401 if JWT token is invalid', () => {
      req.headers.authorization = 'Bearer invalid-token';
      mockJWT.verify.mockImplementation(() => {
        throw new Error('JsonWebTokenError: invalid token');
      });

      authMiddleware(req, res, next);

      expect(mockJWT.verify).toHaveBeenCalledWith('invalid-token', process.env.JWT_SECRET);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
      expect(req.userId).toBeUndefined();
    });

    it('should return 401 if JWT token is expired', () => {
      req.headers.authorization = 'Bearer expired-token';
      mockJWT.verify.mockImplementation(() => {
        throw new Error('TokenExpiredError: jwt expired');
      });

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if JWT signature is invalid', () => {
      req.headers.authorization = 'Bearer token-with-invalid-signature';
      mockJWT.verify.mockImplementation(() => {
        throw new Error('JsonWebTokenError: invalid signature');
      });

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if JWT secret is incorrect', () => {
      req.headers.authorization = 'Bearer valid-token-wrong-secret';
      mockJWT.verify.mockImplementation(() => {
        throw new Error('JsonWebTokenError: invalid signature');
      });

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if JWT payload is malformed', () => {
      req.headers.authorization = 'Bearer malformed-payload-token';
      mockJWT.verify.mockImplementation(() => {
        throw new Error('JsonWebTokenError: jwt malformed');
      });

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle JWT verification with missing userId', () => {
      req.headers.authorization = 'Bearer token-without-userid';
      mockJWT.verify.mockReturnValue({ email: 'test@example.com' }); // Missing userId

      authMiddleware(req, res, next);

      expect(req.userId).toBeUndefined();
      expect(next).toHaveBeenCalled(); // Still calls next, but userId is undefined
    });
  });

  describe('edge cases and security', () => {
    it('should handle Authorization header with extra spaces', () => {
      req.headers.authorization = '  Bearer   valid-jwt-token  ';
      mockJWT.verify.mockReturnValue({ userId: 1 });

      authMiddleware(req, res, next);

      // Should fail because it doesn't handle extra spaces
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle case sensitivity in Bearer keyword', () => {
      req.headers.authorization = 'bearer valid-jwt-token';
      mockJWT.verify.mockReturnValue({ userId: 1 });

      authMiddleware(req, res, next);

      // Should fail because it's case sensitive
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle multiple Bearer keywords', () => {
      req.headers.authorization = 'Bearer Bearer valid-jwt-token';
      mockJWT.verify.mockReturnValue({ userId: 1 });

      authMiddleware(req, res, next);

      // Should work because it splits and takes second part (which is "Bearer" in this case)
      expect(mockJWT.verify).toHaveBeenCalledWith('Bearer', process.env.JWT_SECRET);
      expect(req.userId).toBe(1);
      expect(next).toHaveBeenCalled();
    });

    it('should handle very long JWT tokens', () => {
      const longToken = 'a'.repeat(1000);
      req.headers.authorization = `Bearer ${longToken}`;
      mockJWT.verify.mockReturnValue({ userId: 1 });

      authMiddleware(req, res, next);

      expect(mockJWT.verify).toHaveBeenCalledWith(longToken, process.env.JWT_SECRET);
      expect(req.userId).toBe(1);
      expect(next).toHaveBeenCalled();
    });

    it('should handle numeric userId correctly', () => {
      req.headers.authorization = 'Bearer valid-token';
      mockJWT.verify.mockReturnValue({ userId: 999999 });

      authMiddleware(req, res, next);

      expect(req.userId).toBe(999999);
      expect(typeof req.userId).toBe('number');
      expect(next).toHaveBeenCalled();
    });

    it('should handle string userId correctly', () => {
      req.headers.authorization = 'Bearer valid-token';
      mockJWT.verify.mockReturnValue({ userId: '1' });

      authMiddleware(req, res, next);

      expect(req.userId).toBe('1');
      expect(typeof req.userId).toBe('string');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('environment variable handling', () => {
    it('should use JWT_SECRET from environment', () => {
      const originalSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'test-secret-123';
      
      req.headers.authorization = 'Bearer valid-token';
      mockJWT.verify.mockReturnValue({ userId: 1 });

      authMiddleware(req, res, next);

      expect(mockJWT.verify).toHaveBeenCalledWith('valid-token', 'test-secret-123');
      
      // Restore original
      process.env.JWT_SECRET = originalSecret;
    });

    it('should handle missing JWT_SECRET environment variable', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      
      req.headers.authorization = 'Bearer valid-token';
      mockJWT.verify.mockReturnValue({ userId: 1 });

      authMiddleware(req, res, next);

      expect(mockJWT.verify).toHaveBeenCalledWith('valid-token', undefined);
      
      // Restore original
      process.env.JWT_SECRET = originalSecret;
    });
  });
});