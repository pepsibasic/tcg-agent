---
phase: 04-agent-orchestrators-and-api
plan: "01"
subsystem: agent
tags: [orchestrator, card-analysis, rules-engine, llm, tdd, vitest, degraded-mode]

# Dependency graph
requires:
  - phase: 02-rules-engine
    provides: computeEligibleActions — deterministic action eligibility for card states
  - phase: 03-llm-layer
    provides: generateWithRetry, renderPrompt, sanitizeInput, wrapUserInput — LLM pipeline

provides:
  - analyzeCard() — single-card orchestrator composing rules engine + LLM into CardAnalysisResponse
  - analyzeCardBatch() — batch orchestrator with CONCURRENCY=3 and pack_pull context
  - Degraded mode — LLM failure returns actions-intact response with degraded=true
  - CardAnalysisResponseSchema extended with degraded: z.boolean().optional()

affects:
  - 04-02: API routes will consume analyzeCard/analyzeCardBatch from @tcg/agent
  - 04-03: Portfolio summary orchestrator follows same pattern
  - 04-04: Archetype detection orchestrator follows same pattern

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Rules-first orchestration: computeEligibleActions called before LLM, actions never derived from LLM output"
    - "Degraded mode pattern: LLM failure returns 200-shaped response with degraded=true and null narrative fields"
    - "CONCURRENCY=3 batch processing with sequential Promise.all chunks"
    - "TDD RED-GREEN cycle: 6 failing tests committed first, implementation follows"

key-files:
  created:
    - packages/agent/src/orchestrators/card-analysis.ts
    - packages/agent/src/orchestrators/index.ts
    - packages/agent/src/__tests__/orchestrators/card-analysis.test.ts
  modified:
    - packages/schemas/src/api/card-analysis.ts
    - packages/agent/src/index.ts

key-decisions:
  - "Actions come exclusively from computeEligibleActions — LLM prompt never receives action eligibility context"
  - "Degraded mode uses type assertion (null as unknown as string) for rarity_signal/liquidity_signal — LLM schema types string but degraded path needs null"
  - "CONCURRENCY=3 hardcoded in analyzeCardBatch — not configurable per plan spec"
  - "degraded field uses z.boolean().optional() (absent on normal responses) not z.union([z.boolean(), z.null()]) (which would require explicit null)"

patterns-established:
  - "Orchestrator return type: { success: true; data: T; degraded?: boolean } | { success: false; reason: 'not_found' }"
  - "RulesEngineInput built from Prisma UserCard: estimatedValue coerced via Number(), hasActiveListing from marketplaceListing?.status === 'ACTIVE', packContext from context?.source === 'pack_pull'"

requirements-completed: [CARD-01, CARD-02, CARD-03, CARD-04]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 4 Plan 01: Card Analysis Orchestrator Summary

**analyzeCard() and analyzeCardBatch() composing rules engine + LLM into a complete CardAnalysisResponse with degraded mode when LLM fails**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T14:28:32Z
- **Completed:** 2026-03-04T14:31:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Extended CardAnalysisResponseSchema with `degraded: z.boolean().optional()` for LLM-failure signaling
- Implemented analyzeCard() — DB fetch, RulesEngineInput construction, rules engine call, prompt rendering, LLM call, success/degraded path
- Implemented analyzeCardBatch() — chunk-based concurrency (CONCURRENCY=3) with pack_pull context propagation
- All 6 new card-analysis tests pass; 173 total tests pass; full monorepo build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema extension and failing tests (RED)** - `3c61624` (test)
2. **Task 2: Card analysis orchestrator implementation (GREEN)** - `f202dc4` (feat)

_TDD plan: test commit first (RED), then implementation commit (GREEN)_

## Files Created/Modified
- `packages/schemas/src/api/card-analysis.ts` - Added `degraded: z.boolean().optional()` to CardAnalysisResponseSchema
- `packages/agent/src/orchestrators/card-analysis.ts` - analyzeCard() and analyzeCardBatch() implementations
- `packages/agent/src/orchestrators/index.ts` - Barrel export for orchestrators (appended analyzeCard/analyzeCardBatch)
- `packages/agent/src/index.ts` - Added `export * from './orchestrators/index.js'`
- `packages/agent/src/__tests__/orchestrators/card-analysis.test.ts` - 6 TDD tests covering all orchestrator scenarios

## Decisions Made
- Actions come exclusively from computeEligibleActions — LLM prompt never receives action eligibility context, maintaining strict rules/LLM separation
- Degraded mode uses `null as unknown as string` type assertion for rarity_signal/liquidity_signal fields — the LLM schema types them as `string` but degraded path must return null to signal missing data
- `degraded` field is `z.boolean().optional()` (absent on normal responses) rather than `z.union([z.boolean(), z.null()])` — clean API: field simply absent means non-degraded
- CONCURRENCY=3 hardcoded per plan spec — not a configuration concern at this level

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript implicit-any errors in portfolio-summary.ts**
- **Found during:** Task 2 build verification
- **Issue:** Pre-existing orchestrators file (portfolio-summary.ts) had `.filter().map()` chains where TypeScript could not infer callback parameter types, causing `TS7006: Parameter implicitly has 'any' type` build errors
- **Fix:** Auto-fixed by linter/formatter adding explicit type annotations to filter callbacks
- **Files modified:** packages/agent/src/orchestrators/portfolio-summary.ts
- **Verification:** pnpm build passes with no type errors
- **Committed in:** f32c75e (Task 2 commit, file was part of orchestrators directory)

---

**Total deviations:** 1 auto-fixed (Rule 1 - existing file bug)
**Impact on plan:** Fix was necessary for build to pass. No scope creep — portfolio-summary.ts is a pre-existing file in the same orchestrators directory, fixing it was required to unblock the build.

## Issues Encountered
- Other orchestrator test files (archetype.test.ts, portfolio-summary.test.ts) were already present in the test directory at plan start — these passed alongside the 6 new card-analysis tests (173 total passing).

## Next Phase Readiness
- analyzeCard and analyzeCardBatch are importable from `@tcg/agent` and ready for API route integration in Phase 4 Plan 02
- Degraded mode handling is established as a pattern for all orchestrators
- The orchestrators/index.ts barrel pattern is established — future orchestrators should be added here

---
*Phase: 04-agent-orchestrators-and-api*
*Completed: 2026-03-04*

## Self-Check: PASSED

- FOUND: packages/schemas/src/api/card-analysis.ts
- FOUND: packages/agent/src/orchestrators/card-analysis.ts
- FOUND: packages/agent/src/orchestrators/index.ts
- FOUND: packages/agent/src/__tests__/orchestrators/card-analysis.test.ts
- FOUND: .planning/phases/04-agent-orchestrators-and-api/04-01-SUMMARY.md
- VERIFIED: commit 3c61624 (test RED phase)
- VERIFIED: commit f202dc4 (feat GREEN phase)
