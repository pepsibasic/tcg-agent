---
phase: 07-cross-phase-wiring-and-test-fidelity
plan: 02
subsystem: testing
tags: [vitest, integration-tests, schema-validation, PriceConfidence, ActionSchema]

# Dependency graph
requires:
  - phase: 07-01
    provides: LLMLogger wiring and actionsLog integration verified
  - phase: 05-observability-hardening-and-testing
    provides: Journey integration test structure at orchestrator boundary
  - phase: 01-foundation
    provides: PriceConfidence enum and ActionSchema Zod definitions in @tcg/schemas
provides:
  - Schema-valid mock fixtures for all 4 MVP user journey integration tests
affects: [future-test-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mock actions use full ActionSchema shape {type, params, ui_copy, risk_notes} not partial objects"
    - "Mock PriceConfidence values use valid enum members (LIVE/RECENT_24H/STALE_7D/NO_DATA)"

key-files:
  created: []
  modified:
    - apps/api/src/__tests__/integration/journeys.test.ts

key-decisions:
  - "priceConfidence 'FRESH' was invalid — replaced with 'LIVE' for card-1 (live price data) and 'RECENT_24H' for card-2 (slightly older data); each is a semantically appropriate value for the test scenario"
  - "Mock actions previously used {type, label, description} partial shape — corrected to {type, params, ui_copy, risk_notes} per ActionSchema requirement; params:{} for simple actions, risk_notes:[] when no risks"

patterns-established:
  - "Integration test mocks at orchestrator boundary must use fully schema-valid fixture shapes to catch structural regressions"

requirements-completed: [TEST-03]

# Metrics
duration: 3min
completed: 2026-03-05
---

# Phase 07 Plan 02: Cross-Phase Wiring and Test Fidelity — Schema-Valid Mock Fixtures Summary

**Corrected integration test mock fixtures to use valid PriceConfidence enum values (LIVE/RECENT_24H) and full ActionSchema shapes ({type, params, ui_copy, risk_notes}), ensuring all 14 MVP journey tests exercise real schema contracts**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T14:53:00Z
- **Completed:** 2026-03-05T14:57:30Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced invalid `priceConfidence: 'FRESH'` (not a PriceConfidence enum member) with `'LIVE'` and `'RECENT_24H'` in Journey 1 batch analysis mocks
- Replaced partial action objects `{type, label, description}` with complete ActionSchema shapes `{type, params, ui_copy, risk_notes}` in Journey 1 mocks
- Added `priceFetchedAt` ISO timestamp strings to match the schema requirement when price confidence is LIVE or RECENT_24H
- All 14 MVP user journey integration tests now pass with schema-valid fixture data

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix integration test mock fixtures for schema validity** - `399928e` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/api/src/__tests__/integration/journeys.test.ts` - Fixed Journey 1 mock fixtures: invalid priceConfidence values and partial action shapes corrected to match PriceConfidence enum and ActionSchema

## Decisions Made
- `'FRESH'` replaced with `'LIVE'` for card-1 (first-edition holo with active live pricing) and `'RECENT_24H'` for card-2 (standard holo with day-old pricing) — semantically appropriate distinctions
- `params: {}` used for simple LIST and WATCHLIST actions that have no specific parameters
- `risk_notes: []` used since neither LIST nor WATCHLIST carry risk warnings in these test scenarios

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The two invalid fixtures were exactly as identified in the plan: invalid enum string `'FRESH'` and partial action objects missing `params`, `ui_copy`, and `risk_notes` fields.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 4 MVP user journey integration tests pass with schema-valid fixtures
- Test fidelity gap for TEST-03 is closed — structural regressions in PriceConfidence or ActionSchema will now be caught by these tests
- Phase 07 is now fully complete (both plans 07-01 and 07-02 done)

---
*Phase: 07-cross-phase-wiring-and-test-fidelity*
*Completed: 2026-03-05*
