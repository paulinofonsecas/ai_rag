# Playground CLI

## Comando

- `npm run playground -- <command> [args]`

Comandos disponíveis:

- `ingest`
- `search`

## ingest

Obrigatórios:

- `--name`
- `--description`
- `--category`

Exemplo:

- `npm run playground -- ingest --name "MX Master 3" --description "Wireless ergonomic mouse" --category "peripherals"`

Saída esperada:

- log `playground.ingest.ok` com `productId`

## search

Obrigatório:

- `--query`

Opcionais:

- `--limit` (padrão 10)
- `--offset` (padrão 0)
- `--rrfk` (padrão 60)
- `--rerank` (padrão `true`, use `--rerank false` para desativar)
- `--rerank-candidates` (padrão 40)

Exemplo:

- `npm run playground -- search --query "ergonomic wireless mouse" --limit 5 --offset 0 --rrfk 60`

Exemplo sem rerank:

- `npm run playground -- search --query "ergonomic wireless mouse" --rerank false`

Exemplo com mais candidatos para rerank:

- `npm run playground -- search --query "ergonomic wireless mouse" --rerank true --rerank-candidates 60`

Saída esperada:

- log `playground.search.ok`
- `count` + lista de itens com `id`, `name`, `rrfScore`, `semanticScore`, `lexicalScore`

## Erros comuns

- `Missing required args for ingest: --name --description --category`
- `Missing required arg for search: --query`
