import { describe, it, expect } from 'vitest'
import { CardAnalysisSchema } from '../llm/card-analysis.js'
import { CardAnalysisResponseSchema } from '../api/card-analysis.js'

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

  // Missing required fields
  it('rejects missing identity_tags', () => {
    const { identity_tags, ...rest } = validInput
    const result = CardAnalysisSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing rarity_signal', () => {
    const { rarity_signal, ...rest } = validInput
    const result = CardAnalysisSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing liquidity_signal', () => {
    const { liquidity_signal, ...rest } = validInput
    const result = CardAnalysisSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing reasoning_bullets', () => {
    const { reasoning_bullets, ...rest } = validInput
    const result = CardAnalysisSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing confidence', () => {
    const { confidence, ...rest } = validInput
    const result = CardAnalysisSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing price_band (not provided at all)', () => {
    const { price_band, ...rest } = validInput
    const result = CardAnalysisSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  // Wrong types
  it('rejects string in identity_tags (expects array)', () => {
    const result = CardAnalysisSchema.safeParse({ ...validInput, identity_tags: 'pokemon' })
    expect(result.success).toBe(false)
  })

  it('rejects number for rarity_signal (expects string)', () => {
    const result = CardAnalysisSchema.safeParse({ ...validInput, rarity_signal: 42 })
    expect(result.success).toBe(false)
  })

  it('rejects number for liquidity_signal (expects string)', () => {
    const result = CardAnalysisSchema.safeParse({ ...validInput, liquidity_signal: 99 })
    expect(result.success).toBe(false)
  })

  it('rejects string for price_band.low (expects number)', () => {
    const result = CardAnalysisSchema.safeParse({
      ...validInput,
      price_band: { low: 'one hundred', high: 250, currency: 'USD' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects string for price_band.high (expects number)', () => {
    const result = CardAnalysisSchema.safeParse({
      ...validInput,
      price_band: { low: 100, high: 'two fifty', currency: 'USD' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects string[] for reasoning_bullets elements: non-string in array', () => {
    const result = CardAnalysisSchema.safeParse({ ...validInput, reasoning_bullets: [42, 'text'] })
    expect(result.success).toBe(false)
  })

  // Enum validation
  it('rejects confidence=VERY_HIGH (not in enum)', () => {
    const result = CardAnalysisSchema.safeParse({ ...validInput, confidence: 'VERY_HIGH' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })

  it('accepts confidence=MEDIUM', () => {
    const result = CardAnalysisSchema.safeParse({ ...validInput, confidence: 'MEDIUM' })
    expect(result.success).toBe(true)
  })

  it('accepts confidence=LOW', () => {
    const result = CardAnalysisSchema.safeParse({ ...validInput, confidence: 'LOW' })
    expect(result.success).toBe(true)
  })
})

describe('CardAnalysisResponseSchema (API)', () => {
  const validAction = {
    type: 'BUYBACK' as const,
    params: { price: 100 },
    ui_copy: 'Sell this card back for $100',
    risk_notes: null,
  }

  const validResponse = {
    card_id: 'card-123',
    identity_tags: ['pokemon', 'charizard'],
    rarity_signal: 'ultra_rare',
    liquidity_signal: 'high',
    price_band: { low: 100, high: 250, currency: 'USD' },
    reasoning_bullets: ['Base set Charizard'],
    confidence: 'HIGH' as const,
    actions: [validAction],
    priceConfidence: 'LIVE' as const,
    priceFetchedAt: '2026-03-01T00:00:00Z',
    narrative: {
      mode: 'BASIC' as const,
      headline: 'Ultra rare Charizard with high demand',
      bullets: ['Base set in mint condition'],
    },
  }

  it('accepts a valid API response with required actions field', () => {
    const result = CardAnalysisResponseSchema.safeParse(validResponse)
    expect(result.success).toBe(true)
  })

  it('rejects response missing the actions field', () => {
    const { actions, ...rest } = validResponse
    const result = CardAnalysisResponseSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects response missing priceConfidence field', () => {
    const { priceConfidence, ...rest } = validResponse
    const result = CardAnalysisResponseSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('accepts degraded=true as optional field', () => {
    const result = CardAnalysisResponseSchema.safeParse({ ...validResponse, degraded: true })
    expect(result.success).toBe(true)
  })

  it('accepts response without degraded field (degraded is optional)', () => {
    const result = CardAnalysisResponseSchema.safeParse(validResponse)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.degraded).toBeUndefined()
    }
  })

  it('accepts priceFetchedAt=null (nullable)', () => {
    const result = CardAnalysisResponseSchema.safeParse({ ...validResponse, priceFetchedAt: null })
    expect(result.success).toBe(true)
  })

  it('accepts actions=[] (empty actions array)', () => {
    const result = CardAnalysisResponseSchema.safeParse({ ...validResponse, actions: [] })
    expect(result.success).toBe(true)
  })

  it('rejects response where actions contains invalid action type', () => {
    const invalidAction = { ...validAction, type: 'INVALID_TYPE' }
    const result = CardAnalysisResponseSchema.safeParse({ ...validResponse, actions: [invalidAction] })
    expect(result.success).toBe(false)
  })
})
