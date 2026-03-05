/**
 * Rules Engine Gap-Fill Tests
 *
 * Coverage audit result: All card state x action type combinations are fully covered
 * by the existing test suite (rules-vaulted.test.ts, rules-external.test.ts,
 * rules-on-market.test.ts, rules-in-transit.test.ts, vault-conversion.test.ts).
 *
 * Existing coverage summary:
 * - VAULTED x LIVE:       buyback+list+redeem+watchlist (4 actions)
 * - VAULTED x RECENT_24H: same set, null risk_notes on BUYBACK
 * - VAULTED x STALE_7D:   same 4 actions, risk_notes on BUYBACK and LIST (does NOT suppress)
 * - VAULTED x NO_DATA:    BUYBACK hidden entirely, list+redeem+watchlist (3 actions)
 * - VAULTED x packContext: adds OPEN_PACK (5 actions total)
 * - VAULTED x hasActiveListing: suppresses LIST
 * - VAULTED x null estimatedValue: BUYBACK hidden (same as NO_DATA path)
 * - EXTERNAL x LIVE:      ship_to_vault+watchlist (2 actions), batchEligible=false
 * - EXTERNAL x NO_DATA:   same 2 actions, cardValue=0 in params
 * - ON_MARKET (all):      [] — no actions regardless of price confidence or flags
 * - IN_TRANSIT (all):     [WATCHLIST] only, regardless of price confidence or flags
 * - BUNDLE_SHIP:          batch trigger by card count (>=5) or total value (>=$500)
 * - SHIP_TO_VAULT batch:  value threshold $100 boundary tested at $99/$100
 * - batchEligible:        always false at per-card level (batch logic in computeVaultConversionCandidates)
 *
 * This file contains:
 * 1. A coverage sentinel — verifies computeEligibleActions handles all CardState values
 *    in the exhaustive switch without falling through to the never branch.
 * 2. Critical edge-case re-validation for key architectural decisions from STATE.md.
 */

import { describe, it, expect } from 'vitest'
import { computeEligibleActions } from '../index.js'
import { CardStateSchema } from '@tcg/schemas'
import type { RulesEngineInput } from '../types.js'

// ─── Coverage Sentinel ──────────────────────────────────────────────────────

describe('Coverage sentinel — exhaustive switch covers all CardState values', () => {
  /**
   * For each CardState value defined in the Zod enum, verify that
   * computeEligibleActions returns an array (never throws / never hits the never branch).
   *
   * If a new CardState is added to CardStateSchema without a corresponding case in
   * computeEligibleActions, TypeScript will catch it at compile time. This runtime
   * sentinel catches regressions if the type system is bypassed at runtime.
   */
  const allCardStates = CardStateSchema.options

  it('CardStateSchema exposes all expected state values', () => {
    expect(allCardStates).toContain('VAULTED')
    expect(allCardStates).toContain('EXTERNAL')
    expect(allCardStates).toContain('ON_MARKET')
    expect(allCardStates).toContain('IN_TRANSIT')
    expect(allCardStates).toHaveLength(4)
  })

  it.each(allCardStates)(
    'computeEligibleActions returns an array (not null/undefined) for state=%s',
    (state) => {
      const input: RulesEngineInput = {
        card: {
          state,
          estimatedValue: 100,
          priceConfidence: 'LIVE',
          certNumber: null,
        },
        context: {
          hasActiveListing: false,
          packContext: false,
        },
      }
      const result = computeEligibleActions(input)
      expect(Array.isArray(result)).toBe(true)
    },
  )
})

// ─── Key Architectural Decision Re-Validation ────────────────────────────────

describe('Decision sentinel — BUYBACK hidden for NO_DATA (not shown, not suppressed)', () => {
  /**
   * STATE.md decision [Phase 02-rules-engine]:
   * "BUYBACK hidden for NO_DATA (not suppressed with disclaimer) — no price means no buyback basis"
   */
  it('VAULTED+NO_DATA: type list does not include BUYBACK at all', () => {
    const input: RulesEngineInput = {
      card: { state: 'VAULTED', estimatedValue: null, priceConfidence: 'NO_DATA', certNumber: null },
      context: { hasActiveListing: false, packContext: false },
    }
    const types = computeEligibleActions(input).map((a) => a.type)
    expect(types).not.toContain('BUYBACK')
  })

  it('VAULTED+null estimatedValue with LIVE confidence: BUYBACK hidden (null value = no basis)', () => {
    const input: RulesEngineInput = {
      card: { state: 'VAULTED', estimatedValue: null, priceConfidence: 'LIVE', certNumber: null },
      context: { hasActiveListing: false, packContext: false },
    }
    const types = computeEligibleActions(input).map((a) => a.type)
    expect(types).not.toContain('BUYBACK')
  })
})

describe('Decision sentinel — STALE_7D adds risk_notes but does not suppress BUYBACK or LIST', () => {
  /**
   * STATE.md decision [Phase 02-rules-engine]:
   * "STALE_7D adds risk_notes to BUYBACK and LIST but does not suppress — user retains agency"
   */
  it('VAULTED+STALE_7D: BUYBACK is still present in actions', () => {
    const input: RulesEngineInput = {
      card: { state: 'VAULTED', estimatedValue: 500, priceConfidence: 'STALE_7D', certNumber: null },
      context: { hasActiveListing: false, packContext: false },
    }
    const types = computeEligibleActions(input).map((a) => a.type)
    expect(types).toContain('BUYBACK')
  })

  it('VAULTED+STALE_7D: LIST is still present in actions', () => {
    const input: RulesEngineInput = {
      card: { state: 'VAULTED', estimatedValue: 500, priceConfidence: 'STALE_7D', certNumber: null },
      context: { hasActiveListing: false, packContext: false },
    }
    const types = computeEligibleActions(input).map((a) => a.type)
    expect(types).toContain('LIST')
  })

  it('VAULTED+STALE_7D: BUYBACK risk_notes is non-null and contains 7+ day warning', () => {
    const input: RulesEngineInput = {
      card: { state: 'VAULTED', estimatedValue: 500, priceConfidence: 'STALE_7D', certNumber: null },
      context: { hasActiveListing: false, packContext: false },
    }
    const actions = computeEligibleActions(input)
    const buyback = actions.find((a) => a.type === 'BUYBACK')
    expect(buyback).toBeDefined()
    expect(buyback!.risk_notes).not.toBeNull()
    expect(buyback!.risk_notes).toContain('7+')
  })
})

describe('Decision sentinel — ON_MARKET returns [] (no actions while listed)', () => {
  /**
   * STATE.md decision [Phase 02]:
   * "ON_MARKET returns [] (final - no actions while listed)"
   */
  it('ON_MARKET always returns empty array', () => {
    const input: RulesEngineInput = {
      card: { state: 'ON_MARKET', estimatedValue: 500, priceConfidence: 'LIVE', certNumber: null },
      context: { hasActiveListing: true, packContext: false },
    }
    expect(computeEligibleActions(input)).toEqual([])
  })
})

describe('Decision sentinel — IN_TRANSIT returns WATCHLIST only', () => {
  /**
   * STATE.md decision [Phase 02]:
   * "IN_TRANSIT returns WATCHLIST only (final)"
   */
  it('IN_TRANSIT returns exactly one action: WATCHLIST', () => {
    const input: RulesEngineInput = {
      card: { state: 'IN_TRANSIT', estimatedValue: 300, priceConfidence: 'LIVE', certNumber: null },
      context: { hasActiveListing: false, packContext: false },
    }
    const actions = computeEligibleActions(input)
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('WATCHLIST')
  })
})

describe('Decision sentinel — batchEligible computed before single-card loop', () => {
  /**
   * STATE.md decision [Phase 02-rules-engine]:
   * "Compute isBatchEligible before single-card loop so batchEligible flag is accurate on each SHIP_TO_VAULT action"
   * "batchEligible=false at per-card level for SHIP_TO_VAULT — batch logic lives in computeVaultConversionCandidates"
   */
  it('EXTERNAL SHIP_TO_VAULT action has batchEligible=false at per-card level', () => {
    const input: RulesEngineInput = {
      card: { state: 'EXTERNAL', estimatedValue: 250, priceConfidence: 'LIVE', certNumber: null },
      context: { hasActiveListing: false, packContext: false },
    }
    const actions = computeEligibleActions(input)
    const ship = actions.find((a) => a.type === 'SHIP_TO_VAULT')
    expect(ship).toBeDefined()
    const params = ship!.params as { batchEligible: boolean }
    expect(params.batchEligible).toBe(false)
  })
})
