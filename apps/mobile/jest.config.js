const shared = require('../../jest.shared');

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.js'],
  setupFilesAfterEnv: ['./jest.after-env.js'],
  transformIgnorePatterns: shared.transformIgnorePatterns,
  moduleNameMapper: {
    ...shared.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
