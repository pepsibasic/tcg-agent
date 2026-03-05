import type { FastifyInstance } from 'fastify'
import { prisma } from '@tcg/db'

function getUserId(request: { headers: Record<string, string | string[] | undefined> }): string | null {
  const userId = request.headers['x-user-id']
  return typeof userId === 'string' ? userId : null
}

export async function watchlistRoutes(fastify: FastifyInstance) {
  // GET /watchlist
  fastify.get('/watchlist', async (request, reply) => {
    const userId = getUserId(request)
    if (!userId) return reply.code(401).send({ error: { code: 'MISSING_AUTH', message: 'X-User-Id header required' } })

    const items = await prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    if (items.length === 0) {
      return reply.code(200).send({ items: [] })
    }

    const cardKeys = items.map((i) => i.cardKey)
    const now = new Date()
    const since30d = new Date(now.getTime() - 30 * 86400000)
    const target7d = new Date(now.getTime() - 7 * 86400000)

    const allHistory = await prisma.cardPriceHistory.findMany({
      where: { cardKey: { in: cardKeys }, asOfDate: { gte: since30d }, marketPriceUsd: { not: null } },
      orderBy: { asOfDate: 'asc' },
    })

    // Group by cardKey
    const historyMap = new Map<string, Array<{ asOfDate: Date; marketPriceUsd: number }>>()
    for (const row of allHistory) {
      if (row.marketPriceUsd == null) continue
      const arr = historyMap.get(row.cardKey) ?? []
      arr.push({ asOfDate: row.asOfDate, marketPriceUsd: row.marketPriceUsd })
      historyMap.set(row.cardKey, arr)
    }

    const entries = items.map((item) => {
      const points = historyMap.get(item.cardKey) ?? []
      const latestPrice = points.length > 0 ? points[points.length - 1].marketPriceUsd : null

      // Find closest to 7d ago
      let price7d: number | null = null
      let closest7dDiff = Infinity
      for (const p of points) {
        const diff = Math.abs(p.asOfDate.getTime() - target7d.getTime())
        if (diff < closest7dDiff) {
          closest7dDiff = diff
          price7d = p.marketPriceUsd
        }
      }
      const change7d = latestPrice != null && price7d != null && price7d !== 0
        ? (latestPrice - price7d) / price7d
        : null

      const sparkline = points.map((p) => p.marketPriceUsd)

      return {
        card_key: item.cardKey,
        title: item.cardKey,
        latest_price_usd: latestPrice,
        change_7d: change7d,
        sparkline_30d: sparkline,
      }
    })

    request.log.info({ endpoint: '/watchlist', user_id: userId, count: entries.length }, 'watchlist_served')

    return reply.code(200).send({ items: entries })
  })

  // POST /watchlist
  fastify.post('/watchlist', async (request, reply) => {
    const userId = getUserId(request)
    if (!userId) return reply.code(401).send({ error: { code: 'MISSING_AUTH', message: 'X-User-Id header required' } })

    const body = request.body as { cardKey?: string }
    if (!body.cardKey || typeof body.cardKey !== 'string') {
      return reply.code(422).send({ error: { code: 'VALIDATION_ERROR', message: 'cardKey is required' } })
    }

    await prisma.watchlistItem.upsert({
      where: { userId_cardKey: { userId, cardKey: body.cardKey } },
      create: { userId, cardKey: body.cardKey },
      update: {},
    })

    request.log.info({ endpoint: '/watchlist', user_id: userId, card_key: body.cardKey }, 'watchlist_added')

    return reply.code(201).send({ status: 'added' })
  })

  // DELETE /watchlist/:cardKey
  fastify.delete('/watchlist/:cardKey', async (request, reply) => {
    const userId = getUserId(request)
    if (!userId) return reply.code(401).send({ error: { code: 'MISSING_AUTH', message: 'X-User-Id header required' } })

    const { cardKey } = request.params as { cardKey: string }

    await prisma.watchlistItem.deleteMany({
      where: { userId, cardKey },
    })

    request.log.info({ endpoint: '/watchlist', user_id: userId, card_key: cardKey }, 'watchlist_removed')

    return reply.code(204).send()
  })
}
