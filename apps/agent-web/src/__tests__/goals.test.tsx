import { describe, it, expect } from 'vitest'
import { computeGoals } from '@/lib/goals'
import type { PortfolioBreakdown } from '@/lib/types'

describe('computeGoals', () => {
  it('returns IP collection goal for categories with 3+ cards', () => {
    const breakdown: PortfolioBreakdown[] = [
      { ipCategory: 'Pokemon', totalValue: 800, cardCount: 5, percentOfPortfolio: 64 },
      { ipCategory: 'One Piece', totalValue: 200, cardCount: 2, percentOfPortfolio: 16 },
    ]

    const goals = computeGoals(breakdown)
    expect(goals.length).toBeGreaterThanOrEqual(1)

    const pokemonGoal = goals.find((g) => g.title.includes('Pokemon'))
    expect(pokemonGoal).toBeDefined()
    expect(pokemonGoal!.current).toBe(5)
    expect(pokemonGoal!.target).toBe(10)
    expect(pokemonGoal!.percent).toBe(50)
    expect(pokemonGoal!.suggestedAction).toBe('OPEN_PACK')
  })

  it('does not create IP goal for categories with < 3 cards', () => {
    const breakdown: PortfolioBreakdown[] = [
      { ipCategory: 'Lorcana', totalValue: 50, cardCount: 1, percentOfPortfolio: 100 },
    ]

    const goals = computeGoals(breakdown)
    const lorcanaGoal = goals.find((g) => g.title.includes('Lorcana'))
    expect(lorcanaGoal).toBeUndefined()
  })

  it('returns variant chase goals for categories with 2+ cards under 30% portfolio', () => {
    const breakdown: PortfolioBreakdown[] = [
      { ipCategory: 'Pokemon', totalValue: 800, cardCount: 5, percentOfPortfolio: 64 },
      { ipCategory: 'One Piece', totalValue: 200, cardCount: 3, percentOfPortfolio: 20 },
      { ipCategory: 'Digimon', totalValue: 100, cardCount: 2, percentOfPortfolio: 10 },
    ]

    const goals = computeGoals(breakdown)
    const variantGoals = goals.filter((g) => g.title.includes('variant chase'))
    expect(variantGoals.length).toBeGreaterThanOrEqual(1)
    expect(variantGoals[0].suggestedAction).toBe('WATCHLIST')
  })

  it('caps at 4 goals', () => {
    const breakdown: PortfolioBreakdown[] = Array.from({ length: 10 }, (_, i) => ({
      ipCategory: `IP-${i}`,
      totalValue: 100,
      cardCount: 5,
      percentOfPortfolio: 10,
    }))

    const goals = computeGoals(breakdown)
    expect(goals.length).toBeLessThanOrEqual(4)
  })

  it('returns empty array for empty breakdown', () => {
    expect(computeGoals([])).toEqual([])
  })
})
