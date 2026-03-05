import { describe, it, expect } from 'vitest'

// Pure function implementations for testing (mirrored from frontend)
function computeTrend(
  prices: (number | null)[],
  change7d: number | null
): { label: string } {
  const valid = prices.filter((p): p is number => p != null)
  if (valid.length < 3) return { label: 'INSUFFICIENT DATA' }

  const last7 = valid.slice(-7)
  const avg7 = last7.reduce((s, v) => s + v, 0) / last7.length
  const latest = valid[valid.length - 1]

  if (latest > avg7 && change7d != null && change7d > 0.03)
    return { label: 'UP' }
  if (latest < avg7 && change7d != null && change7d < -0.03)
    return { label: 'DOWN' }
  return { label: 'RANGE' }
}

function computeVolatility(prices: (number | null)[]): { label: string } {
  const valid = prices.filter((p): p is number => p != null)
  if (valid.length < 5) return { label: 'N/A' }

  const returns: number[] = []
  for (let i = 1; i < valid.length; i++) {
    if (valid[i - 1] > 0) {
      returns.push((valid[i] - valid[i - 1]) / valid[i - 1])
    }
  }
  if (returns.length === 0) return { label: 'N/A' }

  const mean = returns.reduce((s, v) => s + v, 0) / returns.length
  const variance =
    returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length
  const stddev = Math.sqrt(variance)

  if (stddev < 0.02) return { label: 'LOW' }
  if (stddev < 0.06) return { label: 'MEDIUM' }
  return { label: 'HIGH' }
}

describe('computeTrend', () => {
  it('returns UP when price above avg and 7d > +3%', () => {
    const prices = [100, 102, 104, 106, 108, 110, 112, 115]
    expect(computeTrend(prices, 0.05)).toEqual({ label: 'UP' })
  })

  it('returns DOWN when price below avg and 7d < -3%', () => {
    const prices = [110, 108, 106, 104, 102, 100, 98, 95]
    expect(computeTrend(prices, -0.05)).toEqual({ label: 'DOWN' })
  })

  it('returns RANGE when no clear trend', () => {
    const prices = [100, 102, 101, 100, 101, 100, 101]
    expect(computeTrend(prices, 0.01)).toEqual({ label: 'RANGE' })
  })

  it('returns INSUFFICIENT DATA with < 3 points', () => {
    expect(computeTrend([100, 200], 0.1)).toEqual({
      label: 'INSUFFICIENT DATA',
    })
  })

  it('handles null values in prices', () => {
    const prices: (number | null)[] = [null, 100, 102, 104, null, 108, 110]
    expect(computeTrend(prices, 0.05)).toEqual({ label: 'UP' })
  })
})

describe('computeVolatility', () => {
  it('returns LOW for stable prices', () => {
    const prices = [100, 100.5, 100.2, 100.8, 100.3, 100.6]
    expect(computeVolatility(prices)).toEqual({ label: 'LOW' })
  })

  it('returns MEDIUM for moderate swings', () => {
    const prices = [100, 103, 98, 102, 99, 101]
    expect(computeVolatility(prices)).toEqual({ label: 'MEDIUM' })
  })

  it('returns HIGH for large swings', () => {
    const prices = [100, 115, 90, 120, 85, 110]
    expect(computeVolatility(prices)).toEqual({ label: 'HIGH' })
  })

  it('returns N/A with < 5 points', () => {
    expect(computeVolatility([100, 200, 300])).toEqual({ label: 'N/A' })
  })
})
