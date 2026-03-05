import type { PortfolioBreakdown } from './types'

export interface Goal {
  title: string
  current: number
  target: number
  percent: number
  suggestedAction: 'OPEN_PACK' | 'WATCHLIST'
}

const IP_TARGET = 10
const VARIANT_TARGET = 5

export function computeGoals(breakdown: PortfolioBreakdown[]): Goal[] {
  const goals: Goal[] = []

  for (const entry of breakdown) {
    if (entry.cardCount >= 3) {
      goals.push({
        title: `Build your ${entry.ipCategory} collection`,
        current: entry.cardCount,
        target: IP_TARGET,
        percent: Math.min(100, Math.round((entry.cardCount / IP_TARGET) * 100)),
        suggestedAction: 'OPEN_PACK',
      })
    }
  }

  // Variant chase: categories with 2+ cards that have low individual value suggest variant hunting
  const variantCandidates = breakdown.filter(
    (b) => b.cardCount >= 2 && b.percentOfPortfolio < 30
  )
  for (const entry of variantCandidates.slice(0, 2)) {
    goals.push({
      title: `Complete ${entry.ipCategory} variant chase`,
      current: entry.cardCount,
      target: VARIANT_TARGET,
      percent: Math.min(
        100,
        Math.round((entry.cardCount / VARIANT_TARGET) * 100)
      ),
      suggestedAction: 'WATCHLIST',
    })
  }

  return goals.slice(0, 4)
}
