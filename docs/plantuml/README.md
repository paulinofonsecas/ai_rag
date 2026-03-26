# PlantUML Diagrams

This folder contains PlantUML source files for system architecture and end-to-end flows.

## Files
- `system-architecture.puml`: high-level architecture (API, worker, queue, database, embedding provider)
- `e2e-flows.puml`: request and async processing sequence diagrams
- `search-db-embeddings-ai.puml`: detailed search sequence with DB FTS, pgvector, embeddings and AI reranking
- `c4-model.puml`: C4-based diagrams (Level 1 Context, Level 2 Containers, Level 3 Components)

## How to View in VS Code
1. Install extension: `jebbs.plantuml` (PlantUML).
2. Open any `.puml` file in this folder.
3. Run command: `PlantUML: Preview Current Diagram`.
4. Optional export: `PlantUML: Export Current Diagram`.

## Notes
- Diagrams use only local PlantUML syntax and no external include.
- Keep aliases stable to simplify future updates.
