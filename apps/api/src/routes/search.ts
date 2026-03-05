import type { FastifyInstance } from 'fastify'
import { prisma } from '@tcg/db'

export async function searchRoutes(fastify: FastifyInstance) {
  // GET /search/cards?q=...&limit=20
  fastify.get('/search/cards', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string | undefined
    if (!userId) {
      return reply.code(401).send({ error: { code: 'MISSING_AUTH', message: 'X-User-Id header required' } })
    }

    const { q = '', limit: limitStr = '20' } = request.query as { q?: string; limit?: string }
    const query = q.trim()
    const limit = Math.min(Math.max(parseInt(limitStr, 10) || 20, 1), 50)

    if (query.length < 2) {
      return reply.code(200).send({ items: [], query, total: 0 })
    }

    // Search CardCatalog with case-insensitive contains
    const catalogResults = await prisma.cardCatalog.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { cardKey: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit * 2, // fetch extra for ranking
    })

    if (catalogResults.length === 0) {
      return reply.code(200).send({ items: [], query, total: 0 })
    }

    const cardKeys = catalogResults.map((c) => c.cardKey)

    // Get latest prices for matched cards
    const latestPrices = await prisma.$queryRaw<Array<{
      cardKey: string
      marketPriceUsd: number | null
      confidence: string
      asOfDate: Date
    }>>`
      SELECT DISTINCT ON ("cardKey") "cardKey", "marketPriceUsd", "confidence", "asOfDate"
      FROM "card_price_history"
      WHERE "cardKey" = ANY(${cardKeys})
      ORDER BY "cardKey", "asOfDate" DESC
    `

    // Get 7d ago prices for change calculation
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const oldPrices = await prisma.$queryRaw<Array<{
      cardKey: string
      marketPriceUsd: number | null
    }>>`
      SELECT DISTINCT ON ("cardKey") "cardKey", "marketPriceUsd"
      FROM "card_price_history"
      WHERE "cardKey" = ANY(${cardKeys})
        AND "asOfDate" <= ${sevenDaysAgo}
      ORDER BY "cardKey", "asOfDate" DESC
    `

    // Get user's watched cards
    const watched = await prisma.watchlistItem.findMany({
      where: { userId, cardKey: { in: cardKeys } },
      select: { cardKey: true },
    })
    const watchedSet = new Set(watched.map((w) => w.cardKey))

    // Build price maps
    const priceMap = new Map(latestPrices.map((p) => [p.cardKey, p]))
    const oldPriceMap = new Map(oldPrices.map((p) => [p.cardKey, p.marketPriceUsd]))

    // Rank results: exact prefix > contains, then by price desc
    const queryLower = query.toLowerCase()
    const ranked = catalogResults
      .map((cat) => {
        const price = priceMap.get(cat.cardKey)
        const oldPrice = oldPriceMap.get(cat.cardKey)
        const latestPrice = price?.marketPriceUsd ?? null
        const change7d = (latestPrice != null && oldPrice != null && oldPrice > 0)
          ? (latestPrice - oldPrice) / oldPrice
          : null

        const titleLower = cat.title.toLowerCase()
        const keyLower = cat.cardKey.toLowerCase()
        let score = 0
        if (titleLower === queryLower || keyLower === queryLower) score = 3
        else if (titleLower.startsWith(queryLower) || keyLower.startsWith(queryLower)) score = 2
        else score = 1

        return {
          card_key: cat.cardKey,
          title: cat.title,
          latest_price_usd: latestPrice,
          change_7d: change7d ? Math.round(change7d * 10000) / 10000 : null,
          confidence: (price?.confidence ?? 'NONE') as 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE',
          is_watched: watchedSet.has(cat.cardKey),
          _score: score,
          _price: latestPrice ?? 0,
        }
      })
      .sort((a, b) => {
        if (a._score !== b._score) return b._score - a._score
        return b._price - a._price
      })
      .slice(0, limit)
      .map(({ _score, _price, ...item }) => item)

    return reply.code(200).send({ items: ranked, query, total: ranked.length })
  })
}
