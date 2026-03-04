import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { actionsRoutes } from '../../routes/actions.js'

// Mock @tcg/db
const mockActionsLogCreate = vi.fn()

vi.mock('@tcg/db', () => ({
  prisma: {
    actionsLog: {
      create: (...args: unknown[]) => mockActionsLogCreate(...args),
    },
  },
}))

function buildServer() {
  const app = Fastify({ logger: false })
  app.register(actionsRoutes)
  return app
}

describe('actions routes', () => {
  let app: ReturnType<typeof buildServer>

  beforeEach(() => {
    vi.clearAllMocks()
    app = buildServer()
  })

  // 1. POST /actions/execute — success with WATCHLIST action
  it('POST /actions/execute with valid action logs to ActionsLog and returns 201', async () => {
    mockActionsLogCreate.mockResolvedValue({ id: 'log-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/actions/execute',
      headers: { 'x-user-id': 'user-1' },
      payload: { action: 'WATCHLIST', cardId: 'abc' },
    })

    expect(response.statusCode).toBe(201)
    const body = JSON.parse(response.body)
    expect(body.status).toBe('logged')
    expect(mockActionsLogCreate).toHaveBeenCalledOnce()
    expect(mockActionsLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          cardId: 'abc',
          agentRecommended: expect.objectContaining({ action: 'WATCHLIST' }),
          userAction: 'ACCEPTED',
        }),
      })
    )
  })

  // 2. POST /actions/execute — missing action field
  it('POST /actions/execute with missing action field returns 422', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/actions/execute',
      headers: { 'x-user-id': 'user-1' },
      payload: { cardId: 'abc' },
    })

    expect(response.statusCode).toBe(422)
    const body = JSON.parse(response.body)
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  // 3. POST /actions/execute — missing X-User-Id
  it('POST /actions/execute without X-User-Id returns 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/actions/execute',
      payload: { action: 'WATCHLIST', cardId: 'abc' },
    })

    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.body)
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('MISSING_AUTH')
  })
})
