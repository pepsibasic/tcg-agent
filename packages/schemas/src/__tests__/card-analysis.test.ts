import { describe, it, expect } from 'vitest'
import { CardAnalysisSchema } from '../llm/card-analysis.js'

describe('CardAnalysisSchema', () => {
  const validInput = {
    card_id: 'card-123',
    identity_tags: ['pokemon', 'charizard', 'base-set'],
    rarity_signal: 'ultra_rare',
    liquidity_signal: 'high',
    price_band: { low: 100, high: 250, currency: 'USD' },
    reasoning_bullets: ['Base set Charizard in mint condition', 'High demand among collectors'],
    confidence: 'HIGH' as const,
  }

  it('accepts a valid card analysis', () => {
    const result = CardAnalysisSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('accepts null price_band', () => {
    const result = CardAnalysisSchema.safeParse({ ...validInput, price_band: null })
    expect(result.success).toBe(true)
  })

  it('rejects missing card_id', () => {
    const { card_id, ...rest } = validInput
    const result = CardAnalysisSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects invalid confidence value', () => {
    const result = CardAnalysisSchema.safeParse({ ...validInput, confidence: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('rejects price_band with missing currency', () => {
    const result = CardAnalysisSchema.safeParse({
      ...validInput,
      price_band: { low: 100, high: 250 },
    })
    expect(result.success).toBe(false)
  })
})
