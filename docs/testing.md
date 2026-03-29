# Testing and Coverage

## Tooling

- Jest
- ts-jest

Main configuration:

- `testEnvironment: node`
- `collectCoverage: true`
- `roots: <rootDir>/src`

## Commands

- `npm run test`
- `npm run test:watch`
- `npm run test:coverage`

## Current Test Scope

- `RrfService`
- `HybridSearchOrchestrator`
- `SearchProductsUseCase`
- `IngestProductUseCase`
- `SearchController`
- `ProductController`
- `ProductWriteAdapter`

NOTE: the `RrfService` test is currently a placeholder/smoke test and should be expanded with real ranking scenarios.

## Coverage Policy

Global threshold defined in `jest.config.cjs`:

- branches: 80%
- functions: 85%
- lines: 85%
- statements: 85%

Coverage exclusions:

- `src/main.ts`
- `src/workers/main.worker.ts`
- `src/**/index.ts`

## Recommended Next Additions

- integration tests for Postgres adapters against ephemeral DB
- queue processor tests with mocked embedding provider failures
- e2e tests for `/products` -> worker -> `/search` flow
