import { describe, it, expect } from 'vitest'
import { computeEligibleActions } from '../rules/index.js'
import { ActionSchema } from '@tcg/schemas'
import type { RulesEngineInput } from '../rules/types.js'

function makeExternalInput(overrides: Partial<RulesEngineInput['card']> = {}, contextOverrides: Partial<RulesEngineInput['context']> = {}): RulesEngineInput {
  return {
    card: {
      state: 'EXTERNAL',
      estimatedValue: 200,
      priceConfidence: 'LIVE',
      certNumber: 'CERT-EXT-001',
      ...overrides,
    },
    context: {
      hasActiveListing: false,
      packContext: false,
      ...contextOverrides,
    },
  }
}

describe('EXTERNAL state — basic actions', () => {
  it('returns SHIP_TO_VAULT and WATCHLIST', () => {
    const actions = computeEligibleActions(makeExternalInput())
    const types = actions.map((a) => a.type)
    expect(types).toContain('SHIP_TO_VAULT')
    expect(types).toContain('WATCHLIST')
  })

  it('returns exactly 2 actions', () => {
    const actions = computeEligibleActions(makeExternalInput())
    expect(actions).toHaveLength(2)
  })

  it('does NOT return BUYBACK, LIST, REDEEM, OPEN_PACK, BUNDLE_SHIP', () => {
    const actions = computeEligibleActions(makeExternalInput())
    const types = actions.map((a) => a.type)
    expect(types).not.toContain('BUYBACK')
    expect(types).not.toContain('LIST')
    expect(types).not.toContain('REDEEM')
    expect(types).not.toContain('OPEN_PACK')
    expect(types).not.toContain('BUNDLE_SHIP')
  })

  it('every action validates against ActionSchema', () => {
    const actions = computeEligibleActions(makeExternalInput())
    for (const action of actions) {
      expect(() => ActionSchema.parse(action)).not.toThrow()
    }
  })
})

describe('EXTERNAL state — SHIP_TO_VAULT params', () => {
  it('SHIP_TO_VAULT params have cardValue, unlocks array, batchEligible', () => {
    const actions = computeEligibleActions(makeExternalInput({ estimatedValue: 200 }))
    const ship = actions.find((a) => a.type === 'SHIP_TO_VAULT')
    expect(ship).toBeDefined()
    expect(ship!.params).toMatchObject({
      cardValue: 200,
      batchEligible: false,
    })
    expect((ship!.params as Record<string, unknown>).unlocks).toBeInstanceOf(Array)
  })

  it('SHIP_TO_VAULT unlocks array includes at least 3 reasons', () => {
    const actions = computeEligibleActions(makeExternalInput())
    const ship = actions.find((a) => a.type === 'SHIP_TO_VAULT')
    const unlocks = (ship!.params as Record<string, unknown>).unlocks as string[]
    expect(unlocks.length).toBeGreaterThanOrEqual(3)
  })

  it('unlocks includes instant liquidity reason', () => {
    const actions = computeEligibleActions(makeExternalInput())
    const ship = actions.find((a) => a.type === 'SHIP_TO_VAULT')
    const unlocks = (ship!.params as Record<string, unknown>).unlocks as string[]
    const hasLiquidity = unlocks.some((u) => u.toLowerCase().includes('liquidity'))
    expect(hasLiquidity).toBe(true)
  })

  it('unlocks includes pack/trade reason', () => {
    const actions = computeEligibleActions(makeExternalInput())
    const ship = actions.find((a) => a.type === 'SHIP_TO_VAULT')
    const unlocks = (ship!.params as Record<string, unknown>).unlocks as string[]
    const hasPack = unlocks.some((u) => u.toLowerCase().includes('pack'))
    expect(hasPack).toBe(true)
  })

  it('unlocks includes ranking/leaderboard reason', () => {
    const actions = computeEligibleActions(makeExternalInput())
    const ship = actions.find((a) => a.type === 'SHIP_TO_VAULT')
    const unlocks = (ship!.params as Record<string, unknown>).unlocks as string[]
    const hasRanking = unlocks.some((u) => u.toLowerCase().includes('rank'))
    expect(hasRanking).toBe(true)
  })

  it('batchEligible is always false for per-card EXTERNAL action', () => {
    const actions = computeEligibleActions(makeExternalInput())
    const ship = actions.find((a) => a.type === 'SHIP_TO_VAULT')
    expect((ship!.params as Record<string, unknown>).batchEligible).toBe(false)
  })
})

describe('EXTERNAL state — ui_copy', () => {
  it('SHIP_TO_VAULT ui_copy is benefit-forward and contains "Ship to Vault"', () => {
    const actions = computeEligibleActions(makeExternalInput({ estimatedValue: 200 }))
    const ship = actions.find((a) => a.type === 'SHIP_TO_VAULT')
    expect(ship).toBeDefined()
    expect(ship!.ui_copy).toContain('Ship to Vault')
  })

  it('SHIP_TO_VAULT ui_copy contains the card value (200)', () => {
    const actions = computeEligibleActions(makeExternalInput({ estimatedValue: 200 }))
    const ship = actions.find((a) => a.type === 'SHIP_TO_VAULT')
    expect(ship!.ui_copy).toContain('200')
  })
})

describe('EXTERNAL state — NO_DATA price confidence', () => {
  it('still returns SHIP_TO_VAULT and WATCHLIST even with NO_DATA price', () => {
    const actions = computeEligibleActions(makeExternalInput({ estimatedValue: null, priceConfidence: 'NO_DATA' }))
    const types = actions.map((a) => a.type)
    expect(types).toContain('SHIP_TO_VAULT')
    expect(types).toContain('WATCHLIST')
    expect(actions).toHaveLength(2)
  })

  it('SHIP_TO_VAULT with null estimatedValue uses cardValue=0', () => {
    const actions = computeEligibleActions(makeExternalInput({ estimatedValue: null, priceConfidence: 'NO_DATA' }))
    const ship = actions.find((a) => a.type === 'SHIP_TO_VAULT')
    expect((ship!.params as Record<string, unknown>).cardValue).toBe(0)
  })

  it('every action validates against ActionSchema with NO_DATA', () => {
    const actions = computeEligibleActions(makeExternalInput({ priceConfidence: 'NO_DATA' }))
    for (const action of actions) {
      expect(() => ActionSchema.parse(action)).not.toThrow()
    }
  })
})

describe('EXTERNAL state — WATCHLIST', () => {
  it('WATCHLIST has null risk_notes (low-risk action)', () => {
    const actions = computeEligibleActions(makeExternalInput())
    const watchlist = actions.find((a) => a.type === 'WATCHLIST')
    expect(watchlist).toBeDefined()
    expect(watchlist!.risk_notes).toBeNull()
  })
})
