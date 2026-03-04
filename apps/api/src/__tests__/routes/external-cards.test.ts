import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { externalCardRoutes } from '../../routes/external-cards.js'

// Mock @tcg/db
const mockCreate = vi.fn()
const mockFindFirst = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@tcg/db', () => ({
  prisma: {
    externalCard: {
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}))

function buildServer() {
  const app = Fastify({ logger: false })
  app.register(externalCardRoutes)
  return app
}

describe('external card routes', () => {
  let app: ReturnType<typeof buildServer>

  beforeEach(() => {
    vi.clearAllMocks()
    app = buildServer()
  })

  // POST /external-cards
  it('POST /external-cards with valid data creates record and returns 201', async () => {
    const created = {
      id: 'uuid-1',
      userId: 'user-1',
      name: 'Charizard',
      estimatedValue: '25.00',
      priceConfidence: 'NO_DATA',
      setName: null,
      grade: null,
      certNumber: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    }
    mockCreate.mockResolvedValue(created)

    const response = await app.inject({
      method: 'POST',
      url: '/external-cards',
      headers: { 'x-user-id': 'user-1' },
      payload: { title: 'Charizard', estimatedValue: 25.0 },
    })

    expect(response.statusCode).toBe(201)
    const body = JSON.parse(response.body)
    expect(body.priceConfidence).toBe('NO_DATA')
    expect(mockCreate).toHaveBeenCalledOnce()
    // Verify no analysis is triggered — create is the only mock called
  })

  it('POST /external-cards with missing title returns 422 validation error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/external-cards',
      headers: { 'x-user-id': 'user-1' },
      payload: { estimatedValue: 25.0 },
    })

    expect(response.statusCode).toBe(422)
    const body = JSON.parse(response.body)
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('POST /external-cards with missing estimatedValue returns 422 validation error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/external-cards',
      headers: { 'x-user-id': 'user-1' },
      payload: { title: 'Charizard' },
    })

    expect(response.statusCode).toBe(422)
    const body = JSON.parse(response.body)
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  // PATCH /external-cards/:id
  it('PATCH /external-cards/:id updates fields and returns 200', async () => {
    const existing = {
      id: 'uuid-1',
      userId: 'user-1',
      name: 'Charizard',
      estimatedValue: '25.00',
      priceConfidence: 'NO_DATA',
      setName: null,
      grade: null,
      certNumber: null,
      deletedAt: null,
    }
    const updated = { ...existing, grade: 'PSA 9' }
    mockFindFirst.mockResolvedValue(existing)
    mockUpdate.mockResolvedValue(updated)

    const response = await app.inject({
      method: 'PATCH',
      url: '/external-cards/uuid-1',
      headers: { 'x-user-id': 'user-1' },
      payload: { grade: 'PSA 9' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.grade).toBe('PSA 9')
  })

  it('PATCH /external-cards/:id for non-existent card returns 404', async () => {
    mockFindFirst.mockResolvedValue(null)

    const response = await app.inject({
      method: 'PATCH',
      url: '/external-cards/nonexistent',
      headers: { 'x-user-id': 'user-1' },
      payload: { grade: 'PSA 9' },
    })

    expect(response.statusCode).toBe(404)
    const body = JSON.parse(response.body)
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('NOT_FOUND')
  })

  // DELETE /external-cards/:id
  it('DELETE /external-cards/:id soft-deletes and returns 200', async () => {
    const existing = {
      id: 'uuid-1',
      userId: 'user-1',
      name: 'Charizard',
      deletedAt: null,
    }
    mockFindFirst.mockResolvedValue(existing)
    mockUpdate.mockResolvedValue({ ...existing, deletedAt: new Date() })

    const response = await app.inject({
      method: 'DELETE',
      url: '/external-cards/uuid-1',
      headers: { 'x-user-id': 'user-1' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.status).toBe('deleted')
  })

  // GET /external-cards/cert/:certNumber
  it('GET /external-cards/cert/:certNumber returns grade when found', async () => {
    mockFindFirst.mockResolvedValue({ grade: 'PSA 10' })

    const response = await app.inject({
      method: 'GET',
      url: '/external-cards/cert/ABC123',
      headers: { 'x-user-id': 'user-1' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.grade).toBe('PSA 10')
  })

  it('GET /external-cards/cert/:certNumber returns null grade when not found', async () => {
    mockFindFirst.mockResolvedValue(null)

    const response = await app.inject({
      method: 'GET',
      url: '/external-cards/cert/NOTFOUND',
      headers: { 'x-user-id': 'user-1' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.grade).toBeNull()
  })

  // Auth — all endpoints require X-User-Id
  it('POST /external-cards without X-User-Id returns 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/external-cards',
      payload: { title: 'Charizard', estimatedValue: 25.0 },
    })

    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.body)
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('UNAUTHORIZED')
  })
})
