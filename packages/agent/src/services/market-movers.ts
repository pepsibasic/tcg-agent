import { prisma } from '@tcg/db'

export interface MarketMover {
  card_key: string
  title: string
  price: number
  change_pct: number
}

export interface MarketMoverEntry {
  card_key: string
  title: string
  price: number
}

export interface MarketMoversResult {
  top_gainers: MarketMover[]
  top_losers: MarketMover[]
  most_valuable: MarketMoverEntry[]
}

/**
 * Compute market-wide movers from CardPriceHistory.
 *
 * 1. Get the latest price per card_key
 * 2. Get the comparison price (1d or 7d ago)
 * 3. Compute change_pct, sort, return top 10 each
 */
export async function computeMarketMovers(
  range: '24h' | '7d'
): Promise<MarketMoversResult> {
  const daysBack = range === '24h' ? 1 : 7
  const now = new Date()
  const comparisonDate = new Date(now.getTime() - daysBack * 86400000)

  // Get all distinct card keys that have recent data
  const latestRows = await prisma.cardPriceHistory.findMany({
    where: { marketPriceUsd: { not: null } },
    orderBy: { asOfDate: 'desc' },
  })

  // Build latest price map (first occurrence per cardKey is most recent due to desc sort)
  const latestMap = new Map<string, { price: number; asOfDate: Date }>()
  for (const row of latestRows) {
    if (row.marketPriceUsd == null) continue
    if (!latestMap.has(row.cardKey)) {
      latestMap.set(row.cardKey, { price: row.marketPriceUsd, asOfDate: row.asOfDate })
    }
  }

  // Get historical rows around the comparison date (+-2 days window)
  const cardKeys = Array.from(latestMap.keys())
  if (cardKeys.length === 0) {
    return { top_gainers: [], top_losers: [], most_valuable: [] }
  }

  const historicalRows = await prisma.cardPriceHistory.findMany({
    where: {
      cardKey: { in: cardKeys },
      asOfDate: {
        gte: new Date(comparisonDate.getTime() - 2 * 86400000),
        lte: new Date(comparisonDate.getTime() + 2 * 86400000),
      },
      marketPriceUsd: { not: null },
    },
  })

  // Build comparison price map (closest to target date per cardKey)
  const comparisonMap = new Map<string, number>()
  const comparisonDiff = new Map<string, number>()
  for (const row of historicalRows) {
    if (row.marketPriceUsd == null) continue
    const diff = Math.abs(row.asOfDate.getTime() - comparisonDate.getTime())
    const existingDiff = comparisonDiff.get(row.cardKey)
    if (existingDiff === undefined || diff < existingDiff) {
      comparisonMap.set(row.cardKey, row.marketPriceUsd)
      comparisonDiff.set(row.cardKey, diff)
    }
  }

  // Compute deltas
  const movers: MarketMover[] = []
  for (const [cardKey, latest] of latestMap) {
    const oldPrice = comparisonMap.get(cardKey)
    if (oldPrice == null || oldPrice === 0) continue
    const changePct = (latest.price - oldPrice) / oldPrice
    movers.push({
      card_key: cardKey,
      title: cardKey, // cardKey is the card name
      price: latest.price,
      change_pct: changePct,
    })
  }

  // Sort for gainers (highest change_pct first)
  const sortedGainers = [...movers]
    .filter((m) => m.change_pct > 0)
    .sort((a, b) => b.change_pct - a.change_pct)
    .slice(0, 10)

  // Sort for losers (lowest change_pct first)
  const sortedLosers = [...movers]
    .filter((m) => m.change_pct < 0)
    .sort((a, b) => a.change_pct - b.change_pct)
    .slice(0, 10)

  // Most valuable by latest price
  const mostValuable: MarketMoverEntry[] = Array.from(latestMap.entries())
    .map(([cardKey, data]) => ({
      card_key: cardKey,
      title: cardKey,
      price: data.price,
    }))
    .sort((a, b) => b.price - a.price)
    .slice(0, 10)

  return {
    top_gainers: sortedGainers,
    top_losers: sortedLosers,
    most_valuable: mostValuable,
  }
}
