# Phase 6: Prompt-Schema Alignment - Research

**Researched:** 2026-03-05
**Domain:** LLM prompt engineering, Zod schema validation, contract testing
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Change `confidence` instruction from `number (0.0-1.0)` to `enum: 'HIGH' | 'MEDIUM' | 'LOW'` — matching CardAnalysisSchema
- Change `price_band` instruction from `{ low, mid, high }` to `{ low: number, high: number, currency: string }` — matching schema exactly
- Remove `card_id` from prompt field instructions — orchestrator injects card_id after LLM call (success criteria #4)
- Keep all other card analysis prompt fields as-is (identity_tags, rarity_signal, liquidity_signal, reasoning_bullets already match)
- Complete rewrite of portfolio summary prompt field instructions to match PortfolioSummarySchema
- Use camelCase field names: concentrationScore, liquidityScore, recommendedActions, missingSetGoals, collectorArchetype (not snake_case)
- Breakdown: orchestrator pre-computes from DB data as array of `{ ipCategory, totalValue, cardCount, percentOfPortfolio }` — injected after LLM call, NOT requested from LLM
- LLM returns: concentrationScore (number), liquidityScore (number), recommendedActions (string[]), missingSetGoals (string[]), collectorArchetype (string|null)
- Orchestrator injects: userId, totalValueEst, breakdown, priceDataAsOf, priceConfidence
- Remove top_insight (not in schema) and old breakdown structure
- Rename `badges` to `share_card_badges` in prompt instructions — matching CollectorArchetypeSchema
- All other archetype fields already match (name, traits, why, comparable_collectors, share_card_text)
- Add sanitizeInput/wrapUserInput calls in portfolio-summary orchestrator before prompt rendering
- Add sanitizeInput/wrapUserInput calls in archetype orchestrator before prompt rendering
- Card analysis orchestrator already sanitizes correctly (confirmed in code scout)
- One contract test per prompt template verifying field list matches Zod schema keys
- Test approach: extract field names from prompt template instructions, compare against schema .shape keys
- Verify that data structured according to prompt instructions passes Zod schema validation
- Tests live alongside existing prompt tests in packages/agent/src/llm/__tests__/
- Tests should fail loudly if someone edits a prompt without updating the schema (or vice versa)
- Remove card_id from LLM prompt instructions — LLM should not be asked to generate an ID it doesn't know
- Orchestrator injects card_id into the validated LLM result before returning to API layer
- LLM schema retains card_id field (needed for API response composition) but prompt omits it

### Claude's Discretion
- Exact prompt wording for rewritten portfolio summary instructions
- Contract test implementation details (regex parsing vs structured extraction)
- Whether to split portfolio summary into separate LLM schema (excluding orchestrator-computed fields) or keep current schema and merge after
- Sanitization wrapper specifics for portfolio/archetype (which fields to wrap, naming conventions)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LLM-02 | Prompt templates for card narrative, portfolio summary, and archetype identity with slot injection | All 3 prompt templates exist in `packages/agent/src/llm/prompts.ts`; this phase fixes their field instructions to match schemas |
| LLM-05 | Input sanitization for user-supplied card names and notes before prompt interpolation (prompt injection prevention) | `sanitizeInput`/`wrapUserInput` already exist in `sanitize.ts`; portfolio-summary and archetype orchestrators need wiring |
| CARD-01 | User receives CardAnalysis JSON with correct field types (confidence enum, price_band shape) | Prompt currently instructs wrong types; fixing prompt closes this gap |
| CARD-04 | Card analysis outputs validated against zod schema with retry/fallback on invalid LLM response | `generateWithRetry` already handles retry; prompt mismatch is the root cause of first-attempt failures |
| PORT-01 | User views PortfolioSummary with correct camelCase fields and structured breakdown | Prompt uses snake_case and wrong breakdown shape; rewrite aligns with schema |
| PORT-03 | Portfolio concentration signal identifies over-concentration in single IP/set/player | `concentrationScore` field in prompt — fixing name ensures value flows through correctly |
| IDENT-01 | User receives CollectorArchetype with `share_card_badges` (not `badges`) | Single field rename in archetype prompt |
| IDENT-02 | Archetype inference uses portfolio composition | No change needed to logic; prompt fix ensures field names align with schema for clean validation |
| IDENT-03 | Shareable collector identity as exportable JSON + short text + badges | `share_card_badges` rename completes this field; `share_card_text` already correct |
</phase_requirements>

## Summary

Phase 6 is a precision fix phase — not new code, but aligning existing code so it actually works end-to-end. Three LLM prompt templates in `packages/agent/src/llm/prompts.ts` currently instruct the LLM to return field shapes that do not match the Zod schemas in `packages/schemas/src/llm/`. This causes `generateWithRetry` to fail schema validation on the first attempt for every call, burning retries unnecessarily and falling through to the degraded path.

The mismatches are fully documented: `card_analysis` uses wrong confidence type (number vs enum) and wrong price_band shape (3-key vs 2-key); `portfolio_summary` uses snake_case field names and a wrong breakdown structure; `archetype_identity` uses `badges` where the schema expects `share_card_badges`. Two orchestrators (portfolio-summary, archetype) also bypass the input sanitization functions that already exist and are already used correctly in the card-analysis orchestrator.

The contract test requirement is the phase's most durable contribution: tests that extract field names from prompt templates and compare them against Zod schema `.shape` keys will catch any future drift between prompts and schemas before it reaches production.

**Primary recommendation:** Fix the 3 prompts precisely as specified in CONTEXT.md decisions, wire sanitizeInput/wrapUserInput into 2 orchestrators following the card-analysis pattern, then write contract tests that use Zod's `.shape` introspection to enforce alignment.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | Already installed | Schema definition and runtime validation | Source of truth for all field types; `.shape` enables introspection in contract tests |
| Vitest | Already installed | Test runner | Already in use for all existing tests; consistent with project toolchain |
| TypeScript | Already installed | Type safety | Shared types across prompt editing and test verification |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tcg/schemas` | workspace | Import Zod schemas for contract tests | Import `CardAnalysisSchema`, `PortfolioSummarySchema`, `CollectorArchetypeSchema` directly |
| `@tcg/agent` llm/sanitize | workspace | sanitizeInput/wrapUserInput | Wire into portfolio-summary and archetype orchestrators |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod `.shape` introspection for contract tests | Regex parsing of prompt text | `.shape` is authoritative and type-safe; regex on prompt text is fragile (formatting changes break it) |
| Keeping unified PortfolioSummarySchema | Splitting into LLMPortfolioSchema + full schema | Split adds indirection; merging after LLM call in orchestrator achieves same safety without extra schema files |

**Installation:** No new packages needed. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
packages/agent/src/llm/
├── prompts.ts              # All 3 prompt templates — edit in place
├── sanitize.ts             # sanitizeInput/wrapUserInput — no changes needed
├── generate.ts             # generateWithRetry — no changes needed
└── __tests__/
    ├── prompts.test.ts     # Existing slot/rendering tests — keep as-is
    ├── prompts-contract.test.ts  # NEW: contract tests verifying field alignment
    └── sanitize.test.ts    # Existing — no changes needed

packages/agent/src/orchestrators/
├── card-analysis.ts        # No changes needed (already sanitizes correctly)
├── portfolio-summary.ts    # Add sanitizeInput/wrapUserInput wiring
└── archetype.ts            # Add sanitizeInput/wrapUserInput wiring
```

### Pattern 1: Zod Shape Introspection for Contract Tests

**What:** Use `Schema.shape` to get the set of keys the schema expects, then verify that the prompt template instructs the LLM to produce those exact keys — no more, no less.

**When to use:** Any time a prompt template must produce output matching a Zod schema.

**Key insight from codebase:** Zod schemas that use `z.union([type, z.null()])` still expose keys normally through `.shape`. The `PortfolioSummarySchema` does NOT use `.shape` on `z.union` fields — they are plain object keys. `CollectorArchetypeSchema` and `CardAnalysisSchema` similarly expose all keys through `.shape`.

**Example:**
```typescript
// Source: packages/schemas/src/llm/card-analysis.ts (verified)
import { CardAnalysisSchema } from '@tcg/schemas'

// Zod object schemas expose their keys via .shape
const schemaKeys = Object.keys(CardAnalysisSchema.shape)
// => ['card_id', 'identity_tags', 'rarity_signal', 'liquidity_signal',
//    'price_band', 'reasoning_bullets', 'confidence']

// In the contract test: extract field names from prompt text,
// then assert the LLM-requested fields match schema minus orchestrator-injected fields
const llmRequestedFields = extractFieldsFromPrompt(PROMPTS.card_analysis.user)
const expectedLLMFields = schemaKeys.filter(k => k !== 'card_id') // orchestrator injects card_id
expect(llmRequestedFields).toEqual(expect.arrayContaining(expectedLLMFields))
```

### Pattern 2: Orchestrator Sanitization (Card Analysis Reference Implementation)

**What:** Card analysis orchestrator already demonstrates the correct pattern. Port this exact approach to portfolio-summary and archetype orchestrators.

**When to use:** Any user-supplied string before slot injection into `renderPrompt`.

**Verified implementation** (from `packages/agent/src/orchestrators/card-analysis.ts`):
```typescript
// Source: packages/agent/src/orchestrators/card-analysis.ts (verified in codebase)
import { sanitizeInput, wrapUserInput } from '../llm/sanitize.js'

// Plain string fields: use sanitizeInput
card_name: sanitizeInput(userCard.card.name),
card_set: sanitizeInput(userCard.card.setName ?? ''),
card_grade: sanitizeInput(userCard.card.grade ?? 'Ungraded'),

// User-authored content: use wrapUserInput (adds semantic XML tag)
user_notes: wrapUserInput('notes', userCard.userNotes ?? ''),
```

**For portfolio-summary orchestrator:** The `cards_json` slot receives `JSON.stringify(dbBreakdown)` — this is DB-computed, not user-authored, so `sanitizeInput` is appropriate (not `wrapUserInput`). The `user_id` is a UUID (not user-authored text), so it needs no sanitization. Apply `sanitizeInput` defensively to any card name or note data if that ever flows into context.

**For archetype orchestrator:** `action_history` comes from `actionsLog.userAction` — user-authored actions, use `wrapUserInput`. `top_ips` is derived from card IP categories which could contain user-named data if custom; use `sanitizeInput`. `portfolio_summary_json` is DB-computed; use `sanitizeInput`.

### Pattern 3: Portfolio Summary — LLM vs Orchestrator Field Separation

**What:** The `PortfolioSummarySchema` has 10 fields. The LLM only generates 5 of them. The orchestrator injects the other 5. The prompt must ONLY ask for the 5 LLM-generated fields — not all 10.

**Schema fields (verified from `packages/schemas/src/llm/portfolio-summary.ts`):**

| Field | Source | Notes |
|-------|--------|-------|
| `userId` | Orchestrator injects | Always equals the `userId` parameter |
| `totalValueEst` | Orchestrator computes | Sum of all card values |
| `breakdown` | Orchestrator computes | `dbBreakdown` array |
| `concentrationScore` | LLM generates | 0.0-1.0 number |
| `liquidityScore` | LLM generates | 0.0-1.0 number |
| `collectorArchetype` | LLM generates | string or null |
| `missingSetGoals` | LLM generates | string[] |
| `recommendedActions` | LLM generates | string[] |
| `priceDataAsOf` | Orchestrator computes | ISO date string or null |
| `priceConfidence` | Orchestrator computes | PriceConfidence enum |

**The merge pattern already exists** in portfolio-summary orchestrator (lines 152-164):
```typescript
// Source: packages/agent/src/orchestrators/portfolio-summary.ts (verified)
// Success path: merge LLM output with DB-computed fields
return {
  success: true,
  data: {
    ...llmResult.data,     // concentrationScore, liquidityScore, collectorArchetype,
                            // missingSetGoals, recommendedActions (from LLM)
    userId,                 // injected
    totalValueEst,          // injected
    breakdown: dbBreakdown, // injected (overrides any LLM breakdown)
    priceDataAsOf,          // injected
    priceConfidence: overallPriceConfidence, // injected
  },
}
```

**Critical implication:** Even if `generateWithRetry` is called with the full `PortfolioSummarySchema`, the LLM will fail validation because the prompt only returns 5 fields and the schema requires all 10. The planner needs to decide: either use a reduced schema for the LLM call (split approach), or continue using the full schema but understand that the merge happens in the success path. Looking at the orchestrator code, it currently uses `PortfolioSummarySchema` for the LLM call. This means the LLM is expected to return all 10 fields, but the prompt only asks for 5.

**This is a pre-existing architectural tension:** The current code has the LLM called with `PortfolioSummarySchema` (10 fields) but the prompt only asks for a subset. Fixing the prompt to match what the LLM can actually return means the schema validation in `generateWithRetry` will fail on the orchestrator-computed fields. The CONTEXT.md leaves this as Claude's discretion: "Whether to split portfolio summary into separate LLM schema (excluding orchestrator-computed fields) or keep current schema and merge after."

**Recommendation:** Create a `PortfolioSummaryLLMSchema` that contains only the 5 LLM-generated fields. Use it for the `generateWithRetry` call. Merge with DB-computed fields in the success path. This is the cleanest solution — it makes the schema match the prompt exactly, which is the whole point of this phase.

### Anti-Patterns to Avoid

- **Asking the LLM for orchestrator-computed fields:** card_id, userId, totalValueEst, breakdown, priceDataAsOf, priceConfidence must never appear in prompt field instructions — the LLM cannot know these values
- **snake_case in portfolio prompt:** The prompt currently uses concentration_score — the schema uses concentrationScore. Use camelCase to match the schema
- **Removing card_id from the schema:** card_id must stay in `CardAnalysisSchema` because the degraded path injects it directly (line 86 in card-analysis orchestrator). Only remove it from the prompt instructions
- **Using z.optional() instead of z.union([type, z.null()]):** Project convention (confirmed in STATE.md) is nullable fields use union, not optional — this is for OpenAI strict mode compatibility

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema key extraction | Manual string parsing | `Object.keys(Schema.shape)` | Zod exposes `.shape` on `z.object()` — authoritative, type-safe, refactor-proof |
| Input sanitization | Custom HTML escape | `sanitizeInput` from `packages/agent/src/llm/sanitize.ts` | Already battle-tested with 11 unit tests covering all 5 HTML special chars |
| Contract test field comparison | Snapshot testing | Direct key set comparison | Snapshot tests hide intent; set comparison makes the invariant explicit and readable |

**Key insight:** The sanitize.ts module is already complete and unit-tested. Zero new code needed for sanitization — the work is purely wiring the existing functions into the two orchestrators that currently omit them.

## Common Pitfalls

### Pitfall 1: Portfolio Schema Mismatch in generateWithRetry Call

**What goes wrong:** If the portfolio-summary orchestrator continues calling `generateWithRetry({ schema: PortfolioSummarySchema })` but the prompt only asks for 5 of the 10 fields, every LLM response will fail Zod validation because the response will be missing `userId`, `totalValueEst`, `breakdown`, `priceDataAsOf`, `priceConfidence`. The retry logic will loop 3 times then fall to the degraded path.

**Why it happens:** The full `PortfolioSummarySchema` is used for both the LLM call schema and the final API response schema. The LLM can only provide the narrative fields.

**How to avoid:** Create `PortfolioSummaryLLMSchema` with only the 5 LLM fields. Use it in `generateWithRetry`. Keep the full `PortfolioSummarySchema` for the merged response type returned to callers.

**Warning signs:** LLM call always failing schema validation with errors about missing `userId` or `totalValueEst`.

### Pitfall 2: Contract Test Field Extraction Strategy

**What goes wrong:** If the contract test tries to parse prompt text with regex to find field names (e.g., looking for `- fieldName:` patterns), any change to prompt formatting will break the test for the wrong reason, or formatting inconsistencies will miss fields.

**Why it happens:** Prompt templates are freeform strings — field extraction by regex is inherently fragile.

**How to avoid:** The contract test should verify the relationship from the schema side (what does the schema require?) and check that the prompt text contains mention of those field names — not the other way around. Alternatively, define a structured constant alongside each prompt template that explicitly lists which fields are LLM-generated, and have the contract test verify both sides agree.

**Warning signs:** Contract test breaks after reformatting a prompt string without changing any field names.

### Pitfall 3: Archetype narrativeFields List Must Match Schema After Badge Rename

**What goes wrong:** The archetype orchestrator's `generateWithRetry` call specifies `narrativeFields: ['why', 'share_card_text', 'traits', 'comparable_collectors']` (line 149). After renaming `badges` to `share_card_badges` in the prompt, the compliance scrubbing fields list does NOT need to change — `share_card_badges` is a badge array (deterministic), not a narrative field. No action needed here, but verify.

**Why it happens:** Confusion between the prompt field instruction name and the narrativeFields compliance scrubbing list.

**How to avoid:** Keep narrativeFields as `['why', 'share_card_text', 'traits', 'comparable_collectors']` — these are the fields that could contain financial advice language. Badges are identifiers, not narrative.

### Pitfall 4: card_id Is Required by Degraded Path — Do Not Remove from Schema

**What goes wrong:** The card-analysis orchestrator's degraded path (line 86) sets `card_id: userCardId` directly. If `card_id` is removed from `CardAnalysisSchema`, this line will fail TypeScript type checking.

**Why it happens:** The phase decision says "remove card_id from prompt" but the schema must retain it for the degraded path and API response composition.

**How to avoid:** Edit only the prompt's field instruction list — the line starting with `- card_id:` — not the schema file. The schema stays as-is.

### Pitfall 5: CollectorArchetypeSchema Fields Without | null

**What goes wrong:** `CollectorArchetypeSchema` has fields like `why: z.string()` and `share_card_text: z.string()` — not nullable. The prompt must not say "return null" for these fields. The degraded path already handles the empty string case (`why: ''`, `share_card_text: ''`).

**Why it happens:** Other schemas use union-with-null but archetype schema uses plain z.string() for narrative fields.

**How to avoid:** When writing the archetype contract test, verify that non-nullable fields are not instructed as "null or string" in the prompt.

## Code Examples

Verified patterns from official codebase (all paths verified by direct file reading):

### Zod Shape Introspection
```typescript
// Verified: packages/schemas/src/llm/card-analysis.ts
import { CardAnalysisSchema } from '@tcg/schemas'

// CardAnalysisSchema.shape keys (verified):
// card_id, identity_tags, rarity_signal, liquidity_signal,
// price_band, reasoning_bullets, confidence
const allSchemaKeys = Object.keys(CardAnalysisSchema.shape)

// LLM should be asked for all keys EXCEPT card_id (orchestrator injects)
const llmExpectedKeys = allSchemaKeys.filter(k => k !== 'card_id')
```

### Portfolio Summary LLM Schema (Recommended Split)
```typescript
// New file or inline constant — 5 LLM-generated fields only
import { z } from 'zod'

const PortfolioSummaryLLMSchema = z.object({
  concentrationScore: z.number(),
  liquidityScore: z.number(),
  collectorArchetype: z.union([z.string(), z.null()]),
  missingSetGoals: z.array(z.string()),
  recommendedActions: z.array(z.string()),
})
```

### Sanitization Wiring in Orchestrator (Port from card-analysis.ts)
```typescript
// Pattern from packages/agent/src/orchestrators/card-analysis.ts (verified)
import { sanitizeInput, wrapUserInput } from '../llm/sanitize.js'

// In portfolio-summary orchestrator renderPrompt call:
const { system, user } = renderPrompt('portfolio_summary', {
  user_id: userId,                                    // UUID, no sanitization needed
  cards_json: sanitizeInput(JSON.stringify(dbBreakdown)),  // DB-computed but defensive
  total_count: totalCards.toString(),
  vaulted_count: vaultedCount.toString(),
  external_count: externalCards.length.toString(),
})

// In archetype orchestrator renderPrompt call:
const { system, user } = renderPrompt('archetype_identity', {
  user_id: userId,
  portfolio_summary_json: sanitizeInput(JSON.stringify(portfolioData)),
  top_ips: sanitizeInput(topIpsString),               // derived from card data
  action_history: wrapUserInput('action_history', JSON.stringify(actionHistory)), // user-authored
})
```

### Contract Test Structure
```typescript
// Location: packages/agent/src/llm/__tests__/prompts-contract.test.ts
import { describe, it, expect } from 'vitest'
import { PROMPTS } from '../prompts.js'
import { CardAnalysisSchema } from '@tcg/schemas'
import { CollectorArchetypeSchema } from '@tcg/schemas'

describe('Card Analysis prompt-schema contract', () => {
  it('prompt mentions all LLM-generated schema fields', () => {
    const schemaKeys = Object.keys(CardAnalysisSchema.shape)
    const llmFields = schemaKeys.filter(k => k !== 'card_id') // orchestrator-injected
    const promptText = PROMPTS.card_analysis.user
    for (const field of llmFields) {
      expect(promptText).toContain(field)
    }
  })

  it('prompt does not instruct LLM to generate card_id', () => {
    expect(PROMPTS.card_analysis.user).not.toMatch(/^- card_id:/m)
  })

  it('sample LLM output matching prompt instructions passes CardAnalysisSchema', () => {
    const sampleOutput = {
      card_id: 'injected-by-orchestrator',
      identity_tags: ['pokemon', 'holo'],
      rarity_signal: 'Low print run signals strong scarcity.',
      liquidity_signal: 'Active secondary market with frequent trades.',
      price_band: { low: 100, high: 200, currency: 'USD' },
      reasoning_bullets: ['Strong demand signal.'],
      confidence: 'HIGH' as const,
    }
    expect(() => CardAnalysisSchema.parse(sampleOutput)).not.toThrow()
  })
})

describe('Archetype prompt-schema contract', () => {
  it('prompt uses share_card_badges not badges', () => {
    expect(PROMPTS.archetype_identity.user).toContain('share_card_badges')
    expect(PROMPTS.archetype_identity.user).not.toMatch(/^- badges:/m)
  })
})
```

### Corrected Card Analysis Prompt Field Instructions
```
Produce a JSON object with EXACTLY these fields (return null — not omit — for unknown fields):
- identity_tags: string[] — descriptive tags (e.g., ["pokemon", "holo", "first-edition"])
- rarity_signal: string | null — market scarcity observations using signals language
- liquidity_signal: string | null — how actively this card trades
- price_band: { low: number, high: number, currency: string } | null — estimated price range
- reasoning_bullets: string[] — 2-4 analytical observations about market position, demand, and trends
- confidence: 'HIGH' | 'MEDIUM' | 'LOW' — your confidence level in this analysis
```

### Corrected Portfolio Summary Prompt Field Instructions
```
Produce a JSON object with EXACTLY these fields (return null — not omit — for unknown fields):
- concentrationScore: number — 0.0 to 1.0, higher = more concentrated in fewer IPs
- liquidityScore: number — 0.0 to 1.0, higher = more liquid portfolio
- collectorArchetype: string | null — single word or phrase describing collector style
- missingSetGoals: string[] — sets or cards that would complete likely goals
- recommendedActions: string[] — 2-3 actionable recommendations (signals language, no financial advice)
```

### Corrected Archetype Prompt Field Instructions
```
- badges changed to:
- share_card_badges: string[] — earned achievement badges (e.g., ["vault_builder", "ip_specialist"])
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ask LLM for all response fields including orchestrator-computed | Split: LLM returns narrative subset, orchestrator merges | Phase 6 | Eliminates guaranteed schema validation failures on every LLM call |
| Prompt uses generic number for confidence | Prompt specifies enum 'HIGH'\|'MEDIUM'\|'LOW' | Phase 6 | LLM output validates on first attempt |
| snake_case in portfolio prompt | camelCase matching PortfolioSummarySchema | Phase 6 | Field names align, no key transformation needed |
| badges in archetype prompt | share_card_badges | Phase 6 | Single rename closes schema mismatch |

**Deprecated/outdated patterns this phase removes:**
- `confidence: number (0.0-1.0)` — replaced with enum instruction
- `price_band: { low, mid, high }` — replaced with `{ low, high, currency }`
- `concentration_score` / `liquidity_score` snake_case — replaced with camelCase
- `breakdown: { vaulted, external, other }` in prompt — removed entirely (orchestrator computes)
- `top_insight` field — not in schema, removed from portfolio prompt
- `badges` in archetype prompt — renamed to `share_card_badges`

## Open Questions

1. **PortfolioSummarySchema used in generateWithRetry call**
   - What we know: Orchestrator calls `generateWithRetry({ schema: PortfolioSummarySchema })` with the 10-field schema, but the prompt will only ask for 5 fields. The 5 orchestrator fields (userId, totalValueEst, breakdown, priceDataAsOf, priceConfidence) will be missing from LLM output.
   - What's unclear: Whether `generateWithRetry`'s schema validation will reject partial output missing orchestrator-computed fields, causing retry loops.
   - Recommendation: Create `PortfolioSummaryLLMSchema` with only the 5 LLM-returned fields. Use it in `generateWithRetry`. Keep `PortfolioSummarySchema` as the merged output type. This is the clean architectural fix — it matches the prompt exactly.

2. **Contract test field extraction strategy**
   - What we know: The test should check that schema fields appear in prompt text. Two approaches: (A) check that prompt text contains each field name as a substring, (B) parse the bulleted list structure.
   - What's unclear: Whether substring matching is sufficient or will produce false positives.
   - Recommendation: Use substring matching (`.toContain(fieldName)`) — simple, robust, clear intent. Add a negative test for removed fields (`not.toContain('card_id')` instruction line).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (packages/agent/vitest.config.ts) |
| Config file | `packages/agent/vitest.config.ts` |
| Quick run command | `cd packages/agent && pnpm vitest run src/llm/__tests__/prompts-contract.test.ts` |
| Full suite command | `pnpm --filter @tcg/agent test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LLM-02 | Prompt templates produce correct schema-aligned output | contract | `pnpm --filter @tcg/agent test` | ❌ Wave 0: `packages/agent/src/llm/__tests__/prompts-contract.test.ts` |
| LLM-05 | Sanitization wired in portfolio-summary and archetype orchestrators | unit | `pnpm --filter @tcg/agent test` | ❌ Wave 0: extend orchestrator tests |
| CARD-01 | CardAnalysis confidence is enum, price_band has {low,high,currency} | contract | `pnpm --filter @tcg/agent test` | ❌ Wave 0 (same contract test file) |
| CARD-04 | LLM output validates against schema on first attempt | contract | `pnpm --filter @tcg/agent test` | ❌ Wave 0 (sample output parse test) |
| PORT-01 | PortfolioSummary camelCase fields, breakdown from orchestrator | contract | `pnpm --filter @tcg/agent test` | ❌ Wave 0 |
| PORT-03 | concentrationScore field flows correctly | contract | `pnpm --filter @tcg/agent test` | ❌ Wave 0 |
| IDENT-01 | share_card_badges field name in archetype prompt | contract | `pnpm --filter @tcg/agent test` | ❌ Wave 0 |
| IDENT-02 | Archetype inference schema alignment | contract | `pnpm --filter @tcg/agent test` | ❌ Wave 0 |
| IDENT-03 | Exportable archetype JSON with correct field names | contract | `pnpm --filter @tcg/agent test` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @tcg/agent test`
- **Per wave merge:** `pnpm --filter @tcg/agent test && pnpm --filter @tcg/schemas test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/agent/src/llm/__tests__/prompts-contract.test.ts` — covers LLM-02, CARD-01, CARD-04, PORT-01, PORT-03, IDENT-01, IDENT-02, IDENT-03
- [ ] `PortfolioSummaryLLMSchema` — either inline in portfolio-summary orchestrator or new file in packages/schemas/src/llm/ — needed before contract test can import it

*(No new framework install needed — Vitest already configured and running)*

## Sources

### Primary (HIGH confidence)
- Direct file read: `packages/agent/src/llm/prompts.ts` — all 3 current prompt templates, exact field instructions
- Direct file read: `packages/schemas/src/llm/card-analysis.ts` — CardAnalysisSchema exact fields and types
- Direct file read: `packages/schemas/src/llm/portfolio-summary.ts` — PortfolioSummarySchema exact fields and types
- Direct file read: `packages/schemas/src/llm/archetype.ts` — CollectorArchetypeSchema exact fields and types
- Direct file read: `packages/agent/src/orchestrators/card-analysis.ts` — sanitization pattern reference
- Direct file read: `packages/agent/src/orchestrators/portfolio-summary.ts` — merge pattern, dbBreakdown computation
- Direct file read: `packages/agent/src/orchestrators/archetype.ts` — badge computation, LLM call pattern
- Direct file read: `packages/agent/src/llm/sanitize.ts` — sanitizeInput/wrapUserInput API
- Direct file read: `packages/agent/src/llm/generate.ts` — generateWithRetry schema parameter
- Direct file read: `packages/agent/src/llm/__tests__/prompts.test.ts` — existing test patterns to extend
- Direct file read: `packages/agent/vitest.config.ts` — test runner configuration

### Secondary (MEDIUM confidence)
- Zod documentation (.shape property for z.object schemas) — standard Zod API, widely documented

### Tertiary (LOW confidence)
None — all findings based on direct codebase inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use
- Architecture: HIGH — all files read directly, exact mismatches documented with line numbers
- Pitfalls: HIGH — derived from reading actual orchestrator and schema code, not speculation

**Research date:** 2026-03-05
**Valid until:** Stable — this is a fixed codebase, not a moving ecosystem target
