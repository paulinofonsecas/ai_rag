/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/application/**/*.ts',
    'src/domain/**/*.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  coverageThreshold: {
    global: {
      branches: 55,
      functions: 90,
      lines: 85,
      statements: 85,
    },
  },
};

module.exports = config;
