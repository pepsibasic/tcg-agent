# Phase 7: Cross-Phase Wiring and Test Fidelity - Research

**Researched:** 2026-03-05
**Domain:** TypeScript monorepo — Fastify route handlers, orchestrator wiring, Prisma actionsLog, Vitest integration fixture fidelity
**Confidence:** HIGH

## Summary

Phase 7 is a pure gap-closure phase: no new modules, no new infrastructure. All four integration gaps were confirmed by reading actual source files. The changes are surgical — additive wiring into already-wired callsites.

The `generateWithRetry` function already has `logger?: LLMLogger` and `cardId?: string` in its `GenerateWithRetryOptions` interface (packages/agent/src/llm/generate.ts lines 7-21). The logging events `llm_validation_failure` and `llm_generation_exhausted` already fire inside `generateWithRetry` — but none of the three orchestrators pass `logger` or `cardId` yet. Phase 7 threads `request.log` from the route handler down through each orchestrator into those options.

`computeVaultConversionCandidates` is fully implemented and tested in `packages/agent/src/rules/vault/conversion.ts`. The `summarizePortfolio` orchestrator has access to `externalCards` (already fetched in step 1). Adding vault conversion is a matter of calling `computeVaultConversionCandidatesImpl` with those external cards and including the result in the response. The `PortfolioSummaryResponseSchema` currently aliases `PortfolioSummarySchema` which has no `vaultConversionCandidates` field — the schema must be extended.

The `analyze-batch` route handler (apps/api/src/routes/agent.ts line 60-79) already logs a single `agent_analysis_complete` event but does NOT write `actionsLog` entries per card — unlike the single-card `/analyze` handler (lines 38-48) which does. The fix is a `for` loop over `results` after `analyzeCardBatch` returns, writing one `actionsLog.create` per successful result.

The integration test fixtures in `journeys.test.ts` use structurally invalid mock data: `priceConfidence: 'FRESH'` (line 89, 106) is not in the `PriceConfidence` enum (valid values: `LIVE/RECENT_24H/STALE_7D/NO_DATA`), and the `actions` mock shapes (lines 87, 93) use `{ type, label, description }` instead of the real `ActionSchema` shape `{ type, params, ui_copy, risk_notes }`.

**Primary recommendation:** Execute four independent, additive changes in the order: (1) schema extension, (2) orchestrator logger threading, (3) batch actionsLog writes, (4) fixture fix.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Call computeVaultConversionCandidates from the portfolio summary orchestrator (not a dedicated endpoint)
- Include vault conversion results in the PortfolioSummaryResponse — extend response schema if needed
- VAULT-01/02/03: rules engine function already exists and tested — this is purely wiring
- Thread request.log (Fastify Pino logger) through all 3 orchestrators into generateWithRetry
- Add logger parameter to generateWithRetry function signature (optional, for backward compatibility) — ALREADY DONE
- Log llm_validation_failure and llm_generation_exhausted with card_id, model, error path, truncated raw output — ALREADY DONE inside generateWithRetry; orchestrators just need to pass logger
- POST /agent/card/analyze-batch writes RECOMMENDATION entries to actionsLog for each card analyzed
- Fix mock fixtures to use valid PriceConfidence enum values (LIVE/RECENT_24H/STALE_7D/NO_DATA)
- Fix mock fixtures to use real ActionSchema shapes ({type, params, ui_copy, risk_notes})

### Claude's Discretion
- Whether to add vaultConversionCandidates as a new field on PortfolioSummaryResponseSchema or return alongside it
- generateWithRetry logger parameter design (options bag vs separate param) — already resolved: options bag
- actionsLog write timing in batch flow (per-card or batched)
- Exact test fixture data values

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VAULT-01 | Agent recommends vaulting when external card estimated value >= threshold OR matches identity goals OR enough cards to batch ship | `computeVaultConversionCandidatesImpl` already implements this; wire into `summarizePortfolio` |
| VAULT-02 | Vault recommendation includes "unlocks" reasons: instant liquidity, trade into packs, verified portfolio ranking | `buildUnlockReasons` called inside `computeVaultConversionCandidatesImpl`; surfaces automatically |
| VAULT-03 | Batching prompt triggers when >= N external cards or total external value >= X, recommending BUNDLE_SHIP action | `isBatchEligible` logic in `computeVaultConversionCandidatesImpl` handles this; no new logic needed |
| OBS-02 | Actions log records what agent recommended and what user clicked | Single-card handler already writes RECOMMENDATION; batch handler needs the same pattern added |
| OBS-03 | LLM validation failures logged with card_id, model, error path, and truncated raw output | Already implemented inside `generateWithRetry`; orchestrators must pass `logger` and `cardId` |
| CARD-03 | After pack pull, user receives CardAnalysis for each pulled card with "What next?" actions contextual to the pull | Batch handler already calls `analyzeCardBatch` with `source: pack_pull`; actionsLog write is the missing gap |
| TEST-03 | Integration tests for MVP user journeys via HTTP | Tests exist; fixture data uses invalid enum values and wrong action shapes — fix the mock data only |
</phase_requirements>

---

## Standard Stack

### Core (already in project — no new installs)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Fastify Pino logger | via Fastify | `request.log` available on every route handler | `LLMLogger` interface in `generate.ts` already matches Pino's `.info`/`.warn` signatures |
| Prisma `actionsLog` | via `@tcg/db` | Write RECOMMENDATION audit entries | Table and `prisma.actionsLog.create` already used in single-card handler |
| Zod `PortfolioSummarySchema` | via `@tcg/schemas` | API response schema | Must be extended with `vaultConversionCandidates` field |
| `computeVaultConversionCandidatesImpl` | `packages/agent/src/rules/vault/conversion.ts` | Returns `Action[]` of SHIP_TO_VAULT + BUNDLE_SHIP | Fully implemented and tested |
| Vitest | via project | Integration test runner | `journeys.test.ts` fixtures need data correction only |

**No new packages to install.**

---

## Architecture Patterns

### Recommended Project Structure
No new files are required for this phase. All changes are additive edits to existing files:

```
packages/schemas/src/
├── llm/portfolio-summary.ts      # Add vaultConversionCandidates to PortfolioSummarySchema
└── api/portfolio-summary.ts      # PortfolioSummaryResponseSchema (re-exports — may auto-update)

packages/agent/src/
├── orchestrators/portfolio-summary.ts  # Add computeVaultConversionCandidates call + logger threading
├── orchestrators/card-analysis.ts      # Add logger + cardId threading into generateWithRetry
└── orchestrators/archetype.ts          # Add logger threading into generateWithRetry

apps/api/src/
├── routes/agent.ts                     # Pass request.log to orchestrators; add batch actionsLog writes

apps/api/src/__tests__/integration/
└── journeys.test.ts                    # Fix mock fixture data shapes
```

### Pattern 1: Threading logger through orchestrator options

The three orchestrators currently call `generateWithRetry` without `logger` or `cardId`. The fix is to add an `options` parameter to each orchestrator function signature (matching the existing `context` parameter pattern in `analyzeCard`) and thread it down.

`analyzeCard` already accepts `context: { source?: 'pack_pull' }` — extend it to also accept `logger`:

```typescript
// Source: packages/agent/src/orchestrators/card-analysis.ts (existing pattern)
export async function analyzeCard(
  userCardId: string,
  userId: string,
  context: { source?: 'pack_pull'; logger?: LLMLogger } = {}
): Promise<CardAnalysisResult> {
  // ...
  const llmResult = await generateWithRetry({
    schema: CardAnalysisSchema,
    prompt: rendered.user,
    system: rendered.system,
    config: DEFAULT_LLM_CONFIG,
    narrativeFields: ['rarity_signal', 'liquidity_signal', 'reasoning_bullets'],
    logger: context.logger,
    cardId: userCardId,         // userCardId is already available here
  })
}
```

`summarizePortfolio` and `detectArchetype` currently take only `userId: string`. Add an optional options bag:

```typescript
// Source: packages/agent/src/orchestrators/portfolio-summary.ts (new pattern)
export async function summarizePortfolio(
  userId: string,
  options: { logger?: LLMLogger } = {}
): Promise<PortfolioSummaryResult> {
  // ...
  const llmResult = await generateWithRetry({
    // ...
    logger: options.logger,
    cardId: userId,   // no card_id for portfolio; pass userId as context identifier
  })
}
```

In the route handler, `request.log` satisfies the `LLMLogger` interface (it has `.info` and `.warn`):

```typescript
// Source: apps/api/src/routes/agent.ts (existing pattern — request.log already used line 49)
const result = await summarizePortfolio(userId, { logger: request.log })
const result = await detectArchetype(userId, { logger: request.log })
const results = await analyzeCardBatch(body.cardIds as string[], userId, {
  source: 'pack_pull',
  logger: request.log,
})
```

### Pattern 2: Vault conversion wiring in portfolio summary

`externalCards` is already fetched in `summarizePortfolio` step 1. After step 2 (DB-computed fields), call the vault rules function:

```typescript
// Source: packages/agent/src/rules/vault/conversion.ts (existing export)
import { computeVaultConversionCandidatesImpl } from '../rules/vault/conversion.js'

// In summarizePortfolio, after step 2:
const externalCardInputs = externalCards.map((ec) => ({
  cardName: ec.name,
  estimatedValue: ec.estimatedValue ? Number(ec.estimatedValue) : null,
  ipCategory: 'External',
}))
const vaultConversionCandidates = computeVaultConversionCandidatesImpl(externalCardInputs)
```

Then include in both success and degraded return paths:
```typescript
// Success path merge:
data: {
  ...llmResult.data,
  userId,
  totalValueEst,
  breakdown: dbBreakdown,
  priceDataAsOf,
  priceConfidence: overallPriceConfidence,
  vaultConversionCandidates,   // new field
}
```

### Pattern 3: Batch actionsLog writes (per-card, post-call)

The single-card handler writes one `actionsLog` entry per card (lines 38-48 of agent.ts). The batch handler needs the same pattern, iterating over results after `analyzeCardBatch` returns:

```typescript
// Source: apps/api/src/routes/agent.ts — mirrors existing single-card pattern
const results = await analyzeCardBatch(body.cardIds as string[], userId, {
  source: 'pack_pull',
  logger: request.log,
})

// Write RECOMMENDATION entries for each successful analysis (OBS-02, CARD-03)
for (const result of results) {
  if (result.success) {
    await prisma.actionsLog.create({
      data: {
        userId,
        cardId: result.data.card_id,
        agentRecommended: { actions: result.data.actions ?? [] },
        userAction: 'RECOMMENDATION',
      },
    })
  }
}
```

Write timing: per-card (not batched) — consistent with single-card handler, simpler error isolation.

### Pattern 4: Schema extension for vaultConversionCandidates

`PortfolioSummaryResponseSchema` currently aliases `PortfolioSummarySchema` directly. Two options:

**Option A (recommended): Extend PortfolioSummarySchema directly**
Add `vaultConversionCandidates: z.array(ActionSchema)` to `PortfolioSummarySchema` in `packages/schemas/src/llm/portfolio-summary.ts`. Since `PortfolioSummaryResponseSchema` re-exports it, it auto-updates. `PortfolioSummaryLLMSchema` is separate and unaffected.

```typescript
// packages/schemas/src/llm/portfolio-summary.ts
import { ActionSchema } from './action.js'

export const PortfolioSummarySchema = z.object({
  // ... existing fields ...
  vaultConversionCandidates: z.array(ActionSchema),
})
```

**Option B: Extend in API schema only**
Only add the field to `PortfolioSummaryResponseSchema` in `packages/schemas/src/api/portfolio-summary.ts` using `.extend()`. This keeps `PortfolioSummarySchema` (LLM) unchanged.

Option A is simpler — the field is DB-computed not LLM-generated, but it belongs on the full portfolio document. The planner should choose based on whether `PortfolioSummarySchema` is used elsewhere as the "LLM schema" (it is not — `PortfolioSummaryLLMSchema` is the narrow LLM schema).

### Pattern 5: Fixture data correction

The invalid values and their replacements:

```typescript
// BEFORE (invalid — 'FRESH' not in PriceConfidence enum):
priceConfidence: 'FRESH',

// AFTER (valid enum values per PriceConfidenceSchema):
priceConfidence: 'LIVE',       // or 'RECENT_24H' / 'STALE_7D' / 'NO_DATA'

// BEFORE (invalid ActionSchema shape):
actions: [{ type: 'LIST', label: 'List on marketplace', description: 'List this card' }],

// AFTER (real ActionSchema: { type, params, ui_copy, risk_notes }):
actions: [
  {
    type: 'LIST',
    params: null,
    ui_copy: 'List on marketplace',
    risk_notes: null,
  },
],
```

The journey tests mock at the orchestrator boundary (`@tcg/agent`), so the fixture data is what the mock returns — it bypasses real Zod validation. TEST-03 requires that these mocks use schema-valid shapes so the tests exercise real structure.

### Anti-Patterns to Avoid
- **Changing generateWithRetry signature**: It already has `logger` and `cardId` — do NOT refactor the function itself. Only pass the values from orchestrators.
- **Parallelizing actionsLog writes in batch handler**: Write sequentially or with `Promise.all` — but do NOT skip writes on partial failures. Each card's audit entry is independent.
- **Adding vaultConversionCandidates to PortfolioSummaryLLMSchema**: This field is deterministic (rules engine), not LLM-generated. Keep it out of the narrow LLM schema.
- **Modifying the `rules/vault/conversion.ts` implementation**: It is complete and tested. Only import and call it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Vault recommendations | Custom threshold/batch logic | `computeVaultConversionCandidatesImpl` — already handles single-card threshold, batch count/value threshold, BUNDLE_SHIP |
| Unlock reasons on vault actions | Custom reason strings | `buildUnlockReasons` — already called inside the vault function |
| LLM diagnostic events | New logging wrapper | `generateWithRetry` already fires `llm_validation_failure` and `llm_generation_exhausted` — just pass `logger` |
| Action serialization | Custom JSON shapes | `ActionSchema` from `@tcg/schemas` — `{ type, params, ui_copy, risk_notes }` |

---

## Common Pitfalls

### Pitfall 1: ExternalCardInput shape mismatch
**What goes wrong:** `computeVaultConversionCandidatesImpl` expects `ExternalCardInput` (from `packages/agent/src/rules/types.ts`), but the Prisma `externalCard` model has a `name` field whereas `ExternalCardInput` uses `cardName`.
**Why it happens:** The rules engine input type is domain-typed, not DB-typed.
**How to avoid:** Map Prisma records to `ExternalCardInput` explicitly before calling the function. Check `RulesEngineConfig` import too — `DEFAULT_CONFIG` is the default second parameter.
**Warning signs:** TypeScript compile error: `Property 'cardName' does not exist on type ExternalCard`.

### Pitfall 2: LLMLogger interface compatibility with Pino
**What goes wrong:** `request.log` is a full Pino logger; `LLMLogger` only requires `info` and `warn`. The assignment is safe, but if the interface is ever accidentally changed to require Pino-specific methods, the decoupling breaks.
**How to avoid:** Keep `LLMLogger` minimal — `{ info, warn }` only. Never add Pino-specific methods to it.
**Warning signs:** TypeScript error when passing `request.log` to orchestrator options.

### Pitfall 3: actionsLog cardId for batch — card_id vs userCardId
**What goes wrong:** `result.data.card_id` in `CardAnalysisResponse` is the `userCardId` string (the UUID passed to `analyzeCard`). Confirm the Prisma `actionsLog` `cardId` field accepts this format.
**How to avoid:** The single-card handler uses `body.cardId` (the request parameter, which is a userCardId). The batch handler should use `result.data.card_id` from each result — these are the same type.

### Pitfall 4: summarizePortfolio called without options in existing tests
**What goes wrong:** The journey test in `journeys.test.ts` mocks `summarizePortfolio` at the `@tcg/agent` boundary (line 385: `mockSummarizePortfolio.mockResolvedValue(portfolioResult)`) and asserts `mockSummarizePortfolio.toHaveBeenCalledWith('test-user-id')`. After adding an `options` second parameter, this assertion will FAIL because the call becomes `summarizePortfolio('test-user-id', { logger: request.log })`.
**How to avoid:** Update the `toHaveBeenCalledWith` assertion to `expect.objectContaining` or add the options argument. Similarly check `mockDetectArchetype` assertions.
**Warning signs:** Journey test fails with "Expected: 'test-user-id', Received: ['test-user-id', { logger: ... }]".

### Pitfall 5: vaultConversionCandidates in degraded path
**What goes wrong:** The degraded path in `summarizePortfolio` hard-codes return fields. If `vaultConversionCandidates` is added to the schema but not the degraded return, TypeScript will error or the degraded path will omit the field.
**How to avoid:** Compute `vaultConversionCandidates` before the LLM call (it is deterministic) so it is available in both success and degraded paths.

---

## Code Examples

### ExternalCardInput type (rules engine)
```typescript
// Source: packages/agent/src/rules/types.ts (inferred from conversion.ts usage)
// ExternalCardInput has: cardName, estimatedValue, ipCategory (and potentially others)
// Map from Prisma externalCard:
const externalCardInputs = externalCards.map((ec) => ({
  cardName: ec.name,
  estimatedValue: ec.estimatedValue ? Number(ec.estimatedValue) : null,
  ipCategory: 'External',
}))
```

### Valid ActionSchema fixture data
```typescript
// Source: packages/schemas/src/llm/action.ts
// ActionSchema = { type: ActionTypeSchema, params: Record<string,unknown>|null, ui_copy: string, risk_notes: string|null }
{
  type: 'LIST',           // ActionTypeSchema enum value
  params: null,           // or { cardValue: 200, ... }
  ui_copy: 'List on marketplace',
  risk_notes: null,       // or 'Price data may be stale'
}
```

### Valid PriceConfidence values
```typescript
// Source: packages/schemas/src/shared/enums.ts
// PriceConfidenceSchema = z.enum(['LIVE', 'RECENT_24H', 'STALE_7D', 'NO_DATA'])
// Replace 'FRESH' with 'LIVE' in all fixtures
priceConfidence: 'LIVE'  // highest confidence
priceConfidence: 'NO_DATA'  // lowest / default for new external cards
```

---

## State of the Art

| Old State | Current State | Notes |
|-----------|---------------|-------|
| `generateWithRetry` had no logger | Logger already added in Phase 5 | Orchestrators just need to pass it |
| Single-card handler lacked audit trail | Phase 4 added actionsLog.create to `/analyze` | Batch handler was not updated to match |
| `computeVaultConversionCandidates` existed but not wired | Rules engine complete since Phase 2; never called from API | Phase 7 closes this gap |
| Integration fixtures used arbitrary shapes | Tests written with placeholder data | Schema drift went undetected because mocks bypass Zod |

---

## Open Questions

1. **ExternalCardInput field names**
   - What we know: `computeVaultConversionCandidatesImpl` takes `ExternalCardInput[]`; the function uses `card.cardName` and `card.estimatedValue`
   - What's unclear: The exact shape of `ExternalCardInput` in `packages/agent/src/rules/types.ts` was not read
   - Recommendation: Planner should read `types.ts` at task time and map Prisma fields accordingly. LOW risk — TypeScript will catch mismatches at compile time.

2. **`analyzeCardBatch` logger propagation to per-card calls**
   - What we know: `analyzeCardBatch` calls `analyzeCard` for each card; `analyzeCard` is the function that calls `generateWithRetry`
   - What's unclear: Whether to add `logger` to `analyzeCard`'s context parameter and thread it from `analyzeCardBatch`
   - Recommendation: Yes — add `logger` to `analyzeCard`'s context. `analyzeCardBatch` should forward it: `analyzeCard(id, userId, { source: context.source, logger: context.logger })`. This matches the established context-forwarding pattern.

3. **PortfolioSummaryResponseSchema extension approach**
   - What we know: It currently is just `export const PortfolioSummaryResponseSchema = PortfolioSummarySchema`
   - What's unclear: Whether the planner should extend `PortfolioSummarySchema` itself or use `.extend()` in the API schema file
   - Recommendation: Extend `PortfolioSummarySchema` directly — it is the full document schema; `PortfolioSummaryLLMSchema` remains the narrow 5-field LLM schema. This keeps the response type accurate.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (detected: vitest.config.ts in root, package.json test scripts) |
| Config file | vitest.config.ts (root) |
| Quick run command | `pnpm test --filter apps/api -- --reporter=verbose journeys` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VAULT-01 | computeVaultConversionCandidates called and results in portfolio response | integration | `pnpm test --filter apps/api -- journeys` | ✅ journeys.test.ts (needs new assertion) |
| VAULT-02 | SHIP_TO_VAULT includes unlocks reasons | unit | `pnpm test --filter packages/agent -- vault-conversion` | ✅ vault-conversion.test.ts |
| VAULT-03 | BUNDLE_SHIP in results when batch threshold met | unit | `pnpm test --filter packages/agent -- vault-conversion` | ✅ vault-conversion.test.ts |
| OBS-02 | actionsLog.create called per card in batch | integration | `pnpm test --filter apps/api -- journeys` | ✅ journeys.test.ts (needs new assertion) |
| OBS-03 | llm_validation_failure fires with logger context | unit | `pnpm test --filter packages/agent -- generate` | ✅ generate.test.ts |
| CARD-03 | analyze-batch writes RECOMMENDATION entries after pack pull | integration | `pnpm test --filter apps/api -- journeys` | ✅ journeys.test.ts (needs new assertion) |
| TEST-03 | Fixture PriceConfidence and ActionSchema shapes are schema-valid | integration | `pnpm test --filter apps/api -- journeys` | ✅ journeys.test.ts (fix existing data) |

### Sampling Rate
- **Per task commit:** `pnpm test --filter apps/api -- journeys`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. Changes are: (a) fix fixture data in `journeys.test.ts`, (b) add new assertions to Journey 1 (actionsLog called per card, vaultConversionCandidates in portfolio response), (c) add assertion to Journey 3 (vaultConversionCandidates field present).

---

## Sources

### Primary (HIGH confidence)
- `packages/agent/src/llm/generate.ts` — `GenerateWithRetryOptions` interface, `LLMLogger` type, existing logging events
- `packages/agent/src/rules/vault/conversion.ts` — `computeVaultConversionCandidatesImpl` full implementation
- `packages/agent/src/orchestrators/portfolio-summary.ts` — full orchestrator, existing `generateWithRetry` call site
- `packages/agent/src/orchestrators/card-analysis.ts` — `analyzeCard` and `analyzeCardBatch` implementations
- `packages/agent/src/orchestrators/archetype.ts` — `detectArchetype` implementation
- `apps/api/src/routes/agent.ts` — all route handlers; single-card `actionsLog.create` pattern
- `apps/api/src/__tests__/integration/journeys.test.ts` — all four journey tests; invalid fixture values identified
- `packages/schemas/src/llm/action.ts` — `ActionSchema` canonical shape
- `packages/schemas/src/llm/portfolio-summary.ts` — `PortfolioSummarySchema` and `PortfolioSummaryLLMSchema`
- `packages/schemas/src/api/portfolio-summary.ts` — `PortfolioSummaryResponseSchema` (simple re-export)
- `.planning/phases/07-cross-phase-wiring-and-test-fidelity/07-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- `packages/schemas/src/shared/enums.ts` (inferred from exports index) — PriceConfidence enum values confirmed via `portfolio-summary.ts` import

---

## Metadata

**Confidence breakdown:**
- Vault wiring: HIGH — source code read, function exists, external cards already fetched
- Logger threading: HIGH — `LLMLogger` interface exists, `request.log` already used in route handlers
- Batch actionsLog: HIGH — pattern exists in single-card handler; gap confirmed by reading batch handler
- Fixture fidelity: HIGH — invalid values ('FRESH', wrong action shape) confirmed by reading journeys.test.ts
- ExternalCardInput mapping: MEDIUM — `types.ts` not directly read; field name inferred from conversion.ts usage

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable codebase, no external dependencies changing)
