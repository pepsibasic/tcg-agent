# Project Research Summary

**Project:** tcg-agent — Collectible Card Portfolio Agent (Gacha Platform)
**Domain:** Rules+LLM hybrid agent service embedded in a collectibles/Gacha platform
**Researched:** 2026-03-04
**Confidence:** HIGH (stack and architecture verified against official sources; features MEDIUM due to AI-agent-specific extrapolation)

## Executive Summary

This project is a rules-driven, LLM-enhanced portfolio intelligence service embedded in an existing Gacha collectibles platform. The agent does not replace the marketplace — it surfaces contextual signals, eligible actions, and narrative insight to turn passive card holders into active participants in the Gacha economy. The recommended build pattern is a TypeScript pnpm monorepo with four packages: `schemas` (Zod contracts), `db` (Prisma 7 + PostgreSQL), `agent` (rules engine + LLM orchestration), and `api` (Fastify 5 HTTP surface). This layered structure keeps business logic testable in isolation and prevents the most common agent architecture failure: coupling LLM output generation to HTTP request handling.

The central architectural principle is rules-first, LLM-second. The deterministic rules engine always computes eligible card actions from card state before any LLM call is made. The LLM narrates and explains — it never decides. This single constraint eliminates the most dangerous failure mode in production LLM systems: users being shown hallucinated actions they cannot actually execute. The Vercel AI SDK's `generateObject` with Zod schemas enforces structured outputs at the provider boundary, eliminating fragile regex-parsing patterns. Every LLM call is wrapped in retry-with-schema-feedback logic and a compliance text scrub to prevent financial advice language from appearing in user-visible outputs.

The main risks are compliance exposure (archetype narratives drifting into investment advice language), prompt injection via user-supplied card names and notes, and stale price data displayed without confidence indicators. All three are preventable at the schema and prompt design layer if addressed during the foundation phase — they become costly to retrofit after the LLM prompt templates are locked. The stack choices (Prisma 7, Zod 4, Fastify 5, Vercel AI SDK 6) are all current stable versions with significant v-over-v performance improvements; the version compatibility constraints are well-documented and the upgrade paths are clear.

---

## Key Findings

### Recommended Stack

The stack is a cohesive ESM-first TypeScript monorepo built on Node.js 22 LTS. Key choices were made to minimize friction between the API validation layer, the LLM output validation layer, and the database schema: Zod 4 is used as the single schema definition tool across all three contexts. This eliminates the dual-schema problem (TypeBox for routes + Zod for agents) and the need for `zod-to-json-schema` as a separate dependency. Prisma 7 (GA January 2026) brings a Rust-free pure-TypeScript client with 90% smaller bundles and 3x faster queries, but requires explicit adapter configuration via `prisma.config.ts` — the implicit `.env` loading and `datasource.url` pattern from v6 are removed.

The Vercel AI SDK 6.x is the correct LLM abstraction layer for this use case. It is purpose-built for deterministic structured-output generation (`generateObject`), is provider-agnostic across OpenAI and Anthropic, and handles retry logic at the SDK level. LangChain is explicitly not recommended — it adds complexity appropriate for multi-step agentic reasoning chains, not for the structured JSON generation pattern this service requires.

**Core technologies:**
- Node.js 22 LTS: runtime — active LTS until April 2027; required for Fastify 5 (Node 20+); 30% faster startup than Node 20
- TypeScript 5.8: type system — current stable; required by Prisma 7 (min 5.1) and Zod 4
- pnpm 10 + Turborepo 2: monorepo management — phantom-dependency prevention; `workspace:` protocol; build caching; right-sized for 4-package monorepo
- Fastify 5: HTTP API — schema-driven type inference via `fastify-type-provider-zod`; built-in pino logging; fastest Node HTTP framework at this layer
- Prisma 7 + PostgreSQL 16: persistence — pure-TS client; requires `@prisma/adapter-pg` explicitly; new `prisma.config.ts` configuration model
- Zod 4: schema validation — 14x faster parsing vs v3; native `z.toJSONSchema()`; shared across API routes, LLM output validation, and data contracts
- Vercel AI SDK 6 (`ai`): LLM abstraction — `generateObject` with Zod schemas; provider-agnostic; handles retries and streaming
- `fastify-type-provider-zod`: Fastify/Zod bridge — every route gets compile-time types from Zod schemas; no casting
- Vitest 4: testing — native ESM; 2-5x faster than Jest; no `jest.config.js` ceremony

### Expected Features

The feature dependency graph has a clear root: the card state model (`user_cards` table with state enum: `vaulted`, `external`, `on_market`, `in_transit`). Almost nothing meaningful is buildable without it. The action eligibility rules engine depends on card state. Portfolio summary depends on both card state and external card upload. Archetype inference depends on a complete portfolio picture, which requires both vaulted and external cards to be present.

The product's core differentiator — features that no off-the-shelf tracker (CardLadder, CollX, Alt, Collectr) provides — is the combination of: (1) context-aware "what next?" per card with eligible actions surfaced from a deterministic rules engine, (2) collector archetype inference as a shareable identity artifact, and (3) vault conversion incentive logic that drives the external-to-vaulted funnel central to the Gacha business model.

**Must have (table stakes):**
- Card state model + DB schema — root dependency for all features; nothing works without it
- Card value estimate per card (with range + timestamp) — every tracker has this; missing it makes the product feel broken
- Action eligibility rules engine — deterministic state-to-actions mapping; must precede LLM layer
- Portfolio total value and summary — aggregate view; table stakes for any collector tool
- External card upload (manual entry) — collectors own cards outside Gacha; ignoring them produces an incomplete picture
- Search and filter collection — basic UX hygiene for any collection over 20 cards

**Should have (differentiators):**
- Context-aware "what next?" per card with LLM narrative — core product differentiator; no competitor does this with state-aware eligibility
- Vault conversion incentive logic — threshold-based nudges that drive the external-to-vaulted funnel
- Collector archetype inference + shareable identity card — viral loop driver; no mainstream tracker does collector identity
- Pack-pull analysis endpoint — triggered after pack opening; surfaces immediate post-pull value and recommended action
- Portfolio concentration signal — "90% of value in one player" is high-signal for power users
- Liquidity classification per card — distinguishes instantly tradeable (vaulted) from illiquid (external, ungraded)

**Defer (v2+):**
- Image-based card recognition — high engineering cost; validate manual entry adoption first
- Real-time price feeds — data licensing cost; daily-updated estimates are sufficient and more honest for illiquid assets
- Image rendering for Collector Identity card — visual cards convert better; validate sharing behavior with text-first
- CSV export / cost-basis tracking — power user feature; defer until portfolio tools are proven
- PSA cert live scraping — ToS violation; v1 stub (cert number + stored grade) is sufficient

### Architecture Approach

The system follows a layered monorepo architecture where the HTTP surface (`apps/api`) is a thin adapter over a self-contained agent package (`packages/agent`). The agent package contains three sub-systems: a deterministic rules engine (pure functions, no I/O, fully unit-testable), an LLM client (Vercel AI SDK wrapper with retry and fallback), and a prompt template registry (versioned `.txt` files with slot injection). A shared `packages/schemas` package is the single source of truth for all Zod schemas — both the API layer and the agent layer import from it, preventing type drift. The build order is strictly: `schemas` → `db` → `agent/rules` → `agent/llm` → `agent/orchestrators` → `api/routes` → `api/plugins`.

**Major components:**
1. Fastify API (`apps/api`) — HTTP surface, request validation, auth, rate limiting; delegates immediately to agent orchestrators; no business logic in route handlers
2. Agent Orchestrator (`packages/agent/orchestrators`) — per-use-case coordination of rules engine + LLM + prompt store; three orchestrators: `analyze-card`, `summarize-portfolio`, `detect-archetype`
3. Rules Engine (`packages/agent/rules`) — deterministic card state → eligible action set mapping; pure functions; always runs before any LLM call; unit-testable without HTTP or LLM
4. LLM Client (`packages/agent/llm`) — `generateObject` wrapper with schema-aware retry (appends validation error to prompt on retry), compliance scrub, and deterministic fallback after max retries
5. Prompt Store (`packages/agent/prompts`) — versioned template files (`card-narrative.txt`, `portfolio-summary.txt`, `archetype-identity.txt`); slot injection via `renderPrompt(name, vars)`
6. Schema Layer (`packages/schemas`) — Zod schemas for all agent outputs; TypeScript types derived with `z.infer`; imported by both API and agent; never redefined elsewhere
7. Prisma + PostgreSQL (`packages/db`) — persistent card state, user data, actions log; singleton client; N+1 prevention via `include`; `priceFetchedAt` column required from day one
8. Compliance Guard — post-LLM text scrub; detects and replaces financial advice language; last-resort catch, not primary safety mechanism

### Critical Pitfalls

1. **LLM populates eligible actions directly** — the LLM hallucinates actions users cannot take, destroying trust. Prevention: rules engine always runs first and produces the canonical `ActionSet`; the LLM schema does not include a top-level `actions` field the LLM can populate — actions are merged by the service layer after validation. This boundary must be encoded in the Zod schema design before the first prompt template is written.

2. **Zod `.catch()` fallback with no observability** — silent fallback masks broken prompt templates for days. Prevention: never use `.catch()` without a structured log that records request ID, card ID, model, validation error path (`zodError.issues`), and raw LLM output (truncated). Return a typed `AnalysisFailure` response after max retries, not a degraded success. Alert on `analysis_failure_rate > 2%`.

3. **OpenAI strict mode incompatibility with `z.optional()`** — schemas with optional fields cause `400 BadRequestError` with `strict: true`. Prevention: establish a convention from day one that all LLM-facing Zod schemas use `z.nullable()` for optional fields, not `.optional()`. Run a CI smoke test that sends the actual schema to the configured LLM provider before any deployment.

4. **Collector archetype narrative becomes financial advice** — advisory language in archetype text creates regulatory exposure even with a disclaimer. Prevention: prompt templates must explicitly prohibit "buy," "sell," "hold," "will increase" language; add a `complianceFlags: string[]` field to the `CollectorArchetype` schema for LLM self-reporting; run adversarial prompt tests as part of the test suite.

5. **Prompt injection via user-supplied card names and notes** — free-text fields interpolated into prompts are the #1 LLM vulnerability (OWASP 2025). Prevention: sanitize and truncate all user strings before prompt interpolation; wrap in XML-delimited context tags (`<card_name>{{cardName}}</card_name>`) so the model treats them as data, not instructions; validate that LLM outputs only contain actions from the rules engine `ActionSet`.

6. **Stale price data with no staleness indicator** — TCG prices move 20%+ in hours during market events. Prevention: every price field in `CardAnalysis` and `PortfolioSummary` Zod schemas must include `priceDataAge` (ISO timestamp) and `priceConfidence` enum (`LIVE`, `RECENT_24H`, `STALE_7D`, `NO_DATA`); `priceFetchedAt` column in Prisma schema from day one.

---

## Implications for Roadmap

Based on the combined research findings, the feature dependency graph and architectural build order both point to the same phase structure. The key constraint is that foundational contracts (schemas, card state model, rules engine) must be locked before any LLM work begins — retrofitting schema conventions or state model design after prompts are written is expensive and error-prone.

### Phase 1: Foundation — Monorepo, Schemas, and Data Model

**Rationale:** All other work depends on this. The Zod schema conventions (nullable vs optional for LLM compatibility), the card state enum, and the Prisma schema including `priceFetchedAt` must be established before any prompt or route is written. The monorepo structure enables testable isolation of each package. Establishing ESM-first configuration, `turbo.json` pipeline, and `prisma.config.ts` removes all environment setup risk before functional development begins.

**Delivers:** Working monorepo scaffold; Prisma schema with card state model, `priceFetchedAt`, and price confidence fields; Zod schemas for `CardAnalysis`, `PortfolioSummary`, and `CollectorArchetype`; confirmed LLM schema convention (nullable fields, strict mode CI smoke test); Turborepo build pipeline.

**Addresses:** Card state model + DB schema (P1), schema layer as single source of truth

**Avoids:** OpenAI strict mode `400` errors at launch; schema drift between API and agent; stale price data trust incident (by embedding staleness metadata in the schema from the start)

**Research flag:** Standard patterns — Prisma 7 setup, pnpm workspace configuration, and Turborepo pipeline are all well-documented. No additional research needed.

---

### Phase 2: Rules Engine and Core Data Layer

**Rationale:** The rules engine is the safety constraint for the entire system. It must be built and fully unit-tested before any LLM work begins. Building it first also surfaces any gaps in the card state enum — missing states (e.g., `in_transit`) discovered here are cheap to fix; discovered after LLM prompts are written, they require prompt and schema rewrites.

**Delivers:** `computeEligibleActions(card)` pure function covering all card states; `computePortfolioSignals(cards)` for concentration and liquidity analysis; `computeVaultConversionCandidates(cards)` for threshold nudges; full unit test coverage without any HTTP or LLM dependency; Prisma queries with correct `include` patterns for N+1 prevention.

**Addresses:** Action eligibility rules engine (P1), vault conversion incentive logic (P1), portfolio concentration signal, liquidity classification

**Avoids:** LLM hallucinating eligible actions (the rules engine output is the only permitted source for the `actions` field); N+1 Prisma queries in portfolio aggregation

**Research flag:** Standard patterns — rules engine as pure functions, Prisma `include` patterns. No additional research needed.

---

### Phase 3: LLM Client and Prompt Infrastructure

**Rationale:** With schemas locked and the rules engine producing trusted `ActionSet` outputs, the LLM layer can be added safely. The LLM client, retry/fallback logic, compliance guard, and prompt template registry must all be built together — they are a single reliability unit. Building retry without observability, or prompts without the compliance guard, produces a system that looks functional but silently fails in production.

**Delivers:** `generateStructured<T>(schema, prompt)` LLM client wrapper; `withRetry` with schema-aware error feedback (validation error appended to prompt on retry); deterministic typed fallback after max retries; structured logging at every catch site; compliance guard for financial advice language; prompt template registry with `card-narrative.txt`, `portfolio-summary.txt`, `archetype-identity.txt`; per-user rate limiting; `maxTokens` cap on all LLM calls.

**Addresses:** LLM narrative layer (P1), context-aware "what next?" narrative component, collector archetype inference narrative component

**Avoids:** Silent fallback masking broken prompts; financial advice in archetype narrative; prompt injection via user card names/notes; token cost runaway; LLM provider lock-in (abstract provider interface from day one)

**Research flag:** Needs research-phase during planning — prompt template design for archetype inference and compliance constraint enforcement warrants a dedicated research pass. The adversarial prompt test suite structure also needs specific attention.

---

### Phase 4: Agent Orchestrators and Core API Endpoints

**Rationale:** With all three packages (`schemas`, `db`, `agent/rules`, `agent/llm`, `agent/prompts`) built and tested, the orchestrators compose them into use-case flows. The Fastify API routes are then thin adapters over these orchestrators. This phase produces the first end-to-end user-facing functionality.

**Delivers:** `analyzeCard` orchestrator (rules → LLM → compliance scrub → log); `summarizePortfolio` orchestrator; `detectArchetype` orchestrator; Fastify routes `POST /cards/:id/analyze`, `GET /portfolio/:userId/summary`, `GET /portfolio/:userId/archetype`; external card upload endpoint (`POST /cards/external`) with async background analysis trigger; `POST /cards/external/pack-pull` pack analysis endpoint; OpenAPI docs auto-generated from Zod schemas via `@fastify/swagger`.

**Addresses:** Context-aware "what next?" per card (P1), portfolio summary (P1), external card upload (P1), collector archetype inference + shareable identity card (P1), pack-pull analysis endpoint (P1)

**Avoids:** Business logic in route handlers; schema drift between API response and agent output; shareable archetype card containing full portfolio detail (privacy: share cards expose only curated archetype data with non-guessable share tokens)

**Research flag:** Standard patterns for Fastify route composition and plugin wiring. The shareable identity card share token generation and content safety check may need a brief focused research pass.

---

### Phase 5: Observability, Hardening, and v1.x Features

**Rationale:** The core product is functional after Phase 4. This phase adds the production reliability layer — LLM result caching, performance testing, security hardening — and the first post-validation features (PSA cert stub, price trend signal, liquidity classification). It also addresses the "looks done but isn't" checklist items that are frequently shipped incomplete.

**Delivers:** Redis LLM result cache (key: `hash(cardId + cardState + schemaVersion)`); structured logging with `analysis_failure_rate` alerting; adversarial prompt test suite (injection tests, advisory language tests); CI smoke test sending live schema to LLM provider; portfolio performance test (50-card portfolio resolves in <500ms); PSA/BGS cert stub lookup; price trend signal (daily delta vs 30-day avg); portfolio concentration alerts (threshold: 10+ cards).

**Addresses:** PSA/BGS cert stub (P2), price trend signal (P2), liquidity classification (P2), portfolio concentration alerts (P2)

**Avoids:** Retry loop thundering herd (exponential backoff + jitter + circuit breaker after 5 consecutive failures); stored LLM raw response ballooning Postgres row sizes (store only truncated validation excerpts in separate `agent_debug_log` table)

**Research flag:** Redis integration patterns for LLM result caching are well-documented. BullMQ async job queue may be needed if LLM latency becomes unacceptable in the request path — this warrants a performance validation step before committing to sync vs async architecture for Phase 5.

---

### Phase Ordering Rationale

- **Schema and state model must precede all other work** — the `user_cards` state enum and Zod schema conventions (nullable fields) are root dependencies. Every other component imports from `packages/schemas`. Changing these after LLM prompts are written requires coordinated refactors across all layers.
- **Rules engine must precede LLM layer** — this is the single most important safety constraint. If the LLM layer is built before the rules engine is locked, developers are tempted to let the LLM populate the `actions` field directly (it is in the schema). This creates the highest-risk pitfall in the system.
- **LLM infrastructure must be built as a unit** — retry, fallback, compliance guard, and observability are not separable. Building the "happy path" LLM client without the error path is the pattern that causes the silent fallback pitfall.
- **Orchestrators come last among packages** — they compose everything above. Building them first would require mocking all dependencies and creates the risk that the mocks diverge from the real implementations.
- **API routes are thin adapters, added after orchestrators** — routes contain no business logic and are straightforward once orchestrators are stable.
- **Hardening is a phase, not an afterthought** — the "looks done but isn't" checklist items (`priceDataAge` in API responses, injection tests, CI smoke tests against live LLM provider) are consistently the items that slip unless scheduled as a named phase with explicit deliverables.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (LLM Client and Prompt Infrastructure):** Prompt template design for collector archetype inference needs a focused research pass — specifically: how to structure prompts to reliably elicit compliant language, how to design the `complianceFlags` self-reporting field, and how to structure adversarial test fixtures.
- **Phase 5 (Hardening):** If LLM call latency is unacceptable in the synchronous request path at moderate load, the decision between Redis caching (Phase 5 plan) and BullMQ async job queue (higher complexity) needs a performance validation step before committing.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Prisma 7 setup, pnpm workspace, Turborepo pipeline — all covered by official documentation with clear upgrade guides.
- **Phase 2 (Rules Engine):** Pure TypeScript functions + Prisma queries — well-documented patterns.
- **Phase 4 (API Routes):** Fastify 5 + Zod type provider integration — official documentation and examples are comprehensive.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All major versions verified against npm and official release announcements. Version compatibility matrix confirmed. Prisma 7 GA January 2026 verified. |
| Features | MEDIUM | Table stakes features verified via live competitor product research (CardLadder, CollX, Alt, Collectr). AI-agent-specific differentiators (archetype inference, vault conversion logic) extrapolated from project requirements and comparable tools — no direct competitor does this. |
| Architecture | HIGH | Patterns verified across OpenAI practical agent guide, Vercel AI SDK docs, Fastify community, and TypeScript monorepo ecosystem. Rules-first pattern is extensively documented as the correct approach for action-eligible LLM systems. |
| Pitfalls | HIGH | Critical pitfalls verified via multiple independent sources: OWASP LLM Top 10 2025 for prompt injection, OpenAI community for strict mode gotcha, arXiv research for hallucinated financial data, PSA 2025 scandal coverage for stale price data risk. |

**Overall confidence:** HIGH

### Gaps to Address

- **External price data source:** The research assumes Gacha provides internal price data for vaulted cards. For external cards, the research recommends `EXTERNAL_ESTIMATE` labeling without specifying a source. The implementation will need to clarify whether any external TCG price API (TCGPlayer, PokeWallet) is available or approved — this affects the `priceConfidence` enum values and price update TTL strategy.
- **`fastify-type-provider-zod` Zod 4 compatibility:** The STACK.md notes "verify latest release supports Zod 4 before locking versions." This should be a first-day validation step in Phase 1 — if the type provider does not yet support Zod 4, the project must either wait for the release or use Zod 3 (with the 14x performance penalty and no native JSON Schema export).
- **Archetype inference minimum threshold UX:** Research recommends requiring a minimum of 5 cards before archetype inference is run. The exact threshold and the UX state before threshold is reached (placeholder, locked state, etc.) needs product clarification before Phase 4 route design.
- **Gacha platform authentication model:** The API routes require authentication, but the research does not specify the Gacha platform's auth mechanism (JWT, session, API key). This is an integration assumption that must be confirmed before Phase 4.

---

## Sources

### Primary (HIGH confidence)
- [Prisma 7 announcement + upgrade guide](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0) — Rust-free client, adapter requirement, `prisma.config.ts`, bundle/performance numbers
- [Zod v4 release notes](https://zod.dev/v4) — performance benchmarks, nullable vs optional convention, native JSON Schema export
- [Vercel AI SDK generateObject docs](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) — structured output pattern, Zod integration, provider abstraction
- [Fastify npm + v5 announcement](https://www.npmjs.com/package/fastify) — Node 20+ requirement, version confirmed
- [OWASP LLM Top 10 2025: Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) — prompt injection as #1 LLM vulnerability
- [OpenAI Structured Outputs: strict mode](https://platform.openai.com/docs/guides/structured-outputs) — `z.optional()` incompatibility, nullable requirement
- [OpenAI Practical Guide to Building Agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) — rules-first architecture pattern
- [Anthropic Structured Outputs (Nov 2025)](https://tessl.io/blog/anthropic-brings-structured-outputs-to-claude-developer-platform-making-api-responses-more-reliable/) — beta header requirement
- [Node.js 22 LTS](https://endoflife.date/nodejs) — active LTS until April 2027

### Secondary (MEDIUM confidence)
- [CardLadder Pro Features](https://www.cardladder.com/pro-features/collection) — competitor feature baseline
- [CollX Pro](https://www.collx.app/collx-pro) — AI insights, portfolio tracking features
- [Alt Vault](https://www.alt.xyz/vault) — vault, liquidity, lending model
- [Collectr](https://getcollectr.com/) — TCG portfolio tracking feature set
- [Medium: Token Cost Trap](https://medium.com/@klaushofenbitzer/token-cost-trap-why-your-ai-agents-roi-breaks-at-scale-and-how-to-fix-it-4e4a9f6f5b9a) — LLM cost scaling patterns
- [Inferable.ai: retry patterns for structured outputs](https://www.inferable.ai/blog/posts/llm-json-parser-structured-output) — retry with schema-aware error feedback
- [Turborepo vs Nx comparison](https://dev.to/saswatapal/why-i-chose-turborepo-over-nx-monorepo-performance-without-the-complexity-1afp) — monorepo tool selection rationale
- [Medium: AI agent schema drift](https://medium.com/@nraman.n6/versioning-rollback-lifecycle-management-of-ai-agents-treating-intelligence-as-deployable-deac757e4dea) — 40% of production agent failures from schema drift

### Tertiary (LOW confidence / validation needed)
- [Athlon Sports: PSA 2025 grade-swap scandal](https://athlonsports.com/collectibles/psa-grading-scandal-2025-grade-swapping) — price volatility risk rationale; single source
- [The Hobby Spectrum — Collector Identity](https://www.thehobbyspectrum.com/preview-access) — archetype classification reference; niche source
- [CardTechie: The Data Problem Every Card App Faces](https://cardtechie.com/blog/the-data-problem-every-card-app-faces/) — data silo pitfall context; community source

---
*Research completed: 2026-03-04*
*Ready for roadmap: yes*
