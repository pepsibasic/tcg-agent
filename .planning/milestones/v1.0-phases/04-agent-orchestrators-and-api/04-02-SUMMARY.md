---
phase: 04-agent-orchestrators-and-api
plan: "02"
subsystem: agent
tags: [prisma, zod, llm, orchestrator, portfolio]

# Dependency graph
requires:
  - phase: 03-llm-layer
    provides: generateWithRetry, renderPrompt, DEFAULT_LLM_CONFIG
  - phase: 01-foundation
    provides: Prisma schema — UserCard, ExternalCard, PriceConfidence enum
  - phase: 01-foundation
    provides: PortfolioSummarySchema, PortfolioSummaryResponse from @tcg/schemas
provides:
  - summarizePortfolio() function in packages/agent/src/orchestrators/portfolio-summary.ts
  - worstPriceConfidence() helper for price confidence aggregation
affects: [04-api-routes, 05-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DB-first orchestration — compute totalValueEst, breakdown, priceConfidence deterministically; LLM only for narrative fields
    - Degraded mode pattern — on LLM failure, return DB-computed fields with narrative defaults (success:true, degraded:true)
    - Worst-quality price confidence aggregation across all cards in portfolio
    - for-of loops over Prisma findMany results to avoid TypeScript implicit-any in callbacks

key-files:
  created:
    - packages/agent/src/orchestrators/portfolio-summary.ts
    - packages/agent/src/__tests__/orchestrators/portfolio-summary.test.ts
  modified:
    - packages/agent/src/orchestrators/index.ts

key-decisions:
  - "externalCards always mapped to ipCategory='External' — simplest consistent approach for breakdown grouping"
  - "LLM produces concentrationScore and liquidityScore; orchestrator overrides only totalValueEst, breakdown, priceDataAsOf, priceConfidence from DB"
  - "narrativeFields=['recommendedActions', 'missingSetGoals'] — only narrative fields declared for compliance scrub"
  - "Use for-of loops (not .map/.filter) over Prisma findMany results to avoid TS7006 implicit-any errors in strict mode"

patterns-established:
  - "Orchestrator merge pattern: { ...llmResult.data, ...dbComputedFields } — DB fields take precedence over LLM for deterministic accuracy"
  - "Degraded path always returns success:true with degraded:true flag, never throws"

requirements-completed: [PORT-01, PORT-02, PORT-03]

# Metrics
duration: 5min
completed: 2026-03-04
---

# Phase 4 Plan 02: Portfolio Summary Orchestrator Summary

**summarizePortfolio() — DB-computed totalValueEst/breakdown/priceConfidence merged with LLM narrative fields, degraded mode on LLM failure**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-04T14:28:24Z
- **Completed:** 2026-03-04T14:33:00Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 3

## Accomplishments

- TDD RED: 5 failing tests covering PORT-01 (full response), PORT-02 (vaulted+external cards), PORT-03 (concentration score), degraded mode, empty portfolio
- TDD GREEN: `summarizePortfolio(userId)` function with DB-computed fields and LLM-generated narrative fields
- Degraded mode returns DB-accurate fields (totalValueEst, breakdown, priceDataAsOf, priceConfidence) with empty narrative defaults when LLM fails
- `worstPriceConfidence()` helper aggregates price confidence across all cards using NO_DATA < STALE_7D < RECENT_24H < LIVE ordering

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing portfolio summary orchestrator tests (RED phase)** - `b698e98` (test)
2. **Task 2: Implement portfolio summary orchestrator (GREEN phase)** - `6ab1978` (fix — TypeScript compliance)

_Note: Implementation went through multiple iterations (refactor + fix commits in `49712a0`, `e3e494a`, `6ab1978`) due to TypeScript strict-mode implicit-any issues with Prisma findMany callback parameters._

## Files Created/Modified

- `packages/agent/src/orchestrators/portfolio-summary.ts` - summarizePortfolio() with DB-computed + LLM-merged fields, degraded path
- `packages/agent/src/__tests__/orchestrators/portfolio-summary.test.ts` - 5 TDD tests covering all PORT requirements
- `packages/agent/src/orchestrators/index.ts` - barrel export (summarizePortfolio already present from plan 04-01)

## Decisions Made

- **externalCards use ipCategory='External'**: Plan specified "try to infer from name — simplest approach: treat all externalCards as ipCategory 'External'". External is the consistent mapping.
- **LLM provides concentrationScore + liquidityScore**: The prompt gives the LLM the full breakdown JSON so it can score concentration. Orchestrator only overrides value-related DB fields.
- **narrativeFields list**: `['recommendedActions', 'missingSetGoals']` — only these two go through compliance scrub. concentrationScore and liquidityScore are numeric, not narrative.
- **for-of loops over Prisma arrays**: TypeScript 5.9 in strict mode errors with `noImplicitAny` when using `.map((uc) => ...)` callbacks on Prisma `findMany` results with complex generic include types. for-of loops avoid this without requiring Prisma GetPayload type imports.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript TS7006 implicit-any in Prisma findMany callbacks**
- **Found during:** Task 2 (Green phase — build verification)
- **Issue:** `pnpm build` failed with `TS7006: Parameter 'uc' implicitly has an 'any' type` for all lambda parameters in `.map()` and `.filter()` calls on `userCards` (Prisma `findMany` with `include: { card: true }` returns complex generic type that TypeScript strict mode can't propagate into callback params)
- **Fix:** Replaced all `.map((uc) => ...)` / `.filter((uc) => ...)` chains with `for...of` loops that TypeScript can properly infer. The `for (const uc of userCards)` pattern works because TypeScript resolves the loop variable type from the array's generic type, not from callback inference.
- **Files modified:** `packages/agent/src/orchestrators/portfolio-summary.ts`
- **Verification:** `pnpm build` passes, all 173 tests pass
- **Committed in:** `6ab1978`

---

**Total deviations:** 1 auto-fixed (1 TypeScript implicit-any bug)
**Impact on plan:** Required fix for build to pass. No functional scope change — same logic, different syntax.

## Issues Encountered

- TypeScript strict mode (`noImplicitAny`) fails to infer lambda parameter types from complex Prisma `findMany` generic return types. Resolved by using `for...of` loops throughout instead of `.map()/.filter()` chains on Prisma results.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `summarizePortfolio()` is importable from `@tcg/agent` via barrel export
- Ready for plan 04-03 (API route `/portfolio-summary`) to call `summarizePortfolio(userId)` and return response
- All 3 PORT requirements completed: PORT-01 (full response shape), PORT-02 (vaulted+external cards), PORT-03 (concentration score)

## Self-Check: PASSED

All files confirmed present:
- packages/agent/src/orchestrators/portfolio-summary.ts: FOUND
- packages/agent/src/__tests__/orchestrators/portfolio-summary.test.ts: FOUND
- .planning/phases/04-agent-orchestrators-and-api/04-02-SUMMARY.md: FOUND

All commits confirmed:
- b698e98 (test: RED phase tests): FOUND
- 6ab1978 (fix: TypeScript compliance): FOUND

---
*Phase: 04-agent-orchestrators-and-api*
*Completed: 2026-03-04*
