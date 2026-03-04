# Gacha Portfolio Agent

## What This Is

An embedded "collector portfolio manager" agent for the Gacha platform that helps users understand their card holdings (both vaulted and externally uploaded), surfaces actionable next steps within the Gacha economy (sell/buyback, list, redeem, ship, trade into packs), and generates shareable "Collector Identity" summaries as a viral loop. This is NOT a standalone chatbot — it's a service layer with integration endpoints and minimal embeddable UI components.

## Core Value

Every card interaction surfaces a clear, contextual "what next?" action — turning passive collectors into active participants in the Gacha economy.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Card analysis engine (CardAnalysis JSON output per card with state-aware actions)
- [ ] Portfolio summary generation (PortfolioSummary with value estimates, concentration, liquidity)
- [ ] Collector archetype inference (CollectorArchetype with traits, comparables, shareable text)
- [ ] External card upload and management (manual entry, portfolio integration)
- [ ] Vault conversion incentive logic (threshold-based recommendations, batching prompts)
- [ ] Action eligibility rules engine (deterministic state → eligible actions mapping)
- [ ] LLM narrative layer (prompt templates, JSON schema validation, retry/fallback)
- [ ] REST API endpoints for all agent services
- [ ] Zod schema definitions for all agent outputs
- [ ] DB schema (users, cards, user_cards, external_cards, packs, marketplace stubs, actions_log)
- [ ] Seed data fixtures for local development
- [ ] MVP user journeys testable via HTTP (pack pull → analysis, external upload → analysis, portfolio summary, share card)

### Out of Scope

- Full marketplace UI — only agent endpoints and integration hooks
- Pack-opening UI — only post-pull analysis
- Direct "buy/sell/hold" financial advice — signals and options only
- Image recognition for card uploads — manual entry for v1
- Real PSA cert scraping — stub only
- Image rendering for share cards — text + badges + JSON export only
- Mobile app — API-first, embed in existing Gacha web UI
- Real-time chat/conversational agent — deterministic request/response pattern

## Context

**Product model:** Gacha is a platform where users open packs of collectible cards. Cards exist in three states:
1. **External** (user-uploaded): read-only intelligence, not actionable in Gacha economy
2. **Vaulted** (Gacha vault): fully actionable — sell/buyback, list on marketplace, redeem/ship, trade into packs
3. **Market** (pack inventory / marketplace): discovery layer

**Viral loop:** Collector Identity Detection assigns users an archetype based on their portfolio composition. Shareable report cards with badges drive social sharing and new user acquisition.

**Vault conversion funnel:** External cards are the growth lever. Agent shows what vaulting unlocks (instant liquidity, trade-into-packs, verified ranking, future credit/collateral) and encourages batch shipping when thresholds are met.

**Safety posture:** No profit guarantees. Always present uncertainty. Educational framing — "signals" and "options." Compliance-safe language in all LLM outputs.

## Constraints

- **Tech stack**: TypeScript monorepo (pnpm), Node backend (Fastify or NestJS), Postgres (Prisma), Redis optional
- **LLM provider**: Abstracted (OpenAI/Anthropic) with prompt templates; deterministic JSON outputs validated with zod
- **Architecture**: Rules+LLM hybrid — hard rules for state/actions, LLM for narrative + identity inference
- **Observability**: Structured logs, request IDs, basic metrics from day one
- **Output format**: All agent outputs must be valid JSON conforming to zod schemas; retry/fallback on invalid LLM responses

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fastify over NestJS | Lighter weight, faster startup, simpler for service-oriented architecture | — Pending |
| Rules+LLM hybrid | Deterministic action eligibility (no hallucinated actions) + LLM for narrative quality | — Pending |
| Zod for all schemas | Runtime validation of LLM outputs, shared types between API and agent | — Pending |
| pnpm monorepo | packages/agent, packages/schemas, packages/db, apps/api structure | — Pending |
| No image rendering for share cards | Text + badges + JSON keeps v1 simple; image gen is a v2 feature | — Pending |

---
*Last updated: 2026-03-04 after initialization*
