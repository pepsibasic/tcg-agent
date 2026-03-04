import type { FastifyInstance } from 'fastify'
import { prisma } from '@tcg/db'

export async function externalCardRoutes(fastify: FastifyInstance) {
  // Auth check helper — returns userId or null
  const getUserId = (request: { headers: Record<string, string | string[] | undefined> }): string | null => {
    const userId = request.headers['x-user-id']
    if (!userId || typeof userId !== 'string') return null
    return userId
  }

  // POST /external-cards — create
  fastify.post('/external-cards', async (request, reply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'X-User-Id header is required' } })
    }

    const body = request.body as Record<string, unknown>

    // Validate required fields
    if (!body.title || typeof body.title !== 'string') {
      return reply.code(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'title is required and must be a string',
          details: { field: 'title' },
        },
      })
    }

    if (body.estimatedValue === undefined || body.estimatedValue === null) {
      return reply.code(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'estimatedValue is required',
          details: { field: 'estimatedValue' },
        },
      })
    }

    const created = await prisma.externalCard.create({
      data: {
        userId,
        name: body.title as string,
        estimatedValue: body.estimatedValue as number,
        setName: (body.set as string | undefined) ?? null,
        grade: (body.grade as string | undefined) ?? null,
        certNumber: (body.certNumber as string | undefined) ?? null,
        priceConfidence: 'NO_DATA',
      },
    })

    return reply.code(201).send(created)
  })

  // PATCH /external-cards/:id — update
  fastify.patch('/external-cards/:id', async (request, reply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'X-User-Id header is required' } })
    }

    const { id } = request.params as { id: string }
    const body = request.body as Record<string, unknown>

    const existing = await prisma.externalCard.findFirst({
      where: { id, userId, deletedAt: null },
    })

    if (!existing) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'External card not found',
          details: { id },
        },
      })
    }

    // Build update data from provided fields only
    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.name = body.title
    if (body.set !== undefined) updateData.setName = body.set
    if (body.grade !== undefined) updateData.grade = body.grade
    if (body.certNumber !== undefined) updateData.certNumber = body.certNumber
    if (body.estimatedValue !== undefined) updateData.estimatedValue = body.estimatedValue

    const updated = await prisma.externalCard.update({
      where: { id },
      data: updateData,
    })

    return reply.code(200).send(updated)
  })

  // DELETE /external-cards/:id — soft delete
  fastify.delete('/external-cards/:id', async (request, reply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'X-User-Id header is required' } })
    }

    const { id } = request.params as { id: string }

    const existing = await prisma.externalCard.findFirst({
      where: { id, userId, deletedAt: null },
    })

    if (!existing) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'External card not found',
          details: { id },
        },
      })
    }

    await prisma.externalCard.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return reply.code(200).send({ status: 'deleted' })
  })

  // GET /external-cards/cert/:certNumber — PSA cert lookup stub
  fastify.get('/external-cards/cert/:certNumber', async (request, reply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'X-User-Id header is required' } })
    }

    const { certNumber } = request.params as { certNumber: string }

    const card = await prisma.externalCard.findFirst({
      where: { certNumber, userId, deletedAt: null },
      select: { grade: true },
    })

    return reply.code(200).send({ grade: card?.grade ?? null })
  })
}
