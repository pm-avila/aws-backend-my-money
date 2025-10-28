// Jest globals are available automatically
const { mockPrismaClient, mockBcrypt, mockJWT, resetAllMocks, setupSuccessfulMocks } = require('../../setup/mocks');

// Mock modules before importing
jest.mock('../../../src/utils/prisma', () => mockPrismaClient);
jest.mock('bcrypt', () => mockBcrypt);
jest.mock('jsonwebtoken', () => mockJWT);

const { register, login } = require('../../../src/controllers/auth.controller');

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    // Reset all mocks
    resetAllMocks();
    setupSuccessfulMocks();

    // Setup mock request and response objects
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should register a new user successfully', async () => {
      req.body = validUserData;

      // Mock user doesn't exist
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      
      // Mock user creation
      const mockUser = global.testHelpers.createMockUser({
        email: validUserData.email,
        name: validUserData.name,
      });
      mockPrismaClient.user.create.mockResolvedValue(mockUser);

      await register(req, res);

      // Verify password was hashed
      expect(mockBcrypt.hash).toHaveBeenCalledWith(validUserData.password, 10);

      // Verify user was created
      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: {
          email: validUserData.email,
          password: 'hashedpassword123',
          name: validUserData.name,
        },
      });

      // Verify default categories were created
      expect(mockPrismaClient.category.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'Salary', type: 'income', userId: mockUser.id }),
          expect.objectContaining({ name: 'Food', type: 'expense', userId: mockUser.id }),
          expect.objectContaining({ name: 'Transport', type: 'expense', userId: mockUser.id }),
          expect.objectContaining({ name: 'Shopping', type: 'expense', userId: mockUser.id }),
          expect.objectContaining({ name: 'Bills', type: 'expense', userId: mockUser.id }),
          expect.objectContaining({ name: 'Entertainment', type: 'expense', userId: mockUser.id }),
          expect.objectContaining({ name: 'Health', type: 'expense', userId: mockUser.id }),
        ]),
      });

      // Verify response (password should be excluded)
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should return 400 if email is missing', async () => {
      req.body = { password: 'password123', name: 'Test User' };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Email and password are required',
      });
      expect(mockPrismaClient.user.create).not.toHaveBeenCalled();
    });

    it('should return 400 if password is missing', async () => {
      req.body = { email: 'test@example.com', name: 'Test User' };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Email and password are required',
      });
      expect(mockPrismaClient.user.create).not.toHaveBeenCalled();
    });

    it('should return 400 if user already exists', async () => {
      req.body = validUserData;
      
      // Mock existing user
      mockPrismaClient.user.findUnique.mockResolvedValue(global.testHelpers.createMockUser());

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User with this email already exists',
      });
      expect(mockPrismaClient.user.create).not.toHaveBeenCalled();
    });

    it('should return 500 if database error occurs', async () => {
      req.body = validUserData;

      mockPrismaClient.user.findUnique.mockRejectedValue(new Error('Database error'));

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to register user',
        details: undefined,
      });
    });

    it('should handle bcrypt error gracefully', async () => {
      req.body = validUserData;

      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockBcrypt.hash.mockRejectedValue(new Error('Bcrypt error'));

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to register user',
        details: undefined,
      });
    });
  });

  describe('login', () => {
    const validCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      req.body = validCredentials;
      
      const mockUser = global.testHelpers.createMockUser({
        email: validCredentials.email,
        password: 'hashedpassword123',
      });
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJWT.sign.mockReturnValue('mock-jwt-token');

      await login(req, res);

      // Verify user lookup
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

      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        token: 'mock-jwt-token',
      });
    });

    it('should return 400 if email is missing', async () => {
      req.body = { password: 'password123' };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Email and password are required',
      });
    });

    it('should return 400 if password is missing', async () => {
      req.body = { email: 'test@example.com' };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Email and password are required',
      });
    });

    it('should return 401 if user does not exist', async () => {
      req.body = validCredentials;
      
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid credentials',
      });
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
      expect(mockJWT.sign).not.toHaveBeenCalled();
    });

    it('should return 401 if password is incorrect', async () => {
      req.body = validCredentials;
      
      const mockUser = global.testHelpers.createMockUser();
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid credentials',
      });
      expect(mockJWT.sign).not.toHaveBeenCalled();
    });

    it('should return 500 if database error occurs', async () => {
      req.body = validCredentials;

      mockPrismaClient.user.findUnique.mockRejectedValue(new Error('Database error'));

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to login',
        details: undefined,
      });
    });

    it('should return 500 if bcrypt compare fails', async () => {
      req.body = validCredentials;

      const mockUser = global.testHelpers.createMockUser();
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockRejectedValue(new Error('Bcrypt error'));

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to login',
        details: undefined,
      });
    });

    it('should return 500 if JWT signing fails', async () => {
      req.body = validCredentials;

      const mockUser = global.testHelpers.createMockUser();
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJWT.sign.mockImplementation(() => {
        throw new Error('JWT error');
      });

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to login',
        details: undefined,
      });
    });
  });
});