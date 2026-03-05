import { describe, it, expect } from 'vitest'
import { buildBasicPortfolioCommentary, buildBasicCardNarrative } from '../basic.js'
import type { Action } from '@tcg/schemas'

function makeAction(type: Action['type'], ui_copy: string): Action {
  return { type, params: {}, ui_copy, risk_notes: null }
}

describe('buildBasicPortfolioCommentary', () => {
  const baseCtx = {
    totalValueEst: 5000,
    breakdown: [
      { ipCategory: 'Pokemon', totalValue: 3000, cardCount: 30, percentOfPortfolio: 0.6 },
      { ipCategory: 'Yu-Gi-Oh', totalValue: 2000, cardCount: 20, percentOfPortfolio: 0.4 },
    ],
    priceConfidence: 'LIVE',
    liquidityScore: 0.8,
    concentrationScore: 0.6,
  }

  it('returns mode BASIC', () => {
    const result = buildBasicPortfolioCommentary(baseCtx, [])
    expect(result.mode).toBe('BASIC')
  })

  it('headline mentions top IP when breakdown exists', () => {
    const result = buildBasicPortfolioCommentary(baseCtx, [])
    expect(result.headline).toContain('Pokemon')
    expect(result.headline).toContain('60%')
  })

  it('headline is generic when breakdown is empty', () => {
    const result = buildBasicPortfolioCommentary({ ...baseCtx, breakdown: [] }, [])
    expect(result.headline).toContain('$5,000')
  })

  it('includes bullets with value and IP count', () => {
    const result = buildBasicPortfolioCommentary(baseCtx, [])
    expect(result.bullets.length).toBeGreaterThanOrEqual(3)
    expect(result.bullets[1]).toContain('2 IP categories')
  })

  it('includes top action in bullets when actions provided', () => {
    const actions = [makeAction('BUYBACK', 'Sell back for $100')]
    const result = buildBasicPortfolioCommentary(baseCtx, actions)
    expect(result.bullets.some(b => b.includes('Sell back for $100'))).toBe(true)
  })

  it('generates next_best_moves from top 3 ranked actions', () => {
    const actions = [
      makeAction('BUYBACK', 'Sell back'),
      makeAction('LIST', 'List on market'),
      makeAction('WATCHLIST', 'Watch this'),
      makeAction('REDEEM', 'Redeem now'),
    ]
    const result = buildBasicPortfolioCommentary(baseCtx, actions)
    expect(result.next_best_moves).toHaveLength(3)
    expect(result.next_best_moves[0].action.type).toBe('BUYBACK')
  })

  it('next_best_moves is empty when no actions', () => {
    const result = buildBasicPortfolioCommentary(baseCtx, [])
    expect(result.next_best_moves).toHaveLength(0)
  })
})

describe('buildBasicCardNarrative', () => {
  const baseCtx = {
    card_id: 'card-1',
    identity_tags: ['holo', 'first-edition'],
    rarity_signal: 'Ultra Rare',
    liquidity_signal: 'High',
    price_band: { low: 100, high: 250, currency: 'USD' } as { low: number; high: number; currency: string } | null,
    actions: [makeAction('BUYBACK', 'Sell back for $100')],
  }

  it('returns mode BASIC', () => {
    const result = buildBasicCardNarrative(baseCtx)
    expect(result.mode).toBe('BASIC')
  })

  it('headline includes price range when price_band exists', () => {
    const result = buildBasicCardNarrative(baseCtx)
    expect(result.headline).toContain('$100')
    expect(result.headline).toContain('$250')
  })

  it('headline mentions rarity and liquidity when no price_band', () => {
    const result = buildBasicCardNarrative({ ...baseCtx, price_band: null })
    expect(result.headline).toContain('ultra rare')
    expect(result.headline).toContain('high')
  })

  it('headline includes identity tags', () => {
    const result = buildBasicCardNarrative(baseCtx)
    expect(result.headline).toContain('holo, first-edition')
  })

  it('uses "untagged" when identity_tags is empty', () => {
    const result = buildBasicCardNarrative({ ...baseCtx, identity_tags: [] })
    expect(result.headline).toContain('untagged')
  })

  it('bullets include rarity and liquidity', () => {
    const result = buildBasicCardNarrative(baseCtx)
    expect(result.bullets[0]).toContain('Ultra Rare')
    expect(result.bullets[0]).toContain('High')
  })

  it('bullets include price range when available', () => {
    const result = buildBasicCardNarrative(baseCtx)
    expect(result.bullets.some(b => b.includes('$100') && b.includes('$250'))).toBe(true)
  })

  it('bullets include top action ui_copy', () => {
    const result = buildBasicCardNarrative(baseCtx)
    expect(result.bullets.some(b => b.includes('Sell back for $100'))).toBe(true)
  })

  it('populates what_people_do from actions', () => {
    const actions = [
      makeAction('BUYBACK', 'Sell back'),
      makeAction('LIST', 'List it'),
      makeAction('WATCHLIST', 'Watch it'),
      makeAction('REDEEM', 'Redeem'),
    ]
    const result = buildBasicCardNarrative({ ...baseCtx, actions })
    expect(result.what_people_do).toEqual(['Sell back', 'List it', 'Watch it'])
  })

  it('what_people_do is empty when no actions', () => {
    const result = buildBasicCardNarrative({ ...baseCtx, actions: [] })
    expect(result.what_people_do).toEqual([])
  })
})
