---
phase: 02-rules-engine
plan: 01
subsystem: agent
tags: [vitest, typescript, rules-engine, types]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "@tcg/schemas with CardState, PriceConfidence, Action, ActionType enums"
provides:
  - Vitest test infrastructure for @tcg/agent package
  - RulesEngineInput typed interface for card state, price confidence, estimated value, and listing context
  - RulesEngineConfig with configurable thresholds ($100 vault, 5 card batch, $500 batch total)
  - DEFAULT_CONFIG with sensible default thresholds
  - Seven typed action param interfaces (ListParams, BuybackParams, ShipToVaultParams, BundleShipParams, RedeemParams, OpenPackParams, WatchlistParams)
  - ExternalCardInput type for vault conversion function
  - computeEligibleActions dispatcher with exhaustive switch on CardState (ON_MARKET returns [], IN_TRANSIT returns WATCHLIST)
  - computeVaultConversionCandidates placeholder function
  - buildWatchlistAction shared builder
  - Public API re-exports from packages/agent/src/index.ts
affects:
  - 02-02 (per-card action implementations fill VAULTED and EXTERNAL branches)
  - 02-03 (vault conversion fills computeVaultConversionCandidates)
  - 04-orchestration (uses computeEligibleActions, computeVaultConversionCandidates)

# Tech tracking
tech-stack:
  added: [vitest@^3.0.0]
  patterns:
    - Exhaustive switch on discriminated union (CardState) with TypeScript never check
    - Placeholder functions with void parameters to suppress unused-variable warnings
    - passWithNoTests: true for clean vitest exit before test files exist

key-files:
  created:
    - packages/agent/src/rules/types.ts
    - packages/agent/src/rules/index.ts
    - packages/agent/src/rules/actions/shared.ts
    - packages/agent/vitest.config.ts
  modified:
    - packages/agent/package.json
    - packages/agent/src/index.ts

key-decisions:
  - "ON_MARKET returns [] (final - no actions while listed, user manages through marketplace UI)"
  - "IN_TRANSIT returns [WATCHLIST] only (final - nothing actionable until card arrives at vault)"
  - "VAULTED and EXTERNAL branches are placeholders returning [WATCHLIST] until Plan 02-02 fills real logic"
  - "computeVaultConversionCandidates is a placeholder returning [] until Plan 02-03"
  - "WatchlistParams is an empty interface - WATCHLIST has static ui_copy, no card-specific data needed"
  - "void keyword used to suppress unused parameter warnings in placeholder functions"

patterns-established:
  - "Exhaustive switch pattern: default branch casts to never for compile-time CardState coverage"
  - "Shared action builders in rules/actions/ for reuse across state handlers"
  - "Public API centralized in src/index.ts with explicit type re-exports"

requirements-completed: [RULE-01, RULE-02]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 02 Plan 01: Rules Engine Foundation Summary

**Vitest configured in @tcg/agent, typed rules engine contracts established with exhaustive CardState dispatcher and configurable thresholds ($100/$500/5-card)**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-04T12:59:40Z
- **Completed:** 2026-03-04T13:01:24Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added vitest to @tcg/agent with passWithNoTests configuration — test infrastructure ready for TDD in Plans 02-02 and 02-03
- Defined all typed contracts: RulesEngineInput, RulesEngineConfig, DEFAULT_CONFIG, 7 action param interfaces, ExternalCardInput
- Implemented exhaustive CardState dispatcher with ON_MARKET and IN_TRANSIT as final locked states

## Task Commits

Each task was committed atomically:

1. **Task 1: Add vitest to agent package and create rules engine type contracts** - `cd3b226` (feat)
2. **Task 2: Create state dispatcher and shared WATCHLIST builder** - `8ea75c2` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `packages/agent/src/rules/types.ts` - All typed interfaces: RulesEngineInput, RulesEngineConfig, DEFAULT_CONFIG, 7 action param interfaces, ExternalCardInput
- `packages/agent/src/rules/index.ts` - computeEligibleActions with exhaustive switch, computeVaultConversionCandidates placeholder
- `packages/agent/src/rules/actions/shared.ts` - buildWatchlistAction() shared builder with static ui_copy
- `packages/agent/vitest.config.ts` - Vitest config matching schemas package pattern
- `packages/agent/package.json` - Added vitest devDependency and test script
- `packages/agent/src/index.ts` - Added re-exports for rules engine public API

## Decisions Made
- `void externalCards; void config` pattern used in placeholder functions to suppress TypeScript unused-variable errors cleanly
- ON_MARKET and IN_TRANSIT marked as final in comments — will not change in downstream plans
- WatchlistParams left as empty interface per CONTEXT.md ("null for low-risk actions", static copy)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Types are the contract for Plan 02-02 which fills VAULTED and EXTERNAL action logic
- computeVaultConversionCandidates placeholder ready for Plan 02-03 vault conversion logic
- Vitest infrastructure ready for TDD approach in subsequent plans
- No blockers

---
*Phase: 02-rules-engine*
*Completed: 2026-03-04*

## Self-Check: PASSED

- FOUND: packages/agent/src/rules/types.ts
- FOUND: packages/agent/src/rules/index.ts
- FOUND: packages/agent/src/rules/actions/shared.ts
- FOUND: packages/agent/vitest.config.ts
- FOUND: commit cd3b226
- FOUND: commit 8ea75c2
