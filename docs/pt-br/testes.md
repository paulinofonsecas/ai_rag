# Testes e Cobertura

## Ferramentas

- Jest
- ts-jest

Configuração principal:

- `testEnvironment: node`
- `collectCoverage: true`
- `roots: <rootDir>/src`

## Comandos

- `npm run test`
- `npm run test:watch`
- `npm run test:coverage`

## Escopo Atual

- `RrfService`
- `HybridSearchOrchestrator`
- `SearchProductsUseCase`
- `IngestProductUseCase`
- `SearchController`
- `ProductController`
- `ProductWriteAdapter`

NOTE: o teste de `RrfService` hoje é um teste simples de placeholder (smoke/legado) e deve ser evoluído para cenários de ranking reais.

## Política de Cobertura

Threshold global definido em `jest.config.cjs`:

- branches: 80%
- functions: 85%
- lines: 85%
- statements: 85%

Arquivos excluídos da cobertura:

- `src/main.ts`
- `src/workers/main.worker.ts`
- `src/**/index.ts`

## Recomendações de Próximos Testes

- testes de integração para adapters PostgreSQL (com banco efêmero)
- testes do processor de fila cobrindo falha do provider de embedding
- cenários e2e do fluxo completo:
  - `POST /products` -> fila -> worker -> embedding persistido
  - `GET /search` com e sem `rerank`
