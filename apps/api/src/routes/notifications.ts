import type { FastifyInstance } from 'fastify'
import { prisma } from '@tcg/db'

function formatEventTitle(payload: Record<string, unknown>): string {
  const cardKey = (payload.card_key as string) || 'Unknown card'
  const price = payload.latest_price_usd as number | undefined
  const priceFmt = price != null ? `$${Math.round(price).toLocaleString()}` : ''

  switch (payload.alert_type) {
    case 'PRICE_ABOVE':
    case 'PRICE_THRESHOLD':
      return `${cardKey} crossed ${priceFmt}`
    case 'PRICE_BELOW':
      return `${cardKey} dropped to ${priceFmt}`
    case 'CHANGE_7D_ABOVE_PCT':
      return `${cardKey} surging this week`
    case 'CHANGE_7D_BELOW_PCT':
      return `${cardKey} declining this week`
    default:
      return `Alert for ${cardKey}`
  }
}

function formatEventBody(payload: Record<string, unknown>): string {
  const price = payload.latest_price_usd as number | undefined
  const change = payload.change_7d as number | null | undefined
  const parts: string[] = []
  if (price != null) parts.push(`Latest: $${Math.round(price).toLocaleString()}`)
  if (change != null) {
    const sign = change >= 0 ? '+' : ''
    parts.push(`7d: ${sign}${(change * 100).toFixed(1)}%`)
  }
  return parts.length > 0 ? parts.join(' | ') : 'Alert triggered'
}

export async function notificationsRoutes(fastify: FastifyInstance) {
  // GET /notifications
  fastify.get('/notifications', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string | undefined
    if (!userId) return reply.code(401).send({ error: { code: 'MISSING_AUTH', message: 'X-User-Id header required' } })

    const events = await prisma.alertEvent.findMany({
      where: { userId },
      orderBy: [{ status: 'asc' }, { triggeredAt: 'desc' }], // NEW first
      take: 20,
    })

    const mapped = events.map((e) => {
      const payload = e.payload as Record<string, unknown>
      return {
        id: e.id,
        type: (payload.alert_type as string) || 'UNKNOWN',
        card_key: e.cardKey,
        title: formatEventTitle(payload),
        body: formatEventBody(payload),
        triggered_at: e.triggeredAt.toISOString(),
        status: e.status as 'NEW' | 'SEEN',
      }
    })

    request.log.info({ endpoint: '/notifications', user_id: userId, count: mapped.length, new_count: mapped.filter((e) => e.status === 'NEW').length }, 'notifications_served')

    return reply.code(200).send({ events: mapped })
  })

  // POST /notifications/:id/seen
  fastify.post('/notifications/:id/seen', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string | undefined
    if (!userId) return reply.code(401).send({ error: { code: 'MISSING_AUTH', message: 'X-User-Id header required' } })

    const { id } = request.params as { id: string }

    await prisma.alertEvent.updateMany({
      where: { id, userId },
      data: { status: 'SEEN' },
    })

    request.log.info({ endpoint: '/notifications/seen', user_id: userId, event_id: id }, 'notification_seen')

    return reply.code(200).send({ status: 'seen' })
  })
}
