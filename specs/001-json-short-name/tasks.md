---
description: 'Task list for Chat Support feature'
---

# Tasks: Chat Support

**Input**: Design documents from `/specs/001-json-short-name/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create project structure for chat support per plan.md
- [x] T002 Initialize backend (NestJS) and frontend (Next.js) with dependencies
- [x] T003 [P] Configure linting, formatting, and commit hooks
- [ ] T004 [P] Setup environment configuration for chat and product search

---

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T005 Setup database schema for chat, messages, and artifacts in sql/001_init_hybrid_search.sql
- [ ] T006 [P] Implement base entities: ChatSession, Message, Product, Artifact in src/domain/entities/
- [ ] T007 [P] Setup API routing and middleware in src/presentation/controllers/
- [ ] T008 Configure error handling and logging in src/infrastructure/
- [ ] T009 Setup authentication and user context in src/infrastructure/

---

## Phase 3: User Story 1 - Conversational Product Search (Priority: P1) 🎯 MVP

**Goal**: Permitir ao usuário buscar produtos via chat usando linguagem natural ou pesquisa estruturada.
**Independent Test**: Enviar perguntas e pesquisas no chat e receber produtos relevantes.

- [ ] T010 [P] [US1] Implement chat controller in src/presentation/controllers/chat.controller.ts
- [ ] T011 [P] [US1] Implement chat service logic in src/application/services/chat.service.ts
- [ ] T012 [P] [US1] Integrate product search in src/application/services/product-search.service.ts
- [ ] T013 [US1] Implement message parsing and intent detection in src/application/services/message-parser.service.ts
- [ ] T014 [US1] Add tests for chat and product search in tests/integration/chat-search.test.ts

---

## Phase 4: User Story 2 - Product Embedding in Chat (Priority: P2)

**Goal**: Permitir que o chat incorpore informações de produtos diretamente na conversa.
**Independent Test**: Mensagem que referencia produto exibe detalhes no chat.

- [ ] T015 [P] [US2] Implement product embedding logic in src/application/services/product-embed.service.ts
- [ ] T016 [US2] Update chat controller to support embedded product artifacts in src/presentation/controllers/chat.controller.ts
- [ ] T017 [US2] Add UI component for product card in frontend/app/components/ProductCard.tsx
- [ ] T018 [US2] Add tests for product embedding in tests/integration/product-embed.test.ts

---

## Phase 5: User Story 3 - Interpretation and Artifact Generation (Priority: P3)

**Goal**: Gerar artefatos (sumários, recomendações, links) a partir das mensagens do usuário.
**Independent Test**: Mensagens complexas geram artefatos apropriados no chat.

- [ ] T019 [P] [US3] Implement artifact generation logic in src/application/services/artifact.service.ts
- [ ] T020 [US3] Update message parser to trigger artifact generation in src/application/services/message-parser.service.ts
- [ ] T021 [US3] Add UI component for artifact display in frontend/app/components/ArtifactCard.tsx
- [ ] T022 [US3] Add tests for artifact generation in tests/integration/artifact-generation.test.ts

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T023 [P] Update documentation in docs/api.md and docs/architecture.md
- [ ] T024 Code cleanup and refactoring across backend and frontend
- [ ] T025 Performance optimization for chat and search flows
- [ ] T026 [P] Add additional unit tests in tests/unit/
- [ ] T027 Security review and hardening for chat endpoints
- [ ] T028 Run quickstart validation in specs/001-json-short-name/quickstart.md

---

## Dependencies & Execution Order

- Setup (Phase 1) → Foundational (Phase 2) → User Stories (Phases 3-5) → Polish (Phase 6)
- User stories can be implemented in parallel after foundational phase
- Each user story is independently testable

## Parallel Execution Examples

- T003, T004 can run in parallel
- T006, T007 can run in parallel
- T010, T011, T012 can run in parallel
- T015, T017 can run in parallel
- T019, T021 can run in parallel
- All test tasks ([P]) can run in parallel

## Implementation Strategy

- MVP: Complete User Story 1 (Phase 3) for first demo
- Incremental: Add User Stories 2 and 3 in sequence or parallel
- Polish: Finalize with cross-cutting improvements and documentation
