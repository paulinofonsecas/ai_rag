# Estudo Técnico: IA na Pesquisa de Produtos

## Resumo Executivo

Este estudo recomenda evoluir a arquitetura atual de busca híbrida com uma estratégia incremental, preservando PostgreSQL + pgvector + FTS + RRF e adicionando capacidades de intenção, reranking e recomendação em camadas.

Resultado esperado para negócio:

- maior relevância de resultados
- melhor experiência de busca em linguagem natural
- aumento de descoberta de produtos

Decisão proposta:

- aprovar a Opção A (evolução incremental)
- executar roadmap em fases com gates de custo, latência e qualidade

NOTE: este documento é de direcionamento técnico-estratégico e deve ser validado formalmente por Tech Lead e Produto antes do rollout amplo.

## 1. Contexto e Objetivo

### Contexto atual (baseline)

- backend NestJS com separação Domain/Application/Infrastructure/Presentation
- busca híbrida ativa: semântica (pgvector) + lexical (PostgreSQL FTS) com fusão RRF
- pipeline assíncrono de ingestão com BullMQ para embeddings
- integração ativa com Google Gemini
- PostgreSQL como banco principal

### Objetivo do estudo

Definir a melhor estratégia técnica para escalar pesquisa inteligente com IA, minimizando risco operacional no curto prazo e mantendo opção de evolução para cenários de alta escala.

## 2. Escopo

Itens considerados:

- pesquisa semântica
- embeddings de produtos
- busca por linguagem natural
- ranking inteligente
- recomendação orientada por intenção

Fora do escopo imediato:

- migração completa para stack self-hosted de IA no curto prazo
- substituição total de PostgreSQL por vector DB externo nesta etapa

## 3. Alternativas Avaliadas

### 3.1 APIs de IA

| Opção                   | Uso principal                                 | Vantagens                                                               | Desvantagens                                                    |
| ----------------------- | --------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| Google Gemini (atual)   | Embeddings e possível reranking/classificação | Integração existente, menor esforço inicial, boa relação custo/latência | Dependência de provedor externo                                 |
| OpenAI                  | Embeddings/reranking                          | Ecossistema maduro e documentação ampla                                 | Troca de provedor, possível aumento de custo em alguns cenários |
| Open-source self-hosted | Embeddings/reranking local                    | Controle de dados e custo previsível em alto volume                     | Alta complexidade operacional (GPU, observabilidade, MLOps)     |

### 3.2 Camada vetorial

| Opção                          | Vantagens                                                                       | Desvantagens                                         | Fit com cenário atual |
| ------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------- |
| pgvector no PostgreSQL (atual) | Simplicidade operacional, menos componentes, integração com dados transacionais | Limites de escala comparado a engines especializadas | Alto                  |
| Pinecone                       | Escalabilidade e recursos especializados                                        | Custo adicional e nova dependência externa           | Médio                 |
| Weaviate                       | Flexibilidade e recursos de busca semântica                                     | Operação mais complexa que manter no PostgreSQL      | Médio                 |

## 4. Arquiteturas Candidatas

### Opção A: Evolução da arquitetura atual (recomendada)

- manter PostgreSQL + pgvector + FTS
- expandir camada de IA para intenção, reranking e recomendação
- preservar pipeline assíncrono no worker

Prós:

- menor risco de entrega
- menor custo de transição
- reaproveitamento da base existente

Contras:

- escalabilidade vetorial exige tuning contínuo
- recomendação avançada pode demandar novos componentes

### Opção B: Híbrida com vector DB externo

- manter transacional no PostgreSQL
- mover busca vetorial para Pinecone/Weaviate
- manter FTS e fusão no backend

Prós:

- melhor escalabilidade vetorial de longo prazo
- recursos especializados de similaridade

Contras:

- maior complexidade de integração e operação
- aumento de custo recorrente

### Opção C: Plataforma IA self-hosted end-to-end

- modelos open-source para embedding/reranking
- infraestrutura dedicada de inferência

Prós:

- governança e controle de dados
- potencial redução de custo unitário em altíssimo volume

Contras:

- alto esforço inicial
- risco operacional elevado
- necessidade de maturidade MLOps/SRE

## 5. Recomendação Corporativa

Recomenda-se aprovar a Opção A para curto e médio prazo.

Racional executivo:

- time-to-value mais rápido
- menor exposição a risco técnico/operacional
- manutenção da opcionalidade estratégica para migração parcial futura

TIP: tratar Opção B como trilha de contingência condicionada a gatilhos objetivos de escala/custo.

## 6. Arquitetura Alvo (Faseada)

### 6.1 Fluxo de ingestão

1. Cadastro/atualização de produto
2. Publicação de evento na fila
3. Worker gera embedding
4. Persistência em PostgreSQL (pgvector)
5. Atualização de metadados de busca e observabilidade

### 6.2 Fluxo de consulta

1. Usuário envia consulta em linguagem natural
2. Backend classifica intenção (navegação, comparação, descoberta)
3. Execução paralela:
   - busca semântica via pgvector
   - busca lexical via FTS
4. Fusão por RRF
5. Reranking dos candidatos finais
6. Resposta com sinais de explicabilidade (scores e etapa dominante)

### 6.3 Recomendação por intenção

- classificador leve (regra + IA)
- bloco contextual no frontend:
  - itens similares
  - itens complementares
  - tendência por categoria

## 7. Modelo de Custos e Gestão Financeira

### 7.1 Fórmulas de referência

- Custo de ingestão:

$$C_{ingestao} = N_{produtos} \times Tokens_{medio} \times Preco_{embedding}$$

- Custo de consulta inteligente:

$$C_{consulta} = N_{consultas} \times (Preco_{classificacao} + Preco_{rerank})$$

- Custo mensal total:

$$C_{mensal} = C_{ingestao} + C_{consulta} + C_{infra}$$

### 7.2 Faixas indicativas

| Cenário | Volume mensal              | Faixa de custo estimada | Direcionamento                                       |
| ------- | -------------------------- | ----------------------- | ---------------------------------------------------- |
| Baixo   | até 50 mil consultas       | Baixo                   | Operar na stack atual                                |
| Médio   | 50 mil a 500 mil consultas | Médio                   | Tuning de índices, cache e filas                     |
| Alto    | acima de 500 mil consultas | Alto                    | Avaliar vector DB externo e otimização de inferência |

WARNING: valores são referenciais e precisam ser revalidados no pricing oficial no momento de contratação.

Controle recomendado:

- painel financeiro por 1.000 consultas
- painel financeiro por 1.000 produtos ingeridos
- alerta de desvio de custo unitário por feature

## 8. Performance, SLIs e Escalabilidade

Recomendações técnicas:

- manter top-k por etapa
- cachear embeddings de consultas repetidas
- usar indexação apropriada (HNSW para vetor, GIN para FTS)
- monitorar latência p50/p95/p99 por etapa
- desacoplar picos de ingestão com fila e backpressure

SLIs sugeridos:

- latência de busca p95 < 500 ms (sem reranking pesado)
- latência de busca p95 < 900 ms (com reranking)
- taxa de erro de busca < 1%
- custo por consulta dentro da meta definida pelo negócio

## 9. Roadmap e Complexidade

| Fase   | Escopo                                              | Complexidade | Esforço estimado | Gate de saída                                           |
| ------ | --------------------------------------------------- | ------------ | ---------------- | ------------------------------------------------------- |
| Fase 1 | Intenção básica + ajustes de ranking na stack atual | Média        | 2 a 4 semanas    | KPI de relevância e latência estáveis                   |
| Fase 2 | Reranking avançado + recomendação contextual        | Média/Alta   | 3 a 6 semanas    | ganho comprovado em NDCG/CTR                            |
| Fase 3 | Escala avançada (opcional: vector DB externo)       | Alta         | 4 a 8 semanas    | justificativa econômica e técnica para migração parcial |

## 10. Riscos e Mitigações

| Risco                                   | Impacto    | Mitigação                                                     |
| --------------------------------------- | ---------- | ------------------------------------------------------------- |
| Custo de IA acima do previsto           | Alto       | limites por feature, cache e monitoramento por custo unitário |
| Latência alta em pico                   | Alto       | top-k adaptativo, fila assíncrona e observabilidade por etapa |
| Dependência forte de fornecedor         | Médio      | abstração de provider e testes de fallback                    |
| Relevância inconsistente por categoria  | Médio      | dataset de avaliação por categoria e tuning mensal            |
| Complexidade operacional no crescimento | Médio/Alto | roadmap faseado com gatilhos claros de mudança arquitetural   |

## 11. Governança e Critérios de Decisão

### 11.1 RACI simplificado

| Tema                       | Responsável primário  | Coparticipantes                |
| -------------------------- | --------------------- | ------------------------------ |
| Arquitetura e trade-offs   | Tech Lead             | Engenharia Backend, Plataforma |
| KPI de relevância e metas  | Produto               | Dados/Analytics, Engenharia    |
| Custo e orçamento          | Produto/Financeiro    | Tech Lead                      |
| Operação e observabilidade | Engenharia/Plataforma | SRE (quando aplicável)         |

### 11.2 Critérios de aprovação

| Critério                          | Status   | Evidência                                      |
| --------------------------------- | -------- | ---------------------------------------------- |
| Documento técnico consolidado     | Atendido | Este documento                                 |
| Arquitetura sugerida definida     | Atendido | Seções 4, 5 e 6                                |
| Riscos mapeados com mitigação     | Atendido | Seção 10                                       |
| Validação formal em fórum técnico | Pendente | Reunião de arquitetura com Tech Lead e Produto |

## 12. Plano de Implementação, Verificação e Rollback

### 12.1 Verificação mínima por fase

- baseline de relevância (NDCG, CTR, conversão por busca)
- latência p95 por etapa
- custo unitário por consulta/produto
- taxa de erro operacional

### 12.2 Rollback

- manter feature flags para intenção/rerank/recomendação
- desativar camadas adicionais sem remover fluxo base híbrido
- preservar fallback para busca lexical + semântica com RRF

## 13. Open Questions

- TODO: definir orçamento mensal alvo por faixa de volume
- TODO: formalizar limiar objetivo para migrar parcial vetorial para solução externa
- TODO: definir dataset de avaliação por categoria e cadência de recalibração
- TODO: confirmar estratégia de fallback entre provedores de IA

## 14. Próximos Passos

1. Validar este estudo com Tech Lead e Produto.
2. Definir baseline e metas de KPI (NDCG, CTR, conversão por busca).
3. Executar piloto controlado da Fase 1.
4. Revisar custo unitário e latência após 2 semanas de piloto.
5. Deliberar go/no-go da Fase 2 em comitê técnico-produto.
