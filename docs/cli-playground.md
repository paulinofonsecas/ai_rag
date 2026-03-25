# CLI Playground

## Purpose
Fast interactive validation of ingestion and search workflows without HTTP clients.

## Command
- `npm run playground -- <command> [args]`

## Commands
### ingest
Required args:
- `--name`
- `--description`
- `--category`

Example:
- `npm run playground -- ingest --name "MX Master 3" --description "Wireless ergonomic mouse" --category "peripherals"`

### search
Required args:
- `--query`

Optional args:
- `--limit` (default 10)
- `--offset` (default 0)
- `--rrfk` (default 60)

Example:
- `npm run playground -- search --query "ergonomic wireless mouse" --limit 5 --offset 0 --rrfk 60`

## Output
Structured logs with result list and RRF/semantic/lexical scoring fields.
