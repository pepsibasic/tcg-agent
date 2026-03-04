import { describe, it, expect } from 'vitest'
import { PortfolioSummarySchema } from '../llm/portfolio-summary.js'

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
})
