import { describe, it, expect } from 'vitest'
import { ActionSchema, ActionTypeSchema } from '../llm/action.js'

describe('ActionTypeSchema', () => {
  const allTypes = ['BUYBACK', 'LIST', 'REDEEM', 'SHIP_TO_VAULT', 'OPEN_PACK', 'WATCHLIST', 'BUNDLE_SHIP']

  it.each(allTypes)('accepts valid action type: %s', (type) => {
    expect(ActionTypeSchema.safeParse(type).success).toBe(true)
  })

  it('rejects unknown action type', () => {
    expect(ActionTypeSchema.safeParse('TRADE').success).toBe(false)
  })
})

describe('ActionSchema', () => {
  const validAction = {
    type: 'BUYBACK' as const,
    params: { price: 100 },
    ui_copy: 'Sell this card back for $100',
    risk_notes: 'Price may fluctuate',
  }

  it('accepts a valid action', () => {
    expect(ActionSchema.safeParse(validAction).success).toBe(true)
  })

  it('accepts null params', () => {
    expect(ActionSchema.safeParse({ ...validAction, params: null }).success).toBe(true)
  })

  it('accepts null risk_notes', () => {
    expect(ActionSchema.safeParse({ ...validAction, risk_notes: null }).success).toBe(true)
  })

  it('rejects missing ui_copy', () => {
    const { ui_copy, ...rest } = validAction
    expect(ActionSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects unknown action type', () => {
    expect(ActionSchema.safeParse({ ...validAction, type: 'TRADE' }).success).toBe(false)
  })
})
