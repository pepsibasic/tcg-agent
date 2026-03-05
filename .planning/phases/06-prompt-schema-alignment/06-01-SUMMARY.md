---
phase: 06-prompt-schema-alignment
plan: 01
subsystem: llm
tags: [zod, prompts, sanitization, schema-alignment, generateWithRetry]

# Dependency graph
requires:
  - phase: 03-llm-layer
    provides: renderPrompt, generateWithRetry, sanitize utilities, prompt template registry
  - phase: 04-agent-orchestrators-and-api
    provides: portfolio-summary orchestrator, archetype orchestrator, card-analysis orchestrator
provides:
  - Corrected card_analysis prompt: confidence enum HIGH/MEDIUM/LOW, price_band {low,high,currency}, no card_id field
  - Corrected portfolio_summary prompt: 5 camelCase LLM-generated fields only (no orchestrator-computed fields)
  - Corrected archetype_identity prompt: share_card_badges (not badges)
  - PortfolioSummaryLLMSchema: 5-field Zod schema for LLM-only output validation
  - Sanitization wiring in portfolio-summary and archetype orchestrators
affects: [07-cross-phase-wiring, integration-tests, llm-validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Narrow LLM schema (only fields LLM produces) vs full API schema (merged with DB-computed fields)
    - wrapUserInput wraps all user-influenced slot values before renderPrompt
    - generateWithRetry receives narrow LLM schema; orchestrator merges DB-computed fields on success path

key-files:
  created: []
  modified:
    - packages/agent/src/llm/prompts.ts
    - packages/schemas/src/llm/portfolio-summary.ts
    - packages/schemas/src/index.ts
    - packages/agent/src/orchestrators/portfolio-summary.ts
    - packages/agent/src/orchestrators/archetype.ts

key-decisions:
  - "PortfolioSummaryLLMSchema has only 5 fields (concentrationScore, liquidityScore, collectorArchetype, missingSetGoals, recommendedActions) — orchestrator merges DB-computed fields (userId, totalValueEst, breakdown, priceDataAsOf, priceConfidence) after LLM call"
  - "portfolio_summary prompt field names are camelCase matching PortfolioSummaryLLMSchema keys — no snake_case aliases"
  - "cards_json slot value is wrapped with wrapUserInput('portfolio_data', ...) — IP category strings are user-influenced"
  - "archetype slots portfolio_summary_json, top_ips, action_history all wrapped with wrapUserInput — derived from user card data"

patterns-established:
  - "Narrow schema pattern: define separate LLM schema with only the fields the LLM generates; full schema merges in orchestrator"
  - "All user-influenced data passed to renderPrompt must be wrapped with wrapUserInput before slot injection"

requirements-completed: [LLM-02, LLM-05, CARD-01, CARD-04, PORT-01, PORT-03, IDENT-01, IDENT-02, IDENT-03]

# Metrics
duration: 4min
completed: 2026-03-05
---

# Phase 6 Plan 01: Prompt-Schema Alignment Summary

**Fixed all 3 LLM prompt templates to exactly match their Zod schemas, added PortfolioSummaryLLMSchema (5 fields) to replace full 10-field schema in generateWithRetry, and wired wrapUserInput sanitization into portfolio-summary and archetype orchestrators.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-05T14:07:00Z
- **Completed:** 2026-03-05T14:11:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- card_analysis prompt: confidence is now `'HIGH' | 'MEDIUM' | 'LOW'` enum (was float 0.0-1.0); price_band is now `{low, high, currency}` (was `{low, mid, high}`); card_id removed from field instructions
- portfolio_summary prompt: rewritten with 5 camelCase fields only (concentrationScore, liquidityScore, collectorArchetype, missingSetGoals, recommendedActions); removed breakdown, top_insight, userId, totalValueEst, priceDataAsOf, priceConfidence
- archetype_identity prompt: `badges` renamed to `share_card_badges` matching CollectorArchetypeSchema
- PortfolioSummaryLLMSchema defined and exported from schemas barrel — generateWithRetry now validates against 5 LLM-produced fields instead of full 10-field schema, eliminating Zod validation failures on orchestrator-computed fields
- Input sanitization wired in both portfolio-summary and archetype orchestrators using wrapUserInput (matching the card-analysis orchestrator's existing pattern)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix all 3 prompt templates in prompts.ts** - `c9d9fbf` (fix)
2. **Task 2: Define PortfolioSummaryLLMSchema, wire sanitization, and fix generateWithRetry schema parameter** - `9b36aef` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `packages/agent/src/llm/prompts.ts` - Fixed card_analysis, portfolio_summary, and archetype_identity prompt templates
- `packages/schemas/src/llm/portfolio-summary.ts` - Added PortfolioSummaryLLMSchema (5 fields) and PortfolioSummaryLLM type
- `packages/schemas/src/index.ts` - Added barrel exports for PortfolioSummaryLLMSchema and PortfolioSummaryLLM
- `packages/agent/src/orchestrators/portfolio-summary.ts` - Switched to PortfolioSummaryLLMSchema, added wrapUserInput for cards_json
- `packages/agent/src/orchestrators/archetype.ts` - Added wrapUserInput for portfolio_summary_json, top_ips, action_history

## Decisions Made
- PortfolioSummaryLLMSchema holds only the 5 fields the LLM generates; the orchestrator's success-path merge spreads llmResult.data and then overrides with DB-computed fields, so the narrower schema works transparently
- All slot values derived from user card data (IP category names, action history, portfolio breakdown) are wrapped with wrapUserInput to prevent prompt injection; system-generated values (user_id, counts) are not wrapped

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Agent package tsc failed initially because schemas package needed to be built first (to generate the compiled JS that @tcg/schemas resolves to). Fixed by running `pnpm --filter @tcg/schemas build` before the agent tsc check. This is expected monorepo behavior.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 3 prompt templates now produce field instructions that exactly match their target Zod schemas
- generateWithRetry in portfolio-summary orchestrator will no longer fail Zod validation on orchestrator-computed fields
- Both portfolio-summary and archetype orchestrators now match card-analysis's sanitization pattern
- Full monorepo build passes: 288 tests (186 agent + 102 schemas), 4 TypeScript packages compile cleanly

---
*Phase: 06-prompt-schema-alignment*
*Completed: 2026-03-05*
