import type { FastifyInstance } from 'fastify'
import { prisma } from '@tcg/db'

export async function vaultRoutes(fastify: FastifyInstance) {
  // POST /vault/shipments — create shipment intent stub
  fastify.post('/vault/shipments', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string | undefined
    if (!userId) {
      return reply.code(401).send({ error: { code: 'MISSING_AUTH', message: 'X-User-Id header required' } })
    }

    const body = request.body as { cardIds?: string[]; action?: string }

    // Create ActionsLog entry — stub, no real shipment logic
    await prisma.actionsLog.create({
      data: {
        userId,
        cardId: null,
        agentRecommended: { action: 'SHIP_TO_VAULT', cardIds: body.cardIds ?? [] },
        userAction: 'SHIPMENT_INTENT',
      },
    })

    return reply.code(201).send({
      status: 'shipment_intent_created',
      message: 'Shipment intent logged. Actual shipment processing is not yet implemented.',
    })
  })
}
