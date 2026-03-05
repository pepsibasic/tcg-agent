import type { FastifyInstance } from 'fastify'
import { computeMarketMovers } from '@tcg/agent'

export async function marketRoutes(fastify: FastifyInstance) {
  // GET /market/movers?range=24h|7d
  fastify.get('/market/movers', async (request, reply) => {
    const query = request.query as { range?: string }
    const range = query.range || '7d'

    if (!['24h', '7d'].includes(range)) {
      return reply.code(400).send({
        error: { code: 'INVALID_RANGE', message: 'range must be 24h or 7d' },
      })
    }

    const result = await computeMarketMovers(range as '24h' | '7d')

    request.log.info(
      {
        endpoint: '/market/movers',
        range,
        gainers_count: result.top_gainers.length,
        losers_count: result.top_losers.length,
        valuable_count: result.most_valuable.length,
      },
      'market_movers_served'
    )

    return reply.code(200).send(result)
  })
}
