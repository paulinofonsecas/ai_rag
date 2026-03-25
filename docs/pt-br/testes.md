# Testes e Cobertura

## Ferramentas
- Jest
- ts-jest

## Comandos
- `npm test`
- `npm run test:watch`
- `npm run test:coverage`

## Escopo Atual
- `RrfService`
- `HybridSearchOrchestrator`
- `SearchProductsUseCase`
- `IngestProductUseCase`
- `SearchController`
- `ProductController`

## Política de Cobertura
Threshold global definido em `jest.config.ts`:
- branches: 80%
- functions: 85%
- lines: 85%
- statements: 85%
