import { describe, it, expect } from 'vitest'
import { PortfolioSummarySchema } from '../llm/portfolio-summary.js'
import { PortfolioSummaryResponseSchema } from '../api/portfolio-summary.js'

describe('PortfolioSummarySchema', () => {
  const validSummary = {
    userId: 'user-456',
    totalValueEst: 5000,
    breakdown: [
      { ipCategory: 'Pokemon', totalValue: 3000, cardCount: 50, percentOfPortfolio: 0.6 },
      { ipCategory: 'Yu-Gi-Oh', totalValue: 2000, cardCount: 30, percentOfPortfolio: 0.4 },
    ],
    concentrationScore: 0.6,
    liquidityScore: 0.8,
    collectorArchetype: 'The Set Completionist',
    missingSetGoals: ['Base Set Charizard', 'Jungle Pikachu'],
    recommendedActions: ['Complete Base Set', 'Consider selling duplicates'],
    priceDataAsOf: '2026-03-01T00:00:00Z',
    priceConfidence: 'LIVE' as const,
  }

  it('accepts a valid portfolio summary', () => {
    expect(PortfolioSummarySchema.safeParse(validSummary).success).toBe(true)
  })

  it('accepts null collectorArchetype', () => {
    expect(PortfolioSummarySchema.safeParse({ ...validSummary, collectorArchetype: null }).success).toBe(true)
  })

  it('accepts null priceDataAsOf', () => {
    expect(PortfolioSummarySchema.safeParse({ ...validSummary, priceDataAsOf: null }).success).toBe(true)
  })

  it('rejects missing userId', () => {
    const { userId, ...rest } = validSummary
    expect(PortfolioSummarySchema.safeParse(rest).success).toBe(false)
  })

  it('rejects invalid priceConfidence', () => {
    expect(PortfolioSummarySchema.safeParse({ ...validSummary, priceConfidence: 'INVALID' }).success).toBe(false)
  })

  // Missing required fields
  it('rejects missing totalValueEst', () => {
    const { totalValueEst, ...rest } = validSummary
    const result = PortfolioSummarySchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing breakdown', () => {
    const { breakdown, ...rest } = validSummary
    const result = PortfolioSummarySchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing concentrationScore', () => {
    const { concentrationScore, ...rest } = validSummary
    const result = PortfolioSummarySchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing liquidityScore', () => {
    const { liquidityScore, ...rest } = validSummary
    const result = PortfolioSummarySchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing missingSetGoals', () => {
    const { missingSetGoals, ...rest } = validSummary
    const result = PortfolioSummarySchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing recommendedActions', () => {
    const { recommendedActions, ...rest } = validSummary
    const result = PortfolioSummarySchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing priceConfidence', () => {
    const { priceConfidence, ...rest } = validSummary
    const result = PortfolioSummarySchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  // Wrong types
  it('rejects string for totalValueEst (expects number)', () => {
    const result = PortfolioSummarySchema.safeParse({ ...validSummary, totalValueEst: 'five thousand' })
    expect(result.success).toBe(false)
  })

  it('rejects string for concentrationScore (expects number)', () => {
    const result = PortfolioSummarySchema.safeParse({ ...validSummary, concentrationScore: 'high' })
    expect(result.success).toBe(false)
  })

  it('rejects string for liquidityScore (expects number)', () => {
    const result = PortfolioSummarySchema.safeParse({ ...validSummary, liquidityScore: 'high' })
    expect(result.success).toBe(false)
  })

  it('rejects string for breakdown (expects array)', () => {
    const result = PortfolioSummarySchema.safeParse({ ...validSummary, breakdown: 'no categories' })
    expect(result.success).toBe(false)
  })

  it('rejects string for missingSetGoals (expects array)', () => {
    const result = PortfolioSummarySchema.safeParse({ ...validSummary, missingSetGoals: 'Base Set' })
    expect(result.success).toBe(false)
  })

  // Breakdown item validation
  it('rejects breakdown item missing ipCategory', () => {
    const result = PortfolioSummarySchema.safeParse({
      ...validSummary,
      breakdown: [{ totalValue: 3000, cardCount: 50, percentOfPortfolio: 0.6 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects breakdown item with wrong type for totalValue', () => {
    const result = PortfolioSummarySchema.safeParse({
      ...validSummary,
      breakdown: [{ ipCategory: 'Pokemon', totalValue: 'three thousand', cardCount: 50, percentOfPortfolio: 0.6 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects breakdown item missing cardCount', () => {
    const result = PortfolioSummarySchema.safeParse({
      ...validSummary,
      breakdown: [{ ipCategory: 'Pokemon', totalValue: 3000, percentOfPortfolio: 0.6 }],
    })
    expect(result.success).toBe(false)
  })

  // Enum validation for priceConfidence
  it('accepts priceConfidence=RECENT_24H', () => {
    expect(PortfolioSummarySchema.safeParse({ ...validSummary, priceConfidence: 'RECENT_24H' }).success).toBe(true)
  })

  it('accepts priceConfidence=STALE_7D', () => {
    expect(PortfolioSummarySchema.safeParse({ ...validSummary, priceConfidence: 'STALE_7D' }).success).toBe(true)
  })

  it('accepts priceConfidence=NO_DATA', () => {
    expect(PortfolioSummarySchema.safeParse({ ...validSummary, priceConfidence: 'NO_DATA' }).success).toBe(true)
  })

  it('rejects priceConfidence=UNKNOWN (not in enum)', () => {
    const result = PortfolioSummarySchema.safeParse({ ...validSummary, priceConfidence: 'UNKNOWN' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })
})

describe('PortfolioSummaryResponseSchema (API)', () => {
  const validResponse = {
    userId: 'user-456',
    totalValueEst: 5000,
    breakdown: [
      { ipCategory: 'Pokemon', totalValue: 3000, cardCount: 50, percentOfPortfolio: 0.6 },
    ],
    concentrationScore: 0.6,
    liquidityScore: 0.8,
    collectorArchetype: null,
    missingSetGoals: [],
    recommendedActions: ['Consider diversifying'],
    priceDataAsOf: null,
    priceConfidence: 'NO_DATA' as const,
  }

  it('accepts a valid PortfolioSummaryResponse (same shape as LLM schema)', () => {
    const result = PortfolioSummaryResponseSchema.safeParse(validResponse)
    expect(result.success).toBe(true)
  })

  it('rejects missing userId in PortfolioSummaryResponseSchema', () => {
    const { userId, ...rest } = validResponse
    const result = PortfolioSummaryResponseSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })
})
