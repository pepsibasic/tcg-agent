# Phase 3: LLM Layer - Research

**Researched:** 2026-03-04
**Domain:** Vercel AI SDK, LLM provider abstraction, Zod validation with retry, compliance filtering, prompt engineering
**Confidence:** HIGH (locked decisions from CONTEXT.md drive implementation; Vercel AI SDK `generateObject` is well-documented)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Compliance guard rules:**
- Aggressive blocklist approach — catch broad patterns: 'will increase', 'guaranteed return', 'buy now', 'sell immediately', 'profit', 'investment advice', 'should buy/sell/hold'
- When violation detected: replace phrase in-place with compliance-safe alternative (e.g., 'will increase in value' → 'shows positive market signals'). Preserve surrounding narrative flow
- Log every scrub: which field, original text, replacement text, card_id, model — useful for tuning prompts to reduce violations over time
- Scan narrative fields only: reasoning_bullets, rarity_signal, liquidity_signal (CardAnalysis); recommendedActions (PortfolioSummary); why, share_card_text (Archetype). Skip identity_tags, card_id, numeric fields

**Prompt narrative style:**
- Card analysis: Analytical with personality — knowledgeable friend, not a robot. Example: 'Charizard VMAX PSA 10 sits in the top tier of modern Pokemon chase cards. Market activity is strong — recent comps suggest $4,800-$5,200.'
- Portfolio summary: Key insights + recommendations — 2-3 sentence overview highlighting concentration risk, strongest IP, and top recommendation. Actionable, not exhaustive
- Archetype descriptions: Fun and shareable — memorable names like 'The Vault Guardian', personality-driven descriptions made for sharing
- Explicit system persona in every template: 'You are a knowledgeable card market analyst. Be direct, data-informed, and engaging. Never give financial advice. Use signals language.'

**Failure and fallback behavior:**
- 2 retries (3 total attempts) before fallback — ~6-9 seconds total
- Fallback returns typed AnalysisFailure with partial data: `{ status: 'failed', reason: 'llm_validation_error', partial: { card_id, actions (from rules engine) }, retryable: true }`. User still gets their actions — just missing narrative
- Retry feedback includes Zod error + truncated output (first 500 chars) — gives LLM context on what it got wrong without blowing up token count

**Input sanitization:**
- Sanitize: card names, userNotes, set names, grade — all user-supplied strings that flow into prompts
- Approach: XML escape (<, >, &, quotes) + wrap in context tags: `<user_input type="card_name">escaped value</user_input>`
- Cert numbers are alphanumeric-only and safe — no sanitization needed

### Claude's Discretion
- Provider switching mechanism (env var, config, runtime parameter)
- Exact blocklist patterns and replacement mappings for compliance guard
- Prompt template token optimization
- Internal retry timing (immediate vs backoff)
- Prompt store implementation (file-based, in-memory registry, etc.)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LLM-01 | LLM provider abstraction supporting OpenAI and Anthropic via Vercel AI SDK generateObject with zod schema validation | Vercel AI SDK `generateObject` accepts any provider model; switching is a single config change |
| LLM-02 | Prompt templates for card narrative, portfolio summary, and archetype identity with slot injection | In-memory prompt registry pattern; template functions with typed slot params |
| LLM-03 | Retry with schema-aware error feedback (validation error appended to prompt) and deterministic fallback after max retries | `generateObject` throws `NoObjectGeneratedError`; catch, append Zod error, recurse up to maxRetries |
| LLM-04 | Compliance guard scrubs financial advice language from all LLM outputs | Regex-based replacer over targeted fields; run after successful validation |
| LLM-05 | Input sanitization for user-supplied card names and notes before prompt interpolation | XML-escape + wrap in `<user_input>` tags; applied before template render |
</phase_requirements>

---

## Summary

Phase 3 builds the LLM abstraction layer that sits between raw provider calls and the agent orchestrators in Phase 4. The layer's core is Vercel AI SDK's `generateObject`, which handles structured output with Zod schema enforcement for both OpenAI and Anthropic — provider switching is a one-line config change (different model object, same call signature). On top of that, three additional concerns layer in: retry-with-feedback when Zod validation fails (append error + truncated bad output to next prompt), a post-validation compliance guard that regex-replaces financial advice language in specific fields, and an input sanitizer that XML-escapes and tags user-supplied strings before they enter any prompt template.

The prompt store holds three named templates (card narrative, portfolio summary, archetype identity) as typed functions that accept slot params and return a `{ system, user }` message pair. All templates share the same system persona. The `AnalysisFailure` return type is designed generically for reuse across Phase 4 orchestrators — it carries partial data (rules engine actions) so users always receive actionable output even when the narrative fails.

**Primary recommendation:** Use Vercel AI SDK `generateObject` as the sole LLM call surface. Wrap it in a `generateStructured<T>` function that owns retry, fallback, and compliance guard. Keep the prompt store as a typed in-memory registry (no filesystem I/O in hot path).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` (Vercel AI SDK) | ^4.x | `generateObject` for structured LLM output | Already chosen in PROJECT.md; handles OpenAI/Anthropic/etc. uniformly |
| `@ai-sdk/openai` | ^1.x | OpenAI provider adapter | Official Vercel AI SDK provider package |
| `@ai-sdk/anthropic` | ^1.x | Anthropic provider adapter | Official Vercel AI SDK provider package |
| `zod` | ^3.x | Schema validation for LLM output | Already used project-wide; `generateObject` accepts Zod schemas natively |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | - | All deps already in workspace | Phase 3 adds no new external deps |

**Installation:**
```bash
pnpm add ai @ai-sdk/openai @ai-sdk/anthropic --filter @tcg/agent
```

> Note: Verify exact versions match any already pinned in root `package.json` before adding.

---

## Architecture Patterns

### Recommended Project Structure

```
packages/agent/src/
├── llm/
│   ├── index.ts                  # Public exports: generateStructured, AnalysisFailure
│   ├── client.ts                 # Provider factory: getModel(provider) → LanguageModel
│   ├── generate.ts               # generateStructured<T> — retry, fallback, compliance
│   ├── compliance.ts             # scrubCompliance(output, fields, meta) → ScrubbedOutput
│   ├── sanitize.ts               # sanitizeInput(str, type) → safe string
│   └── prompts/
│       ├── index.ts              # Prompt registry: getPrompt(name) → PromptTemplate
│       ├── card-narrative.ts     # Template for CardAnalysis narrative
│       ├── portfolio-summary.ts  # Template for PortfolioSummary narrative
│       └── archetype-identity.ts # Template for CollectorArchetype narrative
└── rules/                        # Existing — Phase 2 output
```

### Pattern 1: Provider Abstraction via getModel()

**What:** A factory function reads the provider from env/config and returns a Vercel AI SDK `LanguageModel` object. All call sites use `generateObject({ model: getModel(), schema, prompt })` — no provider-specific code anywhere else.

**When to use:** Every LLM call. Provider identity is opaque to callers.

```typescript
// packages/agent/src/llm/client.ts
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import type { LanguageModel } from 'ai'

type Provider = 'openai' | 'anthropic'

export function getModel(provider?: Provider): LanguageModel {
  const p = provider ?? (process.env.LLM_PROVIDER as Provider) ?? 'openai'
  if (p === 'anthropic') {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    return anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-20241022')
  }
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return openai(process.env.OPENAI_MODEL ?? 'gpt-4o-mini')
}
```

**Confidence:** HIGH — Vercel AI SDK's provider packages expose exactly this interface.

### Pattern 2: generateStructured<T> with Retry and Fallback

**What:** A generic wrapper around `generateObject` that retries on Zod validation failure, appending the error and truncated bad output to the next prompt. After `maxRetries` (2 retries = 3 total attempts), returns a typed `AnalysisFailure` instead of throwing.

**When to use:** Every structured LLM call in the agent.

```typescript
// packages/agent/src/llm/generate.ts
import { generateObject, NoObjectGeneratedError } from 'ai'
import type { ZodSchema } from 'zod'
import type { LanguageModel } from 'ai'
import { getModel } from './client.js'
import { scrubCompliance } from './compliance.js'

export interface AnalysisFailure {
  status: 'failed'
  reason: 'llm_validation_error' | 'llm_provider_error'
  partial: {
    card_id?: string
    actions?: unknown[]  // Rules engine actions — always present
  }
  retryable: boolean
}

export type LLMResult<T> = T | AnalysisFailure

export async function generateStructured<T>(
  schema: ZodSchema<T>,
  messages: { system: string; user: string },
  options: {
    model?: LanguageModel
    maxRetries?: number
    complianceFields?: (keyof T & string)[]
    meta?: { card_id?: string; model?: string }
  } = {}
): Promise<LLMResult<T>> {
  const model = options.model ?? getModel()
  const maxRetries = options.maxRetries ?? 2
  let userMessage = messages.user
  let lastError: string | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const userWithFeedback = lastError
      ? `${userMessage}\n\n<validation_feedback>\nPrevious attempt failed validation:\n${lastError}\n</validation_feedback>`
      : userMessage

    try {
      const result = await generateObject({
        model,
        schema,
        messages: [
          { role: 'system', content: messages.system },
          { role: 'user', content: userWithFeedback },
        ],
      })
      // Post-validation compliance scrub
      const scrubbed = options.complianceFields
        ? scrubCompliance(result.object, options.complianceFields, options.meta)
        : result.object
      return scrubbed
    } catch (err) {
      if (err instanceof NoObjectGeneratedError) {
        const rawTruncated = String(err.text ?? '').slice(0, 500)
        const zodMsg = err.cause instanceof Error ? err.cause.message : String(err.cause ?? '')
        lastError = `Zod error: ${zodMsg}\nRaw output (truncated): ${rawTruncated}`
        continue
      }
      // Non-validation error — don't retry
      return {
        status: 'failed',
        reason: 'llm_provider_error',
        partial: { card_id: options.meta?.card_id, actions: [] },
        retryable: true,
      }
    }
  }

  return {
    status: 'failed',
    reason: 'llm_validation_error',
    partial: { card_id: options.meta?.card_id, actions: [] },
    retryable: true,
  }
}
```

**Confidence:** HIGH — `NoObjectGeneratedError` is the documented error type from Vercel AI SDK when `generateObject` fails to produce a valid object.

### Pattern 3: Compliance Guard (field-targeted regex replacer)

**What:** After successful validation, iterate over designated string fields (or array-of-string fields). Apply regex replacements from the blocklist. Log every scrub.

**When to use:** Called inside `generateStructured` immediately after successful parse, before returning to caller.

```typescript
// packages/agent/src/llm/compliance.ts

interface ScrubRule {
  pattern: RegExp
  replacement: string
}

const SCRUB_RULES: ScrubRule[] = [
  { pattern: /\bwill increase(?: in value)?\b/gi, replacement: 'shows positive market signals' },
  { pattern: /\bguaranteed? returns?\b/gi, replacement: 'potential market upside' },
  { pattern: /\bbuy now\b/gi, replacement: 'consider acquisition' },
  { pattern: /\bsell immediately\b/gi, replacement: 'consider liquidating' },
  { pattern: /\b(?:profit|profits)\b/gi, replacement: 'potential value gain' },
  { pattern: /\binvestment advice\b/gi, replacement: 'market signals' },
  { pattern: /\bshould (?:buy|sell|hold)\b/gi, replacement: 'may want to consider' },
  { pattern: /\bprice (?:will|is going to)\b/gi, replacement: 'price may' },
]

export interface ScrubLog {
  field: string
  original: string
  replacement: string
  card_id?: string
  model?: string
}

export function scrubCompliance<T extends Record<string, unknown>>(
  output: T,
  fields: (keyof T & string)[],
  meta?: { card_id?: string; model?: string }
): T {
  const scrubLogs: ScrubLog[] = []
  const result = { ...output }

  for (const field of fields) {
    const value = result[field]
    if (typeof value === 'string') {
      result[field] = applyRules(value, field, meta, scrubLogs) as T[typeof field]
    } else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      result[field] = value.map((v: string) => applyRules(v, field, meta, scrubLogs)) as T[typeof field]
    }
  }

  if (scrubLogs.length > 0) {
    // Structured log — Phase 5 OBS-03 consumes this
    console.log(JSON.stringify({ event: 'compliance_scrub', scrubs: scrubLogs }))
  }

  return result
}

function applyRules(
  text: string,
  field: string,
  meta: { card_id?: string; model?: string } | undefined,
  logs: ScrubLog[]
): string {
  let result = text
  for (const rule of SCRUB_RULES) {
    const replaced = result.replace(rule.pattern, rule.replacement)
    if (replaced !== result) {
      logs.push({ field, original: text, replacement: replaced, ...meta })
      result = replaced
    }
  }
  return result
}
```

**Confidence:** HIGH — pure string manipulation, no library dependency.

### Pattern 4: Prompt Store (in-memory registry)

**What:** Named templates are exported as typed functions. The registry is a plain object keyed by template name. No filesystem reads in hot path.

**When to use:** All prompt construction in the agent.

```typescript
// packages/agent/src/llm/prompts/index.ts

export interface PromptTemplate<TSlots> {
  render(slots: TSlots): { system: string; user: string }
}

import { cardNarrativeTemplate } from './card-narrative.js'
import { portfolioSummaryTemplate } from './portfolio-summary.js'
import { archetypeIdentityTemplate } from './archetype-identity.js'

export const PROMPT_STORE = {
  'card-narrative': cardNarrativeTemplate,
  'portfolio-summary': portfolioSummaryTemplate,
  'archetype-identity': archetypeIdentityTemplate,
} as const

export type PromptName = keyof typeof PROMPT_STORE
```

```typescript
// packages/agent/src/llm/prompts/card-narrative.ts

const SYSTEM = `You are a knowledgeable card market analyst. Be direct, data-informed, and engaging. Never give financial advice. Use signals language.`

export interface CardNarrativeSlots {
  cardName: string        // pre-sanitized
  setName: string         // pre-sanitized
  grade: string           // pre-sanitized
  priceRange: string
  priceConfidence: string
  rarityTier: string
}

export const cardNarrativeTemplate = {
  render(slots: CardNarrativeSlots) {
    return {
      system: SYSTEM,
      user: `Analyze this card and produce a CardAnalysis JSON object.

Card details:
<user_input type="card_name">${slots.cardName}</user_input>
<user_input type="set_name">${slots.setName}</user_input>
<user_input type="grade">${slots.grade}</user_input>

Market data:
- Price range: ${slots.priceRange} (confidence: ${slots.priceConfidence})
- Rarity tier: ${slots.rarityTier}

Return null (not omitted) for any unknown fields. Do not include the actions field.`,
    }
  },
}
```

### Pattern 5: Input Sanitizer

**What:** XML-escape user-supplied strings and optionally wrap in typed context tags. Applied before slot injection into any prompt template.

**When to use:** All user-supplied fields: card names, set names, grade, userNotes. Cert numbers skip sanitization (alphanumeric only).

```typescript
// packages/agent/src/llm/sanitize.ts

const XML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

export function xmlEscape(str: string): string {
  return str.replace(/[&<>"']/g, (char) => XML_ESCAPE[char] ?? char)
}

export type InputType = 'card_name' | 'set_name' | 'grade' | 'user_notes'

export function sanitizeInput(raw: string, type: InputType): string {
  const escaped = xmlEscape(raw.trim())
  return `<user_input type="${type}">${escaped}</user_input>`
}
```

### Anti-Patterns to Avoid

- **Embedding raw user strings directly in prompt text:** Always sanitize before interpolation — never `"Analyze ${req.body.cardName}"`.
- **Throwing on LLM validation failure:** The contract is always `LLMResult<T>` — callers must handle `AnalysisFailure`. Never let Zod errors bubble to the HTTP layer.
- **Running compliance guard before Zod validation:** Scrub only validated output — scrubbing invalid JSON fragments wastes cycles and may produce misleading logs.
- **Provider-specific imports in orchestrators:** All provider knowledge lives in `client.ts`. Phase 4 orchestrators call `generateStructured` only.
- **Optional fields in LLM schemas:** Existing convention uses `z.union([type, z.null()])`. Prompt templates must instruct LLM to return `null`, not omit fields — Zod strict mode will reject missing keys.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured LLM output parsing | Custom JSON extraction regex | `generateObject` (Vercel AI SDK) | Handles mode detection, streaming, retries at SDK level |
| OpenAI/Anthropic API clients | Direct `fetch` to provider endpoints | `@ai-sdk/openai`, `@ai-sdk/anthropic` | Auth, retry, streaming, error normalization handled |
| Schema-to-prompt coercion | Custom schema serializer | Pass Zod schema directly to `generateObject` | SDK generates JSON Schema from Zod natively |

**Key insight:** `generateObject` already handles the provider-to-structured-output pipeline. Phase 3 only needs to add retry-with-feedback, compliance scrubbing, and prompt templating on top.

---

## Common Pitfalls

### Pitfall 1: `generateObject` mode mismatch between providers

**What goes wrong:** OpenAI supports `tool` mode (function calling for JSON) and `json` mode. Anthropic supports `tool` mode only for structured output. Passing `mode: 'json'` to Anthropic causes an error.

**Why it happens:** Vercel AI SDK auto-selects mode per provider by default, but explicit `mode` override can break cross-provider compatibility.

**How to avoid:** Do not set `mode` explicitly in `generateObject` calls. Let the SDK select the optimal mode per provider.

**Warning signs:** `UnsupportedFunctionalityError` from Anthropic provider at runtime.

### Pitfall 2: Zod `z.optional()` vs `z.union([type, z.null()])` in strict mode

**What goes wrong:** OpenAI structured output (tool mode) requires all schema keys to be present. `z.optional()` fields may be omitted by the LLM, causing validation failure.

**Why it happens:** OpenAI strict mode requires all declared properties. `z.optional()` generates a JSON Schema `required: false`, which the LLM interprets as "may omit."

**How to avoid:** Use `z.union([type, z.null()])` (already the project convention). Prompt templates must explicitly instruct: "Return null (not omitted) for unknown fields."

**Warning signs:** Frequent `NoObjectGeneratedError` on fields that should be optional.

### Pitfall 3: Retry loop growing token count unboundedly

**What goes wrong:** Appending Zod errors and raw output to each retry grows the user message. With 3 attempts, this can triple token consumption and hit context limits.

**Why it happens:** Feedback accumulation without truncation.

**How to avoid:** Append only the most recent error (not all errors). Truncate raw output to 500 chars (already decided). Reset `userMessage` each attempt — only `lastError` is appended.

**Warning signs:** Requests timing out on retries; unexpectedly high token usage.

### Pitfall 4: Compliance guard logging PII

**What goes wrong:** Logging `original` text that contains user card names or notes exposes user data in logs.

**Why it happens:** The `original` field captures the full pre-scrub text, which may include sanitized-but-still-identifiable card names.

**How to avoid:** Log only `field`, `card_id`, `model`, and a regex match identifier — not the full original text. Or ensure logs go to a PII-safe sink. For v1, log original text only in development (`NODE_ENV !== 'production'`).

**Warning signs:** Compliance logs containing recognizable user-specific strings.

### Pitfall 5: `AnalysisFailure` missing actions from rules engine

**What goes wrong:** Fallback returns empty `actions: []`, losing the deterministic rules engine output the user should always receive.

**Why it happens:** `generateStructured` doesn't have access to the rules engine output — it's a lower-level primitive.

**How to avoid:** The `AnalysisFailure.partial.actions` field is populated by the calling orchestrator (Phase 4), not by `generateStructured` itself. `generateStructured` returns `partial: { card_id }` with empty actions. The orchestrator merges in the rules engine result before returning to the API layer.

**Warning signs:** Phase 4 tests showing `actions: []` in failure responses when rules engine was invoked.

---

## Code Examples

### Calling generateStructured from an orchestrator (Phase 4 preview)

```typescript
// packages/agent/src/orchestrators/card-analysis.ts (Phase 4)
import { generateStructured } from '../llm/index.js'
import { CardAnalysisSchema } from '@tcg/schemas'
import { PROMPT_STORE } from '../llm/prompts/index.js'
import { sanitizeInput } from '../llm/sanitize.js'
import { computeEligibleActions } from '../rules/index.js'

const prompt = PROMPT_STORE['card-narrative'].render({
  cardName: sanitizeInput(card.name, 'card_name'),
  setName: sanitizeInput(card.setName, 'set_name'),
  grade: sanitizeInput(card.grade, 'grade'),
  priceRange: `$${low}-$${high}`,
  priceConfidence: card.priceConfidence,
  rarityTier: card.rarityTier,
})

const result = await generateStructured(CardAnalysisSchema, prompt, {
  complianceFields: ['reasoning_bullets', 'rarity_signal', 'liquidity_signal'],
  meta: { card_id: card.id, model: process.env.OPENAI_MODEL },
})

if (result.status === 'failed') {
  return { ...result, partial: { ...result.partial, actions: rulesEngineActions } }
}
```

### Environment variable configuration

```env
# .env (or .env.local)
LLM_PROVIDER=openai           # or: anthropic
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-haiku-20241022
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual JSON parsing from LLM | `generateObject` with Zod schema | Vercel AI SDK v3+ (2024) | Eliminates hand-rolled extraction |
| Separate OpenAI/Anthropic SDK calls | Unified `ai` package with provider adapters | Vercel AI SDK v3 (2024) | One call surface for all providers |
| `response_format: { type: 'json_object' }` | Tool-mode structured output | OpenAI API late 2024 | More reliable schema adherence |

**Deprecated/outdated:**
- `openai` npm package direct usage: Vercel AI SDK wraps this — use `@ai-sdk/openai` instead for consistency.
- Manual `JSON.parse(response.content)`: Never use — `generateObject` handles this with schema validation.

---

## Open Questions

1. **Retry timing: immediate vs exponential backoff**
   - What we know: User decision is 3 total attempts (~6-9s total). No explicit backoff specified.
   - What's unclear: Whether immediate retries or 1-2s backoff between attempts is better for provider rate limits.
   - Recommendation: Immediate retries for v1 (simplest, within the 6-9s window). Add configurable backoff only if rate limit errors appear in testing.

2. **Compliance log destination in v1**
   - What we know: Phase 5 (OBS-03) will consume compliance logs. Structure logs so they're ready.
   - What's unclear: Log transport (stdout JSON vs log file vs structured logger) in v1 before Phase 5 sets up observability.
   - Recommendation: Use `console.log(JSON.stringify(...))` with a structured `event: 'compliance_scrub'` key. Phase 5 can redirect stdout to its logging infrastructure.

3. **`AnalysisFailure` generic design for Phase 4 reuse**
   - What we know: Three orchestrators (card, portfolio, archetype) will all use this type.
   - What's unclear: Whether `partial` should be typed per-orchestrator or remain a loose `Record<string, unknown>`.
   - Recommendation: Keep `partial` typed as `{ card_id?: string; actions?: unknown[] }` for v1. Phase 4 can narrow the type per orchestrator without changing the core interface.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (already configured in `packages/agent`) |
| Config file | `packages/agent/vitest.config.ts` |
| Quick run command | `pnpm --filter @tcg/agent test --run` |
| Full suite command | `pnpm --filter @tcg/agent test --run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LLM-01 | `getModel('openai')` returns LanguageModel; `getModel('anthropic')` returns LanguageModel; switching via env var | unit | `pnpm --filter @tcg/agent test --run src/__tests__/llm-client.test.ts` | ❌ Wave 0 |
| LLM-01 | `generateStructured` calls `generateObject` with correct model | unit (mock generateObject) | `pnpm --filter @tcg/agent test --run src/__tests__/llm-generate.test.ts` | ❌ Wave 0 |
| LLM-02 | `PROMPT_STORE['card-narrative'].render(slots)` returns `{ system, user }` with slot values present | unit | `pnpm --filter @tcg/agent test --run src/__tests__/llm-prompts.test.ts` | ❌ Wave 0 |
| LLM-02 | Prompt templates contain system persona string | unit | same file | ❌ Wave 0 |
| LLM-03 | On first `generateObject` failure, second call receives error feedback in user message | unit (mock) | `pnpm --filter @tcg/agent test --run src/__tests__/llm-generate.test.ts` | ❌ Wave 0 |
| LLM-03 | After 3 failed attempts, returns `AnalysisFailure` with `status: 'failed'` | unit (mock) | same file | ❌ Wave 0 |
| LLM-04 | Compliance guard replaces all blocklist phrases in designated fields | unit | `pnpm --filter @tcg/agent test --run src/__tests__/llm-compliance.test.ts` | ❌ Wave 0 |
| LLM-04 | Compliance guard does NOT modify identity_tags or numeric fields | unit | same file | ❌ Wave 0 |
| LLM-04 | Scrub event logged with correct structure | unit (spy console.log) | same file | ❌ Wave 0 |
| LLM-05 | `sanitizeInput` XML-escapes `<`, `>`, `&`, `"`, `'` | unit | `pnpm --filter @tcg/agent test --run src/__tests__/llm-sanitize.test.ts` | ❌ Wave 0 |
| LLM-05 | `sanitizeInput` wraps output in `<user_input type="...">` tags | unit | same file | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter @tcg/agent test --run`
- **Per wave merge:** `pnpm --filter @tcg/agent test --run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/agent/src/__tests__/llm-client.test.ts` — covers LLM-01 (provider factory)
- [ ] `packages/agent/src/__tests__/llm-generate.test.ts` — covers LLM-01, LLM-03 (generateStructured + retry)
- [ ] `packages/agent/src/__tests__/llm-prompts.test.ts` — covers LLM-02 (prompt templates)
- [ ] `packages/agent/src/__tests__/llm-compliance.test.ts` — covers LLM-04 (compliance guard)
- [ ] `packages/agent/src/__tests__/llm-sanitize.test.ts` — covers LLM-05 (sanitizer)
- [ ] Vitest mock for `generateObject` from `ai` package — shared test fixture for all LLM tests

---

## Sources

### Primary (HIGH confidence)
- Vercel AI SDK documentation — `generateObject`, `NoObjectGeneratedError`, provider packages (`@ai-sdk/openai`, `@ai-sdk/anthropic`)
- `.planning/phases/03-llm-layer/03-CONTEXT.md` — all locked decisions treated as authoritative
- `packages/agent/src/rules/types.ts`, `packages/agent/src/index.ts` — existing code patterns
- `packages/schemas/src/llm/` — established `z.union([type, z.null()])` convention (referenced in CONTEXT.md)

### Secondary (MEDIUM confidence)
- General knowledge of OpenAI structured output strict mode requirements (optional vs nullable)
- Regex-based compliance filtering pattern — standard NLP preprocessing technique

### Tertiary (LOW confidence)
- Specific `NoObjectGeneratedError` property names (`err.text`, `err.cause`) — verify against installed Vercel AI SDK version at implementation time

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Vercel AI SDK locked decision, provider packages are official
- Architecture: HIGH — patterns derived directly from locked decisions and existing project conventions
- Pitfalls: HIGH (mode mismatch, optional vs nullable) / MEDIUM (PII in logs, actions gap) — based on known SDK behaviors and project patterns
- Validation: HIGH — Vitest already configured, test structure mirrors existing Phase 2 test files

**Research date:** 2026-03-04
**Valid until:** 2026-06-04 (Vercel AI SDK moves fast — re-verify `NoObjectGeneratedError` API if >30 days pass)
