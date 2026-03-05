# Phase 6: Prompt-Schema Alignment - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix all 3 LLM prompt templates to produce output that validates against their target Zod schemas on the first attempt. Wire input sanitization in portfolio-summary and archetype orchestrators. Add contract tests to verify prompt-schema alignment cannot silently drift. This is a gap closure phase — no new features, only alignment fixes.

</domain>

<decisions>
## Implementation Decisions

### Card analysis prompt fixes
- Change `confidence` instruction from `number (0.0-1.0)` to `enum: 'HIGH' | 'MEDIUM' | 'LOW'` — matching CardAnalysisSchema
- Change `price_band` instruction from `{ low, mid, high }` to `{ low: number, high: number, currency: string }` — matching schema exactly
- Remove `card_id` from prompt field instructions — orchestrator injects card_id after LLM call (success criteria #4)
- Keep all other card analysis prompt fields as-is (identity_tags, rarity_signal, liquidity_signal, reasoning_bullets already match)

### Portfolio summary prompt rewrite
- Complete rewrite of prompt field instructions to match PortfolioSummarySchema
- Use camelCase field names: concentrationScore, liquidityScore, recommendedActions, missingSetGoals, collectorArchetype (not snake_case)
- Breakdown: orchestrator pre-computes from DB data as array of `{ ipCategory, totalValue, cardCount, percentOfPortfolio }` — injected after LLM call, NOT requested from LLM
- LLM returns: concentrationScore (number), liquidityScore (number), recommendedActions (string[]), missingSetGoals (string[]), collectorArchetype (string|null)
- Orchestrator injects: userId, totalValueEst, breakdown, priceDataAsOf, priceConfidence
- Remove top_insight (not in schema) and old breakdown structure

### Archetype prompt fix
- Rename `badges` to `share_card_badges` in prompt instructions — matching CollectorArchetypeSchema
- All other archetype fields already match (name, traits, why, comparable_collectors, share_card_text)

### Sanitization wiring
- Add sanitizeInput/wrapUserInput calls in portfolio-summary orchestrator before prompt rendering — defensive measure for any user-supplied context that may flow in via card notes or custom names
- Add sanitizeInput/wrapUserInput calls in archetype orchestrator before prompt rendering — same defensive rationale
- Card analysis orchestrator already sanitizes correctly (confirmed in code scout)

### Contract tests
- One contract test per prompt template verifying field list matches Zod schema keys
- Test approach: extract field names from prompt template instructions, compare against schema .shape keys
- Verify that data structured according to prompt instructions passes Zod schema validation
- Tests live alongside existing prompt tests in packages/agent/src/llm/__tests__/
- Tests should fail loudly if someone edits a prompt without updating the schema (or vice versa)

### card_id injection
- Remove card_id from LLM prompt instructions — LLM should not be asked to generate an ID it doesn't know
- Orchestrator injects card_id into the validated LLM result before returning to API layer
- LLM schema retains card_id field (needed for API response composition) but prompt omits it

### Claude's Discretion
- Exact prompt wording for rewritten portfolio summary instructions
- Contract test implementation details (regex parsing vs structured extraction)
- Whether to split portfolio summary into separate LLM schema (excluding orchestrator-computed fields) or keep current schema and merge after
- Sanitization wrapper specifics for portfolio/archetype (which fields to wrap, naming conventions)

</decisions>

<specifics>
## Specific Ideas

- The portfolio summary orchestrator already pre-computes `dbBreakdown` from DB data — leverage this existing computation for the breakdown field injection
- Deterministic badge override in archetype orchestrator already works correctly — only the prompt field name needs fixing
- Contract tests should be the "canary" that catches future prompt-schema drift before it reaches production

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/agent/src/llm/prompts.ts`: All 3 prompt templates with slot injection via renderPrompt()
- `packages/agent/src/llm/sanitize.ts`: sanitizeInput() and wrapUserInput() ready to use
- `packages/agent/src/llm/generate.ts`: generateWithRetry() pipeline handles schema validation + compliance
- `packages/schemas/src/llm/`: CardAnalysisSchema, PortfolioSummarySchema, CollectorArchetypeSchema — the source of truth

### Established Patterns
- LLM schemas use `z.union([type, z.null()])` — prompts must say "return null" not "omit"
- API schemas extend LLM schemas via `.extend()` — fixes to LLM schemas cascade to API schemas
- Orchestrators use narrativeFields list for compliance scrubbing — must stay aligned with actual schema fields
- Card analysis orchestrator pattern: sanitize → render prompt → generateWithRetry → inject actions → return

### Integration Points
- Prompt templates in `packages/agent/src/llm/prompts.ts` — edit in place
- Orchestrators in `packages/agent/src/orchestrators/` — wire sanitization calls
- Contract tests alongside `packages/agent/src/llm/__tests__/prompts.test.ts` — extend existing test file or add contract-specific file
- Schema definitions in `packages/schemas/src/llm/` — reference for contract tests (import directly)

### Known Mismatches (from code scout)
| Component | Prompt Says | Schema Expects | Fix |
|-----------|------------|----------------|-----|
| Card Analysis | confidence: 0.0-1.0 | 'HIGH'\|'MEDIUM'\|'LOW' | Update prompt |
| Card Analysis | price_band: {low, mid, high} | {low, high, currency} | Update prompt |
| Card Analysis | includes card_id | card_id injected by orchestrator | Remove from prompt |
| Portfolio Summary | concentration_score | concentrationScore | Update prompt casing |
| Portfolio Summary | liquidity_score | liquidityScore | Update prompt casing |
| Portfolio Summary | breakdown: {vaulted, external, other} | [{ipCategory, totalValue, cardCount, percentOfPortfolio}] | Orchestrator computes |
| Portfolio Summary | top_insight | Not in schema | Remove from prompt |
| Archetype | badges | share_card_badges | Update prompt |

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-prompt-schema-alignment*
*Context gathered: 2026-03-05*
