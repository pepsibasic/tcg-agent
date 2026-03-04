import type { FastifyInstance } from 'fastify'
import { prisma } from '@tcg/db'

export async function actionsRoutes(fastify: FastifyInstance) {
  // POST /actions/execute — stub action execution with logging
  fastify.post('/actions/execute', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string | undefined
    if (!userId) {
      return reply.code(401).send({ error: { code: 'MISSING_AUTH', message: 'X-User-Id header required' } })
    }

    const body = request.body as { cardId?: string; action?: string }
    if (!body.action) {
      return reply.code(422).send({ error: { code: 'VALIDATION_ERROR', message: 'action field required' } })
    }

    await prisma.actionsLog.create({
      data: {
        userId,
        cardId: body.cardId ?? null,
        agentRecommended: { action: body.action },
        userAction: 'ACCEPTED',
      },
    })

    return reply.code(201).send({
      status: 'logged',
      message: 'Action recorded',
    })
  })
}
