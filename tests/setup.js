/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

// Suppress console output during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console output in tests
  if (process.env.SHOW_TEST_LOGS !== 'true') {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restore console
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
global.testUtils = {
  /**
   * Wait for a condition to be true
   */
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error('Timeout waiting for condition');
  },

  /**
   * Create a mock response
   */
  createMockResponse: (data = {}, status = 200) => ({
    status,
    data,
    headers: {},
    config: {}
  }),

  /**
   * Create a mock error
   */
  createMockError: (message = 'Test error', code = 'TEST_ERROR') => {
    const error = new Error(message);
    error.code = code;
    return error;
  },

  /**
   * Mock file system
   */
  mockFileSystem: (files = {}) => {
    const fs = require('fs').promises;
    
    jest.spyOn(fs, 'readFile').mockImplementation(async (path) => {
      if (files[path]) {
        return files[path];
      }
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    });

    jest.spyOn(fs, 'writeFile').mockImplementation(async (path, content) => {
      files[path] = content;
      return undefined;
    });

    jest.spyOn(fs, 'access').mockImplementation(async (path) => {
      if (!files[path]) {
        throw new Error(`ENOENT: no such file or directory, access '${path}'`);
      }
    });

    jest.spyOn(fs, 'mkdir').mockImplementation(async () => undefined);

    return {
      getFiles: () => files,
      restore: () => {
        fs.readFile.mockRestore();
        fs.writeFile.mockRestore();
        fs.access.mockRestore();
        fs.mkdir.mockRestore();
      }
    };
  },

  /**
   * Mock process.platform
   */
  mockPlatform: (platform) => {
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', {
      value: platform
    });
    return () => {
      Object.defineProperty(process, 'platform', originalPlatform);
    };
  }
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MAK3R_HUB_TEST = 'true';

// Increase test timeout for CI environments
if (process.env.CI) {
  jest.setTimeout(30000);
}