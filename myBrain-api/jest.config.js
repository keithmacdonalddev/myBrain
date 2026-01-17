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
};
