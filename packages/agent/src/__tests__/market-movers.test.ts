import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computeMarketMovers } from '../services/market-movers.js'

vi.mock('@tcg/db', () => ({
  prisma: {
    cardPriceHistory: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@tcg/db'

const mockFindMany = vi.mocked(prisma.cardPriceHistory.findMany)

function makeRow(cardKey: string, price: number, daysAgo: number) {
  const date = new Date(Date.now() - daysAgo * 86400000)
  return {
    id: `${cardKey}-${daysAgo}`,
    cardKey,
    asOfDate: date,
    marketPriceUsd: price,
    confidence: 'HIGH',
    source: 'seed',
    createdAt: date,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('computeMarketMovers', () => {
  it('returns top gainers sorted by change_pct descending', async () => {
    // First call: latest rows (desc order)
    // Second call: historical rows around comparison date
    mockFindMany
      .mockResolvedValueOnce([
        makeRow('Charizard PSA10', 500, 0),
        makeRow('Luffy PSA10', 300, 0),
        makeRow('Pikachu PSA10', 100, 0),
      ] as never)
      .mockResolvedValueOnce([
        makeRow('Charizard PSA10', 400, 7),
        makeRow('Luffy PSA10', 200, 7),
        makeRow('Pikachu PSA10', 110, 7),
      ] as never)

    const result = await computeMarketMovers('7d')

    expect(result.top_gainers.length).toBe(2) // Luffy +50%, Charizard +25%
    expect(result.top_gainers[0].card_key).toBe('Luffy PSA10')
    expect(result.top_gainers[0].change_pct).toBeCloseTo(0.5)
    expect(result.top_gainers[1].card_key).toBe('Charizard PSA10')
    expect(result.top_gainers[1].change_pct).toBeCloseTo(0.25)
  })

  it('returns top losers sorted by change_pct ascending', async () => {
    mockFindMany
      .mockResolvedValueOnce([
        makeRow('Card A', 80, 0),
        makeRow('Card B', 90, 0),
      ] as never)
      .mockResolvedValueOnce([
        makeRow('Card A', 100, 7),
        makeRow('Card B', 100, 7),
      ] as never)

    const result = await computeMarketMovers('7d')

    expect(result.top_losers.length).toBe(2)
    expect(result.top_losers[0].card_key).toBe('Card A') // -20%
    expect(result.top_losers[0].change_pct).toBeCloseTo(-0.2)
    expect(result.top_losers[1].card_key).toBe('Card B') // -10%
    expect(result.top_losers[1].change_pct).toBeCloseTo(-0.1)
  })

  it('returns most_valuable sorted by price descending', async () => {
    mockFindMany
      .mockResolvedValueOnce([
        makeRow('Cheap Card', 50, 0),
        makeRow('Mid Card', 200, 0),
        makeRow('Expensive Card', 1000, 0),
      ] as never)
      .mockResolvedValueOnce([] as never) // no historical data

    const result = await computeMarketMovers('7d')

    expect(result.most_valuable.length).toBe(3)
    expect(result.most_valuable[0].title).toBe('Expensive Card')
    expect(result.most_valuable[0].price).toBe(1000)
    expect(result.most_valuable[1].title).toBe('Mid Card')
    expect(result.most_valuable[2].title).toBe('Cheap Card')
  })

  it('computes correct delta for 24h range', async () => {
    mockFindMany
      .mockResolvedValueOnce([
        makeRow('Card X', 120, 0),
      ] as never)
      .mockResolvedValueOnce([
        makeRow('Card X', 100, 1),
      ] as never)

    const result = await computeMarketMovers('24h')

    expect(result.top_gainers.length).toBe(1)
    expect(result.top_gainers[0].change_pct).toBeCloseTo(0.2)
    expect(result.top_gainers[0].price).toBe(120)
  })

  it('returns empty arrays when no price data exists', async () => {
    mockFindMany.mockResolvedValue([] as never)

    const result = await computeMarketMovers('7d')

    expect(result.top_gainers).toEqual([])
    expect(result.top_losers).toEqual([])
    expect(result.most_valuable).toEqual([])
  })

  it('limits results to 10 items each', async () => {
    const latestRows = Array.from({ length: 20 }, (_, i) =>
      makeRow(`Card ${i}`, 100 + i * 10, 0)
    )
    const historicalRows = Array.from({ length: 20 }, (_, i) =>
      makeRow(`Card ${i}`, 80, 7)
    )

    mockFindMany
      .mockResolvedValueOnce(latestRows as never)
      .mockResolvedValueOnce(historicalRows as never)

    const result = await computeMarketMovers('7d')

    expect(result.top_gainers.length).toBeLessThanOrEqual(10)
    expect(result.most_valuable.length).toBeLessThanOrEqual(10)
  })

  it('excludes cards with zero old price from movers', async () => {
    mockFindMany
      .mockResolvedValueOnce([makeRow('Card Z', 100, 0)] as never)
      .mockResolvedValueOnce([
        { ...makeRow('Card Z', 0, 7), marketPriceUsd: 0 },
      ] as never)

    const result = await computeMarketMovers('7d')

    // zero old price should be excluded (division by zero)
    expect(result.top_gainers.length).toBe(0)
    expect(result.top_losers.length).toBe(0)
  })
})
