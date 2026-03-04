import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { vaultRoutes } from '../../routes/vault.js'

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
  app.register(vaultRoutes)
  return app
}

describe('vault routes', () => {
  let app: ReturnType<typeof buildServer>

  beforeEach(() => {
    vi.clearAllMocks()
    app = buildServer()
  })

  // 1. POST /vault/shipments — success
  it('POST /vault/shipments creates ActionsLog entry and returns 201', async () => {
    mockActionsLogCreate.mockResolvedValue({ id: 'log-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/vault/shipments',
      headers: { 'x-user-id': 'user-1' },
      payload: { cardIds: ['card-1', 'card-2'] },
    })

    expect(response.statusCode).toBe(201)
    const body = JSON.parse(response.body)
    expect(body.status).toBe('shipment_intent_created')
    expect(mockActionsLogCreate).toHaveBeenCalledOnce()
    expect(mockActionsLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          userAction: 'SHIPMENT_INTENT',
          agentRecommended: expect.objectContaining({ action: 'SHIP_TO_VAULT' }),
        }),
      })
    )
  })

  // 2. POST /vault/shipments — missing X-User-Id
  it('POST /vault/shipments without X-User-Id returns 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/vault/shipments',
      payload: { cardIds: ['card-1'] },
    })

    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.body)
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('MISSING_AUTH')
  })
})
