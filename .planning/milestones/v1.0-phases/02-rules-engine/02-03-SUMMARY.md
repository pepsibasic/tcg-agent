---
phase: 02-rules-engine
plan: 03
subsystem: agent
tags: [typescript, vitest, tdd, vault, rules-engine, actions]

# Dependency graph
requires:
  - phase: 02-rules-engine/02-01
    provides: "RulesEngineConfig, ExternalCardInput, ShipToVaultParams, BundleShipParams types"
  - phase: 01-foundation/01-02
    provides: "ActionSchema, Action type from @tcg/schemas"
provides:
  - "computeVaultConversionCandidatesImpl: portfolio-level vault action recommender"
  - "buildUnlockReasons: dynamic VAULT-02 unlock reason builder (3 reasons per card)"
  - "SHIP_TO_VAULT: triggers at >= vaultSingleCardThreshold (configurable, default $100)"
  - "BUNDLE_SHIP: triggers at >= batchCardCountThreshold OR >= batchTotalValueThreshold"
  - "computeIdentityVaultTrigger: Phase 4 activation stub (always returns false)"
affects:
  - 03-api
  - 04-identity
  - 05-platform

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED-GREEN: failing tests committed before implementation"
    - "Compute batch eligibility before single-card loop so batchEligible flag is correct"
    - "Identity trigger stub: module-private function returning false as Phase 4 hook"
    - "estimatedSavings formula: (cardCount - 1) * bundleShipSavingsPerCard"

key-files:
  created:
    - packages/agent/src/rules/vault/conversion.ts
    - packages/agent/src/rules/vault/unlock-reasons.ts
    - packages/agent/src/__tests__/vault-conversion.test.ts
  modified:
    - packages/agent/src/rules/index.ts

key-decisions:
  - "Compute isBatchEligible before single-card loop so batchEligible param is accurate on each SHIP_TO_VAULT action"
  - "Identity vault trigger stub always returns false — Phase 4 activation point, not a bug"
  - "buildUnlockReasons uses estimatedValue != null (not nullish) for specificity check"
  - "estimatedSavings = (cardCount - 1) * bundleShipSavingsPerCard — stub formula per Research open question #2"

patterns-established:
  - "Vault module pattern: conversion.ts and unlock-reasons.ts as co-located vault-specific files"
  - "Single-card threshold check: value >= config.vaultSingleCardThreshold (>= inclusive boundary)"
  - "null estimatedValue coercion: ?? 0 for arithmetic, != null check for display specificity"

requirements-completed: [VAULT-01, VAULT-02, VAULT-03]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 02 Plan 03: Vault Conversion Rules Summary

**TDD vault conversion engine: SHIP_TO_VAULT at >= $100 with 3 unlock reasons (VAULT-02), BUNDLE_SHIP at 5+ cards or $500+ total, configurable thresholds via RulesEngineConfig**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T13:04:09Z
- **Completed:** 2026-03-04T13:07:04Z
- **Tasks:** 1 (TDD: RED + GREEN commits)
- **Files modified:** 4

## Accomplishments
- Implemented `buildUnlockReasons()` with 3 dynamic unlock reasons per card (instant liquidity with card-specific value, trade into packs, verified ranking)
- Implemented `computeVaultConversionCandidatesImpl()` covering single-card SHIP_TO_VAULT threshold, BUNDLE_SHIP batch triggers, and identity stub
- All 30 vault-conversion tests pass; full monorepo test suite 115/115 green; TypeScript build clean

## Task Commits

Each task was committed atomically with TDD RED then GREEN:

1. **RED - Vault conversion failing tests** - `80db646` (test)
2. **GREEN - Vault conversion implementation** - `9571e8e` (feat)

_Note: TDD tasks have two commits (test → feat)_

## Files Created/Modified
- `packages/agent/src/__tests__/vault-conversion.test.ts` - 30 unit tests covering threshold combinations, boundary values, mixed scenarios, identity stub, and ActionSchema validation
- `packages/agent/src/rules/vault/unlock-reasons.ts` - `buildUnlockReasons()` pure function returning 3 VAULT-02 unlock strings per card
- `packages/agent/src/rules/vault/conversion.ts` - `computeVaultConversionCandidatesImpl()` with single-card and batch logic, identity stub
- `packages/agent/src/rules/index.ts` - Replaced placeholder body with delegation to real implementation

## Decisions Made
- Compute `isBatchEligible` before the single-card loop so the `batchEligible` flag on SHIP_TO_VAULT params is always accurate
- Identity trigger stub (`computeIdentityVaultTrigger`) is a module-private function that always returns false — Phase 4 activation point, not test-skipped
- `buildUnlockReasons` uses `!= null` (not `?? 0`) for display specificity check so `$0` doesn't appear when value is unavailable
- estimatedSavings formula `(cardCount - 1) * bundleShipSavingsPerCard` used as stub per Research open question #2

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The index.ts file had been updated by Plan 02-02 (not a placeholder as the plan suggested) with real `buildVaultedActions`, `buildExternalActions` etc. This was a benign forward-progress by the prior plan — the import and delegation were added without conflict.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Vault conversion engine complete; ready for Phase 03 API layer to call `computeVaultConversionCandidates`
- Identity vault trigger stub at `computeIdentityVaultTrigger` is the Phase 4 hook point
- All thresholds configurable via `RulesEngineConfig` — API layer can pass user-specific or global config

## Self-Check: PASSED

- FOUND: packages/agent/src/rules/vault/conversion.ts
- FOUND: packages/agent/src/rules/vault/unlock-reasons.ts
- FOUND: packages/agent/src/__tests__/vault-conversion.test.ts
- FOUND: .planning/phases/02-rules-engine/02-03-SUMMARY.md
- FOUND: commit 80db646 (RED)
- FOUND: commit 9571e8e (GREEN)

---
*Phase: 02-rules-engine*
*Completed: 2026-03-04*
