# Phase 5: Observability, Hardening, and Testing - Research

**Researched:** 2026-03-05
**Domain:** Structured logging (Pino/Fastify), audit trails (Prisma), LLM failure diagnostics, Vitest unit + integration testing
**Confidence:** HIGH

## Summary

Phase 5 closes out the v1 build with three distinct workstreams: (1) structured logging with request ID propagation via Fastify's built-in Pino logger, (2) an actions audit trail writing two entries per interaction to the existing `actions_log` table, and (3) comprehensive Vitest tests covering Zod schemas, rules engine, and four HTTP integration journeys.

All infrastructure already exists. Pino is active via `Fastify({ logger: true })`. The `actions_log` table is in the Prisma schema. `generateWithRetry` returns `attempts`, `complianceViolations`, and `failure.reason` — the raw material for OBS-03 diagnostics. 173 agent tests and 24 API route tests are already passing; this phase adds schema tests (TEST-01) and HTTP journey tests (TEST-03), and fills any rules engine gaps (TEST-02).

**Primary recommendation:** Wire a Fastify `onRequest` hook to inject/propagate `X-Request-Id`, extend `generateWithRetry` to accept a `requestId`/diagnostic context param, log LLM failures in orchestrators with the required diagnostic fields, insert a second `actions_log` record in card-analysis orchestrators for recommendations, and write Vitest tests targeting schemas and HTTP journeys via `fastify.inject`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Request ID propagation via X-Request-Id header — accept from upstream gateway if present, otherwise generate. Pass through orchestrator calls as context param
- Log levels: info for every API request, warn for LLM failures/retries, error for unrecoverable errors
- Log LLM token usage (input_tokens, output_tokens) and latency_ms per LLM call at info level — enables cost tracking and performance monitoring
- Use Fastify's built-in Pino logger — already active with `logger: true`
- Log both agent recommendations AND user clicks — two entries per interaction
- When card analysis returns, log the full recommended action list to actions_log
- When user executes via POST /actions/execute, log the executed action with reference to the recommendation
- Queryable by user and card (OBS-02 requirement)
- Real HTTP via fastify.inject + mocked LLM layer — tests the full request pipeline without external API dependencies
- 4 MVP journey tests: pack pull → card analysis, external upload → portfolio appearance, portfolio summary request, shareable archetype export
- Mock LLM responses with canned data, but exercise real routing, auth (X-User-Id), error handling, and response shaping
- Log validation failures with: card_id, model, zodError.issues (error path), and truncated raw output (first 500 chars)
- Matches Phase 3 retry prompt truncation (500 chars) — consistent truncation boundary
- A developer should be able to diagnose a prompt failure from the log entry alone (OBS-03)

### Claude's Discretion
- Pino log transport configuration
- Request ID generation strategy (UUID v4 vs nanoid)
- Test file organization for integration tests
- Schema test structure for TEST-01 (valid + invalid inputs)
- Whether to add request logging middleware or use Fastify hooks

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| API-07 | Structured logs with request IDs on all endpoints | Fastify `onRequest` hook sets `request.id`; Pino serializes it automatically in every log line |
| OBS-01 | Structured logging with request IDs across all agent operations | `request.id` passed as context param into orchestrators; orchestrators call `fastify.log` or accept a logger param |
| OBS-02 | Actions log records what agent recommended and what user clicked | Two `prisma.actionsLog.create` calls: one in card-analysis orchestrator (recommended), one in `/actions/execute` route (executed) |
| OBS-03 | LLM validation failures logged with card_id, model, error path, and truncated raw output | `generateWithRetry` already surfaces `failure.reason` (truncated to 500 chars by retry logic); orchestrators add card_id and model to the log call |
| TEST-01 | Vitest unit tests for all Zod schemas (valid and invalid inputs) | `packages/schemas` contains all Zod schemas; test file imports schema, runs `safeParse` with valid fixture and invalid fixture, asserts success/failure |
| TEST-02 | Vitest unit tests for rules engine (all card states × action eligibility) | 89 existing rules tests already cover most paths; gap-fill any missing state×action combinations |
| TEST-03 | Integration tests for MVP user journeys via HTTP | Use `fastify.inject` with mocked orchestrators (same pattern as existing 24 route tests); 4 journey tests as specified |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Pino | (bundled with Fastify) | Structured JSON logging | Already active via `Fastify({ logger: true })`; zero setup cost |
| Fastify hooks | Built-in | `onRequest` for request ID injection | Idiomatic Fastify; runs before route handlers, available on all routes |
| Vitest | (existing config) | Unit + integration test runner | Already configured in both `packages/agent` and `apps/api` |
| `crypto.randomUUID()` | Node 14.17+ built-in | Request ID generation | No dependency; produces RFC 4122 UUID v4; available in Node 18+ which this project targets |
| Prisma | (existing) | `actionsLog.create` for audit entries | `actions_log` table already in schema; `agentRecommended` and `userAction` fields exist |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fastify.inject` | Built-in | HTTP integration testing without network | All TEST-03 journey tests — same pattern used in existing 24 route tests |
| `vi.mock` | Vitest built-in | Mock LLM layer in integration tests | Mock `@tcg/agent` orchestrators so tests don't need real LLM API keys |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `crypto.randomUUID()` | `nanoid` | nanoid is shorter/URL-safe but adds a dependency; UUID is sufficient for request IDs |
| Fastify `onRequest` hook | Fastify plugin/middleware | Plugin adds abstraction; direct hook in server.ts is simpler for one concern |
| Fastify built-in Pino | `winston`, `bunyan` | Pino is already active — no reason to change |

**Installation:** No new dependencies required. All tooling is already installed.

---

## Architecture Patterns

### Recommended Project Structure for Phase 5 Changes

```
apps/api/src/
├── server.ts                    # Add onRequest hook for X-Request-Id
└── routes/
    ├── agent.ts                 # Pass requestId to orchestrators; log recommendations to actions_log
    └── actions.ts               # Extend execute log entry with executedAction field

packages/agent/src/
├── llm/
│   └── generate.ts              # Accept optional logContext param for OBS-03 diagnostics
└── orchestrators/
    ├── card-analysis.ts         # Log LLM failures with card_id, model, error path, raw output
    ├── portfolio-summary.ts     # Log LLM token usage + latency_ms
    └── archetype.ts             # Log LLM token usage + latency_ms

apps/api/src/__tests__/
├── routes/                      # Existing 24 tests — do not modify
└── integration/                 # New: 4 MVP journey tests
    └── journeys.test.ts

packages/agent/src/__tests__/
├── rules-*.test.ts              # Existing 89 rules tests — gap-fill only
└── schemas/                     # New: TEST-01 schema tests
    └── schemas.test.ts

packages/schemas/src/__tests__/  # Alternative location for schema tests
    └── schemas.test.ts
```

### Pattern 1: Request ID Injection via Fastify onRequest Hook

**What:** A single `onRequest` hook in `server.ts` reads `X-Request-Id` from the incoming header; if absent, generates one with `crypto.randomUUID()`. Assigns it to `request.id` so Pino includes it in every log line automatically.

**When to use:** Applies to all routes registered after `server.ts` hook setup — no per-route changes needed.

**Example:**
```typescript
// In apps/api/src/server.ts
server.addHook('onRequest', async (request, reply) => {
  const incomingId = request.headers['x-request-id']
  request.id = (Array.isArray(incomingId) ? incomingId[0] : incomingId)
    ?? crypto.randomUUID()
  reply.header('X-Request-Id', request.id)
})
```

Note: Fastify's Pino integration automatically includes `reqId` (mapped from `request.id`) in every log call made via `request.log` or `fastify.log`. No extra serializer needed.

### Pattern 2: OBS-03 — LLM Failure Diagnostic Logging

**What:** When `generateWithRetry` returns `success: false`, the orchestrator logs at `warn` level with all required diagnostic fields before returning the degraded result.

**When to use:** In every orchestrator that calls `generateWithRetry` — card-analysis, portfolio-summary, archetype.

**Example:**
```typescript
// In orchestrator after generateWithRetry call
if (!result.success) {
  fastify.log.warn({
    event: 'llm_validation_failure',
    card_id: cardId,           // OBS-03 required field
    model: config.model,       // OBS-03 required field
    error_path: result.failure.reason.slice(0, 500), // truncated — consistent with retry logic
    attempts: result.attempts,
    request_id: requestId,     // threaded from API layer
  }, 'LLM validation failed after max retries')
}
```

The `failure.reason` in `AnalysisFailure` already contains the Zod error string from `generateWithRetry`. The 500-char truncation is already applied in the retry loop's prompt feedback; logging the same `failure.reason` slice maintains consistency.

### Pattern 3: OBS-02 — Dual Actions Log Entries

**What:** Two separate `actionsLog.create` calls — one when analysis completes (agent recommended), one when user executes (user clicked).

**When to use:** Recommendation entry in orchestrator/route after analysis; execution entry in `/actions/execute` route (already creates one entry — extend its data).

**Example:**
```typescript
// Entry 1: After card analysis (in agent.ts route or card-analysis orchestrator)
await prisma.actionsLog.create({
  data: {
    userId,
    cardId,
    agentRecommended: { actions: result.data.actions },  // full recommended action list
    userAction: 'RECOMMENDED',
    requestId,
  },
})

// Entry 2: When user executes (existing /actions/execute route — extend)
await prisma.actionsLog.create({
  data: {
    userId,
    cardId: body.cardId ?? null,
    agentRecommended: null,
    userAction: body.action,   // what the user actually clicked
    requestId,
  },
})
```

### Pattern 4: TEST-01 Schema Unit Tests

**What:** For each Zod schema, test `safeParse` with a valid fixture and at least one invalid fixture covering required field missing and wrong type.

**When to use:** One `describe` block per schema; two `it` blocks minimum (valid passes, invalid fails with specific issue path).

**Example:**
```typescript
// packages/schemas/src/__tests__/schemas.test.ts
import { describe, it, expect } from 'vitest'
import { CardAnalysisSchema } from '../index.js'

describe('CardAnalysisSchema', () => {
  it('accepts valid card analysis', () => {
    const result = CardAnalysisSchema.safeParse(validCardAnalysis)
    expect(result.success).toBe(true)
  })

  it('rejects missing card_id', () => {
    const result = CardAnalysisSchema.safeParse({ ...validCardAnalysis, card_id: undefined })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('card_id')
  })
})
```

### Pattern 5: TEST-03 Integration Journey Tests

**What:** Full HTTP flow via `fastify.inject` with orchestrators mocked via `vi.mock`. Tests real routing, auth check, request shaping, and response shaping without LLM API calls.

**When to use:** Four journey tests — one per MVP journey. Each sets up mock return value, fires inject, asserts status + response shape.

**Example:**
```typescript
// apps/api/src/__tests__/integration/journeys.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { agentRoutes } from '../../routes/agent.js'
import { externalCardRoutes } from '../../routes/external-cards.js'

vi.mock('@tcg/agent', () => ({ analyzeCardBatch: vi.fn() }))
vi.mock('@tcg/db', () => ({ prisma: { /* mocked calls */ } }))

describe('Journey: pack pull → card analysis', () => {
  it('POST /agent/card/analyze-batch returns analysis for pulled cards', async () => {
    const app = Fastify({ logger: false })
    app.register(agentRoutes)
    // ... mock setup, inject, assert
  })
})
```

### Anti-Patterns to Avoid

- **Logging in route handlers without request.id context:** Always use `request.log.warn(...)` not `fastify.log.warn(...)` inside route handlers — `request.log` automatically includes the request ID.
- **Duplicating existing route tests in journey tests:** Journey tests cover multi-step flows, not single endpoint success/failure. Don't re-assert what the 24 existing route tests already cover.
- **Logging full raw LLM output:** The `failure.reason` is already truncated by `generateWithRetry`'s retry logic. Logging `failure.reason.slice(0, 500)` is correct; do not log the full prompt or full response body.
- **Writing requestId to a separate field if Pino includes it automatically:** Since `request.id` is set on the Fastify request object, every `request.log.*` call includes it automatically. No need to manually add `requestId` to every log payload unless threading into external packages (orchestrators in `packages/agent`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request ID in every log | Manual `requestId` field in every log call | Set `request.id` once; Pino serializes automatically | Pino/Fastify integration handles this; manual approach misses concurrent requests |
| UUID generation | Custom ID scheme | `crypto.randomUUID()` | Built-in, collision-resistant, no dep |
| HTTP integration test server | Express test harness, supertest | `fastify.inject` | Already used in 24 existing tests; consistent with project pattern |
| LLM output truncation | Custom truncation logic | Reuse `failure.reason` (already truncated in `generateWithRetry`) | Retry loop already slices to 500 chars; log the same value |

**Key insight:** Every piece of infrastructure this phase needs already exists. The work is wiring and testing, not building new systems.

---

## Common Pitfalls

### Pitfall 1: Request ID Not Threading Into Packages

**What goes wrong:** `request.id` is set correctly in `apps/api`, but orchestrators in `packages/agent` use their own logger or no logger, so LLM failure logs don't include the request ID.

**Why it happens:** Package-level code doesn't have access to the Fastify request object.

**How to avoid:** Pass `requestId: string` as a parameter in the orchestrator function signature. Orchestrators log using a passed-in logger or include `requestId` explicitly in the log object.

**Warning signs:** LLM failure log entries appear in output but lack `reqId`/`request_id` field, making them impossible to correlate to an API request.

### Pitfall 2: actions_log Schema Missing requestId Column

**What goes wrong:** Code attempts to write `requestId` to `actionsLog` but the Prisma schema doesn't have that field.

**Why it happens:** The `actions_log` table was defined before request ID tracing was designed.

**How to avoid:** Check the current Prisma schema before writing the log entry. If the column doesn't exist, either add a migration or log `requestId` only in the Pino log (not the DB row). Decision should be made in planning — the locked constraint requires queryability by user and card (OBS-02), not by request ID.

**Warning signs:** Prisma type error on `actionsLog.create` when passing `requestId`.

### Pitfall 3: Integration Tests Breaking on Prisma Calls

**What goes wrong:** Journey tests that hit routes which internally call Prisma fail because `@tcg/db` is not mocked.

**Why it happens:** The existing 24 route tests mock `@tcg/db` with `vi.mock('@tcg/db', ...)` — journey tests must do the same.

**How to avoid:** Include `vi.mock('@tcg/db', () => ({ prisma: { actionsLog: { create: vi.fn() }, ... } }))` in integration test setup. Study the existing route tests in `apps/api/src/__tests__/routes/` for the exact mock shape.

**Warning signs:** Test fails with "Cannot connect to database" or Prisma client initialization error.

### Pitfall 4: TEST-02 Rules Engine — 89 Tests Already Exist

**What goes wrong:** Planner creates a full rules engine test suite from scratch, duplicating existing tests and potentially conflicting with them.

**Why it happens:** Not checking existing test coverage before planning new tests.

**How to avoid:** Run `pnpm test` in `packages/agent` to see current passing count. Add only gap-filling tests for combinations not already covered. The CONTEXT.md confirms 89 tests exist.

**Warning signs:** Test file count doubles; tests with identical names appear.

### Pitfall 5: Pino Transport Configuration Breaks Existing Tests

**What goes wrong:** Adding a Pino transport (e.g., `pino-pretty`) to server.ts causes tests that build a Fastify server inline to fail or produce unexpected output.

**Why it happens:** Transport config in `server.ts` may not be idiomatic for test environments.

**How to avoid:** Any transport config should be in a separate `logger.ts` helper or gated on `NODE_ENV !== 'test'`. Tests that build inline Fastify instances use `logger: false` (already the pattern in existing tests).

---

## Code Examples

### Fastify onRequest Hook for Request ID (API-07 / OBS-01)
```typescript
// apps/api/src/server.ts — add before route registration
server.addHook('onRequest', async (request, reply) => {
  const incoming = request.headers['x-request-id']
  const id = (Array.isArray(incoming) ? incoming[0] : incoming)
    ?? crypto.randomUUID()
  request.id = id
  reply.header('X-Request-Id', id)
})
```

### OBS-03 LLM Failure Log in Orchestrator
```typescript
// In any orchestrator after generateWithRetry
if (!llmResult.success) {
  request.log.warn({
    event: 'llm_validation_failure',
    card_id: cardId,
    model: config.model,
    error_path: llmResult.failure.reason.slice(0, 500),
    attempts: llmResult.attempts,
  }, 'LLM validation failed')
}
```

### OBS-02 Recommendation Entry in Card Analysis Route
```typescript
// After analyzeCard returns successfully in agent.ts route
await prisma.actionsLog.create({
  data: {
    userId,
    cardId: body.cardId,
    agentRecommended: result.data.actions as unknown as Prisma.InputJsonValue,
    userAction: 'RECOMMENDED',
  },
})
```

### TEST-01 Schema Test Pattern
```typescript
import { describe, it, expect } from 'vitest'
import { CardAnalysisSchema, PortfolioSummarySchema, CollectorArchetypeSchema } from '@tcg/schemas'

const validCardAnalysis = {
  card_id: 'card-uuid',
  identity_tags: ['holo'],
  rarity_signal: 'High',
  liquidity_signal: 'Fast',
  price_band: { low: 10, mid: 25, high: 40 },
  reasoning_bullets: ['Popular'],
  confidence: 'HIGH',
  actions: [],
  priceConfidence: 'LIVE',
  priceFetchedAt: null,
}

describe('CardAnalysisSchema', () => {
  it('accepts valid input', () => {
    expect(CardAnalysisSchema.safeParse(validCardAnalysis).success).toBe(true)
  })
  it('rejects missing card_id', () => {
    const r = CardAnalysisSchema.safeParse({ ...validCardAnalysis, card_id: undefined })
    expect(r.success).toBe(false)
  })
})
```

### TEST-03 Journey Test Pattern
```typescript
// apps/api/src/__tests__/integration/journeys.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { agentRoutes } from '../../routes/agent.js'

const mockAnalyzeCardBatch = vi.fn()
vi.mock('@tcg/agent', () => ({
  analyzeCardBatch: (...args: unknown[]) => mockAnalyzeCardBatch(...args),
  analyzeCard: vi.fn(),
  summarizePortfolio: vi.fn(),
  detectArchetype: vi.fn(),
}))
vi.mock('@tcg/db', () => ({
  prisma: { actionsLog: { create: vi.fn().mockResolvedValue({}) } },
}))

function buildServer() {
  const app = Fastify({ logger: false })
  app.register(agentRoutes)
  return app
}

describe('Journey 1: pack pull → card analysis', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('POST /agent/card/analyze-batch returns results for pulled card IDs', async () => {
    mockAnalyzeCardBatch.mockResolvedValue([
      { success: true, data: { card_id: 'card-1', actions: [] } },
    ])
    const app = buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/agent/card/analyze-batch',
      headers: { 'x-user-id': 'user-seed-1' },
      payload: { cardIds: ['card-1'] },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).results).toHaveLength(1)
  })
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual logger setup | Pino bundled with Fastify via `logger: true` | Fastify v4+ | Zero config structured logging |
| Supertest for HTTP integration tests | `fastify.inject` | Fastify v3+ | No network, no port binding, deterministic |
| Manual UUID npm package | `crypto.randomUUID()` | Node 14.17 LTS | Zero dependency request ID generation |

**Deprecated/outdated:**
- `uuid` npm package for request IDs: Node's built-in `crypto.randomUUID()` is sufficient and eliminates a dependency.
- `pino-http` as a separate middleware: Fastify's native Pino integration handles request logging automatically.

---

## Open Questions

1. **Does `actions_log` Prisma model have a `requestId` column?**
   - What we know: The table has `userId`, `cardId`, `agentRecommended`, `userAction`
   - What's unclear: Whether adding `requestId` to the DB row is needed (vs just logging it via Pino)
   - Recommendation: OBS-02 requires queryability by user and card — not by request ID. Log `requestId` via Pino only; do not add a migration unless the planner decides it's needed for DB-level tracing.

2. **Which file houses the schema tests for TEST-01?**
   - What we know: Schemas live in `packages/schemas`; Vitest is not yet configured there
   - What's unclear: Whether to add Vitest config to `packages/schemas` or place schema tests in `packages/agent`
   - Recommendation: Add a `vitest.config.ts` to `packages/schemas` and test schemas there — keeps schema tests co-located with schema definitions.

3. **Do the 4 journey test scenarios require Prisma DB fixtures or are mocks sufficient?**
   - What we know: Existing route tests mock both `@tcg/agent` and `@tcg/db` entirely
   - What's unclear: Whether journey tests need to simulate real DB state for richer assertions
   - Recommendation: Stick with full mocks (consistent with existing pattern). Real DB integration is out of scope for v1.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing in `packages/agent` and `apps/api`) |
| Config file | `packages/agent/vitest.config.ts`, `apps/api/vitest.config.ts` (existing); `packages/schemas/vitest.config.ts` (Wave 0 gap) |
| Quick run command | `pnpm --filter @tcg/agent test --run` |
| Full suite command | `pnpm test` (turbo runs all packages) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| API-07 | All endpoints include `reqId` in log output | smoke (manual log inspection) | `pnpm --filter @tcg/api test --run` | ✅ (extend existing) |
| OBS-01 | Orchestrator log entries carry request ID | unit | `pnpm --filter @tcg/agent test --run` | ❌ Wave 0 |
| OBS-02 | Two actionsLog entries per card analysis + execute | integration | `pnpm --filter @tcg/api test --run` | ❌ Wave 0 |
| OBS-03 | LLM failure log has card_id, model, error_path, truncated output | unit | `pnpm --filter @tcg/agent test --run` | ❌ Wave 0 |
| TEST-01 | Zod schemas: valid input passes, invalid input fails with correct issue path | unit | `pnpm --filter @tcg/schemas test --run` | ❌ Wave 0 |
| TEST-02 | Rules engine: all card states × eligible actions covered | unit | `pnpm --filter @tcg/agent test --run` | ✅ (89 existing; gap-fill only) |
| TEST-03 | 4 MVP journey HTTP flows: pack pull, external upload, portfolio summary, archetype export | integration | `pnpm --filter @tcg/api test --run` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @tcg/agent test --run && pnpm --filter @tcg/api test --run`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/schemas/vitest.config.ts` — Vitest not yet configured for schemas package
- [ ] `packages/schemas/src/__tests__/schemas.test.ts` — covers TEST-01 (all Zod schemas)
- [ ] `apps/api/src/__tests__/integration/journeys.test.ts` — covers TEST-03 (4 MVP journeys)
- [ ] Framework install: `pnpm --filter @tcg/schemas add -D vitest` — if not present in schemas package

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `apps/api/src/server.ts` — confirmed `Fastify({ logger: true })` active
- Codebase inspection: `packages/agent/src/llm/generate.ts` — confirmed `failure.reason` already truncated at 500 chars in retry loop
- Codebase inspection: `apps/api/src/routes/actions.ts` — confirmed existing `actionsLog.create` pattern
- Codebase inspection: `apps/api/src/__tests__/routes/agent.test.ts` — confirmed `fastify.inject` + `vi.mock` pattern in 24 existing tests
- Codebase inspection: `packages/agent/src/llm/types.ts` — confirmed `AnalysisFailure` type shape
- `.planning/phases/05-observability-hardening-and-testing/05-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- Fastify documentation (known): `addHook('onRequest', ...)` is idiomatic for cross-cutting concerns; `request.id` is the standard field Pino reads for `reqId` in log output
- Node.js documentation (known): `crypto.randomUUID()` available since Node 14.17, standard in Node 18+

### Tertiary (LOW confidence)
- None — all claims verified against codebase or well-established Fastify/Node conventions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tooling confirmed in codebase; no new dependencies
- Architecture: HIGH — patterns derived directly from existing 24 route tests and CONTEXT.md locked decisions
- Pitfalls: HIGH — grounded in specific codebase observations (existing mock patterns, existing test counts)

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable stack; only risk is Prisma schema change before implementation)
