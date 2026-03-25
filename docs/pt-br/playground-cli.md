# Playground CLI

## Comando
- `npm run playground -- <command> [args]`

## ingest
Obrigatórios:
- `--name`
- `--description`
- `--category`

Exemplo:
- `npm run playground -- ingest --name "MX Master 3" --description "Wireless ergonomic mouse" --category "peripherals"`

## search
Obrigatório:
- `--query`

Opcionais:
- `--limit` (padrão 10)
- `--offset` (padrão 0)
- `--rrfk` (padrão 60)

Exemplo:
- `npm run playground -- search --query "ergonomic wireless mouse" --limit 5 --offset 0 --rrfk 60`
