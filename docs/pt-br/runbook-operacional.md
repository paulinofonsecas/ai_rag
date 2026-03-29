# Runbook Operacional

## Checklist de Saúde

- API online
- Worker online
- PostgreSQL acessível
- Redis acessível
- fila sem crescimento anormal

Validação sugerida:

- `docker compose ps`
- `docker compose logs api --tail 200`
- `docker compose logs worker --tail 200`
- smoke test HTTP: `GET /search?q=mouse&limit=1`

NOTE: atualmente não há endpoint dedicado de healthcheck HTTP no backend.

## Incidentes Comuns

### Busca voltando apenas lexical

Sintomas:

- resultados com baixa relevância semântica
- latência variável no passo de embedding/rerank

Ações:

- validar `EMBEDDING_API_KEY`
- verificar disponibilidade do provedor de embedding
- checar logs de erro de embedding na API
- testar com `rerank=false` para isolar impacto do reranker

### Produto criado sem embedding

Sintomas:

- `POST /products` retorna `queued_for_embedding`, mas status não evolui para `completed`

Ações:

- validar se worker está rodando
- validar Redis
- conferir se há retries/falhas na fila BullMQ
- checar stream `GET /products/:productId/stream` para estado `failed`

### Latência alta na busca

Sintomas:

- p95 elevado em `GET /search` ou `GET /search/stream`

Ações:

- confirmar índices vetoriais e FTS (HNSW/GIN)
- reduzir `limit` e/ou `rerankCandidates`
- desativar `rerank` temporariamente para mitigação
- revisar plano de execução no PostgreSQL

## Procedimento de Mitigação Rápida

1. Reduzir carga de busca pesada:
   - usar `rerank=false` em chamadas críticas
   - reduzir `rerankCandidates`
2. Confirmar worker e redis estáveis:
   - reiniciar serviços afetados se necessário
3. Monitorar logs por 10-15 minutos antes de rollback adicional.

## Rollback Seguro (Aplicação)

1. Reverter configuração/versão da API.
2. Manter worker ativo para drenar fila pendente.
3. Validar fluxo mínimo:
   - criar produto
   - acompanhar status de ingestão
   - executar busca simples
