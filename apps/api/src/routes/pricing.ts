import type { FastifyInstance } from 'fastify'
import { prisma } from '@tcg/db'
import { getCardPrice } from '@tcg/agent'

// ─── Helpers ────────────────────────────────────────────────────────────────

function rangeToDate(range: string): Date {
  const now = new Date()
  switch (range) {
    case '30d': return new Date(now.getTime() - 30 * 86400000)
    case '90d': return new Date(now.getTime() - 90 * 86400000)
    case '1y': return new Date(now.getTime() - 365 * 86400000)
    default: return new Date(now.getTime() - 30 * 86400000)
  }
}

function computeChange(latest: number | null, past: number | null): number | null {
  if (latest == null || past == null || past === 0) return null
  return (latest - past) / past
}

function findClosestPrice(
  points: Array<{ asOfDate: Date; marketPriceUsd: number | null }>,
  targetDate: Date
): number | null {
  let closest: { asOfDate: Date; marketPriceUsd: number | null } | null = null
  let closestDiff = Infinity
  for (const p of points) {
    const diff = Math.abs(p.asOfDate.getTime() - targetDate.getTime())
    if (diff < closestDiff) {
      closestDiff = diff
      closest = p
    }
  }
  return closest?.marketPriceUsd ?? null
}

// ─── Routes ─────────────────────────────────────────────────────────────────

export async function pricingRoutes(fastify: FastifyInstance) {
  // GET /pricing/history/:cardKey?range=30d|90d|1y
  fastify.get('/pricing/history/:cardKey', async (request, reply) => {
    const { cardKey } = request.params as { cardKey: string }
    const query = request.query as { range?: string }
    const range = query.range || '30d'

    if (!['30d', '90d', '1y'].includes(range)) {
      return reply.code(400).send({
        error: { code: 'INVALID_RANGE', message: 'range must be 30d, 90d, or 1y' },
      })
    }

    const sinceDate = rangeToDate(range)

    const points = await prisma.cardPriceHistory.findMany({
      where: { cardKey, asOfDate: { gte: sinceDate } },
      orderBy: { asOfDate: 'asc' },
    })

    const now = new Date()
    const latestPrice = points.length > 0 ? points[points.length - 1].marketPriceUsd : null

    const price1dAgo = findClosestPrice(points, new Date(now.getTime() - 1 * 86400000))
    const price7dAgo = findClosestPrice(points, new Date(now.getTime() - 7 * 86400000))
    const price30dAgo = findClosestPrice(points, new Date(now.getTime() - 30 * 86400000))

    request.log.info(
      { endpoint: '/pricing/history', card_key: cardKey, range, points_count: points.length },
      'price_history_served'
    )

    return reply.code(200).send({
      card_key: cardKey,
      range,
      points: points.map((p) => ({
        as_of: p.asOfDate.toISOString().split('T')[0],
        price_usd: p.marketPriceUsd,
      })),
      change_1d: computeChange(latestPrice, price1dAgo),
      change_7d: computeChange(latestPrice, price7dAgo),
      change_30d: computeChange(latestPrice, price30dAgo),
    })
  })

  // GET /portfolio/changes?range=7d|30d
  fastify.get('/portfolio/changes', async (request, reply) => {
    const userId = request.headers['x-user-id']
    if (!userId || typeof userId !== 'string') {
      return reply.code(401).send({ error: { code: 'MISSING_AUTH', message: 'X-User-Id header required' } })
    }

    const query = request.query as { range?: string }
    const range = query.range || '7d'
    if (!['7d', '30d'].includes(range)) {
      return reply.code(400).send({
        error: { code: 'INVALID_RANGE', message: 'range must be 7d or 30d' },
      })
    }

    const daysBack = range === '7d' ? 7 : 30

    // Get all card keys in user portfolio
    const [userCards, externalCards] = await Promise.all([
      prisma.userCard.findMany({
        where: { userId, deletedAt: null },
        include: { card: true },
      }),
      prisma.externalCard.findMany({
        where: { userId, deletedAt: null },
      }),
    ])

    const cardKeyMap = new Map<string, { title: string }>()
    for (const uc of userCards) {
      cardKeyMap.set(uc.card.name, { title: uc.card.name })
    }
    for (const ec of externalCards) {
      if (!cardKeyMap.has(ec.name)) {
        cardKeyMap.set(ec.name, { title: ec.name })
      }
    }

    const cardKeys = Array.from(cardKeyMap.keys())

    // Current prices (from pricing service cache / live)
    const currentPrices = await Promise.all(
      cardKeys.map(async (key) => {
        const p = await getCardPrice(key)
        return { key, price: p.market_price }
      })
    )

    // Historical prices from CardPriceHistory
    const targetDate = new Date(Date.now() - daysBack * 86400000)
    const historicalRows = cardKeys.length > 0
      ? await prisma.cardPriceHistory.findMany({
          where: {
            cardKey: { in: cardKeys },
            asOfDate: { gte: new Date(targetDate.getTime() - 2 * 86400000), lte: new Date(targetDate.getTime() + 2 * 86400000) },
          },
        })
      : []

    // Build historical price map (closest to target date per cardKey)
    const historicalMap = new Map<string, number | null>()
    for (const row of historicalRows) {
      const existing = historicalMap.get(row.cardKey)
      if (existing === undefined) {
        historicalMap.set(row.cardKey, row.marketPriceUsd)
      }
    }

    // Compute totals and movers
    let portfolioValueToday = 0
    let portfolioValueThen = 0
    let coveredCount = 0
    const movers: Array<{ card_key: string; title: string; delta_usd: number; delta_pct: number | null }> = []

    for (const { key, price } of currentPrices) {
      const currentPrice = price ?? 0
      portfolioValueToday += currentPrice

      const historicalPrice = historicalMap.get(key)
      if (historicalPrice != null) {
        portfolioValueThen += historicalPrice
        coveredCount++
        const deltaUsd = currentPrice - historicalPrice
        const deltaPct = historicalPrice !== 0 ? deltaUsd / historicalPrice : null
        movers.push({
          card_key: key,
          title: cardKeyMap.get(key)?.title ?? key,
          delta_usd: deltaUsd,
          delta_pct: deltaPct,
        })
      }
    }

    // Sort by absolute delta, take top 5
    movers.sort((a, b) => Math.abs(b.delta_usd) - Math.abs(a.delta_usd))
    const topMovers = movers.slice(0, 5)

    const coveragePct = cardKeys.length > 0 ? coveredCount / cardKeys.length : 0
    const hasCoverage = coveredCount > 0

    request.log.info(
      { endpoint: '/portfolio/changes', user_id: userId, range, card_count: cardKeys.length, coverage_pct: coveragePct },
      'portfolio_changes_served'
    )

    return reply.code(200).send({
      range,
      portfolio_value_today_usd: portfolioValueToday,
      portfolio_value_then_usd: hasCoverage ? portfolioValueThen : null,
      delta_usd: hasCoverage ? portfolioValueToday - portfolioValueThen : null,
      delta_pct: hasCoverage && portfolioValueThen !== 0
        ? (portfolioValueToday - portfolioValueThen) / portfolioValueThen
        : null,
      coverage_pct: coveragePct,
      top_movers: topMovers,
    })
  })
}
