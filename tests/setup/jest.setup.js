// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test_user:test_pass@localhost:5432/test_db';

// Mock Date.now() for consistent timestamps in tests
const mockDate = new Date('2023-08-30T10:00:00.000Z');
const originalDateNow = Date.now;

beforeAll(() => {
  global.Date.now = jest.fn(() => mockDate.getTime());
});

afterAll(() => {
  global.Date.now = originalDateNow;
});

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Suppress console.error in tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // Suppress React warnings
    if (args[0]?.includes && args[0].includes('Warning:')) {
      return;
    }
    // Suppress expected error logs from controllers (with ❌ emoji)
    if (args[0]?.includes && args[0].includes('❌')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Global test helpers
global.testHelpers = {
  // Helper to create mock user data
  createMockUser: (overrides = {}) => ({
    id: 1,
    email: 'test@example.com',
    password: 'hashedpassword123',
    name: 'Test User',
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  }),

  // Helper to create mock account data
  createMockAccount: (overrides = {}) => ({
    id: 1,
    userId: 1,
    name: 'Test Account',
    balance: 1000.00,
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  }),

  // Helper to create mock category data
  createMockCategory: (overrides = {}) => ({
    id: 1,
    userId: 1,
    name: 'Test Category',
    type: 'expense',
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  }),

  // Helper to create mock transaction data
  createMockTransaction: (overrides = {}) => ({
    id: 1,
    accountId: 1,
    categoryId: 1,
    amount: 50.00,
    description: 'Test transaction',
    date: mockDate,
    type: 'expense',
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  }),

  // Helper to create serialized mock data (for API responses)
  createMockTransactionSerialized: (overrides = {}) => ({
    id: 1,
    accountId: 1,
    categoryId: 1,
    amount: 50.00,
    description: 'Test transaction',
    date: mockDate.toISOString(),
    type: 'expense',
    createdAt: mockDate.toISOString(),
    updatedAt: mockDate.toISOString(),
    ...overrides,
  }),

  // Helper to create mock JWT payload
  createMockJWTPayload: (overrides = {}) => ({
    userId: 1,
    iat: Math.floor(mockDate.getTime() / 1000),
    exp: Math.floor(mockDate.getTime() / 1000) + 86400, // 24 hours
    ...overrides,
  }),
};