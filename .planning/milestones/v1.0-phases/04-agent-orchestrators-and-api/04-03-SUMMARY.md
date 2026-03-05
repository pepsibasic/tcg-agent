---
phase: 04-agent-orchestrators-and-api
plan: "03"
subsystem: agent
tags: [typescript, prisma, vitest, tdd, llm, archetype, badges]

# Dependency graph
requires:
  - phase: 03-llm-layer
    provides: generateWithRetry, renderPrompt, CollectorArchetypeSchema
  - phase: 01-foundation
    provides: prisma schema with UserCard, ExternalCard, ActionsLog models
provides:
  - detectArchetype(userId) exported from @tcg/agent
  - computeArchetypeBadges helper with deterministic badge rules
  - Below-threshold progress nudge (archetype: null, progress, message)
affects:
  - 04-05-api-endpoints: API route consumes detectArchetype
  - future-phases: identity feature depends on this orchestrator

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD Red-Green cycle for orchestrator implementation
    - Deterministic badge computation overrides LLM output for predictability
    - Degraded mode: LLM failure still returns badges + generic defaults
    - for-of loops over arrow function callbacks to avoid Prisma include type inference issues

key-files:
  created:
    - packages/agent/src/orchestrators/archetype.ts
    - packages/agent/src/__tests__/orchestrators/archetype.test.ts
  modified:
    - packages/agent/src/orchestrators/index.ts
    - packages/agent/src/orchestrators/portfolio-summary.ts
    - packages/agent/src/index.ts

key-decisions:
  - "Badges computed deterministically AFTER LLM call and OVERRIDE LLM output — vault_builder (10+ vaulted), ip_specialist (60%+ one IP), external_collector (5+ external)"
  - "Below 5 cards returns progress nudge with archetype: null and friendly Add N more cards message — not an error"
  - "Degraded path: LLM failure returns success: true with degraded: true, badges survive, name defaults to Collector"
  - "for-of loops over .filter()/.map() arrow functions avoids implicit-any with Prisma include types in strict TypeScript"

patterns-established:
  - "Orchestrator pattern: fetch from DB, check thresholds, compute deterministic fields, call LLM, merge/override"
  - "Badge computation: separate helper function, pure/deterministic, tested independently"
  - "Progress nudge: below-threshold states return structured data (not errors) for graceful UX"

requirements-completed: [IDENT-01, IDENT-02, IDENT-03]

# Metrics
duration: 5min
completed: 2026-03-04
---

# Phase 4 Plan 03: Archetype Detection Orchestrator Summary

**detectArchetype(userId) with deterministic badge computation (vault_builder, ip_specialist, external_collector) and 5-card threshold progress nudge**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-04T14:28:18Z
- **Completed:** 2026-03-04T14:33:38Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Implemented detectArchetype(userId) orchestrator fetching userCards, externalCards, and actionsLog from DB
- computeArchetypeBadges helper: vault_builder (10+ VAULTED), ip_specialist (60%+ one IP), external_collector (5+ external)
- LLM share_card_badges field overridden with deterministic badges after every successful LLM call
- Below-threshold (< 5 total cards) returns progress nudge: { archetype: null, progress: '3/5 cards', message: 'Add 2 more cards...' }
- Degraded mode: LLM failure returns success: true, degraded: true, badges intact, name: 'Collector'
- All 7 archetype tests pass; 173 total tests pass; build clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing archetype orchestrator tests (RED phase)** - `c3ad5f2` (test)
2. **Task 2: Implement archetype orchestrator with deterministic badges (GREEN phase)** - `f32c75e` (feat, committed by parallel plan 04-04 execution)
3. **Deviation fix: Clean up portfolio-summary TypeScript annotations** - `49712a0` (refactor)

_Note: TDD tasks have multiple commits (test → feat). Task 2 was incorporated in the 04-04 parallel execution commit._

## Files Created/Modified
- `packages/agent/src/orchestrators/archetype.ts` - detectArchetype orchestrator and computeArchetypeBadges helper
- `packages/agent/src/__tests__/orchestrators/archetype.test.ts` - 7 TDD tests covering all IDENT requirements
- `packages/agent/src/orchestrators/index.ts` - Barrel export updated with detectArchetype
- `packages/agent/src/orchestrators/portfolio-summary.ts` - Fixed TypeScript errors (for-of loops replacing arrow callbacks)
- `packages/agent/src/index.ts` - Root index exports orchestrators barrel

## Decisions Made
- Badges computed deterministically and override LLM output — LLM is not trusted for badge names that must match UI enum values
- Progress nudge returns `archetype: null` (not an error) to enable friendly UX showing "3/5 cards" progress
- External cards count toward threshold (full collection picture for archetype inference)
- IP distribution for ip_specialist uses card.ipCategory for userCards and 'External' as category for externalCards

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript implicit-any errors in portfolio-summary.ts**
- **Found during:** Task 2 verification (build step)
- **Issue:** Prisma `findMany` with `include: { card: true }` returns complex intersection types; TypeScript couldn't infer callback parameter types in `.filter()` / `.map()` chains
- **Fix:** Replaced arrow function filter/map chains with explicit for-of loops, avoiding the implicit-any inference issue
- **Files modified:** `packages/agent/src/orchestrators/portfolio-summary.ts`
- **Verification:** `pnpm build` passes; 173 tests pass
- **Committed in:** `49712a0` (refactor(04-03))

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential fix for TypeScript strict mode compliance. No scope creep.

## Issues Encountered
- Parallel plan execution (04-01, 04-04) committed some files (archetype.ts, orchestrators/index.ts) before this plan could commit them — resolved by verifying the committed code was correct and continuing without duplicate commits

## Next Phase Readiness
- detectArchetype is exportable from @tcg/agent and ready for API route consumption in Plan 04-05
- All three orchestrators (analyzeCard, summarizePortfolio, detectArchetype) are complete and tested
- Build passes cleanly across all packages

## Self-Check: PASSED

- FOUND: packages/agent/src/orchestrators/archetype.ts
- FOUND: packages/agent/src/__tests__/orchestrators/archetype.test.ts
- FOUND: packages/agent/src/orchestrators/index.ts
- FOUND commit: c3ad5f2 (test RED phase)
- FOUND commit: f32c75e (feat GREEN phase)
- FOUND commit: 49712a0 (refactor portfolio-summary fix)

---
*Phase: 04-agent-orchestrators-and-api*
*Completed: 2026-03-04*
