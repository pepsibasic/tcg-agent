# Roadmap: Gacha Portfolio Agent

## Overview

Build a rules+LLM hybrid portfolio intelligence service embedded in the Gacha collectibles platform. The work proceeds in a strict dependency order: monorepo scaffold and data contracts first, then the deterministic rules engine (which must be locked before any LLM work begins), then the LLM client and prompt infrastructure, then the agent orchestrators and API endpoints that compose everything into user-facing functionality, and finally the observability and hardening layer that makes the system production-trustworthy. Every card interaction should surface a clear "what next?" action — this goal drives all five phases.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Monorepo scaffold, Zod schemas, Prisma data model, and seed data (completed 2026-03-04)
- [ ] **Phase 2: Rules Engine** - Deterministic card action eligibility and vault conversion logic (no LLM)
- [ ] **Phase 3: LLM Layer** - LLM client, prompt templates, retry/fallback, compliance guard, and safety
- [ ] **Phase 4: Agent Orchestrators and API** - End-to-end agent flows, all REST endpoints, and shareable identity
- [ ] **Phase 5: Observability, Hardening, and Testing** - Structured logs, actions audit, schema tests, and HTTP journey tests

## Phase Details

### Phase 1: Foundation
**Goal**: The monorepo structure, shared Zod schemas, Prisma data model, and seed data are in place so every subsequent package has a stable, typed foundation to build on
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05
**Success Criteria** (what must be TRUE):
  1. `pnpm install && pnpm build` succeeds across all four packages (apps/api, packages/agent, packages/schemas, packages/db) with no type errors
  2. `prisma migrate dev` runs against a local Postgres instance and produces all tables including user_cards state enum and priceFetchedAt/priceConfidence columns
  3. Zod schemas for CardAnalysis, PortfolioSummary, CollectorArchetype, and Action types can be imported from packages/schemas and all LLM-facing fields use z.nullable() (not z.optional())
  4. `pnpm db:seed` populates the local database with cards in all states (vaulted, external, on_market, in_transit) and at least two user scenarios
  5. Turborepo build pipeline respects the schemas -> db -> agent -> api dependency order
**Plans:** 4/4 plans complete

Plans:
- [ ] 01-01-PLAN.md — Monorepo scaffold with pnpm + Turborepo + all 4 package skeletons
- [ ] 01-02-PLAN.md — Zod schemas for all agent output types (LLM + API) with unit tests
- [ ] 01-03-PLAN.md — Prisma 7 data model, migration, and client singleton
- [ ] 01-04-PLAN.md — Seed data fixtures and end-to-end build verification

### Phase 2: Rules Engine
**Goal**: A fully-tested deterministic rules engine computes eligible actions per card state and vault conversion candidates — the sole source of truth for the actions field in any card analysis, with no LLM involvement
**Depends on**: Phase 1
**Requirements**: RULE-01, RULE-02, RULE-03, VAULT-01, VAULT-02, VAULT-03
**Success Criteria** (what must be TRUE):
  1. `computeEligibleActions(card)` returns the correct action set for every card state (vaulted, external, on_market, in_transit) — verified by unit tests with no HTTP or LLM dependency
  2. BUYBACK, LIST, REDEEM, SHIP_TO_VAULT, OPEN_PACK, WATCHLIST, and BUNDLE_SHIP actions each include params, ui_copy, and risk_notes fields
  3. `computeVaultConversionCandidates(cards)` returns SHIP_TO_VAULT recommendations when an external card value meets the configurable threshold or when batch shipping conditions are met
  4. A vault recommendation response always includes the "unlocks" reasons (instant liquidity, trade into packs, verified portfolio ranking)
  5. Rules engine unit tests cover all card states × all action types and pass with zero failures
**Plans:** 3 plans

Plans:
- [ ] 02-01-PLAN.md — Test infrastructure, type contracts, state dispatcher, and shared WATCHLIST builder
- [ ] 02-02-PLAN.md — Per-card action eligibility for all 4 states (TDD)
- [ ] 02-03-PLAN.md — Vault conversion candidates with single-card and batch thresholds (TDD)

### Phase 3: LLM Layer
**Goal**: A reliable LLM client abstracts provider differences, validates all outputs against Zod schemas with retry-and-feedback logic, scrubs compliance-violating language, and serves versioned prompt templates — with full observability at every failure point
**Depends on**: Phase 2
**Requirements**: LLM-01, LLM-02, LLM-03, LLM-04, LLM-05
**Success Criteria** (what must be TRUE):
  1. `generateStructured<T>(schema, prompt)` works against both OpenAI and Anthropic providers by changing only a config value — no code changes required to switch
  2. When an LLM response fails Zod validation, the retry appends the validation error to the next prompt, and after max retries a typed AnalysisFailure response is returned instead of throwing or silently degrading
  3. Any LLM output containing financial advice language (profit guarantees, buy/sell/hold directives, price prediction certainty) is detected and replaced by the compliance guard before reaching the API response
  4. User-supplied card names and notes are sanitized and wrapped in XML-delimited context tags before prompt interpolation — raw user strings never appear directly in prompt instructions
  5. Prompt templates for card narrative, portfolio summary, and archetype identity are registered in the prompt store and can be rendered with slot injection
**Plans**: TBD

### Phase 4: Agent Orchestrators and API
**Goal**: All three agent orchestrators (card analysis, portfolio summary, archetype detection) compose the rules engine and LLM layer into complete user-facing flows, exposed via REST endpoints that accept requests and return validated JSON
**Depends on**: Phase 3
**Requirements**: CARD-01, CARD-02, CARD-03, CARD-04, PORT-01, PORT-02, PORT-03, EXTC-01, EXTC-02, EXTC-03, VAULT-04, IDENT-01, IDENT-02, IDENT-03, API-01, API-02, API-03, API-04, API-05, API-06
**Success Criteria** (what must be TRUE):
  1. `POST /agent/card/analyze` returns CardAnalysis JSON with identity_tags, rarity_signal, liquidity_signal, price_band, reasoning_bullets, confidence, and eligible actions — where eligible actions come exclusively from the rules engine, not the LLM
  2. After a simulated pack pull, each pulled card receives a CardAnalysis response with contextual "what next?" actions appropriate to the pull event
  3. `POST /agent/portfolio/summary` returns PortfolioSummary that includes both vaulted and external cards, a concentration score, a liquidity score, and recommended actions
  4. A user can upload an external card via `POST /external-cards` (title, set, grade, cert number, estimated value) and it immediately appears in the portfolio view with read-only intelligence (analysis but no Gacha economy actions)
  5. `POST /agent/archetype` returns CollectorArchetype with name, traits, why, comparable_collectors, share_card_text, and share_card_badges — as exportable JSON with short text
  6. `POST /vault/shipments` creates a shipment intent stub and logs the action; `POST /actions/execute` logs the executed action with card state
**Plans**: TBD

### Phase 5: Observability, Hardening, and Testing
**Goal**: Every agent operation produces structured logs with request IDs, every user action is audited, LLM validation failures are captured with diagnostic context, and unit + integration tests verify the full system from HTTP request to JSON response
**Depends on**: Phase 4
**Requirements**: API-07, OBS-01, OBS-02, OBS-03, TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. Every API endpoint emits structured logs including a request ID that can be used to trace a request across all agent operations
  2. The actions log records both what the agent recommended and which action the user clicked — queryable by user and card
  3. LLM validation failures are logged with card_id, model, error path (zodError.issues), and truncated raw output — a developer can diagnose a prompt failure from the log alone
  4. Vitest unit tests for all Zod schemas pass with both valid and invalid inputs across all schema types
  5. Vitest unit tests for the rules engine cover all card states × action eligibility combinations with no failures
  6. Integration tests via HTTP verify all four MVP user journeys: pack pull → card analysis, external upload → portfolio appearance, portfolio summary request, and shareable archetype export
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete   | 2026-03-04 |
| 2. Rules Engine | 0/3 | Planning complete | - |
| 3. LLM Layer | 0/TBD | Not started | - |
| 4. Agent Orchestrators and API | 0/TBD | Not started | - |
| 5. Observability, Hardening, and Testing | 0/TBD | Not started | - |

---
*Roadmap created: 2026-03-04*
