# Gacha Portfolio Agent

## What This Is

A rules+LLM hybrid portfolio intelligence service embedded in the Gacha collectibles platform. Analyzes card holdings (vaulted and external), surfaces actionable next steps within the Gacha economy (sell/buyback, list, redeem, ship, trade into packs), and generates shareable Collector Identity summaries. Deterministic rules engine controls action eligibility; LLM provides narrative quality and archetype inference.

## Core Value

Every card interaction surfaces a clear, contextual "what next?" action — turning passive collectors into active participants in the Gacha economy.

## Requirements

### Validated

- ✓ Card analysis engine with state-aware action eligibility — v1.0
- ✓ Portfolio summary with concentration/liquidity signals — v1.0
- ✓ Collector archetype inference with shareable badges — v1.0
- ✓ External card upload and portfolio integration — v1.0
- ✓ Vault conversion incentive logic with batch thresholds — v1.0
- ✓ Deterministic rules engine (sole source of action eligibility) — v1.0
- ✓ LLM layer with provider abstraction, retry/fallback, compliance guard — v1.0
- ✓ 7 REST API endpoints with structured logging — v1.0
- ✓ Zod schemas for all agent outputs with runtime validation — v1.0
- ✓ Prisma data model with seed data fixtures — v1.0
- ✓ Prompt-schema alignment with contract tests — v1.0
- ✓ 4 MVP user journeys testable via HTTP — v1.0

### Active

- [ ] Price history trend signal (daily delta vs 30-day average)
- [ ] Portfolio concentration alerts at configurable thresholds
- [ ] Image-based card recognition for upload flow
- [ ] Real-time price feeds from external data sources
- [ ] Image rendering for Collector Identity share cards
- [ ] CSV export of portfolio data
- [ ] Redis LLM result caching
- [ ] Adversarial prompt test suite

### Out of Scope

- Full marketplace UI — agent provides hooks, not a replacement
- Pack-opening UI — only post-pull analysis
- Direct "buy/sell/hold" financial advice — signals and options only (regulatory)
- Real PSA cert scraping — PSA ToS prohibits; stub with stored grade sufficient
- Mobile app — API-first; embed in existing Gacha web UI
- Real-time chat/conversational agent — deterministic request/response pattern
- Social feed / community features — shareable identity covers social touchpoints
- Profit/loss tax reporting — regulatory risk; export raw data instead

## Context

Shipped v1.0 with 26,517 LOC TypeScript across 4 packages.
Tech stack: pnpm monorepo, Turborepo, Fastify, Prisma, Vercel AI SDK, Zod, Vitest.
326 tests passing (102 schema, 102 rules, 13 contract, 14 HTTP journey, others).
5 low-severity tech debt items documented (Nyquist validation, double-write, identity trigger stub, migration not live-tested, journey test fixture gap).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fastify over NestJS | Lighter weight, faster startup, simpler for service-oriented architecture | ✓ Good — clean plugin system, fast DX |
| Rules+LLM hybrid | Deterministic action eligibility (no hallucinated actions) + LLM for narrative quality | ✓ Good — strict separation maintained across all phases |
| Zod for all schemas | Runtime validation of LLM outputs, shared types between API and agent | ✓ Good — caught prompt-schema drift, enabled contract tests |
| pnpm monorepo | packages/agent, packages/schemas, packages/db, apps/api structure | ✓ Good — clean dependency boundaries |
| No image rendering for share cards | Text + badges + JSON keeps v1 simple | ✓ Good — v1 focus preserved |
| Vercel AI SDK for LLM abstraction | Provider-agnostic generateObject with native Zod schema support | ✓ Good — single import handles OpenAI and Anthropic |
| Narrow LLM schemas | Separate LLM schema (fewer fields) from API schema; orchestrator merges after LLM call | ✓ Good — eliminated validation failures on orchestrator-computed fields |
| Compliance guard with explicit field list | Callers declare narrative fields to scrub — prevents accidental scrubbing of identity_tags or cert numbers | ✓ Good — safe and predictable |
| Mock at orchestrator boundary in tests | Integration tests mock @tcg/agent not LLM layer — exercises real route handler logic | ✓ Good — catches wiring bugs |
| Contract tests for prompt-schema alignment | String-match strategy catches additions and removals without fragile regex | ✓ Good — prevents silent drift |

## Constraints

- **Tech stack**: TypeScript monorepo (pnpm), Fastify, Postgres (Prisma), Redis optional
- **LLM provider**: Abstracted (OpenAI/Anthropic) via Vercel AI SDK; deterministic JSON outputs validated with Zod
- **Architecture**: Rules+LLM hybrid — hard rules for state/actions, LLM for narrative + identity inference
- **Observability**: Structured logs, request IDs, actions audit trail from day one
- **Output format**: All agent outputs must be valid JSON conforming to Zod schemas; retry/fallback on invalid LLM responses
- **Safety**: No profit guarantees, always present uncertainty, compliance-safe language in all LLM outputs

---
*Last updated: 2026-03-05 after v1.0 milestone*
