---
phase: 02-rules-engine
verified: 2026-03-04T21:10:00Z
status: passed
score: 20/20 must-haves verified
re_verification: false
---

# Phase 02: Rules Engine Verification Report

**Phase Goal:** A fully-tested deterministic rules engine computes eligible actions per card state and vault conversion candidates — the sole source of truth for the actions field in any card analysis, with no LLM involvement
**Verified:** 2026-03-04T21:10:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | RulesEngineInput type accepts card state, price confidence, estimated value, and listing context | VERIFIED | `packages/agent/src/rules/types.ts` lines 3-14: full interface with card.state, card.priceConfidence, card.estimatedValue, context.hasActiveListing |
| 2 | Typed action param interfaces exist for all 7 action types with correct fields | VERIFIED | `types.ts` exports ListParams, BuybackParams, ShipToVaultParams, BundleShipParams, RedeemParams, OpenPackParams, WatchlistParams — all with correct fields per plan |
| 3 | RulesEngineConfig provides configurable thresholds with sensible defaults ($100, 5 cards, $500) | VERIFIED | `types.ts` lines 16-28: DEFAULT_CONFIG = { vaultSingleCardThreshold: 100, batchCardCountThreshold: 5, batchTotalValueThreshold: 500, bundleShipSavingsPerCard: 5 } |
| 4 | computeEligibleActions dispatches to correct handler per card state with exhaustive switch | VERIFIED | `rules/index.ts` lines 10-30: switch on input.card.state with VAULTED, EXTERNAL, ON_MARKET, IN_TRANSIT cases + default `never` exhaustive check |
| 5 | VAULTED card with LIVE price returns BUYBACK, LIST, REDEEM, WATCHLIST actions | VERIFIED | `rules/actions/vaulted.ts` implements conditional logic; `rules-vaulted.test.ts` test "returns exactly 4 actions" passes (89/89 green) |
| 6 | VAULTED card with NO_DATA price omits BUYBACK (hidden, not shown with disclaimer) | VERIFIED | `vaulted.ts` line 14: `if (priceConfidence !== 'NO_DATA' && estimatedValue !== null)` guards BUYBACK; test "omits BUYBACK entirely" passes |
| 7 | VAULTED card with STALE_7D price includes risk_notes on BUYBACK | VERIFIED | `vaulted.ts` lines 15-18: risk_notes set to "Price signal is 7+ days old — verify current comps before accepting buyback"; test asserts non-null risk_notes containing "7+" |
| 8 | VAULTED card with hasActiveListing=true suppresses LIST action | VERIFIED | `vaulted.ts` line 32: `if (!hasActiveListing && estimatedValue !== null)` guards LIST; test "suppresses LIST action" passes |
| 9 | VAULTED card with packContext=true includes OPEN_PACK action | VERIFIED | `vaulted.ts` line 61: `if (packContext)` guards OPEN_PACK; test "includes OPEN_PACK when packContext is true" passes |
| 10 | EXTERNAL card returns SHIP_TO_VAULT and WATCHLIST | VERIFIED | `rules/actions/external.ts`: always pushes SHIP_TO_VAULT and buildWatchlistAction(); test "returns exactly 2 actions" passes |
| 11 | ON_MARKET card returns empty action array | VERIFIED | `rules/actions/on-market.ts` line 4: `return []`; 7 on-market tests all pass |
| 12 | IN_TRANSIT card returns only WATCHLIST | VERIFIED | `rules/actions/in-transit.ts` line 4: `return [buildWatchlistAction()]`; 9 in-transit tests all pass |
| 13 | Every action output validates against ActionSchema from @tcg/schemas | VERIFIED | ActionSchema.parse() called in every test file (vaulted, external, in-transit, vault-conversion); 89/89 pass with no ZodErrors |
| 14 | ui_copy includes card-specific data via template interpolation | VERIFIED | vaulted.ts line 27: `~$${Math.round(estimatedValue)}`; external.ts line 29: `$${Math.round(cardValue)}`; conversion.ts line 48 includes card.cardName |
| 15 | SHIP_TO_VAULT recommended when external card estimatedValue >= $100 | VERIFIED | `conversion.ts` line 39: `if (value >= config.vaultSingleCardThreshold)`; boundary tests ($100 in, $99 out) pass |
| 16 | BUNDLE_SHIP triggered when user has 5+ external cards regardless of individual values | VERIFIED | `conversion.ts` line 29-31: `externalCards.length >= config.batchCardCountThreshold`; 5-card test passes, 4-card test correctly returns no bundle |
| 17 | BUNDLE_SHIP triggered when total external value >= $500 regardless of card count | VERIFIED | `conversion.ts` line 31: `totalValue >= config.batchTotalValueThreshold`; 3-card/$600 test passes, 3-card/$499 test correctly returns no bundle |
| 18 | SHIP_TO_VAULT unlocks include instant liquidity, trade into packs, verified ranking | VERIFIED | `vault/unlock-reasons.ts` returns exactly 3 reasons; all 3 unlock language tests pass |
| 19 | Identity-based vault trigger stub always returns false | VERIFIED | `conversion.ts` lines 10-12: `computeIdentityVaultTrigger` returns `false`; identity stub test confirms belowThreshold card gets no SHIP_TO_VAULT |
| 20 | Thresholds are configurable via RulesEngineConfig parameter | VERIFIED | Both computeEligibleActions path (no config needed) and computeVaultConversionCandidates accept optional RulesEngineConfig; custom config tests (threshold=$50, batchCount=3) pass |

**Score:** 20/20 truths verified

---

### Required Artifacts

| Artifact | Provides | Status | Evidence |
|----------|----------|--------|---------|
| `packages/agent/src/rules/types.ts` | All typed interfaces for rules engine input, config, action params | VERIFIED | 69 lines, exports RulesEngineInput, RulesEngineConfig, DEFAULT_CONFIG, 7 param interfaces, ExternalCardInput |
| `packages/agent/src/rules/index.ts` | Public API with state dispatch | VERIFIED | 37 lines, exports computeEligibleActions and computeVaultConversionCandidates, exhaustive switch wired to all 4 builders |
| `packages/agent/src/rules/actions/shared.ts` | Shared WATCHLIST action builder reused by 3 state handlers | VERIFIED | Exports buildWatchlistAction(); used in vaulted.ts, external.ts, in-transit.ts |
| `packages/agent/vitest.config.ts` | Vitest configuration for agent package | VERIFIED | Matches schemas package pattern with include, globals: false, passWithNoTests: true |
| `packages/agent/src/rules/actions/vaulted.ts` | VAULTED state action builder | VERIFIED | 76 lines, full conditional BUYBACK/LIST/REDEEM/OPEN_PACK/WATCHLIST logic |
| `packages/agent/src/rules/actions/external.ts` | EXTERNAL state action builder | VERIFIED | 36 lines, SHIP_TO_VAULT + WATCHLIST |
| `packages/agent/src/rules/actions/on-market.ts` | ON_MARKET state action builder (always empty array) | VERIFIED | Intentionally minimal: `return []` |
| `packages/agent/src/rules/actions/in-transit.ts` | IN_TRANSIT state action builder (WATCHLIST only) | VERIFIED | `return [buildWatchlistAction()]` |
| `packages/agent/src/rules/vault/conversion.ts` | computeVaultConversionCandidatesImpl with single-card and batch logic | VERIFIED | 70 lines, single-card loop, isBatchEligible computation, BUNDLE_SHIP trigger, identity stub |
| `packages/agent/src/rules/vault/unlock-reasons.ts` | Dynamic unlock reason builder for SHIP_TO_VAULT | VERIFIED | buildUnlockReasons(card) returns 3 strings with card-specific estimatedValue interpolation |
| `packages/agent/src/__tests__/rules-vaulted.test.ts` | Unit tests for VAULTED state | VERIFIED | 27 tests covering LIVE, RECENT_24H, STALE_7D, NO_DATA, hasActiveListing, packContext, params, ui_copy, null value |
| `packages/agent/src/__tests__/rules-external.test.ts` | Unit tests for EXTERNAL state | VERIFIED | 16 tests covering basic actions, params, unlocks, ui_copy, NO_DATA, WATCHLIST |
| `packages/agent/src/__tests__/rules-on-market.test.ts` | Unit tests for ON_MARKET state | VERIFIED | 7 tests covering all input variations |
| `packages/agent/src/__tests__/rules-in-transit.test.ts` | Unit tests for IN_TRANSIT state | VERIFIED | 9 tests covering all input variations and WATCHLIST properties |
| `packages/agent/src/__tests__/vault-conversion.test.ts` | Unit tests for vault conversion | VERIFIED | 30 tests covering threshold boundaries, batch triggers, mixed scenarios, identity stub, ActionSchema validation |

---

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `packages/agent/src/rules/types.ts` | `@tcg/schemas` | import Action, ActionType, CardState, PriceConfidence | WIRED | Line 1: `import type { CardState, PriceConfidence } from '@tcg/schemas'` |
| `packages/agent/src/rules/index.ts` | `packages/agent/src/rules/types.ts` | import RulesEngineInput | WIRED | Line 2: `import type { RulesEngineInput, RulesEngineConfig, ExternalCardInput } from './types.js'` |
| `packages/agent/src/index.ts` | `packages/agent/src/rules/index.ts` | re-export public API | WIRED | Lines 3-5: `export { computeEligibleActions, computeVaultConversionCandidates } from './rules/index.js'` |
| `packages/agent/src/rules/actions/vaulted.ts` | `packages/agent/src/rules/types.ts` | import RulesEngineInput | WIRED | Line 2: `import type { RulesEngineInput } from '../types.js'` |
| `packages/agent/src/rules/actions/vaulted.ts` | `packages/agent/src/rules/actions/shared.ts` | import buildWatchlistAction | WIRED | Line 3: `import { buildWatchlistAction } from './shared.js'` |
| `packages/agent/src/rules/index.ts` | `packages/agent/src/rules/actions/vaulted.ts` | VAULTED case calls buildVaultedActions | WIRED | Line 4 import + line 13: `case 'VAULTED': return buildVaultedActions(input)` |
| `packages/agent/src/__tests__/rules-vaulted.test.ts` | `packages/agent/src/rules/index.ts` | import computeEligibleActions | WIRED | Line 2: `import { computeEligibleActions } from '../rules/index.js'` |
| `packages/agent/src/rules/vault/conversion.ts` | `packages/agent/src/rules/types.ts` | import ExternalCardInput, RulesEngineConfig, DEFAULT_CONFIG | WIRED | Lines 2-3: `import type { ExternalCardInput, RulesEngineConfig } from '../types.js'` and `import { DEFAULT_CONFIG }` |
| `packages/agent/src/rules/index.ts` | `packages/agent/src/rules/vault/conversion.ts` | delegate computeVaultConversionCandidates to vault module | WIRED | Line 8: `import { computeVaultConversionCandidatesImpl } from './vault/conversion.js'` + line 36 delegation |
| `packages/agent/src/__tests__/vault-conversion.test.ts` | `packages/agent/src/rules/index.ts` | import computeVaultConversionCandidates | WIRED | Line 3: `import { computeVaultConversionCandidates } from '../rules/index.js'` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| RULE-01 | 02-01, 02-02 | Deterministic rules engine computes eligible actions per card based on card state — LLM never decides action eligibility | SATISFIED | computeEligibleActions is a pure TypeScript function with no LLM calls. Exhaustive switch on CardState. All 89 tests verify deterministic output. |
| RULE-02 | 02-01, 02-02 | Action types include BUYBACK, LIST, REDEEM, SHIP_TO_VAULT, OPEN_PACK, WATCHLIST, BUNDLE_SHIP with params, ui_copy, and risk_notes | SATISFIED | All 7 action types implemented with typed params, card-specific ui_copy via template literals, and conditional risk_notes (null for low-risk, present for STALE_7D). Every action validated against ActionSchema. |
| RULE-03 | 02-02 | Rules engine output is the sole source of the actions field in CardAnalysis — LLM cannot add or remove actions | SATISFIED | computeEligibleActions and computeVaultConversionCandidates are pure functions exported from rules engine. No LLM involvement in any implementation file. Phase 4 orchestration is not yet built but the contract is established. |
| VAULT-01 | 02-03 | Agent recommends vaulting when external card estimated value >= configurable threshold OR matches user identity goals OR user has enough cards to batch ship | SATISFIED | SHIP_TO_VAULT at >= vaultSingleCardThreshold ($100 default); identity stub present (always false, Phase 4 hook); BUNDLE_SHIP at >= batchCardCountThreshold or batchTotalValueThreshold. Boundary tests ($100 in, $99 out) verified. |
| VAULT-02 | 02-03 | Vault recommendation includes "unlocks" reasons: instant liquidity (buyback/list), trade into packs, verified portfolio ranking | SATISFIED | buildUnlockReasons() returns exactly 3 strings with card-specific value. All 4 unlock language tests pass (instant liquidity, trade into packs, verified/ranking). |
| VAULT-03 | 02-03 | Batching prompt triggers when user has >= N external cards or total external value >= X, recommending BUNDLE_SHIP action | SATISFIED | isBatchEligible = count >= 5 OR total >= $500. BUNDLE_SHIP params include cardCount, totalValue, estimatedSavings. 5-card test, value-threshold test ($600), and NOT-triggered tests ($499, 4 cards) all pass. |

All 6 requirement IDs declared across plans are SATISFIED.

**Orphaned requirement check:** REQUIREMENTS.md Traceability table maps RULE-01, RULE-02, RULE-03, VAULT-01, VAULT-02, VAULT-03 to Phase 2 — exactly matching the 6 IDs claimed by the plans. No orphaned requirements.

---

### Anti-Patterns Found

Scanned all 11 implementation files modified in this phase:

| File | Pattern Checked | Result |
|------|----------------|--------|
| `rules/types.ts` | TODO/FIXME, empty implementations | None found |
| `rules/index.ts` | Placeholder return stubs, console.log | None found — placeholder removed, real delegation in place |
| `rules/actions/shared.ts` | Stub implementations | None found — buildWatchlistAction returns full Action object |
| `rules/actions/vaulted.ts` | TODO/FIXME, placeholder returns | None found |
| `rules/actions/external.ts` | TODO/FIXME, placeholder returns | None found |
| `rules/actions/on-market.ts` | `return null`, placeholder | None — intentional `return []` is correct final implementation |
| `rules/actions/in-transit.ts` | TODO/FIXME | None found |
| `rules/vault/conversion.ts` | TODO/FIXME, stub functions | computeIdentityVaultTrigger is an intentional stub (Phase 4 hook) — documented in code comments and SUMMARY as planned |
| `rules/vault/unlock-reasons.ts` | TODO/FIXME | None found |

**One intentional stub noted:** `computeIdentityVaultTrigger` in `conversion.ts` always returns `false`. This is a documented Phase 4 activation point, not a gap — the requirement (VAULT-01 "matches user identity goals") explicitly defers identity inference to Phase 4. The stub is module-private and covered by a dedicated identity trigger test.

No blockers. No unintentional placeholder implementations.

---

### Human Verification Required

None. All behaviors in this phase are deterministic pure functions testable programmatically. The 89-test suite covers the complete state x priceConfidence x context matrix. No visual rendering, real-time behavior, or external service integration is involved.

---

### Test Suite Summary

| Test File | Tests | Result |
|-----------|-------|--------|
| `rules-vaulted.test.ts` | 27 | PASSED |
| `rules-external.test.ts` | 16 | PASSED |
| `rules-on-market.test.ts` | 7 | PASSED |
| `rules-in-transit.test.ts` | 9 | PASSED |
| `vault-conversion.test.ts` | 30 | PASSED |
| **Total** | **89** | **ALL PASSED** |

Full monorepo build: 4/4 packages successful (schemas, db, agent, api).

---

### Commit Verification

All commits referenced in summaries confirmed in git history:

| Plan | Purpose | Hash | Status |
|------|---------|------|--------|
| 02-01 | feat: vitest config + type contracts | cd3b226 | CONFIRMED |
| 02-01 | feat: state dispatcher + WATCHLIST builder | 8ea75c2 | CONFIRMED |
| 02-02 | test: RED — failing per-card action tests | 82fc9de | CONFIRMED |
| 02-02 | feat: GREEN — per-card action eligibility | 9018cab | CONFIRMED |
| 02-03 | test: RED — failing vault conversion tests | 80db646 | CONFIRMED |
| 02-03 | feat: GREEN — vault conversion implementation | 9571e8e | CONFIRMED |

TDD discipline verified: RED commit (tests) precedes GREEN commit (implementation) for both 02-02 and 02-03.

---

### Goal Achievement Summary

The phase goal is fully achieved. The rules engine is:

1. **Deterministic** — pure functions with no LLM calls, no side effects, no external service dependencies
2. **Fully-tested** — 89 unit tests covering all card states, all price confidence levels, all context flags, threshold boundary values, and mixed portfolio scenarios
3. **Complete for all card states** — VAULTED (conditional BUYBACK/LIST/REDEEM/OPEN_PACK/WATCHLIST), EXTERNAL (SHIP_TO_VAULT + WATCHLIST), ON_MARKET ([]), IN_TRANSIT ([WATCHLIST])
4. **Vault conversion complete** — SHIP_TO_VAULT at >= $100, BUNDLE_SHIP at 5+ cards or $500+ total, configurable thresholds
5. **Schema-validated** — every action output verified against ActionSchema.parse() in tests
6. **Properly exported** — computeEligibleActions and computeVaultConversionCandidates re-exported from packages/agent/src/index.ts as public API for Phase 4 orchestration

---

_Verified: 2026-03-04T21:10:00Z_
_Verifier: Claude (gsd-verifier)_
