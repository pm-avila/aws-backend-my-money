const request = require('supertest');
// Jest globals are available automatically
const { mockPrismaClient, mockBcrypt, mockJWT, resetAllMocks, setupSuccessfulMocks } = require('../setup/mocks');

// Mock modules before importing app
jest.mock('../../src/utils/prisma', () => mockPrismaClient);
jest.mock('bcrypt', () => mockBcrypt);
jest.mock('jsonwebtoken', () => mockJWT);

// Import express app after mocks are set
const express = require('express');
const cors = require('cors');
const authRoutes = require('../../src/routes/auth.routes');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
};

describe('Auth API Integration Tests', () => {
  let app;

  beforeEach(() => {
    resetAllMocks();
    setupSuccessfulMocks();
    app = createTestApp();
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should register a new user successfully', async () => {
      // Mock user doesn't exist
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      
      const mockUser = global.testHelpers.createMockUser({
        email: validUserData.email,
        name: validUserData.name,
      });
      mockPrismaClient.user.create.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString(),
      });

      // Verify password was hashed
      expect(mockBcrypt.hash).toHaveBeenCalledWith(validUserData.password, 10);
      
      // Verify default categories were created
      expect(mockPrismaClient.category.createMany).toHaveBeenCalled();
    });

    it('should return 400 for invalid request body', async () => {
      const invalidData = { email: 'invalid-email' }; // missing password

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Email and password are required',
      });

      expect(mockPrismaClient.user.create).not.toHaveBeenCalled();
    });

    it('should return 400 if user already exists', async () => {
      const existingUser = global.testHelpers.createMockUser();
      mockPrismaClient.user.findUnique.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'User with this email already exists',
      });

      expect(mockPrismaClient.user.create).not.toHaveBeenCalled();
    });

    it('should return 500 for database errors', async () => {
      mockPrismaClient.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Something went wrong',
      });
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      // Express should handle JSON parsing error
    });

    it('should handle missing Content-Type header', async () => {
      // Without proper Content-Type, Express might not parse the body correctly
      // This could result in either 400 (validation error) or 500 (server error)
      // depending on how the application handles malformed requests
      const response = await request(app)
        .post('/api/auth/register')
        .send('email=test@example.com&password=123');

      // Accept either 400 or 500 as valid responses for malformed requests
      expect([400, 500]).toContain(response.status);
    });

    it('should validate email format implicitly through database constraints', async () => {
      const invalidEmailData = {
        email: 'not-an-email',
        password: 'password123',
        name: 'Test User',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      // Database would reject invalid email, simulate this
      mockPrismaClient.user.create.mockRejectedValue(new Error('Invalid email format'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidEmailData)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Something went wrong',
      });
    });
  });

  describe('POST /api/auth/login', () => {
    const validCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      const mockUser = global.testHelpers.createMockUser({
        email: validCredentials.email,
        password: 'hashedpassword123',
      });
      
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJWT.sign.mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send(validCredentials)
        .expect(200);

      expect(response.body).toEqual({
        token: 'mock-jwt-token',
      });

      // Verify database lookup
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: validCredentials.email },
      });

      // Verify password comparison
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        validCredentials.password,
        mockUser.password
      );

      // Verify JWT generation
      expect(mockJWT.sign).toHaveBeenCalledWith(
        { userId: mockUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
    });

    it('should return 400 for missing credentials', async () => {
      const testCases = [
        { email: 'test@example.com' }, // missing password
        { password: 'password123' }, // missing email
        {}, // missing both
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(testCase)
          .expect(400);

        expect(response.body).toEqual({
          error: 'Email and password are required',
        });
      }
    });

    it('should return 401 for non-existent user', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validCredentials)
        .expect(401);

      expect(response.body).toEqual({
        error: 'Invalid credentials',
      });

      expect(mockBcrypt.compare).not.toHaveBeenCalled();
      expect(mockJWT.sign).not.toHaveBeenCalled();
    });

    it('should return 401 for incorrect password', async () => {
      const mockUser = global.testHelpers.createMockUser();
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validCredentials)
        .expect(401);

      expect(response.body).toEqual({
        error: 'Invalid credentials',
      });

      expect(mockJWT.sign).not.toHaveBeenCalled();
    });

    it('should return 500 for database errors', async () => {
      mockPrismaClient.user.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/login')
        .send(validCredentials)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Something went wrong',
      });
    });

    it('should return 500 for bcrypt errors', async () => {
      const mockUser = global.testHelpers.createMockUser();
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockRejectedValue(new Error('Bcrypt error'));

      const response = await request(app)
        .post('/api/auth/login')
        .send(validCredentials)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Something went wrong',
      });
    });

    it('should return 500 for JWT generation errors', async () => {
      const mockUser = global.testHelpers.createMockUser();
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJWT.sign.mockImplementation(() => {
        throw new Error('JWT error');
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(validCredentials)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Something went wrong',
      });
    });
  });

  describe('CORS and Headers', () => {
    it('should handle CORS preflight request', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .expect(204);

      // CORS headers should be present
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should accept JSON content type', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      const mockUser = global.testHelpers.createMockUser();
      mockPrismaClient.user.create.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }))
        .expect(201);
    });

    it('should handle large request bodies gracefully', async () => {
      const largeData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'a'.repeat(10000), // Very long name
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      const mockUser = global.testHelpers.createMockUser();
      mockPrismaClient.user.create.mockResolvedValue(mockUser);

      // This should still work (assuming no server-side length limits)
      const response = await request(app)
        .post('/api/auth/register')
        .send(largeData)
        .expect(201);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent registration attempts', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      // First request succeeds
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(null);
      const mockUser = global.testHelpers.createMockUser();
      mockPrismaClient.user.create.mockResolvedValueOnce(mockUser);

      // Second request finds existing user
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(mockUser);

      const [response1, response2] = await Promise.all([
        request(app).post('/api/auth/register').send(userData),
        request(app).post('/api/auth/register').send(userData),
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(400);
      expect(response2.body.error).toBe('User with this email already exists');
    });

    it('should handle empty request bodies', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'Email and password are required',
      });
    });

    it('should handle null values in request', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: null,
          password: null,
          name: null,
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Email and password are required',
      });
    });
  });
});