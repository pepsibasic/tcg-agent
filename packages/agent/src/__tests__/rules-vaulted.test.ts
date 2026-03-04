import { describe, it, expect } from 'vitest'
import { computeEligibleActions } from '../rules/index.js'
import { ActionSchema } from '@tcg/schemas'
import type { RulesEngineInput } from '../rules/types.js'

// Helper to build a baseline VAULTED input
function makeVaultedInput(overrides: Partial<RulesEngineInput['card']> = {}, contextOverrides: Partial<RulesEngineInput['context']> = {}): RulesEngineInput {
  return {
    card: {
      state: 'VAULTED',
      estimatedValue: 850,
      priceConfidence: 'LIVE',
      certNumber: 'CERT-12345',
      ...overrides,
    },
    context: {
      hasActiveListing: false,
      packContext: false,
      ...contextOverrides,
    },
  }
}

describe('VAULTED state — LIVE price, no listing, no pack', () => {
  it('returns BUYBACK, LIST, REDEEM, WATCHLIST in the action set', () => {
    const actions = computeEligibleActions(makeVaultedInput())
    const types = actions.map((a) => a.type)
    expect(types).toContain('BUYBACK')
    expect(types).toContain('LIST')
    expect(types).toContain('REDEEM')
    expect(types).toContain('WATCHLIST')
  })

  it('does NOT return SHIP_TO_VAULT or BUNDLE_SHIP', () => {
    const actions = computeEligibleActions(makeVaultedInput())
    const types = actions.map((a) => a.type)
    expect(types).not.toContain('SHIP_TO_VAULT')
    expect(types).not.toContain('BUNDLE_SHIP')
  })

  it('returns exactly 4 actions (BUYBACK, LIST, REDEEM, WATCHLIST)', () => {
    const actions = computeEligibleActions(makeVaultedInput())
    expect(actions).toHaveLength(4)
  })

  it('every action validates against ActionSchema', () => {
    const actions = computeEligibleActions(makeVaultedInput())
    for (const action of actions) {
      expect(() => ActionSchema.parse(action)).not.toThrow()
    }
  })
})

describe('VAULTED state — RECENT_24H price', () => {
  it('returns BUYBACK, LIST, REDEEM, WATCHLIST (same set as LIVE)', () => {
    const actions = computeEligibleActions(makeVaultedInput({ priceConfidence: 'RECENT_24H' }))
    const types = actions.map((a) => a.type)
    expect(types).toContain('BUYBACK')
    expect(types).toContain('LIST')
    expect(types).toContain('REDEEM')
    expect(types).toContain('WATCHLIST')
    expect(actions).toHaveLength(4)
  })

  it('BUYBACK has null risk_notes for RECENT_24H', () => {
    const actions = computeEligibleActions(makeVaultedInput({ priceConfidence: 'RECENT_24H' }))
    const buyback = actions.find((a) => a.type === 'BUYBACK')
    expect(buyback).toBeDefined()
    expect(buyback!.risk_notes).toBeNull()
  })
})

describe('VAULTED state — STALE_7D price', () => {
  it('returns BUYBACK with non-null risk_notes containing stale price warning', () => {
    const actions = computeEligibleActions(makeVaultedInput({ priceConfidence: 'STALE_7D' }))
    const buyback = actions.find((a) => a.type === 'BUYBACK')
    expect(buyback).toBeDefined()
    expect(buyback!.risk_notes).not.toBeNull()
    expect(buyback!.risk_notes).toContain('7+')
  })

  it('returns LIST with non-null risk_notes containing stale price warning', () => {
    const actions = computeEligibleActions(makeVaultedInput({ priceConfidence: 'STALE_7D' }))
    const list = actions.find((a) => a.type === 'LIST')
    expect(list).toBeDefined()
    expect(list!.risk_notes).not.toBeNull()
    expect(list!.risk_notes).toContain('7+')
  })

  it('returns all 4 actions (BUYBACK not suppressed for STALE_7D)', () => {
    const actions = computeEligibleActions(makeVaultedInput({ priceConfidence: 'STALE_7D' }))
    const types = actions.map((a) => a.type)
    expect(types).toContain('BUYBACK')
    expect(types).toContain('LIST')
    expect(types).toContain('REDEEM')
    expect(types).toContain('WATCHLIST')
    expect(actions).toHaveLength(4)
  })

  it('every action validates against ActionSchema', () => {
    const actions = computeEligibleActions(makeVaultedInput({ priceConfidence: 'STALE_7D' }))
    for (const action of actions) {
      expect(() => ActionSchema.parse(action)).not.toThrow()
    }
  })
})

describe('VAULTED state — NO_DATA price', () => {
  it('omits BUYBACK entirely (not shown — no price to base buyback on)', () => {
    const actions = computeEligibleActions(makeVaultedInput({ priceConfidence: 'NO_DATA' }))
    const types = actions.map((a) => a.type)
    expect(types).not.toContain('BUYBACK')
  })

  it('returns LIST, REDEEM, WATCHLIST (3 actions) for NO_DATA', () => {
    const actions = computeEligibleActions(makeVaultedInput({ priceConfidence: 'NO_DATA' }))
    const types = actions.map((a) => a.type)
    expect(types).toContain('LIST')
    expect(types).toContain('REDEEM')
    expect(types).toContain('WATCHLIST')
    expect(actions).toHaveLength(3)
  })

  it('every action validates against ActionSchema', () => {
    const actions = computeEligibleActions(makeVaultedInput({ priceConfidence: 'NO_DATA' }))
    for (const action of actions) {
      expect(() => ActionSchema.parse(action)).not.toThrow()
    }
  })
})

describe('VAULTED state — hasActiveListing=true', () => {
  it('suppresses LIST action when card has active listing', () => {
    const actions = computeEligibleActions(makeVaultedInput({}, { hasActiveListing: true }))
    const types = actions.map((a) => a.type)
    expect(types).not.toContain('LIST')
  })

  it('still includes BUYBACK, REDEEM, WATCHLIST when listing is active', () => {
    const actions = computeEligibleActions(makeVaultedInput({}, { hasActiveListing: true }))
    const types = actions.map((a) => a.type)
    expect(types).toContain('BUYBACK')
    expect(types).toContain('REDEEM')
    expect(types).toContain('WATCHLIST')
    expect(actions).toHaveLength(3)
  })
})

describe('VAULTED state — packContext=true', () => {
  it('includes OPEN_PACK action when packContext is true', () => {
    const actions = computeEligibleActions(makeVaultedInput({}, { packContext: true }))
    const types = actions.map((a) => a.type)
    expect(types).toContain('OPEN_PACK')
  })

  it('returns 5 actions total with OPEN_PACK (BUYBACK, LIST, REDEEM, OPEN_PACK, WATCHLIST)', () => {
    const actions = computeEligibleActions(makeVaultedInput({}, { packContext: true }))
    expect(actions).toHaveLength(5)
  })

  it('every action validates against ActionSchema when packContext=true', () => {
    const actions = computeEligibleActions(makeVaultedInput({}, { packContext: true }))
    for (const action of actions) {
      expect(() => ActionSchema.parse(action)).not.toThrow()
    }
  })
})

describe('VAULTED state — action params', () => {
  it('BUYBACK params have estimatedBuybackValue and priceConfidence', () => {
    const actions = computeEligibleActions(makeVaultedInput({ estimatedValue: 850 }))
    const buyback = actions.find((a) => a.type === 'BUYBACK')
    expect(buyback).toBeDefined()
    expect(buyback!.params).toMatchObject({
      estimatedBuybackValue: 850,
      priceConfidence: 'LIVE',
    })
  })

  it('LIST params have suggestedPrice, priceConfidence, currency=USD', () => {
    const actions = computeEligibleActions(makeVaultedInput({ estimatedValue: 850 }))
    const list = actions.find((a) => a.type === 'LIST')
    expect(list).toBeDefined()
    expect(list!.params).toMatchObject({
      suggestedPrice: 850,
      priceConfidence: 'LIVE',
      currency: 'USD',
    })
  })

  it('REDEEM params have certNumber matching input card certNumber', () => {
    const actions = computeEligibleActions(makeVaultedInput({ certNumber: 'CERT-12345' }))
    const redeem = actions.find((a) => a.type === 'REDEEM')
    expect(redeem).toBeDefined()
    expect(redeem!.params).toMatchObject({ certNumber: 'CERT-12345' })
  })

  it('WATCHLIST has null risk_notes for LIVE price (low-risk action)', () => {
    const actions = computeEligibleActions(makeVaultedInput())
    const watchlist = actions.find((a) => a.type === 'WATCHLIST')
    expect(watchlist).toBeDefined()
    expect(watchlist!.risk_notes).toBeNull()
  })

  it('REDEEM has null risk_notes (always safe)', () => {
    const actions = computeEligibleActions(makeVaultedInput())
    const redeem = actions.find((a) => a.type === 'REDEEM')
    expect(redeem).toBeDefined()
    expect(redeem!.risk_notes).toBeNull()
  })
})

describe('VAULTED state — ui_copy with card-specific data', () => {
  it('BUYBACK ui_copy contains the estimated value as price (~$850)', () => {
    const actions = computeEligibleActions(makeVaultedInput({ estimatedValue: 850 }))
    const buyback = actions.find((a) => a.type === 'BUYBACK')
    expect(buyback).toBeDefined()
    expect(buyback!.ui_copy).toContain('850')
  })

  it('LIST ui_copy contains the estimated value as price (~$850)', () => {
    const actions = computeEligibleActions(makeVaultedInput({ estimatedValue: 850 }))
    const list = actions.find((a) => a.type === 'LIST')
    expect(list).toBeDefined()
    expect(list!.ui_copy).toContain('850')
  })
})

describe('VAULTED state — null estimatedValue handling', () => {
  it('skips BUYBACK when estimatedValue is null', () => {
    const actions = computeEligibleActions(makeVaultedInput({ estimatedValue: null, priceConfidence: 'LIVE' }))
    const types = actions.map((a) => a.type)
    expect(types).not.toContain('BUYBACK')
  })

  it('still includes REDEEM and WATCHLIST when estimatedValue is null', () => {
    const actions = computeEligibleActions(makeVaultedInput({ estimatedValue: null, priceConfidence: 'LIVE' }))
    const types = actions.map((a) => a.type)
    expect(types).toContain('REDEEM')
    expect(types).toContain('WATCHLIST')
  })
})
