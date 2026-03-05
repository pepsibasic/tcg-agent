---
phase: 02-rules-engine
plan: 02
subsystem: agent
tags: [vitest, tdd, typescript, rules-engine, actions, vaulted, external, on-market, in-transit]

# Dependency graph
requires:
  - phase: 02-rules-engine
    plan: 01
    provides: "RulesEngineInput types, computeEligibleActions dispatcher, buildWatchlistAction, vitest infrastructure"
  - phase: 01-foundation
    provides: "@tcg/schemas with Action, ActionSchema, ActionType, CardState, PriceConfidence"
provides:
  - buildVaultedActions: VAULTED state handler with conditional BUYBACK/LIST/REDEEM/OPEN_PACK/WATCHLIST
  - buildExternalActions: EXTERNAL state handler with SHIP_TO_VAULT + WATCHLIST
  - buildOnMarketActions: ON_MARKET state handler (always empty array)
  - buildInTransitActions: IN_TRANSIT state handler (WATCHLIST only)
  - 4 test files covering all card state x priceConfidence x context combinations
  - computeEligibleActions dispatcher wired to all 4 real implementations
affects:
  - 02-03 (vault conversion fills computeVaultConversionCandidates — already stubbed out)
  - 04-orchestration (uses computeEligibleActions for action injection into API responses)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD RED/GREEN cycle with vitest — tests written first, then implementations
    - Pure function state handlers — each builder is side-effect free
    - Conditional action building via if-guards (not switch-case) for readability
    - Typed params cast to Record<string, unknown> to satisfy ActionSchema.parse()
    - Null-safe estimatedValue handling (null falls back to ?? 0 or skips action entirely)

key-files:
  created:
    - packages/agent/src/rules/actions/vaulted.ts
    - packages/agent/src/rules/actions/external.ts
    - packages/agent/src/rules/actions/on-market.ts
    - packages/agent/src/rules/actions/in-transit.ts
    - packages/agent/src/__tests__/rules-vaulted.test.ts
    - packages/agent/src/__tests__/rules-external.test.ts
    - packages/agent/src/__tests__/rules-on-market.test.ts
    - packages/agent/src/__tests__/rules-in-transit.test.ts
  modified:
    - packages/agent/src/rules/index.ts

key-decisions:
  - "BUYBACK is hidden (not shown with disclaimer) for NO_DATA — price absence means no buyback basis, not a risky buyback"
  - "null estimatedValue also suppresses BUYBACK and LIST — same rationale as NO_DATA (no price data)"
  - "STALE_7D adds risk_notes to BUYBACK and LIST but does NOT suppress them — user still has agency"
  - "SHIP_TO_VAULT uses cardValue=0 when estimatedValue is null — benefit-forward, not blocked by missing price"
  - "batchEligible is always false at per-card level — batch logic lives in computeVaultConversionCandidates"
  - "OPEN_PACK uses packId=null — dynamic pack context ID deferred until pack-pull flow is built"

patterns-established:
  - "Action builders in rules/actions/ — one file per card state, pure functions taking RulesEngineInput"
  - "Unlock reasons as static strings — dynamic card-specific unlock text deferred to richer data phase"
  - "risk_notes: null for all low-risk actions (WATCHLIST, REDEEM, SHIP_TO_VAULT, OPEN_PACK)"

requirements-completed: [RULE-01, RULE-02, RULE-03]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 02 Plan 02: Per-Card Action Eligibility Summary

**TDD-driven implementation of all 4 card state action builders with conditional BUYBACK/LIST/OPEN_PACK gating, STALE_7D risk_notes, and full ActionSchema validation coverage**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-04T13:03:49Z
- **Completed:** 2026-03-04T13:06:00Z
- **Tasks:** 1 (TDD: RED + GREEN commits)
- **Files modified:** 9

## Accomplishments

- Created 4 test files (59 tests) covering every card state x priceConfidence x context combination: VAULTED (27 tests), EXTERNAL (16 tests), ON_MARKET (7 tests), IN_TRANSIT (9 tests)
- Implemented buildVaultedActions with full conditional logic: BUYBACK gated on !NO_DATA && estimatedValue != null, LIST gated on !hasActiveListing && estimatedValue != null, OPEN_PACK gated on packContext, REDEEM and WATCHLIST always present
- Implemented buildExternalActions: SHIP_TO_VAULT always (cardValue ?? 0), 3 static unlock reasons, batchEligible=false at per-card level
- Implemented buildOnMarketActions (always []) and buildInTransitActions (always [WATCHLIST])
- Wired all 4 builders into computeEligibleActions dispatcher, replacing VAULTED and EXTERNAL placeholders
- All 89 tests pass (including pre-existing tests in vault-conversion.test.ts that also passed due to linter wiring vault conversion impl)
- Full monorepo build green (4 packages)

## Task Commits

Each TDD phase was committed atomically:

1. **RED: test(02-02): add failing tests for all card state action eligibility** - `82fc9de`
2. **GREEN: feat(02-02): implement per-card action eligibility for all states** - `9018cab`

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/agent/src/rules/actions/vaulted.ts` - buildVaultedActions with BUYBACK/LIST/REDEEM/OPEN_PACK/WATCHLIST conditional logic
- `packages/agent/src/rules/actions/external.ts` - buildExternalActions with SHIP_TO_VAULT (3 unlock reasons) + WATCHLIST
- `packages/agent/src/rules/actions/on-market.ts` - buildOnMarketActions returning [] always
- `packages/agent/src/rules/actions/in-transit.ts` - buildInTransitActions returning [WATCHLIST] always
- `packages/agent/src/rules/index.ts` - computeEligibleActions wired to all 4 real builders (replaced placeholders)
- `packages/agent/src/__tests__/rules-vaulted.test.ts` - 27 tests: LIVE/RECENT_24H/STALE_7D/NO_DATA, hasActiveListing, packContext, params, ui_copy, null estimatedValue
- `packages/agent/src/__tests__/rules-external.test.ts` - 16 tests: basic actions, SHIP_TO_VAULT params/unlocks/ui_copy, NO_DATA handling, WATCHLIST
- `packages/agent/src/__tests__/rules-on-market.test.ts` - 7 tests: all input variations return []
- `packages/agent/src/__tests__/rules-in-transit.test.ts` - 9 tests: all input variations return [WATCHLIST]

## Decisions Made

- BUYBACK hidden for NO_DATA (not shown with disclaimer) — no buyback basis without price data, full suppression is cleaner than a disabled state with explanation
- null estimatedValue treated identically to NO_DATA for BUYBACK/LIST — can't suggest a price if we don't know the value
- STALE_7D risk_notes added to both BUYBACK and LIST: "Price signal is 7+ days old — verify current comps before [action]"
- Static unlock reasons for SHIP_TO_VAULT — dynamic card-specific unlock text deferred until richer card data is available in Phase 4

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- computeVaultConversionCandidates placeholder ready for Plan 02-03 vault conversion logic (already stubbed to call computeVaultConversionCandidatesImpl)
- All 4 card states handled — dispatcher is complete
- Action builders are pure functions, making them easy to unit test and extend
- No blockers

---
*Phase: 02-rules-engine*
*Completed: 2026-03-04*

## Self-Check: PASSED

- FOUND: packages/agent/src/rules/actions/vaulted.ts
- FOUND: packages/agent/src/rules/actions/external.ts
- FOUND: packages/agent/src/rules/actions/on-market.ts
- FOUND: packages/agent/src/rules/actions/in-transit.ts
- FOUND: packages/agent/src/__tests__/rules-vaulted.test.ts
- FOUND: packages/agent/src/__tests__/rules-external.test.ts
- FOUND: packages/agent/src/__tests__/rules-on-market.test.ts
- FOUND: packages/agent/src/__tests__/rules-in-transit.test.ts
- FOUND: commit 82fc9de (RED)
- FOUND: commit 9018cab (GREEN)
