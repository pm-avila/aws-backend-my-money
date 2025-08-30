// Jest globals are available automatically
const { mockPrismaClient, resetAllMocks, setupSuccessfulMocks } = require('../../setup/mocks');

// Mock modules before importing
jest.mock('../../../src/utils/prisma', () => mockPrismaClient);

const {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../../../src/controllers/transaction.controller');

describe('Transaction Controller', () => {
  let req, res;

  beforeEach(() => {
    resetAllMocks();
    setupSuccessfulMocks();

    req = {
      body: {},
      query: {},
      params: {},
      userId: 1,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  describe('getTransactions', () => {
    it('should get transactions with default pagination', async () => {
      const mockTransactions = [
        global.testHelpers.createMockTransaction(),
        global.testHelpers.createMockTransaction({ id: 2, amount: 75.50 }),
      ];
      
      mockPrismaClient.transaction.findMany.mockResolvedValue(mockTransactions);
      mockPrismaClient.transaction.count.mockResolvedValue(2);

      await getTransactions(req, res);

      expect(mockPrismaClient.transaction.findMany).toHaveBeenCalledWith({
        where: { account: { userId: 1 } },
        skip: 0,
        take: 10,
        orderBy: { date: 'desc' },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        transactions: mockTransactions,
        totalPages: 1,
        currentPage: 1,
      });
    });

    it('should handle custom pagination parameters', async () => {
      req.query = { page: '2', limit: '5' };
      
      mockPrismaClient.transaction.findMany.mockResolvedValue([]);
      mockPrismaClient.transaction.count.mockResolvedValue(10);

      await getTransactions(req, res);

      expect(mockPrismaClient.transaction.findMany).toHaveBeenCalledWith({
        where: { account: { userId: 1 } },
        skip: 5, // (page - 1) * limit = (2 - 1) * 5
        take: 5,
        orderBy: { date: 'desc' },
      });

      expect(res.json).toHaveBeenCalledWith({
        transactions: [],
        totalPages: 2, // Math.ceil(10 / 5)
        currentPage: 2,
      });
    });

    it('should return 500 if database error occurs', async () => {
      mockPrismaClient.transaction.findMany.mockRejectedValue(new Error('Database error'));

      await getTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Something went wrong',
      });
    });
  });

  describe('createTransaction', () => {
    const validTransactionData = {
      amount: 50.00,
      description: 'Test transaction',
      date: '2023-08-30T10:00:00.000Z',
      categoryId: 1,
      type: 'expense',
    };

    beforeEach(() => {
      req.body = validTransactionData;
    });

    it('should create expense transaction successfully', async () => {
      const mockAccount = global.testHelpers.createMockAccount({ balance: 1000 });
      const mockCategory = global.testHelpers.createMockCategory();
      const mockTransaction = global.testHelpers.createMockTransaction(validTransactionData);

      mockPrismaClient.account.findFirst.mockResolvedValue(mockAccount);
      mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            create: jest.fn().mockResolvedValue(mockTransaction),
          },
          account: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      await createTransaction(req, res);

      // Verify atomic transaction was used
      expect(mockPrismaClient.$transaction).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockTransaction);
    });

    it('should create income transaction successfully', async () => {
      req.body = { ...validTransactionData, type: 'income' };
      
      const mockAccount = global.testHelpers.createMockAccount({ balance: 1000 });
      const mockCategory = global.testHelpers.createMockCategory({ type: 'income' });
      const mockTransaction = global.testHelpers.createMockTransaction({ ...validTransactionData, type: 'income' });

      mockPrismaClient.account.findFirst.mockResolvedValue(mockAccount);
      mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            create: jest.fn().mockResolvedValue(mockTransaction),
          },
          account: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockTransaction);
    });

    it('should return 400 if required fields are missing', async () => {
      const testCases = [
        { field: 'amount', data: { ...validTransactionData, amount: undefined } },
        { field: 'date', data: { ...validTransactionData, date: undefined } },
        { field: 'categoryId', data: { ...validTransactionData, categoryId: undefined } },
        { field: 'type', data: { ...validTransactionData, type: undefined } },
      ];

      for (const testCase of testCases) {
        req.body = testCase.data;
        
        await createTransaction(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Amount, date, categoryId, and type are required',
        });
      }
    });

    it('should return 400 if transaction type is invalid', async () => {
      req.body = { ...validTransactionData, type: 'invalid' };

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid transaction type',
      });
    });

    it('should return 404 if account not found', async () => {
      mockPrismaClient.account.findFirst.mockResolvedValue(null);

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Account not found',
      });
    });

    it('should return 404 if category not found', async () => {
      const mockAccount = global.testHelpers.createMockAccount();
      mockPrismaClient.account.findFirst.mockResolvedValue(mockAccount);
      mockPrismaClient.category.findFirst.mockResolvedValue(null);

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Category not found',
      });
    });

    it('should verify balance calculation for expense', async () => {
      const initialBalance = 1000;
      const expenseAmount = 50;
      const expectedBalance = initialBalance - expenseAmount;

      const mockAccount = global.testHelpers.createMockAccount({ balance: initialBalance });
      const mockCategory = global.testHelpers.createMockCategory();
      
      mockPrismaClient.account.findFirst.mockResolvedValue(mockAccount);
      mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);
      
      let balanceUpdateCalled = false;
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            create: jest.fn().mockResolvedValue(global.testHelpers.createMockTransaction()),
          },
          account: {
            update: jest.fn().mockImplementation(({ where, data }) => {
              expect(data.balance).toBe(expectedBalance);
              balanceUpdateCalled = true;
            }),
          },
        };
        return callback(tx);
      });

      await createTransaction(req, res);

      expect(balanceUpdateCalled).toBe(true);
    });

    it('should verify balance calculation for income', async () => {
      req.body = { ...validTransactionData, type: 'income' };
      
      const initialBalance = 1000;
      const incomeAmount = 50;
      const expectedBalance = initialBalance + incomeAmount;

      const mockAccount = global.testHelpers.createMockAccount({ balance: initialBalance });
      const mockCategory = global.testHelpers.createMockCategory({ type: 'income' });
      
      mockPrismaClient.account.findFirst.mockResolvedValue(mockAccount);
      mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);
      
      let balanceUpdateCalled = false;
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            create: jest.fn().mockResolvedValue(global.testHelpers.createMockTransaction()),
          },
          account: {
            update: jest.fn().mockImplementation(({ where, data }) => {
              expect(data.balance).toBe(expectedBalance);
              balanceUpdateCalled = true;
            }),
          },
        };
        return callback(tx);
      });

      await createTransaction(req, res);

      expect(balanceUpdateCalled).toBe(true);
    });

    it('should return 500 if transaction fails', async () => {
      mockPrismaClient.account.findFirst.mockResolvedValue(global.testHelpers.createMockAccount());
      mockPrismaClient.category.findFirst.mockResolvedValue(global.testHelpers.createMockCategory());
      mockPrismaClient.$transaction.mockRejectedValue(new Error('Transaction failed'));

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Something went wrong',
      });
    });
  });

  describe('updateTransaction', () => {
    const validUpdateData = {
      amount: 75.00,
      description: 'Updated transaction',
      date: '2023-08-30T12:00:00.000Z',
      categoryId: 2,
      type: 'expense',
    };

    beforeEach(() => {
      req.params = { id: '1' };
      req.body = validUpdateData;
    });

    it('should update transaction successfully with balance recalculation', async () => {
      const oldTransaction = global.testHelpers.createMockTransaction({
        amount: 50,
        type: 'expense',
        accountId: 1,
      });
      const mockAccount = global.testHelpers.createMockAccount({ balance: 950 }); // 1000 - 50
      const updatedTransaction = { ...oldTransaction, ...validUpdateData };

      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            findFirst: jest.fn().mockResolvedValue(oldTransaction),
            update: jest.fn().mockResolvedValue(updatedTransaction),
          },
          account: {
            findUnique: jest.fn().mockResolvedValue(mockAccount),
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      await updateTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedTransaction);
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = { ...validUpdateData, amount: undefined };

      await updateTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Amount, date, categoryId, and type are required',
      });
    });

    it('should return 404 if transaction not found', async () => {
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

      await updateTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Transaction not found',
      });
    });

    it('should verify complex balance recalculation (expense to income)', async () => {
      req.body = { ...validUpdateData, type: 'income', amount: 100 };

      const oldTransaction = global.testHelpers.createMockTransaction({
        id: 1,
        amount: 50,
        type: 'expense',
        accountId: 1,
      });
      const mockAccount = global.testHelpers.createMockAccount({ 
        id: 1, // Make sure account ID matches
        balance: 950 
      });
      const updatedTransaction = { ...oldTransaction, ...req.body };

      // Expected: 950 + 50 (revert expense) + 100 (new income) = 1050
      const expectedBalance = 1050;

      let balanceUpdateCalled = false;
      let transactionFindCalled = false;
      let accountFindCalled = false;

      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            findFirst: jest.fn().mockImplementation(() => {
              transactionFindCalled = true;
              return Promise.resolve(oldTransaction);
            }),
            update: jest.fn().mockResolvedValue(updatedTransaction),
          },
          account: {
            findUnique: jest.fn().mockImplementation(() => {
              accountFindCalled = true;
              return Promise.resolve(mockAccount);
            }),
            update: jest.fn().mockImplementation(({ where, data }) => {
              balanceUpdateCalled = true;
              expect(data.balance).toBe(expectedBalance);
              return Promise.resolve();
            }),
          },
        };
        return await callback(tx);
      });

      await updateTransaction(req, res);

      expect(transactionFindCalled).toBe(true);
      expect(accountFindCalled).toBe(true);
      expect(balanceUpdateCalled).toBe(true);
    });
  });

  describe('deleteTransaction', () => {
    beforeEach(() => {
      req.params = { id: '1' };
    });

    it('should delete transaction successfully with balance reversion', async () => {
      const transactionToDelete = global.testHelpers.createMockTransaction({
        amount: 50,
        type: 'expense',
        accountId: 1,
      });
      const mockAccount = global.testHelpers.createMockAccount({ balance: 950 }); // 1000 - 50

      // Expected: 950 + 50 (revert expense) = 1000
      const expectedBalance = 1000;

      let balanceUpdateCalled = false;
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            findFirst: jest.fn().mockResolvedValue(transactionToDelete),
            delete: jest.fn(),
          },
          account: {
            findUnique: jest.fn().mockResolvedValue(mockAccount),
            update: jest.fn().mockImplementation(({ where, data }) => {
              expect(data.balance).toBe(expectedBalance);
              balanceUpdateCalled = true;
            }),
          },
        };
        return callback(tx);
      });

      await deleteTransaction(req, res);

      expect(balanceUpdateCalled).toBe(true);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return 404 if transaction not found', async () => {
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

      await deleteTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Transaction not found',
      });
    });

    it('should handle income transaction deletion', async () => {
      const transactionToDelete = global.testHelpers.createMockTransaction({
        amount: 100,
        type: 'income',
        accountId: 1,
      });
      const mockAccount = global.testHelpers.createMockAccount({ balance: 1100 }); // 1000 + 100

      // Expected: 1100 - 100 (revert income) = 1000
      const expectedBalance = 1000;

      let balanceUpdateCalled = false;
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        const tx = {
          transaction: {
            findFirst: jest.fn().mockResolvedValue(transactionToDelete),
            delete: jest.fn(),
          },
          account: {
            findUnique: jest.fn().mockResolvedValue(mockAccount),
            update: jest.fn().mockImplementation(({ where, data }) => {
              expect(data.balance).toBe(expectedBalance);
              balanceUpdateCalled = true;
            }),
          },
        };
        return callback(tx);
      });

      await deleteTransaction(req, res);

      expect(balanceUpdateCalled).toBe(true);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should return 500 if deletion fails', async () => {
      mockPrismaClient.$transaction.mockRejectedValue(new Error('Database error'));

      await deleteTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Something went wrong',
      });
    });
  });
});