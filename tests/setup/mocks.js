// Jest globals are available automatically

// Mock Prisma Client
const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  account: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  category: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  transaction: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// Mock bcrypt
const mockBcrypt = {
  hash: jest.fn().mockResolvedValue('hashedpassword123'),
  compare: jest.fn().mockResolvedValue(true),
};

// Mock jsonwebtoken
const mockJWT = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: 1 }),
};

// Export mocks
module.exports = {
  mockPrismaClient,
  mockBcrypt,
  mockJWT,

  // Helper to setup all mocks
  setupMocks: () => {
    jest.doMock('../src/utils/prisma', () => mockPrismaClient);
    jest.doMock('bcrypt', () => mockBcrypt);
    jest.doMock('jsonwebtoken', () => mockJWT);
  },

  // Helper to reset all mocks
  resetAllMocks: () => {
    Object.values(mockPrismaClient.user).forEach(mock => mock.mockReset());
    Object.values(mockPrismaClient.account).forEach(mock => mock.mockReset());
    Object.values(mockPrismaClient.category).forEach(mock => mock.mockReset());
    Object.values(mockPrismaClient.transaction).forEach(mock => mock.mockReset());
    mockPrismaClient.$transaction.mockReset();

    mockBcrypt.hash.mockReset().mockResolvedValue('hashedpassword123');
    mockBcrypt.compare.mockReset().mockResolvedValue(true);

    mockJWT.sign.mockReset().mockReturnValue('mock-jwt-token');
    mockJWT.verify.mockReset().mockReturnValue({ userId: 1 });
  },

  // Helper to setup default successful responses
  setupSuccessfulMocks: () => {
    // User mocks
    mockPrismaClient.user.findUnique.mockResolvedValue(null);
    mockPrismaClient.user.create.mockResolvedValue(global.testHelpers.createMockUser());

    // Account mocks
    mockPrismaClient.account.findFirst.mockResolvedValue(global.testHelpers.createMockAccount());
    mockPrismaClient.account.create.mockResolvedValue(global.testHelpers.createMockAccount());
    mockPrismaClient.account.updateMany.mockResolvedValue({ count: 1 });

    // Category mocks
    mockPrismaClient.category.findMany.mockResolvedValue([global.testHelpers.createMockCategory()]);
    mockPrismaClient.category.create.mockResolvedValue(global.testHelpers.createMockCategory());
    mockPrismaClient.category.createMany.mockResolvedValue({ count: 7 });

    // Transaction mocks
    mockPrismaClient.transaction.findMany.mockResolvedValue([global.testHelpers.createMockTransaction()]);
    mockPrismaClient.transaction.create.mockResolvedValue(global.testHelpers.createMockTransaction());
    mockPrismaClient.transaction.count.mockResolvedValue(1);
    mockPrismaClient.$transaction.mockImplementation(async (callback) => {
      return callback(mockPrismaClient);
    });
  },
};