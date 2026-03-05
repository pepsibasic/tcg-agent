import type { FastifyInstance } from 'fastify'
import { analyzeCard, analyzeCardBatch, summarizePortfolio, detectArchetype } from '@tcg/agent'
import type { LLMLogger } from '@tcg/agent'
import { prisma } from '@tcg/db'

function getUserIdOrFail(
  request: { headers: Record<string, string | string[] | undefined> },
  reply: { code: (n: number) => { send: (body: unknown) => unknown } }
): string | null {
  const userId = request.headers['x-user-id']
  if (!userId || typeof userId !== 'string') {
    reply.code(401).send({ error: { code: 'MISSING_AUTH', message: 'X-User-Id header required' } })
    return null
  }
  return userId
}

export async function agentRoutes(fastify: FastifyInstance) {
  // POST /agent/card/analyze
  fastify.post('/agent/card/analyze', async (request, reply) => {
    const userId = getUserIdOrFail(request, reply)
    if (!userId) return

    const body = request.body as Record<string, unknown>
    if (!body.cardId || typeof body.cardId !== 'string') {
      return reply.code(422).send({
        error: { code: 'VALIDATION_ERROR', message: 'cardId is required and must be a string' },
      })
    }

    const result = await analyzeCard(body.cardId, userId, {}, request.log as LLMLogger)

    if (!result.success) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Card not found' },
      })
    }

    // Audit: log recommended actions to actions_log (OBS-02)
    const recommendedActions = result.data.actions ?? []
    await prisma.actionsLog.create({
      data: {
        userId,
        cardId: body.cardId,
        agentRecommended: JSON.parse(JSON.stringify({
          event_type: 'card_analysis',
          mode: result.data.narrative.mode,
          actions: recommendedActions,
        })),
        userAction: 'RECOMMENDATION',
      },
    })

    request.log.info(
      { operation: 'card_analysis', mode: result.data.narrative.mode, actions_count: recommendedActions.length },
      'recommendation_shown'
    )

    const responseBody: Record<string, unknown> = { ...result.data }
    if (result.degraded) {
      responseBody.degraded = true
    }

    return reply.code(200).send(responseBody)
  })

  // POST /agent/card/analyze-batch
  fastify.post('/agent/card/analyze-batch', async (request, reply) => {
    const userId = getUserIdOrFail(request, reply)
    if (!userId) return

    const body = request.body as Record<string, unknown>
    if (!Array.isArray(body.cardIds) || body.cardIds.length === 0) {
      return reply.code(422).send({
        error: { code: 'VALIDATION_ERROR', message: 'cardIds must be a non-empty array' },
      })
    }

    const results = await analyzeCardBatch(body.cardIds as string[], userId, { source: 'pack_pull' }, request.log as LLMLogger)

    request.log.info(
      { endpoint: '/agent/card/analyze-batch', user_id: userId, card_count: (body.cardIds as string[]).length },
      'agent_analysis_complete'
    )

    return reply.code(200).send({ results })
  })

  // POST /agent/portfolio/summary
  fastify.post('/agent/portfolio/summary', async (request, reply) => {
    const userId = getUserIdOrFail(request, reply)
    if (!userId) return

    const result = await summarizePortfolio(userId, request.log as LLMLogger)

    request.log.info(
      {
        operation: 'portfolio_summary',
        mode: result.data.agent_commentary.mode,
        actions_count: result.data.recommended_actions.length,
      },
      'recommendation_shown'
    )

    // Audit: log portfolio-level recommendations
    await prisma.actionsLog.create({
      data: {
        userId,
        agentRecommended: JSON.parse(JSON.stringify({
          event_type: 'portfolio_summary',
          mode: result.data.agent_commentary.mode,
          actions: result.data.recommended_actions,
        })),
        userAction: 'RECOMMENDATION',
      },
    })

    const responseBody: Record<string, unknown> = { ...result.data }
    if (result.degraded) {
      responseBody.degraded = true
    }

    return reply.code(200).send(responseBody)
  })

  // POST /agent/archetype
  fastify.post('/agent/archetype', async (request, reply) => {
    const userId = getUserIdOrFail(request, reply)
    if (!userId) return

    const result = await detectArchetype(userId, request.log as LLMLogger)

    request.log.info({ endpoint: '/agent/archetype', user_id: userId }, 'agent_analysis_complete')

    const responseBody: Record<string, unknown> = { ...result.data }
    if ('degraded' in result && result.degraded) {
      responseBody.degraded = true
    }

    return reply.code(200).send(responseBody)
  })
}
