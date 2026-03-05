import type { PortfolioSummaryResponse } from './types'

export interface WrappedData {
  totalValue: number
  topIp: string | null
  topIpPercent: number
  topCard: string | null
  topCardValue: number
}

export function computeWrapped(
  portfolio: PortfolioSummaryResponse
): WrappedData {
  const sorted = [...portfolio.breakdown].sort(
    (a, b) => b.percentOfPortfolio - a.percentOfPortfolio
  )
  const topEntry = sorted[0] || null

  // Highest value category doubles as "top card proxy" since we don't have individual cards
  const byValue = [...portfolio.breakdown].sort(
    (a, b) => b.totalValue - a.totalValue
  )
  const topByValue = byValue[0] || null

  return {
    totalValue: portfolio.totalValueEst,
    topIp: topEntry?.ipCategory || null,
    topIpPercent: topEntry?.percentOfPortfolio || 0,
    topCard: topByValue?.ipCategory || null,
    topCardValue: topByValue?.totalValue || 0,
  }
}
