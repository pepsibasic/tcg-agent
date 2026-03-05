# Phase 1: Foundation - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Monorepo scaffold (pnpm + Turborepo), shared Zod schemas for all agent outputs, Prisma data model with all tables, and seed data fixtures. Everything subsequent phases build on. No business logic, no endpoints, no LLM calls.

</domain>

<decisions>
## Implementation Decisions

### Monorepo structure
- apps/api (Fastify HTTP surface — skeleton only, no routes yet)
- packages/schemas (Zod schemas — shared single source of truth)
- packages/db (Prisma client, migrations, seed script)
- packages/agent (skeleton — rules engine and LLM client added in later phases)
- Turborepo pipeline: schemas → db → agent → api

### ID strategy
- UUIDs (v7 — time-sortable) for all primary keys — safer for external API exposure, no sequential ID enumeration
- card_id field on user_cards references canonical cards table

### Card taxonomy
- IP categories as flexible string enum (not hard-coded): e.g., "pokemon", "one-piece", "sports", "yugioh", "magic", "custom"
- Language as ISO 639-1 codes: "en", "ja", "ko", "zh", etc.
- Set/series as free-text string (too many to enumerate)
- Grade as string field (e.g., "PSA 10", "BGS 9.5", "RAW") — not an enum, grading systems vary

### Schema conventions
- All LLM-facing Zod fields use z.nullable() not z.optional() (OpenAI strict mode compatibility)
- Separate "LLM output" schemas from "API response" schemas — API schemas can use optional
- All price fields include priceFetchedAt (DateTime) and priceConfidence ("LIVE" | "RECENT_24H" | "STALE_7D" | "NO_DATA")
- Action schema includes all 7 types: BUYBACK, LIST, REDEEM, SHIP_TO_VAULT, OPEN_PACK, WATCHLIST, BUNDLE_SHIP

### Database design
- Soft delete (deletedAt column) on user-facing tables (users, user_cards, external_cards)
- Card state enum: VAULTED, EXTERNAL, ON_MARKET, IN_TRANSIT
- actions_log table for audit trail (agent recommendation + user action)
- marketplace_listings as stub table (minimal columns, ready for real integration)
- Timestamps (createdAt, updatedAt) on all tables

### Seed data
- 3 users with distinct profiles: collector (many cards, diverse IPs), flipper (few high-value cards), new user (1-2 cards)
- ~50 cards across 3-4 IPs (pokemon, one-piece, sports, yugioh)
- Cards in all states: vaulted, external, on_market, in_transit
- Realistic price ranges ($5–$5000) with varying confidence levels
- 2 packs with associated pack_cards mappings
- A few marketplace_listings stubs

### Configuration
- Environment variables for DB connection, LLM API keys
- JSON config file or env vars for thresholds:
  - VAULT_VALUE_THRESHOLD: $50 (default)
  - BATCH_SHIP_COUNT: 3 (default)
  - BATCH_SHIP_VALUE: $200 (default)
  - LLM_MAX_RETRIES: 3 (default)
  - ARCHETYPE_MIN_CARDS: 5 (default)

### Claude's Discretion
- Exact Prisma schema column types and indexes
- tsconfig paths and module resolution details
- Turborepo cache configuration
- Package.json scripts naming
- ESLint/Prettier configuration choices

</decisions>

<specifics>
## Specific Ideas

- User specified: "Keep everything strongly typed, validate every LLM response against zod and retry/fallback to safe response if invalid"
- Research identified: Prisma 7 requires prisma.config.ts (not .env for DB URL), and @prisma/adapter-pg + pg driver explicitly
- Research identified: pnpm 10 disables postinstall by default — must allowlist @prisma/client in pnpm.onlyBuiltDependencies
- First-day validation: verify fastify-type-provider-zod supports Zod 4 before locking versions

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, empty repo

### Established Patterns
- None yet — this phase establishes the patterns

### Integration Points
- Zod schemas from packages/schemas will be imported by every other package
- Prisma client from packages/db will be imported by packages/agent and apps/api
- Turborepo pipeline enforces build order

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-04*
