# Phase 3: LLM Layer - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Reliable LLM client abstraction supporting OpenAI and Anthropic via Vercel AI SDK, with Zod schema validation, retry/fallback logic, compliance guard, prompt templates, and input sanitization. Covers LLM-01, LLM-02, LLM-03, LLM-04, LLM-05.

</domain>

<decisions>
## Implementation Decisions

### Compliance guard rules
- Aggressive blocklist approach — catch broad patterns: 'will increase', 'guaranteed return', 'buy now', 'sell immediately', 'profit', 'investment advice', 'should buy/sell/hold'
- When violation detected: replace phrase in-place with compliance-safe alternative (e.g., 'will increase in value' → 'shows positive market signals'). Preserve surrounding narrative flow
- Log every scrub: which field, original text, replacement text, card_id, model — useful for tuning prompts to reduce violations over time
- Scan narrative fields only: reasoning_bullets, rarity_signal, liquidity_signal (CardAnalysis); recommendedActions (PortfolioSummary); why, share_card_text (Archetype). Skip identity_tags, card_id, numeric fields

### Prompt narrative style
- Card analysis: Analytical with personality — knowledgeable friend, not a robot. Example: 'Charizard VMAX PSA 10 sits in the top tier of modern Pokemon chase cards. Market activity is strong — recent comps suggest $4,800-$5,200.'
- Portfolio summary: Key insights + recommendations — 2-3 sentence overview highlighting concentration risk, strongest IP, and top recommendation. Actionable, not exhaustive
- Archetype descriptions: Fun and shareable — memorable names like 'The Vault Guardian', personality-driven descriptions made for sharing
- Explicit system persona in every template: 'You are a knowledgeable card market analyst. Be direct, data-informed, and engaging. Never give financial advice. Use signals language.'

### Failure and fallback behavior
- 2 retries (3 total attempts) before fallback — ~6-9 seconds total
- Fallback returns typed AnalysisFailure with partial data: { status: 'failed', reason: 'llm_validation_error', partial: { card_id, actions (from rules engine) }, retryable: true }. User still gets their actions — just missing narrative
- Retry feedback includes Zod error + truncated output (first 500 chars) — gives LLM context on what it got wrong without blowing up token count

### Input sanitization
- Sanitize: card names, userNotes, set names, grade — all user-supplied strings that flow into prompts
- Approach: XML escape (<, >, &, quotes) + wrap in context tags: `<user_input type="card_name">escaped value</user_input>`
- Cert numbers are alphanumeric-only and safe — no sanitization needed

### Claude's Discretion
- Provider switching mechanism (env var, config, runtime parameter)
- Exact blocklist patterns and replacement mappings for compliance guard
- Prompt template token optimization
- Internal retry timing (immediate vs backoff)
- Prompt store implementation (file-based, in-memory registry, etc.)

</decisions>

<specifics>
## Specific Ideas

- Compliance logging feeds into Phase 5 observability — structure logs so OBS-03 can consume them
- The AnalysisFailure type should be reusable across all three agent orchestrators (Phase 4) — design it generically
- System persona instruction is the first line of defense for compliance; the guard is the second

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/schemas/src/llm/card-analysis.ts`: CardAnalysisSchema with identity_tags, rarity_signal, liquidity_signal, price_band, reasoning_bullets, confidence
- `packages/schemas/src/llm/portfolio-summary.ts`: PortfolioSummarySchema with breakdown, concentration/liquidity scores, recommended actions
- `packages/schemas/src/llm/archetype.ts`: CollectorArchetypeSchema with name, traits, why, comparable_collectors, share_card_text, badges
- `packages/agent/src/rules/`: Rules engine exports computeEligibleActions and computeVaultConversionCandidates — fallback can leverage these for partial responses

### Established Patterns
- LLM schemas use z.union([type, z.null()]) not z.optional() — prompt templates must instruct LLM to produce null (not omit) for unknown fields
- API schemas extend LLM schemas via .extend() — LLM layer outputs feed directly into API response composition
- Vitest already configured in packages/agent with 89+ tests — LLM layer tests go here too

### Integration Points
- LLM layer lives in `packages/agent/src/` alongside rules engine
- Consumed by agent orchestrators in Phase 4 (card analysis, portfolio summary, archetype detection)
- Compliance guard output feeds Phase 5 observability (OBS-03: LLM validation failures logged)
- Vercel AI SDK `generateObject` with zod schema is the declared provider abstraction (PROJECT.md)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-llm-layer*
*Context gathered: 2026-03-04*
