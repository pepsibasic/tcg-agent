# Phase 4: Agent Orchestrators and API - Research

**Researched:** 2026-03-04
**Domain:** Fastify REST API + orchestrator function composition + Prisma data fetching
**Confidence:** HIGH

## Summary

Phase 4 wires together the already-complete rules engine (Phase 2) and LLM layer (Phase 3) into three orchestrators (card analysis, portfolio summary, archetype detection) and exposes them via six REST endpoints on the Fastify server skeleton at `apps/api/src/server.ts`. The schemas, types, and utility functions are all pre-built and validated — this phase is primarily function composition and route registration, not new infrastructure.

The dominant pattern is: fetch data from Prisma → assemble LLM prompt slots → call `generateWithRetry` → inject rules engine output → validate final shape against API schema → return. Each orchestrator follows this pipeline. The `degraded: true` flag on LLM failure ensures the rules engine actions surface to users even when the LLM is unavailable.

The two stub endpoints (VAULT-04 and API-06) are intentionally thin — they create a record in the DB and return a confirmation. No business logic required beyond schema validation and database writes.

**Primary recommendation:** Implement orchestrators as plain async functions in `packages/agent/src/orchestrators/`, register Fastify routes in `apps/api/src/routes/` organized by domain, and use Fastify's built-in `fastify-plugin` wrapping for clean route registration.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**API contract design:**
- All agent endpoints accept card/entity IDs, not inline data — server fetches from DB
- Authentication: X-User-Id header (stub auth — assumes upstream gateway handles real auth in production)
- Error shape: consistent envelope `{ error: { code, message, details? } }` with appropriate HTTP status codes
- LLM failure handling: return 200 with partial data (rules engine actions + null narrative fields) and a `degraded: true` flag. User always gets their actions even when LLM is unavailable

**Pack pull analysis flow:**
- Batch endpoint: `POST /agent/card/analyze-batch` with `{ cardIds: string[] }` — server runs analyses in parallel
- Pull-aware action copy: same eligible actions as normal analysis, but `ui_copy` is contextual to pull event (e.g., "Just pulled! List now while demand is fresh"). Rules engine receives a `source: 'pack_pull'` context hint
- Partial failure: per-card status in batch results — each card has its own success/degraded flag. Client renders individually
- Concurrency limit on parallel LLM calls: Claude's discretion (reasonable default for typical pack sizes)

**External card lifecycle:**
- Upload via `POST /external-cards` returns the card record only — does NOT auto-trigger analysis. Client calls analyze separately
- Validation: title and estimatedValue required. Set, grade, certNumber optional. Value is needed for vault conversion logic
- PSA cert stub (EXTC-03): lookup stored grade by cert number. Returns grade if found, null otherwise. Clean replacement point for future real API
- Full CRUD: POST (create), PATCH (update fields), DELETE (soft delete via deletedAt). Users can correct mistakes on uploaded cards

**Archetype inference rules:**
- Minimum card threshold: 5 cards required for archetype detection
- Below-threshold response: `{ archetype: null, progress: '2/5 cards', message: 'Add 3 more cards to unlock your collector identity!' }` — friendly nudge encouraging growth, not an error
- Card scope: all cards count (vaulted + external) — full collection picture
- Badge assignment: deterministic rules-based from predefined criteria (e.g., `vault_builder` if 10+ vaulted cards, `ip_specialist` if 60%+ one IP). No LLM involvement in badges — predictable, testable

### Claude's Discretion
- Concurrency limit on batch LLM calls (reasonable default)
- Orchestrator internal architecture (function composition, class-based, etc.)
- Fastify route organization (file-per-route, grouped by domain, etc.)
- Request validation middleware approach
- Shipment intent stub implementation details (VAULT-04)
- Action execute stub implementation details (API-06)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CARD-01 | User can request analysis of any card (vaulted or external) and receive CardAnalysis JSON | `generateWithRetry` + `computeEligibleActions` + `CardAnalysisResponseSchema` all exist; orchestrator composes them |
| CARD-02 | Card analysis includes state-aware action eligibility | `buildVaultedActions`/`buildExternalActions` already implement state gates; orchestrator calls `computeEligibleActions` |
| CARD-03 | After pack pull, user receives CardAnalysis for each pulled card with contextual actions | Batch endpoint pattern with `source: 'pack_pull'` context hint to rules engine; `packContext: true` already wired in RulesEngineInput |
| CARD-04 | Card analysis outputs validated against Zod schema with retry/fallback | `generateWithRetry` handles retry + `AnalysisFailure` fallback; `CardAnalysisResponseSchema` is the validation target |
| PORT-01 | User can view PortfolioSummary with all required fields | `PortfolioSummarySchema` exists; portfolio orchestrator fetches all user cards and calls `generateWithRetry` with `portfolio_summary` template |
| PORT-02 | Portfolio includes both vaulted and external cards | Prisma query spans `userCards` (all states) + `externalCards` table; orchestrator merges before passing to LLM |
| PORT-03 | Portfolio concentration signal identifies over-concentration | `concentrationScore` field in `PortfolioSummarySchema`; LLM computes from cards_json breakdown |
| EXTC-01 | User can upload external cards via manual entry | `POST /external-cards` creates `ExternalCard` record via Prisma; `name` and `estimatedValue` required |
| EXTC-02 | External cards appear in portfolio with read-only intelligence | `buildExternalActions` returns only `SHIP_TO_VAULT` + `WATCHLIST` — no Gacha economy actions |
| EXTC-03 | PSA cert lookup stub accepts cert number and returns stored grade | Query `ExternalCard` by `certNumber`, return `grade` field; returns null if not found |
| VAULT-04 | User can create shipment intent (stub execution with action logging) | `POST /vault/shipments` creates `ActionsLog` entry; no real shipment logic — stub only |
| IDENT-01 | User receives CollectorArchetype with all required fields | `CollectorArchetypeSchema` exists; archetype orchestrator calls `generateWithRetry` with `archetype_identity` template |
| IDENT-02 | Archetype inference uses portfolio composition | Portfolio data passed as `portfolio_summary_json` slot; `top_ips` computed from card breakdown |
| IDENT-03 | Shareable collector identity as exportable JSON + short text + badges | `share_card_text` and `share_card_badges` in schema; badges computed deterministically by rules (not LLM) |
| API-01 | POST /agent/card/analyze endpoint | Route registration in Fastify with X-User-Id header auth |
| API-02 | POST /agent/portfolio/summary endpoint | Route registration in Fastify |
| API-03 | POST /agent/archetype endpoint | Route registration in Fastify |
| API-04 | POST /external-cards endpoint | CRUD route with Prisma create |
| API-05 | POST /vault/shipments endpoint | Stub route with ActionsLog write |
| API-06 | POST /actions/execute endpoint | Stub route with ActionsLog write |
</phase_requirements>

---

## Standard Stack

### Core (All Pre-Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastify | ^5.2.0 | HTTP server | Already installed in `apps/api`; Phase 1 decision |
| @tcg/agent | workspace:* | Orchestrator host + rules/LLM exports | Monorepo package containing all Phase 2+3 logic |
| @tcg/db | workspace:* | Prisma client | Already wired; `prisma` export from `packages/db/src/client.ts` |
| @tcg/schemas | workspace:* | Zod schemas for request/response validation | All API response schemas already defined |
| zod | ^3.24.0 | Schema validation | Existing project-wide standard |
| vitest | ^3.0.0 | Test framework | Already configured with 89+ passing tests |

### No New Dependencies Required
All tools needed for Phase 4 are already installed. The phase is function composition of existing building blocks.

**Fastify plugins to add (lightweight):**
- `@fastify/sensible` — adds `httpErrors` helpers (404, 422, 500) for consistent error shapes. Minimal addition.

**Installation (if using @fastify/sensible):**
```bash
pnpm add @fastify/sensible --filter @tcg/api
```

If `@fastify/sensible` is not used, manual error throwing with `reply.code(N).send({ error: { code, message } })` is equally valid.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain async functions for orchestrators | Class-based orchestrators | Classes add ceremony with no benefit for three stateless pipelines |
| Domain-grouped route files | One giant server.ts | Separation of concerns; keeps server.ts as a registration hub only |
| `fastify-type-provider-zod` | Manual Zod validation in handlers | Type provider gives TypeScript inference of request/reply types from schemas; manual approach is simpler and already proven in this codebase |

---

## Architecture Patterns

### Recommended Project Structure

```
packages/agent/src/
├── rules/              # Phase 2 (complete)
├── llm/                # Phase 3 (complete)
├── orchestrators/      # NEW in Phase 4
│   ├── card-analysis.ts        # analyzeCard() orchestrator
│   ├── portfolio-summary.ts    # summarizePortfolio() orchestrator
│   └── archetype.ts            # detectArchetype() orchestrator
└── index.ts            # Add orchestrator exports

apps/api/src/
├── server.ts           # Fastify app creation + plugin/route registration
└── routes/             # NEW in Phase 4
    ├── agent.ts         # /agent/card/analyze, /agent/portfolio/summary, /agent/archetype
    ├── external-cards.ts # /external-cards (CRUD)
    ├── vault.ts          # /vault/shipments
    └── actions.ts        # /actions/execute
```

### Pattern 1: Orchestrator Pipeline

Each orchestrator follows the same pipeline:

```typescript
// packages/agent/src/orchestrators/card-analysis.ts
export async function analyzeCard(
  userCardId: string,
  userId: string,
  context?: { source?: 'pack_pull' }
): Promise<CardAnalysisOrchestratorResult> {
  // 1. Fetch data from Prisma
  const userCard = await prisma.userCard.findFirst({
    where: { id: userCardId, userId, deletedAt: null },
    include: { card: true },
  })
  if (!userCard) return { success: false, reason: 'not_found' }

  // 2. Build rules engine input
  const rulesInput: RulesEngineInput = {
    card: {
      state: userCard.state,
      estimatedValue: userCard.estimatedValue ? Number(userCard.estimatedValue) : null,
      priceConfidence: userCard.priceConfidence,
      certNumber: userCard.certNumber,
    },
    context: {
      hasActiveListing: false, // fetch from marketplaceListing relation
      packContext: context?.source === 'pack_pull',
    },
  }

  // 3. Compute actions deterministically (rules engine — NEVER LLM)
  const actions = computeEligibleActions(rulesInput)

  // 4. Render prompt and call LLM
  const { system, user } = renderPrompt('card_analysis', { /* slots */ })
  const llmResult = await generateWithRetry({
    schema: CardAnalysisSchema,
    prompt: user,
    system,
    config: DEFAULT_LLM_CONFIG,
    narrativeFields: ['rarity_signal', 'liquidity_signal', 'reasoning_bullets'],
  })

  // 5. Compose response — inject actions (rules engine only)
  if (llmResult.success) {
    return {
      success: true,
      data: { ...llmResult.data, actions, priceConfidence: userCard.priceConfidence, priceFetchedAt: userCard.priceFetchedAt?.toISOString() ?? null },
    }
  }

  // 6. Degraded response — actions survive LLM failure
  return {
    success: true,
    degraded: true,
    data: {
      card_id: userCardId,
      identity_tags: [],
      rarity_signal: null,
      liquidity_signal: null,
      price_band: null,
      reasoning_bullets: [],
      confidence: 'LOW',
      actions,
      priceConfidence: userCard.priceConfidence,
      priceFetchedAt: userCard.priceFetchedAt?.toISOString() ?? null,
    },
  }
}
```

### Pattern 2: Fastify Route Handler

```typescript
// apps/api/src/routes/agent.ts
import type { FastifyInstance } from 'fastify'
import { analyzeCard } from '@tcg/agent'

export async function agentRoutes(fastify: FastifyInstance) {
  fastify.post('/agent/card/analyze', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string
    if (!userId) {
      return reply.code(401).send({ error: { code: 'MISSING_AUTH', message: 'X-User-Id header required' } })
    }

    const { cardId } = request.body as { cardId: string }
    if (!cardId) {
      return reply.code(422).send({ error: { code: 'VALIDATION_ERROR', message: 'cardId required' } })
    }

    const result = await analyzeCard(cardId, userId)

    if (!result.success && result.reason === 'not_found') {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Card not found' } })
    }

    // Always 200 — degraded flag signals partial data
    return reply.code(200).send(result.data)
  })
}
```

### Pattern 3: Route Registration in server.ts

```typescript
// apps/api/src/server.ts
import Fastify from 'fastify'
import { agentRoutes } from './routes/agent.js'
import { externalCardRoutes } from './routes/external-cards.js'
import { vaultRoutes } from './routes/vault.js'
import { actionsRoutes } from './routes/actions.js'

const server = Fastify({ logger: true })

server.get('/health', async () => ({ status: 'ok' }))

server.register(agentRoutes)
server.register(externalCardRoutes)
server.register(vaultRoutes)
server.register(actionsRoutes)
```

### Pattern 4: Batch Analysis with Concurrency Limit

```typescript
// For POST /agent/card/analyze-batch
import { analyzeCard } from './card-analysis.js'

export async function analyzeCardBatch(
  cardIds: string[],
  userId: string,
  context: { source?: 'pack_pull' } = {}
) {
  // Reasonable concurrency: 3 parallel LLM calls (pack sizes typically 3-10 cards)
  const CONCURRENCY = 3
  const results = []

  for (let i = 0; i < cardIds.length; i += CONCURRENCY) {
    const chunk = cardIds.slice(i, i + CONCURRENCY)
    const chunkResults = await Promise.all(
      chunk.map(id => analyzeCard(id, userId, context))
    )
    results.push(...chunkResults)
  }

  return results
}
```

### Pattern 5: Archetype Badge Computation (Deterministic)

```typescript
// Badge assignment: purely rules-based, NOT from LLM
function computeArchetypeBadges(stats: { vaultedCount: number; topIpPercent: number; externalCount: number }): string[] {
  const badges: string[] = []
  if (stats.vaultedCount >= 10) badges.push('vault_builder')
  if (stats.topIpPercent >= 0.6) badges.push('ip_specialist')
  if (stats.externalCount >= 5) badges.push('external_collector')
  return badges
}
```

### Anti-Patterns to Avoid

- **LLM decides actions:** Actions MUST come exclusively from `computeEligibleActions()`. Never pass action eligibility to the LLM prompt.
- **Inline data in request body:** All agent endpoints receive IDs, not card data. The server fetches from DB — never trust client-provided card data for analysis.
- **Throwing on LLM failure:** Return 200 with `degraded: true` — users must always receive their rules engine actions.
- **Forgetting Decimal conversion:** Prisma returns `estimatedValue` as a `Decimal` object. Always convert to `Number()` before passing to rules engine or LLM slots.
- **Skipping compliance scrub:** `generateWithRetry` already runs `scrubCompliance` internally. Do NOT run it again in the orchestrator.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM structured output with retry | Custom fetch loop | `generateWithRetry` (already built) | Handles schema validation, retry with error feedback, compliance scrubbing, fallback |
| Action eligibility logic | If/else on card state in orchestrator | `computeEligibleActions` (already built) | All state × action combinations covered, exhaustive TypeScript check |
| Compliance text scrubbing | Manual regex in orchestrators | `scrubCompliance` (already built, runs inside generateWithRetry) | Don't double-scrub |
| Prompt template rendering | String interpolation | `renderPrompt` (already built) | Slot validation, required slot enforcement |
| Input sanitization | Custom escaping | `sanitizeInput` / `wrapUserInput` (already built) | XSS/prompt injection prevention |
| Response schema validation | Manual type assertions | `CardAnalysisResponseSchema.parse()` | Runtime Zod validation catches shape mismatches |
| Batch concurrency control | Promise.all on full array | Chunked Promise.all with CONCURRENCY=3 | Avoids rate-limit spikes on Claude/OpenAI for large packs |

**Key insight:** Phase 4 is almost entirely composition. The rules engine, LLM pipeline, and schemas are complete. The orchestrator's job is: fetch → assemble → compose → return.

---

## Common Pitfalls

### Pitfall 1: Prisma Decimal vs. Number
**What goes wrong:** Passing `userCard.estimatedValue` directly to rules engine or LLM prompt without conversion — `Decimal` object stringifies as an object, not a number.
**Why it happens:** Prisma uses `Decimal` for `@db.Decimal(10,2)` fields. TypeScript types look like `Decimal | null`, not `number | null`.
**How to avoid:** Always convert: `estimatedValue: userCard.estimatedValue ? Number(userCard.estimatedValue) : null`
**Warning signs:** Rules engine receiving `[object Object]` for estimatedValue; LLM prompt slots containing `[object Object]`.

### Pitfall 2: LLM Narrative Fields in scrubCompliance
**What goes wrong:** Passing wrong field names to `narrativeFields` in `generateWithRetry` — the compliance scrub misses fields or accidentally scrubs IDs/tags.
**Why it happens:** `scrubCompliance` accepts explicit list; callers must declare what to scrub.
**How to avoid:**
- card_analysis: `['rarity_signal', 'liquidity_signal', 'reasoning_bullets']`
- portfolio_summary: `['top_insight', 'recommended_actions']`
- archetype_identity: `['why', 'share_card_text', 'traits', 'comparable_collectors']`
- Do NOT include `identity_tags`, `card_id`, `name`, `certNumber` in narrativeFields.

### Pitfall 3: Missing `hasActiveListing` Check on VAULTED Cards
**What goes wrong:** Rules engine returns LIST action even for cards currently listed on the marketplace.
**Why it happens:** `buildVaultedActions` gates LIST on `!hasActiveListing`, but orchestrator must populate this from DB.
**How to avoid:** Include `marketplaceListing` relation in Prisma query for UserCard:
```typescript
const userCard = await prisma.userCard.findFirst({
  where: { id: cardId, userId },
  include: { card: true, marketplaceListing: true },
})
const hasActiveListing = userCard.marketplaceListing?.status === 'ACTIVE'
```

### Pitfall 4: Archetype Below-Threshold Response is NOT an Error
**What goes wrong:** Returning HTTP 422 or 400 when a user has fewer than 5 cards.
**Why it happens:** Easy to treat "insufficient data" as a request error.
**How to avoid:** Return HTTP 200 with `{ archetype: null, progress: 'N/5 cards', message: 'Add X more cards...' }` — it's a valid, actionable response, not an error.

### Pitfall 5: LLM Called Before Badge Computation
**What goes wrong:** Passing computed badge list to LLM in the archetype prompt, allowing LLM to hallucinate badge names that don't exist.
**Why it happens:** Putting badge names in the LLM schema makes it seem natural to have LLM produce them.
**How to avoid:** Compute badges AFTER the LLM call using deterministic rules. Override the `share_card_badges` field in the response with the deterministically computed badges before returning.

### Pitfall 6: External Card Analysis Returns Gacha Economy Actions
**What goes wrong:** EXTC-02 violated — external cards show BUYBACK, LIST, REDEEM actions.
**Why it happens:** `buildExternalActions` only returns `SHIP_TO_VAULT` + `WATCHLIST`, but if orchestrator passes wrong `state` value, vaulted action builder runs instead.
**How to avoid:** Trust the rules engine — `computeEligibleActions` dispatches on `card.state`. Verify the `state` value matches the actual card type.

### Pitfall 7: Concurrency Without Limiting on Batch Endpoint
**What goes wrong:** `Promise.all(cardIds.map(analyzeCard))` with 10 cards fires 10 simultaneous LLM calls, potentially hitting rate limits.
**Why it happens:** Natural instinct to parallelize everything.
**How to avoid:** Use chunked concurrency: process CONCURRENCY=3 at a time. Recommended: 3 (OpenAI tier 1 is 500 RPM; 3 concurrent keeps headroom for other requests).

---

## Code Examples

### Prisma Query: UserCard with Relations

```typescript
// Source: Prisma schema at packages/db/prisma/schema.prisma
const userCard = await prisma.userCard.findFirst({
  where: {
    id: userCardId,
    userId,
    deletedAt: null,
  },
  include: {
    card: true,
    marketplaceListing: true,
  },
})
```

### Prisma Query: All User Cards for Portfolio

```typescript
// Unified view: vaulted + external user_cards
const userCards = await prisma.userCard.findMany({
  where: { userId, deletedAt: null },
  include: { card: true },
})
// Plus separate external cards table
const externalCards = await prisma.externalCard.findMany({
  where: { userId, deletedAt: null },
})
```

### Fastify Error Envelope

```typescript
// Consistent error shape across all endpoints (per CONTEXT.md decision)
return reply.code(404).send({
  error: {
    code: 'NOT_FOUND',
    message: 'Card not found or does not belong to user',
    details: { cardId },
  },
})
```

### Degraded Response Shape

```typescript
// Source: CONTEXT.md — LLM failure handling decision
return reply.code(200).send({
  card_id: cardId,
  identity_tags: [],
  rarity_signal: null,
  liquidity_signal: null,
  price_band: null,
  reasoning_bullets: [],
  confidence: 'LOW',
  actions,          // Rules engine actions — always present
  priceConfidence: userCard.priceConfidence,
  priceFetchedAt: null,
  degraded: true,   // Signal to client that LLM failed
})
```

### External Card Create (EXTC-01)

```typescript
// POST /external-cards
const externalCard = await prisma.externalCard.create({
  data: {
    userId,
    name: body.title,                         // Required
    estimatedValue: body.estimatedValue,      // Required (Decimal-compatible)
    setName: body.set ?? null,
    grade: body.grade ?? null,
    certNumber: body.certNumber ?? null,
    priceConfidence: 'NO_DATA',
  },
})
return reply.code(201).send(externalCard)
// NOTE: Does NOT trigger analysis — client calls /agent/card/analyze separately
```

### PSA Cert Lookup Stub (EXTC-03)

```typescript
// GET /external-cards/cert/:certNumber
const card = await prisma.externalCard.findFirst({
  where: { certNumber, userId, deletedAt: null },
  select: { grade: true },
})
return reply.code(200).send({ grade: card?.grade ?? null })
```

### ActionsLog Write (VAULT-04 / API-06)

```typescript
// POST /vault/shipments or POST /actions/execute
await prisma.actionsLog.create({
  data: {
    userId,
    cardId: body.cardId ?? null,
    agentRecommended: body.action,   // Json field
    userAction: 'ACCEPTED',
  },
})
return reply.code(201).send({ status: 'logged', message: 'Action recorded' })
```

### Pack Pull Context Hint

```typescript
// Source: CONTEXT.md — pack pull analysis flow
// RulesEngineInput for pack pull cards
const rulesInput: RulesEngineInput = {
  card: { /* ... */ },
  context: {
    hasActiveListing: false,
    packContext: true,  // Enables pull-aware action copy
  },
}
// The rules engine will include OPEN_PACK action for VAULTED cards with packContext=true
// ui_copy can be overridden at route level for pull-specific phrasing
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic server files | Plugin-registered route modules | Fastify 4+ | Cleaner separation, testable in isolation |
| `express.Router` | `fastify.register(plugin)` | Pre-Phase 1 | Fastify's plugin system is the standard |
| Manual JSON.stringify for LLM response | `generateObject` (Vercel AI SDK) | Phase 3 | Zod-validated structured output built-in |
| Optional fields for LLM schemas | `z.union([type, z.null()])` | Phase 1 | Required by OpenAI strict mode; prevents schema drift |

**Deprecated/outdated:**
- `z.optional()` for LLM output fields: Use `z.union([type, z.null()])` — established project convention from Phase 1

---

## Open Questions

1. **`CardAnalysisResponseSchema` missing `degraded` field**
   - What we know: The API schema (`packages/schemas/src/api/card-analysis.ts`) doesn't include a `degraded` field yet. CONTEXT.md specifies returning `degraded: true` on LLM failure.
   - What's unclear: Should `degraded` be added to the schema, or returned as an extra field outside the schema validation?
   - Recommendation: Add `degraded: z.boolean().optional()` to `CardAnalysisResponseSchema` in Phase 4 Plan 01 (schema extension task). Same for batch response wrapper.

2. **Pull-aware `ui_copy` override mechanism**
   - What we know: Pull-aware copy is a copy-level change, not a new action type. Same eligible actions, different `ui_copy`.
   - What's unclear: Should the orchestrator mutate action `ui_copy` after rules engine output, or does the rules engine accept a copy-override map?
   - Recommendation: Orchestrator applies a simple post-processing map: for each action in `actions`, if `source === 'pack_pull'`, prefix `ui_copy` with "Just pulled! " (or similar). Clean, no rules engine changes needed.

3. **`PortfolioSummarySchema` vs. prompt output mismatch**
   - What we know: `portfolio_summary` prompt produces: `breakdown`, `concentration_score`, `liquidity_score`, `recommended_actions`, `top_insight`. But `PortfolioSummarySchema` expects: `userId`, `totalValueEst`, `breakdown` (different shape), `concentrationScore`, `liquidityScore`, `collectorArchetype`, `missingSetGoals`, `recommendedActions`, `priceDataAsOf`, `priceConfidence`.
   - What's unclear: The LLM schema and API schema may be tightly coupled or the orchestrator may need to bridge the gap.
   - Recommendation: The portfolio orchestrator computes `totalValueEst`, `userId`, `priceDataAsOf`, `priceConfidence`, and `missingSetGoals` from Prisma data (deterministic), then passes only `cards_json` breakdown to the LLM for narrative fields. The orchestrator assembles the final `PortfolioSummaryResponse` by merging LLM output with DB-computed fields. The portfolio LLM schema (`PortfolioSummarySchema`) may need a dedicated LLM-only variant, or the orchestrator picks fields selectively.

4. **Archetype `share_card_badges` vs. `badges` field name mismatch**
   - What we know: `CollectorArchetypeSchema` has `share_card_badges: z.array(z.string())` but the `archetype_identity` prompt template specifies field name `badges`.
   - What's unclear: The LLM will produce `badges` but the schema expects `share_card_badges`.
   - Recommendation: Update the prompt template to use `share_card_badges` to match the schema, OR override the field in the orchestrator after the LLM call with deterministically computed badges (since badges are rules-based anyway).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `packages/agent/vitest.config.ts` |
| Quick run command | `pnpm --filter @tcg/agent test` |
| Full suite command | `pnpm --filter @tcg/agent test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CARD-01 | `analyzeCard()` returns CardAnalysisResponse shape | unit | `pnpm --filter @tcg/agent test -- --grep "analyzeCard"` | ❌ Wave 0 |
| CARD-02 | External card analysis returns only SHIP_TO_VAULT + WATCHLIST | unit | `pnpm --filter @tcg/agent test -- --grep "external card actions"` | ❌ Wave 0 |
| CARD-03 | Batch analysis with pack_pull context sets packContext=true | unit | `pnpm --filter @tcg/agent test -- --grep "pack pull"` | ❌ Wave 0 |
| CARD-04 | Degraded response returned when LLM fails (actions preserved) | unit | `pnpm --filter @tcg/agent test -- --grep "degraded"` | ❌ Wave 0 |
| PORT-01 | `summarizePortfolio()` returns PortfolioSummaryResponse shape | unit | `pnpm --filter @tcg/agent test -- --grep "summarizePortfolio"` | ❌ Wave 0 |
| PORT-02 | Portfolio includes both userCards and externalCards | unit | `pnpm --filter @tcg/agent test -- --grep "portfolio unified"` | ❌ Wave 0 |
| PORT-03 | concentrationScore reflects IP over-concentration | unit | `pnpm --filter @tcg/agent test -- --grep "concentrationScore"` | ❌ Wave 0 |
| EXTC-01 | POST /external-cards creates ExternalCard record | unit | `pnpm --filter @tcg/agent test -- --grep "external card create"` | ❌ Wave 0 |
| EXTC-03 | PSA cert lookup returns grade or null | unit | `pnpm --filter @tcg/agent test -- --grep "cert lookup"` | ❌ Wave 0 |
| IDENT-01 | `detectArchetype()` returns CollectorArchetype shape | unit | `pnpm --filter @tcg/agent test -- --grep "detectArchetype"` | ❌ Wave 0 |
| IDENT-02 | Below-threshold returns progress nudge, not error | unit | `pnpm --filter @tcg/agent test -- --grep "below threshold"` | ❌ Wave 0 |
| IDENT-03 | Badges computed deterministically (vault_builder, ip_specialist) | unit | `pnpm --filter @tcg/agent test -- --grep "badge"` | ❌ Wave 0 |
| VAULT-04 | POST /vault/shipments creates ActionsLog entry | unit | `pnpm --filter @tcg/agent test -- --grep "shipment"` | ❌ Wave 0 |
| API-01 | POST /agent/card/analyze returns 200 with CardAnalysis | integration | manual-only (requires running server) | ❌ Wave 0 |
| API-04 | POST /external-cards returns 201 with created record | integration | manual-only (requires running server) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @tcg/agent test`
- **Per wave merge:** `pnpm --filter @tcg/agent test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/agent/src/orchestrators/` — directory does not exist yet
- [ ] `packages/agent/src/__tests__/orchestrators/card-analysis.test.ts` — covers CARD-01 through CARD-04
- [ ] `packages/agent/src/__tests__/orchestrators/portfolio-summary.test.ts` — covers PORT-01 through PORT-03
- [ ] `packages/agent/src/__tests__/orchestrators/archetype.test.ts` — covers IDENT-01 through IDENT-03
- [ ] `apps/api/src/routes/` — directory does not exist yet
- [ ] All orchestrator tests require mocking `prisma` client (same pattern as existing `generate.test.ts` which uses `vi.mock`)

---

## Sources

### Primary (HIGH confidence)
- Codebase: `packages/agent/src/` — full source of rules engine and LLM layer (directly inspected)
- Codebase: `packages/schemas/src/` — all Zod schemas (directly inspected)
- Codebase: `packages/db/prisma/schema.prisma` — full data model (directly inspected)
- Codebase: `apps/api/src/server.ts` — Fastify server skeleton (directly inspected)
- Codebase: `packages/db/src/seed-data.ts` — seed data coverage and user profiles (directly inspected)
- `packages/agent/vitest.config.ts` — test infrastructure (directly inspected)

### Secondary (MEDIUM confidence)
- Fastify 5 plugin/register pattern — established pattern in Fastify documentation; server.ts shows `Fastify()` construction confirming v5 install

### Tertiary (LOW confidence)
- `@fastify/sensible` for httpErrors — widely used Fastify ecosystem plugin; not verified in project but lightweight and additive

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies directly inspected from package.json files
- Architecture: HIGH — patterns derived directly from existing Phase 2/3 code conventions
- Pitfalls: HIGH — derived from actual schema inspection and Phase 1-3 decision log in STATE.md
- Open questions: MEDIUM — schema mismatches observed directly; resolution approaches are recommendations

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable stack; no fast-moving dependencies)
