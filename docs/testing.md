# Testing and Coverage

## Tooling
- Jest
- ts-jest
- Coverage thresholds in `jest.config.ts`

## Commands
- `npm test`
- `npm run test:watch`
- `npm run test:coverage`

## Current Test Scope
- `RrfService`
- `HybridSearchOrchestrator`
- `SearchProductsUseCase`
- `IngestProductUseCase`
- `SearchController`
- `ProductController`

## Coverage Policy
Global threshold:
- branches: 80%
- functions: 85%
- lines: 85%
- statements: 85%

## Recommended Next Additions
- integration tests for Postgres adapters against ephemeral DB
- queue processor tests with mocked embedding provider failures
- e2e tests for `/products` -> worker -> `/search` flow
