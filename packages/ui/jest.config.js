const shared = require('../../jest.shared');

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: shared.transformIgnorePatterns,
  moduleNameMapper: shared.moduleNameMapper,
};
