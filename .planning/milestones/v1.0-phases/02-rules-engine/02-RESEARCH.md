# Phase 02: Rules Engine - Research

**Researched:** 2026-03-04
**Domain:** Deterministic TypeScript rules engine — card state machine, action eligibility, vault recommendation logic
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Action eligibility per state:**
- ON_MARKET: No actions — cards are locked while listed. User manages through marketplace UI
- IN_TRANSIT: WATCHLIST only — nothing actionable until card arrives at vault
- VAULTED: BUYBACK, LIST, REDEEM, SHIP (physical redemption), WATCHLIST — with conditional visibility based on data quality and state (hide BUYBACK if priceConfidence is NO_DATA, add risk_notes if STALE_7D, suppress LIST if card already has an active marketplace listing)
- EXTERNAL: SHIP_TO_VAULT, WATCHLIST
- WATCHLIST: Available for all states except ON_MARKET

**Vault conversion thresholds:**
- Single-card vault recommendation triggers when external card estimated value >= $100
- Batch shipping (BUNDLE_SHIP) triggers when user has 5+ external cards OR total external value >= $500
- Identity-based vault triggers: stub the interface now (always returns false) — will activate when archetype detection is built in Phase 4
- Vault "unlocks" reasons are dynamic with card context (e.g., "Instant liquidity — estimated buyback $85", "Verified ranking — moves you to top 5% Pokemon collectors")

**Action copy and risk tone:**
- ui_copy uses direct, actionable tone: "List on Marketplace — Recent comps suggest ~$520"
- ui_copy includes card-specific data (prices, price confidence, percentages) via template interpolation
- risk_notes present only when relevant — null for low-risk actions (WATCHLIST). Uses compliance-safe "signals" language per project safety posture
- SHIP_TO_VAULT copy is benefit-forward, not pushy: "Ship to Vault — Unlock instant liquidity and verified ranking for this $180 card"

**Action params structure (typed discriminated union, not loose key-value pairs):**
- LIST: `{ suggestedPrice, priceConfidence, currency }`
- BUYBACK: `{ estimatedBuybackValue, priceConfidence }`
- SHIP_TO_VAULT: `{ cardValue, unlocks: string[], batchEligible }`
- BUNDLE_SHIP: `{ cardCount, totalValue, estimatedSavings }`
- REDEEM, OPEN_PACK, WATCHLIST: Claude's discretion on minimal params

### Claude's Discretion
- Exact params shape for REDEEM, OPEN_PACK, and WATCHLIST action types
- Internal architecture of the rules engine (function composition, class-based, etc.)
- Test organization and fixture strategy
- How to structure the configurable thresholds (env vars, config object, etc.)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RULE-01 | Deterministic rules engine computes eligible actions per card based on card state — LLM never decides action eligibility | State machine pattern: pure function `computeEligibleActions(card, context)` returns `Action[]` with zero HTTP or LLM calls |
| RULE-02 | Action types include BUYBACK, LIST, REDEEM, SHIP_TO_VAULT, OPEN_PACK, WATCHLIST, BUNDLE_SHIP with params, ui_copy, and risk_notes | ActionSchema already defined in `packages/schemas/src/llm/action.ts`; this phase adds typed param schemas per action type |
| RULE-03 | Rules engine output is the sole source of the actions field in CardAnalysis — LLM cannot add or remove actions | Rules engine lives in `packages/agent/src/rules/`; injects into `CardAnalysisResponse.actions` (API schema only, not LLM schema) |
| VAULT-01 | Agent recommends vaulting when external card estimated value >= configurable threshold OR matches user identity goals OR user has enough cards to batch ship | `computeVaultConversionCandidates(cards, config)` pure function; identity trigger stub always returns false |
| VAULT-02 | Vault recommendation includes "unlocks" reasons: instant liquidity (buyback/list), trade into packs, verified portfolio ranking | `unlocks: string[]` param on SHIP_TO_VAULT action, dynamically constructed with card value/context |
| VAULT-03 | Batching prompt triggers when user has >= N external cards or total external value >= X, recommending BUNDLE_SHIP action | Threshold config object (N=5 cards, X=$500 total); `computeVaultConversionCandidates` handles both single and batch paths |
</phase_requirements>

---

## Summary

Phase 2 builds a pure, deterministic TypeScript rules engine with zero runtime dependencies on the database, HTTP calls, or LLM. The engine exposes two public functions: `computeEligibleActions(card, context)` for per-card action sets and `computeVaultConversionCandidates(cards, config)` for cross-card vault recommendations. The entire implementation lives in `packages/agent/src/rules/`.

The existing codebase provides everything needed: `ActionSchema` and `ActionTypeSchema` are defined in `packages/schemas/src/llm/action.ts`, `CardState` and `PriceConfidence` enums exist in both `packages/schemas/src/shared/enums.ts` and the generated Prisma client, and 42 UserCard seed records cover all four card states with every PriceConfidence level — giving the test suite real-world fixture data without any database connection.

The key design constraint is purity: the rules engine is a state machine that maps (card state + price confidence + marketplace status) to an `Action[]` array. All conditions are deterministic boolean logic with no side effects. Vitest is already installed and configured in `packages/schemas`; the agent package needs its own `vitest` setup added.

**Primary recommendation:** Implement as pure functions with a typed config object for thresholds. Use function composition over class inheritance. Add Vitest to `packages/agent` with a `src/__tests__/` directory. Test every (state × priceConfidence × listing status) combination using inline fixture objects derived from seed-data constants.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ^5.7.0 (already installed) | Static typing for discriminated union params | Already in all packages |
| Zod | ^3.24.0 (already installed) | Runtime param schema validation if needed | Project standard; all schemas use Zod |
| Vitest | ^3.0.0 (already in schemas) | Unit test runner, zero config for ESM | Already the project test standard |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tcg/schemas` (workspace) | — | ActionSchema, ActionTypeSchema, CardState, PriceConfidence | Import action types and enums; avoids duplicating type definitions |
| `@tcg/db` (workspace) | — | UserCard, ExternalCard Prisma types | Type signatures for function inputs; no runtime DB calls in rules engine itself |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure functions | Class-based RulesEngine | Classes add boilerplate with no benefit for stateless computation; functions are simpler to test |
| Config object | Env vars (process.env) | Env vars require parsing and default handling in every call; config object is testable without environment side effects |
| Inline fixture objects | Loading seed DB | DB-dependent tests break in CI without a live DB; inline objects derived from seed-data constants are always fast |

**Installation (Vitest for agent package):**
```bash
pnpm --filter @tcg/agent add -D vitest
```

---

## Architecture Patterns

### Recommended Project Structure

```
packages/agent/src/
├── rules/
│   ├── index.ts              # Public API: exports computeEligibleActions, computeVaultConversionCandidates
│   ├── types.ts              # RulesEngineInput, RulesEngineConfig, typed action param interfaces
│   ├── actions/
│   │   ├── vaulted.ts        # buildVaultedActions(card, context) → Action[]
│   │   ├── external.ts       # buildExternalActions(card, context) → Action[]
│   │   ├── on-market.ts      # buildOnMarketActions() → Action[] (always empty)
│   │   ├── in-transit.ts     # buildInTransitActions() → Action[] (WATCHLIST only)
│   │   └── shared.ts         # buildWatchlistAction() — reused across states
│   └── vault/
│       ├── conversion.ts     # computeVaultConversionCandidates(cards, config)
│       └── unlock-reasons.ts # buildUnlockReasons(card) → string[]
├── __tests__/
│   ├── rules-vaulted.test.ts
│   ├── rules-external.test.ts
│   ├── rules-on-market.test.ts
│   ├── rules-in-transit.test.ts
│   └── vault-conversion.test.ts
└── index.ts                  # Re-exports rules/ public API + AGENT_VERSION
```

### Pattern 1: Pure Function State Dispatch

**What:** A single entry-point function dispatches to state-specific builders based on `card.state`. Each state builder is a pure function returning `Action[]`.

**When to use:** Any time the same input always produces the same output. No shared mutable state across calls.

**Example:**
```typescript
// packages/agent/src/rules/index.ts
import { Action } from '@tcg/schemas'
import { RulesEngineInput } from './types.js'
import { buildVaultedActions } from './actions/vaulted.js'
import { buildExternalActions } from './actions/external.js'
import { buildInTransitActions } from './actions/in-transit.js'

export function computeEligibleActions(input: RulesEngineInput): Action[] {
  switch (input.card.state) {
    case 'VAULTED':     return buildVaultedActions(input)
    case 'EXTERNAL':    return buildExternalActions(input)
    case 'ON_MARKET':   return []
    case 'IN_TRANSIT':  return buildInTransitActions()
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = input.card.state
      return []
  }
}
```

### Pattern 2: Typed Config Object for Thresholds

**What:** All configurable thresholds live in a single `RulesEngineConfig` object passed as a parameter. Tests override it without touching environment variables.

**When to use:** Any numeric threshold that may change (vault value, batch count, batch total).

**Example:**
```typescript
// packages/agent/src/rules/types.ts
export interface RulesEngineConfig {
  vaultSingleCardThreshold: number   // Default: 100 (USD)
  batchCardCountThreshold: number    // Default: 5 cards
  batchTotalValueThreshold: number   // Default: 500 (USD)
}

export const DEFAULT_CONFIG: RulesEngineConfig = {
  vaultSingleCardThreshold: 100,
  batchCardCountThreshold: 5,
  batchTotalValueThreshold: 500,
}
```

### Pattern 3: Discriminated Union Action Params

**What:** Each action type has a specific typed params interface. The ActionSchema in `packages/schemas` currently uses `z.record(z.unknown())` for params — the rules engine layer uses typed interfaces ABOVE that schema level, then serializes to the looser schema type.

**When to use:** Anywhere action params are constructed — enforces type safety at construction time, validated by existing ActionSchema at the boundary.

**Example:**
```typescript
// packages/agent/src/rules/types.ts
export interface ListParams {
  suggestedPrice: number
  priceConfidence: PriceConfidence
  currency: string
}

export interface BuybackParams {
  estimatedBuybackValue: number
  priceConfidence: PriceConfidence
}

export interface ShipToVaultParams {
  cardValue: number
  unlocks: string[]
  batchEligible: boolean
}

export interface BundleShipParams {
  cardCount: number
  totalValue: number
  estimatedSavings: number
}

// Minimal params (Claude's discretion)
export interface RedeemParams {
  certNumber: string | null
}
export interface WatchlistParams { /* empty — no data needed */ }
export interface OpenPackParams { /* empty — triggered from pack context */ }
```

### Pattern 4: Template String ui_copy Builder

**What:** `ui_copy` strings are built via simple template interpolation, not an external i18n library.

**When to use:** All action construction — ensures copy includes card-specific data.

**Example:**
```typescript
// Inside buildVaultedActions
function buildListAction(card: VaultedCardInput): Action {
  const priceDisplay = card.estimatedValue
    ? `~$${Math.round(Number(card.estimatedValue))}`
    : 'contact us for estimate'
  return {
    type: 'LIST',
    params: {
      suggestedPrice: Number(card.estimatedValue),
      priceConfidence: card.priceConfidence,
      currency: 'USD',
    },
    ui_copy: `List on Marketplace — Recent comps suggest ${priceDisplay}`,
    risk_notes: card.priceConfidence === 'STALE_7D'
      ? 'Price signal is 7+ days old — verify current comps before listing'
      : null,
  }
}
```

### Pattern 5: Vault Candidate Aggregation

**What:** `computeVaultConversionCandidates` accepts an array of cards (UserCard or ExternalCard), computes individual SHIP_TO_VAULT actions where eligible, and adds a BUNDLE_SHIP action if the batch threshold is met.

**When to use:** Portfolio-level analysis — not per-card.

**Example:**
```typescript
export function computeVaultConversionCandidates(
  externalCards: ExternalCardInput[],
  config: RulesEngineConfig = DEFAULT_CONFIG,
): Action[] {
  const actions: Action[] = []

  // Single-card triggers
  for (const card of externalCards) {
    const value = Number(card.estimatedValue ?? 0)
    if (value >= config.vaultSingleCardThreshold) {
      actions.push(buildShipToVaultAction(card, config))
    }
  }

  // Identity-based trigger — Phase 4 stub
  const identityTrigger = computeIdentityVaultTrigger(externalCards) // always false in Phase 2

  // Batch trigger
  const totalValue = externalCards.reduce((sum, c) => sum + Number(c.estimatedValue ?? 0), 0)
  const isBatchEligible =
    externalCards.length >= config.batchCardCountThreshold ||
    totalValue >= config.batchTotalValueThreshold

  if (isBatchEligible) {
    actions.push(buildBundleShipAction(externalCards, totalValue))
  }

  return actions
}

// Phase 4 stub — always returns false
function computeIdentityVaultTrigger(_cards: ExternalCardInput[]): boolean {
  return false
}
```

### Anti-Patterns to Avoid

- **Mutable state in rules functions:** Rules functions must be stateless. Never cache results inside module scope between calls.
- **DB calls inside the rules engine:** The rules engine receives pre-fetched data as function arguments. It never queries the database directly.
- **Using `any` for action params:** Use typed interfaces and cast to `Record<string, unknown>` only at the ActionSchema boundary.
- **Trusting `priceConfidence` as a string:** Always compare against the enum values (`'NO_DATA'`, `'STALE_7D'`, etc.) — Prisma and Zod both use string literals, not numeric enums.
- **Computing WATCHLIST eligibility separately per state:** Extract `buildWatchlistAction()` into `shared.ts` and call it from each eligible state builder. One definition, reused in 3 places.
- **Checking marketplace listing status via DB inside rules engine:** Pass `hasActiveListing: boolean` as part of the input context; compute that flag BEFORE calling the rules engine.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation of action output | Custom type guards | Existing `ActionSchema.parse()` from `@tcg/schemas` | Already covers type, params, ui_copy, risk_notes fields |
| Enum membership checks | `if (state === 'VAULTED' \|\| state === 'vaulted')` | TypeScript discriminated union + `switch` with exhaustiveness | Compiler catches missing cases; no string misspelling risk |
| Decimal arithmetic | Custom float parsing | `Number(prismaDecimal)` → standard JS number | Prisma `Decimal` type serializes safely to JS number for comparison |
| Test fixture generation | Factories with faker | Inline objects from seed-data constants | Seed data already covers all states × all priceConfidence levels |

**Key insight:** This is intentionally a "no library" phase. The rules engine itself is plain TypeScript with zero third-party runtime dependencies. The value is in the logic, not the tooling.

---

## Common Pitfalls

### Pitfall 1: Prisma Decimal vs JS Number comparison

**What goes wrong:** `card.estimatedValue >= 100` fails when `estimatedValue` is a Prisma `Decimal` object (not a JS number). `Decimal >= 100` returns `false` or throws depending on context.

**Why it happens:** Prisma `Decimal` fields (`@db.Decimal(10,2)`) return a Prisma `Decimal` object in TypeScript, not a native `number`. The Prisma-generated type is `Decimal | null`, not `number | null`.

**How to avoid:** Always coerce via `Number(card.estimatedValue ?? 0)` before arithmetic comparison. Define an `ExternalCardInput` type for the rules engine that uses `number | null` instead of the raw Prisma type — convert at the boundary where the rules engine is called.

**Warning signs:** `if (value >= config.vaultSingleCardThreshold)` evaluates to `false` for all cards.

### Pitfall 2: VAULTED card with NO_DATA priceConfidence showing BUYBACK

**What goes wrong:** BUYBACK action is shown to the user even though `priceConfidence === 'NO_DATA'`, making the buyback value meaningless.

**Why it happens:** Forgetting to gate BUYBACK on price availability. The BUYBACK action requires a concrete `estimatedBuybackValue` — there is none when `priceConfidence === 'NO_DATA'`.

**How to avoid:** In `buildVaultedActions`, check `priceConfidence !== 'NO_DATA'` before adding BUYBACK. Explicit guard: only add BUYBACK when price data exists.

**Warning signs:** Test fixture with `priceConfidence: 'NO_DATA'` producing a BUYBACK action.

### Pitfall 3: LIST action appearing for ON_MARKET cards

**What goes wrong:** A card with `state === 'ON_MARKET'` also has a LIST action shown (double-listing risk).

**Why it happens:** `ON_MARKET` rule returns `[]` (correct), but a VAULTED card that was already listed has `hasActiveListing: true` — the caller must pass this flag.

**How to avoid:** The `RulesEngineInput` must include `hasActiveListing: boolean`. In `buildVaultedActions`, skip LIST action when `context.hasActiveListing === true`. Note: a card with `state === 'ON_MARKET'` is already handled by the empty-array branch and never reaches `buildVaultedActions`.

**Warning signs:** Tests that don't pass `hasActiveListing` context and don't test that scenario.

### Pitfall 4: SHIP action (physical redemption) vs SHIP_TO_VAULT conflation

**What goes wrong:** `SHIP_TO_VAULT` (external → vault) and `REDEEM` / `SHIP` (vault → physical) are semantically opposite but similarly named. Mixing them produces wrong actions for wrong states.

**Why it happens:** The action type enum uses `SHIP_TO_VAULT` for external cards moving INTO the vault, while `REDEEM` covers physical redemption (taking a vaulted card back out). The CONTEXT.md calls the vaulted physical-redemption action "SHIP (physical redemption)". There is no separate `SHIP` action type in the enum — `REDEEM` covers physical redemption.

**How to avoid:** Map VAULTED state to `['BUYBACK', 'LIST', 'REDEEM', 'WATCHLIST']`. Map EXTERNAL state to `['SHIP_TO_VAULT', 'WATCHLIST']`. Never put `SHIP_TO_VAULT` in the VAULTED branch.

**Warning signs:** Tests checking that `SHIP_TO_VAULT` appears for VAULTED cards.

### Pitfall 5: Vitest not configured in packages/agent

**What goes wrong:** `pnpm --filter @tcg/agent test` fails — vitest is not in the agent package's dev dependencies and there is no `vitest.config.ts`.

**Why it happens:** `packages/agent/package.json` has no `test` script and no `vitest` dependency (confirmed in codebase inspection).

**How to avoid:** Wave 0 task must: (1) add `vitest` to agent devDependencies, (2) create `vitest.config.ts` mirroring the schemas package config, (3) add `"test": "vitest run"` to agent package.json scripts.

**Warning signs:** `pnpm test` at root passes but agent tests never run.

### Pitfall 6: OPEN_PACK action only relevant in pack-pull context

**What goes wrong:** OPEN_PACK action appears on arbitrary cards outside pack context.

**Why it happens:** The action type exists in the enum but is only meaningful when a card came from a pack that hasn't been opened yet. In Phase 2, without pack pull orchestration (Phase 4), OPEN_PACK should be treated as context-dependent.

**How to avoid:** For Phase 2, `OPEN_PACK` is only added when the caller explicitly provides pack context via the `RulesEngineInput`. Default behavior is to omit it. The test suite should cover the "with pack context → OPEN_PACK present" and "without pack context → OPEN_PACK absent" cases.

---

## Code Examples

Verified patterns from existing codebase:

### Existing ActionSchema (already defined)
```typescript
// Source: packages/schemas/src/llm/action.ts
export const ActionTypeSchema = z.enum([
  'BUYBACK', 'LIST', 'REDEEM', 'SHIP_TO_VAULT', 'OPEN_PACK', 'WATCHLIST', 'BUNDLE_SHIP',
])

export const ActionSchema = z.object({
  type: ActionTypeSchema,
  params: z.union([z.record(z.unknown()), z.null()]),
  ui_copy: z.string(),
  risk_notes: z.union([z.string(), z.null()]),
})

export type Action = z.infer<typeof ActionSchema>
```

### Existing Enums (already defined in two places)
```typescript
// Source: packages/schemas/src/shared/enums.ts
export const CardStateSchema = z.enum(['VAULTED', 'EXTERNAL', 'ON_MARKET', 'IN_TRANSIT'])
export const PriceConfidenceSchema = z.enum(['LIVE', 'RECENT_24H', 'STALE_7D', 'NO_DATA'])

// Source: packages/db/src/generated/client/index.d.ts (Prisma)
export const CardState: { VAULTED, EXTERNAL, ON_MARKET, IN_TRANSIT }
export const PriceConfidence: { LIVE, RECENT_24H, STALE_7D, NO_DATA }
```

### Vitest pattern (from packages/schemas)
```typescript
// Source: packages/schemas/vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globals: false,
    passWithNoTests: true,
  },
})
```

### Test pattern (from packages/schemas/__tests__/action.test.ts)
```typescript
// Source: packages/schemas/src/__tests__/action.test.ts
import { describe, it, expect } from 'vitest'

describe('computeEligibleActions — VAULTED', () => {
  it('returns BUYBACK, LIST, REDEEM, WATCHLIST for LIVE priced vaulted card', () => {
    const card = {
      state: 'VAULTED',
      estimatedValue: 850,
      priceConfidence: 'LIVE',
      hasActiveListing: false,
    }
    const actions = computeEligibleActions({ card })
    const types = actions.map(a => a.type)
    expect(types).toContain('BUYBACK')
    expect(types).toContain('LIST')
    expect(types).toContain('REDEEM')
    expect(types).toContain('WATCHLIST')
    expect(types).not.toContain('SHIP_TO_VAULT')
  })
})
```

### Seed data fixture values for tests
```typescript
// Source: packages/db/src/seed-data.ts — direct reuse in test fixtures
// VAULTED + LIVE: UC_001 (Charizard VMAX, $5000), UC_002 (Mewtwo GX, $850)
// VAULTED + STALE_7D: UC_011 (Gengar VMAX, $480)
// VAULTED + NO_DATA: UC_039 (Venusaur EX, $5)
// EXTERNAL >= $100: UC_017 (Umbreon VMAX, $180), UC_019 (Zoro Leader, $310)
// EXTERNAL < $100: UC_021 (Snorlax VMAX, $25), UC_020 (Ace Rare, $75 NO_DATA)
// ON_MARKET: UC_027–UC_034 (8 cards)
// IN_TRANSIT: UC_035–UC_038 (4 cards)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class-based RulesEngine with method overrides | Pure function dispatch with exhaustive switch | TypeScript 4.1+ (template literal types) | Simpler, easier to tree-shake, no `this` binding issues |
| Optional chaining with undefined params | Nullable with `z.union([type, z.null()])` | Phase 1 decision | Matches OpenAI strict mode compatibility across LLM schemas |
| Loose `Record<string, unknown>` params forever | Typed interfaces for construction, serialize to loose schema | Phase 1 established pattern | Type safety at build time, runtime validation by existing ActionSchema |

**Deprecated/outdated:**
- `z.optional()` in action schemas: replaced by `z.union([type, z.null()])` per Phase 1 decision. All new schemas follow the nullable convention.

---

## Open Questions

1. **REDEEM vs SHIP physical redemption naming**
   - What we know: CONTEXT.md mentions "SHIP (physical redemption)" as a VAULTED action, but the ActionTypeSchema enum only has `REDEEM`, `SHIP_TO_VAULT`, `BUNDLE_SHIP` — no standalone `SHIP`
   - What's unclear: Whether "SHIP" in CONTEXT.md means the `REDEEM` action type or whether a separate `SHIP` action type is needed
   - Recommendation: Map "SHIP (physical redemption)" to `REDEEM` action type in Phase 2. The enum has 7 entries and `REDEEM` is the most semantically correct match. If a dedicated `SHIP` type is needed, it would require a schema change in Phase 1 artifacts — flag to user before implementing.

2. **estimatedSavings calculation for BUNDLE_SHIP**
   - What we know: `BundleShipParams` includes `estimatedSavings` — Phase 2 must provide a value
   - What's unclear: What formula to use (shipping cost per card vs fixed savings vs percentage)
   - Recommendation: Use a fixed per-card shipping savings estimate (e.g., `(cardCount - 1) * 5` dollars, representing saved shipping per additional card). Document the formula as a stub to be replaced with real shipping rate data in a later phase.

3. **ExternalCard vs UserCard for vault candidates**
   - What we know: `computeVaultConversionCandidates` operates on "external cards" — but the DB has both `external_cards` table AND `user_cards` with `state: EXTERNAL`
   - What's unclear: Which model feeds the vault conversion function — `ExternalCard` objects, `UserCard` objects with state=EXTERNAL, or both
   - Recommendation: Accept `UserCard[]` filtered to `state === 'EXTERNAL'` as the primary input. The seed data shows `UC_017`–`UC_026` as EXTERNAL UserCards, which is the richer data model (has `estimatedValue`, `priceConfidence`, `certNumber`). ExternalCards (the separate table) can be processed via the same function if given an adapter.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `packages/agent/vitest.config.ts` — does NOT exist yet (Wave 0 gap) |
| Quick run command | `pnpm --filter @tcg/agent test` |
| Full suite command | `pnpm test` (turbo runs all packages) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RULE-01 | `computeEligibleActions` returns correct set for VAULTED | unit | `pnpm --filter @tcg/agent test -- rules-vaulted` | No — Wave 0 |
| RULE-01 | `computeEligibleActions` returns correct set for EXTERNAL | unit | `pnpm --filter @tcg/agent test -- rules-external` | No — Wave 0 |
| RULE-01 | `computeEligibleActions` returns `[]` for ON_MARKET | unit | `pnpm --filter @tcg/agent test -- rules-on-market` | No — Wave 0 |
| RULE-01 | `computeEligibleActions` returns `[WATCHLIST]` for IN_TRANSIT | unit | `pnpm --filter @tcg/agent test -- rules-in-transit` | No — Wave 0 |
| RULE-02 | Every action has params, ui_copy, risk_notes fields | unit | `pnpm --filter @tcg/agent test` | No — Wave 0 |
| RULE-02 | BUYBACK hidden when priceConfidence === NO_DATA | unit | `pnpm --filter @tcg/agent test -- rules-vaulted` | No — Wave 0 |
| RULE-02 | BUYBACK has risk_notes when priceConfidence === STALE_7D | unit | `pnpm --filter @tcg/agent test -- rules-vaulted` | No — Wave 0 |
| RULE-02 | LIST suppressed when hasActiveListing === true | unit | `pnpm --filter @tcg/agent test -- rules-vaulted` | No — Wave 0 |
| RULE-03 | Output validates against `ActionSchema` for every action | unit | `pnpm --filter @tcg/agent test` | No — Wave 0 |
| VAULT-01 | SHIP_TO_VAULT triggered when estimatedValue >= $100 | unit | `pnpm --filter @tcg/agent test -- vault-conversion` | No — Wave 0 |
| VAULT-01 | SHIP_TO_VAULT NOT triggered when estimatedValue < $100 | unit | `pnpm --filter @tcg/agent test -- vault-conversion` | No — Wave 0 |
| VAULT-01 | Identity trigger stub always returns false | unit | `pnpm --filter @tcg/agent test -- vault-conversion` | No — Wave 0 |
| VAULT-02 | SHIP_TO_VAULT params include `unlocks: string[]` with 3 reasons | unit | `pnpm --filter @tcg/agent test -- vault-conversion` | No — Wave 0 |
| VAULT-03 | BUNDLE_SHIP triggered at 5+ external cards | unit | `pnpm --filter @tcg/agent test -- vault-conversion` | No — Wave 0 |
| VAULT-03 | BUNDLE_SHIP triggered at total value >= $500 | unit | `pnpm --filter @tcg/agent test -- vault-conversion` | No — Wave 0 |
| VAULT-03 | BUNDLE_SHIP NOT triggered for 4 cards with total < $500 | unit | `pnpm --filter @tcg/agent test -- vault-conversion` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter @tcg/agent test`
- **Per wave merge:** `pnpm test` (full turbo suite across all packages)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/agent/vitest.config.ts` — framework config (copy from schemas package)
- [ ] `packages/agent/package.json` — add `"test": "vitest run"` script and `vitest` devDependency
- [ ] `packages/agent/src/__tests__/rules-vaulted.test.ts` — covers RULE-01, RULE-02 for VAULTED state
- [ ] `packages/agent/src/__tests__/rules-external.test.ts` — covers RULE-01 for EXTERNAL state
- [ ] `packages/agent/src/__tests__/rules-on-market.test.ts` — covers RULE-01 for ON_MARKET state
- [ ] `packages/agent/src/__tests__/rules-in-transit.test.ts` — covers RULE-01 for IN_TRANSIT state
- [ ] `packages/agent/src/__tests__/vault-conversion.test.ts` — covers VAULT-01, VAULT-02, VAULT-03

---

## Sources

### Primary (HIGH confidence)

- Codebase — `packages/schemas/src/llm/action.ts`: ActionSchema, ActionTypeSchema, all 7 action types verified
- Codebase — `packages/schemas/src/shared/enums.ts`: CardState, PriceConfidence enum values verified
- Codebase — `packages/schemas/src/api/card-analysis.ts`: CardAnalysisResponseSchema.actions injection point verified
- Codebase — `packages/db/src/seed-data.ts`: All 42 UserCard fixtures across 4 states, 6 ExternalCard fixtures verified
- Codebase — `packages/agent/package.json`: Confirmed no test script, no vitest — Wave 0 gap is real
- Codebase — `packages/schemas/vitest.config.ts`: Vitest configuration pattern to replicate
- Codebase — `packages/db/prisma/schema.prisma`: Confirmed `estimatedValue Decimal?` type (Pitfall 1 source)
- `.planning/phases/02-rules-engine/02-CONTEXT.md`: All locked decisions verified against schema

### Secondary (MEDIUM confidence)

- TypeScript discriminated union exhaustiveness pattern: well-established pattern, consistent with existing codebase switch usage
- Vitest 3.x ESM support: confirmed working in schemas package with `"type": "module"` — agent package matches same structure

### Tertiary (LOW confidence)

- `estimatedSavings` formula for BUNDLE_SHIP: no official formula defined — recommended stub approach flagged in Open Questions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools already installed and verified in codebase
- Architecture: HIGH — pure functions with discriminated union dispatch; established TypeScript pattern; no external dependencies to verify
- Pitfalls: HIGH — identified directly from codebase inspection (Prisma Decimal type, missing vitest setup, enum naming)
- Test strategy: HIGH — vitest pattern directly copied from existing schemas package; all test scenarios derived from seed-data fixtures

**Research date:** 2026-03-04
**Valid until:** 2026-05-04 (stable domain — no external library dependencies to track)
