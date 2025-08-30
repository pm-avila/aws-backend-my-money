module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!**/node_modules/**',
    '!**/coverage/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/controllers/': {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/middlewares/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    }
  },
  
  // Module mocking
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Transform and module paths
  modulePathIgnorePatterns: ['<rootDir>/node_modules/'],
  
  // Timeout for async operations
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
};