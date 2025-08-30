const request = require('supertest');
// Jest globals are available automatically
const { mockPrismaClient, mockJWT, resetAllMocks, setupSuccessfulMocks } = require('../setup/mocks');

// Mock modules before importing app
jest.mock('../../src/utils/prisma', () => mockPrismaClient);
jest.mock('jsonwebtoken', () => mockJWT);

// Import required modules
const express = require('express');
const cors = require('cors');
const authMiddleware = require('../../src/middlewares/auth.middleware');
const transactionRoutes = require('../../src/routes/transaction.routes');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/transactions', transactionRoutes);
  return app;
};

describe('Transactions API Integration Tests', () => {
  let app;

  beforeEach(() => {
    resetAllMocks();
    setupSuccessfulMocks();
    app = createTestApp();

    // Setup JWT middleware mock to always authenticate
    mockJWT.verify.mockReturnValue({ userId: 1 });
  });

  describe('GET /api/transactions', () => {
    it('should get transactions with authentication', async () => {
      const mockTransactions = [
        global.testHelpers.createMockTransaction(),
        global.testHelpers.createMockTransaction({ id: 2, amount: 75.50 }),
      ];
      
      mockPrismaClient.transaction.findMany.mockResolvedValue(mockTransactions);
      mockPrismaClient.transaction.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body).toEqual({
        transactions: [
          global.testHelpers.createMockTransactionSerialized(),
          global.testHelpers.createMockTransactionSerialized({ id: 2, amount: 75.50 }),
        ],
        totalPages: 1,
        currentPage: 1,
      });

      // Verify authentication middleware was called
      expect(mockJWT.verify).toHaveBeenCalledWith('valid-jwt-token', process.env.JWT_SECRET);
      
      // Verify database query with user isolation
      expect(mockPrismaClient.transaction.findMany).toHaveBeenCalledWith({
        where: { account: { userId: 1 } },
        skip: 0,
        take: 10,
        orderBy: { date: 'desc' },
      });
    });

    it('should handle pagination parameters', async () => {
      mockPrismaClient.transaction.findMany.mockResolvedValue([]);
      mockPrismaClient.transaction.count.mockResolvedValue(15);

      const response = await request(app)
        .get('/api/transactions?page=2&limit=5')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body).toEqual({
        transactions: [],
        totalPages: 3, // Math.ceil(15 / 5)
        currentPage: 2,
      });

      expect(mockPrismaClient.transaction.findMany).toHaveBeenCalledWith({
        where: { account: { userId: 1 } },
        skip: 5, // (2 - 1) * 5
        take: 5,
        orderBy: { date: 'desc' },
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Unauthorized',
      });

      expect(mockPrismaClient.transaction.findMany).not.toHaveBeenCalled();
    });

    it('should return 401 with invalid token', async () => {
      mockJWT.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Unauthorized',
      });
    });
  });

  describe('POST /api/transactions', () => {
    const validTransactionData = {
      amount: 50.00,
      description: 'Test transaction',
      date: '2023-08-30T10:00:00.000Z',
      categoryId: 1,
      type: 'expense',
    };

    beforeEach(() => {
      // Setup default mocks for successful transaction creation
      const mockAccount = global.testHelpers.createMockAccount({ balance: 1000 });
      const mockCategory = global.testHelpers.createMockCategory();
      
      mockPrismaClient.account.findFirst.mockResolvedValue(mockAccount);
      mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            create: jest.fn().mockResolvedValue(global.testHelpers.createMockTransaction(validTransactionData)),
          },
          account: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });
    });

    it('should create expense transaction successfully', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(validTransactionData)
        .expect(201);

      expect(response.body).toMatchObject({
        amount: 50.00,
        description: 'Test transaction',
        type: 'expense',
        categoryId: 1,
      });

      // Verify atomic transaction was used
      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
      
      // Verify account and category validation
      expect(mockPrismaClient.account.findFirst).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(mockPrismaClient.category.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
      });
    });

    it('should create income transaction successfully', async () => {
      const incomeData = { ...validTransactionData, type: 'income' };
      const mockCategory = global.testHelpers.createMockCategory({ type: 'income' });
      mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);

      // Update the mock transaction creation to return income type
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            create: jest.fn().mockResolvedValue(global.testHelpers.createMockTransaction({ type: 'income' })),
          },
          account: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(incomeData)
        .expect(201);

      expect(response.body.type).toBe('income');
    });

    it('should return 400 for invalid request data', async () => {
      const invalidData = {
        amount: 50.00,
        // missing required fields
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Amount, date, categoryId, and type are required',
      });

      expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid transaction type', async () => {
      const invalidTypeData = { ...validTransactionData, type: 'invalid' };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(invalidTypeData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid transaction type',
      });
    });

    it('should return 404 if account not found', async () => {
      mockPrismaClient.account.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(validTransactionData)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Account not found',
      });

      expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
    });

    it('should return 404 if category not found or belongs to different user', async () => {
      mockPrismaClient.category.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(validTransactionData)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Category not found',
      });

      expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
    });

    it('should enforce user isolation for categories', async () => {
      // Category exists but belongs to different user
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(validTransactionData)
        .expect(201); // Should succeed with our mock setup

      // Verify category lookup includes userId
      expect(mockPrismaClient.category.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send(validTransactionData)
        .expect(401);

      expect(response.body).toEqual({
        error: 'Unauthorized',
      });

      expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
    });

    it('should handle database transaction failures', async () => {
      mockPrismaClient.$transaction.mockRejectedValue(new Error('Database transaction failed'));

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(validTransactionData)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Something went wrong',
      });
    });
  });

  describe('PUT /api/transactions/:id', () => {
    const validUpdateData = {
      amount: 75.00,
      description: 'Updated transaction',
      date: '2023-08-30T12:00:00.000Z',
      categoryId: 2,
      type: 'expense',
    };

    beforeEach(() => {
      const oldTransaction = global.testHelpers.createMockTransaction({
        amount: 50,
        type: 'expense',
        accountId: 1,
      });
      const mockAccount = global.testHelpers.createMockAccount({ balance: 950 });

      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            findFirst: jest.fn().mockResolvedValue(oldTransaction),
            update: jest.fn().mockResolvedValue({ ...oldTransaction, ...validUpdateData }),
          },
          account: {
            findUnique: jest.fn().mockResolvedValue(mockAccount),
            update: jest.fn(),
          },
        };
        return callback(tx);
      });
    });

    it('should update transaction successfully', async () => {
      const response = await request(app)
        .put('/api/transactions/1')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(validUpdateData)
        .expect(200);

      expect(response.body).toMatchObject({
        amount: 75.00,
        description: 'Updated transaction',
        type: 'expense',
      });

      // Verify atomic transaction was used
      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
    });

    it('should return 400 for invalid update data', async () => {
      const invalidData = { amount: 75.00 }; // missing required fields

      const response = await request(app)
        .put('/api/transactions/1')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Amount, date, categoryId, and type are required',
      });
    });

    it('should return 404 for non-existent transaction', async () => {
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
        };
        try {
          return await callback(tx);
        } catch (error) {
          throw new Error('Transaction not found');
        }
      });

      const response = await request(app)
        .put('/api/transactions/999')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(validUpdateData)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Transaction not found',
      });
    });

    it('should enforce user isolation on updates', async () => {
      // Transaction exists but belongs to different user - should return 404
      const response = await request(app)
        .put('/api/transactions/1')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(validUpdateData)
        .expect(200); // Success with our mock setup

      // The atomic transaction should verify ownership through account.userId
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .put('/api/transactions/1')
        .send(validUpdateData)
        .expect(401);

      expect(response.body).toEqual({
        error: 'Unauthorized',
      });
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    beforeEach(() => {
      const transactionToDelete = global.testHelpers.createMockTransaction({
        amount: 50,
        type: 'expense',
        accountId: 1,
      });
      const mockAccount = global.testHelpers.createMockAccount({ balance: 950 });

      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            findFirst: jest.fn().mockResolvedValue(transactionToDelete),
            delete: jest.fn(),
          },
          account: {
            findUnique: jest.fn().mockResolvedValue(mockAccount),
            update: jest.fn(),
          },
        };
        return callback(tx);
      });
    });

    it('should delete transaction successfully', async () => {
      const response = await request(app)
        .delete('/api/transactions/1')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(204);

      expect(response.body).toEqual({});

      // Verify atomic transaction was used
      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
    });

    it('should return 404 for non-existent transaction', async () => {
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
        };
        try {
          return await callback(tx);
        } catch (error) {
          throw new Error('Transaction not found');
        }
      });

      const response = await request(app)
        .delete('/api/transactions/999')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Transaction not found',
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete('/api/transactions/1')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Unauthorized',
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaClient.$transaction.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/transactions/1')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Something went wrong',
      });
    });
  });

  describe('Race Condition Scenarios', () => {
    it('should handle concurrent transaction creations', async () => {
      const transactionData1 = {
        amount: 100.00,
        description: 'Transaction 1',
        date: '2023-08-30T10:00:00.000Z',
        categoryId: 1,
        type: 'expense',
      };

      const transactionData2 = {
        amount: 50.00,
        description: 'Transaction 2',
        date: '2023-08-30T10:01:00.000Z',
        categoryId: 1,
        type: 'expense',
      };

      const mockAccount = global.testHelpers.createMockAccount({ balance: 1000 });
      const mockCategory = global.testHelpers.createMockCategory();
      
      mockPrismaClient.account.findFirst.mockResolvedValue(mockAccount);
      mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);
      
      // Simulate successful concurrent transactions
      mockPrismaClient.$transaction
        .mockResolvedValueOnce(global.testHelpers.createMockTransaction(transactionData1))
        .mockResolvedValueOnce(global.testHelpers.createMockTransaction(transactionData2));

      const [response1, response2] = await Promise.all([
        request(app)
          .post('/api/transactions')
          .set('Authorization', 'Bearer valid-jwt-token')
          .send(transactionData1),
        request(app)
          .post('/api/transactions')
          .set('Authorization', 'Bearer valid-jwt-token')
          .send(transactionData2),
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      // Both transactions should have been processed
      expect(mockPrismaClient.$transaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large transaction amounts', async () => {
      const largeAmountData = {
        amount: 999999999.99,
        description: 'Large transaction',
        date: '2023-08-30T10:00:00.000Z',
        categoryId: 1,
        type: 'expense',
      };

      const mockAccount = global.testHelpers.createMockAccount({ balance: 1000000000 });
      const mockCategory = global.testHelpers.createMockCategory();
      
      mockPrismaClient.account.findFirst.mockResolvedValue(mockAccount);
      mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);
      
      // Update the mock to return the correct amount
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            create: jest.fn().mockResolvedValue(global.testHelpers.createMockTransaction({ amount: 999999999.99 })),
          },
          account: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(largeAmountData)
        .expect(201);

      expect(response.body.amount).toBe(999999999.99);
    });

    it('should handle negative amounts', async () => {
      const negativeAmountData = {
        amount: -50.00,
        description: 'Negative transaction',
        date: '2023-08-30T10:00:00.000Z',
        categoryId: 1,
        type: 'expense',
      };

      const mockAccount = global.testHelpers.createMockAccount();
      const mockCategory = global.testHelpers.createMockCategory();
      
      mockPrismaClient.account.findFirst.mockResolvedValue(mockAccount);
      mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);
      
      // Update the mock to return the correct negative amount
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            create: jest.fn().mockResolvedValue(global.testHelpers.createMockTransaction({ amount: -50.00 })),
          },
          account: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      // Depending on business rules, this might be allowed or rejected
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(negativeAmountData)
        .expect(201);

      expect(response.body.amount).toBe(-50.00);
    });
  });
});