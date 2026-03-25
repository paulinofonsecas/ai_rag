# Runbook Operacional

## Checklist de Saúde
- API online
- Worker online
- PostgreSQL acessível
- Redis acessível
- fila sem crescimento anormal

## Incidentes Comuns

### Busca voltando apenas lexical
- validar `EMBEDDING_API_KEY`
- verificar disponibilidade do provedor de embedding
- checar logs de erro de embedding

### Produto criado sem embedding
- validar se worker está rodando
- validar Redis
- inspecionar jobs falhos no BullMQ

### Latência alta na busca
- confirmar índices HNSW e GIN
- reduzir top-k por método
- revisar plano de execução no PostgreSQL
