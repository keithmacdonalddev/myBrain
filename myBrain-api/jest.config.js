export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/test/**/*.js',
  ],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['./src/test/setup.js'],
  testTimeout: 10000,
  verbose: true,
  // Run tests sequentially to prevent worker crashes on Windows
  // Jest workers can exceed child process retry limits on Windows with parallel execution
  maxWorkers: 1,
  // Help identify unclosed handles that might cause worker issues
  detectOpenHandles: true,
  // Force exit after tests complete to prevent hanging
  forceExit: true,
};
