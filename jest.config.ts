import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/workers/main.worker.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};

export default config;
