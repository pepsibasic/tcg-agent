import { describe, it, expect } from 'vitest'
import { computeEligibleActions } from '../rules/index.js'
import { ActionSchema } from '@tcg/schemas'
import type { RulesEngineInput } from '../rules/types.js'

function makeInTransitInput(overrides: Partial<RulesEngineInput['card']> = {}, contextOverrides: Partial<RulesEngineInput['context']> = {}): RulesEngineInput {
  return {
    card: {
      state: 'IN_TRANSIT',
      estimatedValue: 300,
      priceConfidence: 'LIVE',
      certNumber: 'CERT-TRAN-001',
      ...overrides,
    },
    context: {
      hasActiveListing: false,
      packContext: false,
      ...contextOverrides,
    },
  }
}

describe('IN_TRANSIT state — WATCHLIST only', () => {
  it('IN_TRANSIT card returns exactly [WATCHLIST]', () => {
    const actions = computeEligibleActions(makeInTransitInput())
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('WATCHLIST')
  })

  it('IN_TRANSIT card with LIVE price still only returns WATCHLIST', () => {
    const actions = computeEligibleActions(makeInTransitInput({ priceConfidence: 'LIVE' }))
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('WATCHLIST')
  })

  it('IN_TRANSIT card with packContext=true still only returns WATCHLIST', () => {
    const actions = computeEligibleActions(makeInTransitInput({}, { packContext: true }))
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('WATCHLIST')
  })

  it('IN_TRANSIT card with STALE_7D price still only returns WATCHLIST', () => {
    const actions = computeEligibleActions(makeInTransitInput({ priceConfidence: 'STALE_7D' }))
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('WATCHLIST')
  })

  it('IN_TRANSIT card with NO_DATA price still only returns WATCHLIST', () => {
    const actions = computeEligibleActions(makeInTransitInput({ priceConfidence: 'NO_DATA' }))
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('WATCHLIST')
  })

  it('does NOT return BUYBACK, LIST, REDEEM, SHIP_TO_VAULT, OPEN_PACK, BUNDLE_SHIP', () => {
    const actions = computeEligibleActions(makeInTransitInput())
    const types = actions.map((a) => a.type)
    expect(types).not.toContain('BUYBACK')
    expect(types).not.toContain('LIST')
    expect(types).not.toContain('REDEEM')
    expect(types).not.toContain('SHIP_TO_VAULT')
    expect(types).not.toContain('OPEN_PACK')
    expect(types).not.toContain('BUNDLE_SHIP')
  })
})

describe('IN_TRANSIT state — WATCHLIST action properties', () => {
  it('WATCHLIST action has null risk_notes (low-risk action)', () => {
    const actions = computeEligibleActions(makeInTransitInput())
    expect(actions[0].risk_notes).toBeNull()
  })

  it('WATCHLIST action validates against ActionSchema', () => {
    const actions = computeEligibleActions(makeInTransitInput())
    expect(() => ActionSchema.parse(actions[0])).not.toThrow()
  })

  it('WATCHLIST action has a non-empty ui_copy string', () => {
    const actions = computeEligibleActions(makeInTransitInput())
    expect(actions[0].ui_copy).toBeTruthy()
    expect(typeof actions[0].ui_copy).toBe('string')
  })
})
