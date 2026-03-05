import type { FastifyInstance } from 'fastify'
import { prisma } from '@tcg/db'

const VALID_ALERT_TYPES = ['PRICE_THRESHOLD', 'PRICE_ABOVE', 'PRICE_BELOW', 'CHANGE_7D_ABOVE_PCT', 'CHANGE_7D_BELOW_PCT']

export async function alertsRoutes(fastify: FastifyInstance) {
  // POST /alerts — create a new alert
  fastify.post('/alerts', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string | undefined
    if (!userId) {
      return reply.code(401).send({ error: { code: 'MISSING_AUTH', message: 'X-User-Id header required' } })
    }

    const body = request.body as { type?: string; cardKey?: string; threshold?: number }
    if (!body.type || !VALID_ALERT_TYPES.includes(body.type)) {
      return reply.code(422).send({
        error: { code: 'VALIDATION_ERROR', message: `type must be one of: ${VALID_ALERT_TYPES.join(', ')}` },
      })
    }
    if (!body.cardKey || typeof body.cardKey !== 'string') {
      return reply.code(422).send({
        error: { code: 'VALIDATION_ERROR', message: 'cardKey is required' },
      })
    }
    if (body.threshold == null || typeof body.threshold !== 'number') {
      return reply.code(422).send({
        error: { code: 'VALIDATION_ERROR', message: 'threshold must be a number' },
      })
    }

    const alert = await prisma.alert.create({
      data: {
        userId,
        type: body.type,
        cardKey: body.cardKey,
        threshold: body.threshold,
      },
    })

    request.log.info({ alert_id: alert.id, user_id: userId, type: body.type }, 'alert_created')

    return reply.code(201).send(alert)
  })

  // GET /alerts — list alerts for user
  fastify.get('/alerts', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string | undefined
    if (!userId) {
      return reply.code(401).send({ error: { code: 'MISSING_AUTH', message: 'X-User-Id header required' } })
    }

    const alerts = await prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return reply.code(200).send(alerts)
  })
}
