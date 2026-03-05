import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { agentRoutes } from '../../routes/agent.js'

// Mock @tcg/agent
const mockAnalyzeCard = vi.fn()
const mockAnalyzeCardBatch = vi.fn()
const mockSummarizePortfolio = vi.fn()
const mockDetectArchetype = vi.fn()

vi.mock('@tcg/agent', () => ({
  analyzeCard: (...args: unknown[]) => mockAnalyzeCard(...args),
  analyzeCardBatch: (...args: unknown[]) => mockAnalyzeCardBatch(...args),
  summarizePortfolio: (...args: unknown[]) => mockSummarizePortfolio(...args),
  detectArchetype: (...args: unknown[]) => mockDetectArchetype(...args),
}))

// Mock @tcg/db so tests don't need Prisma generated client
vi.mock('@tcg/db', () => ({
  prisma: {
    actionsLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}))

function buildServer() {
  const app = Fastify({ logger: false })
  app.register(agentRoutes)
  return app
}

describe('agent routes', () => {
  let app: ReturnType<typeof buildServer>

  beforeEach(() => {
    vi.clearAllMocks()
    app = buildServer()
  })

  // 1. POST /agent/card/analyze — success
  it('POST /agent/card/analyze with valid cardId returns 200 with CardAnalysisResponse', async () => {
    const analysisData = {
      card_id: 'card-1',
      identity_tags: ['holo'],
      rarity_signal: 'High demand',
      liquidity_signal: 'Sells quickly',
      price_band: { low: 10, mid: 25, high: 40 },
      reasoning_bullets: ['Popular card'],
      confidence: 'HIGH',
      actions: [],
      priceConfidence: 'FRESH',
      priceFetchedAt: null,
    }
    mockAnalyzeCard.mockResolvedValue({ success: true, data: analysisData })

    const response = await app.inject({
      method: 'POST',
      url: '/agent/card/analyze',
      headers: { 'x-user-id': 'user-1' },
      payload: { cardId: 'card-1' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.card_id).toBe('card-1')
    expect(body.confidence).toBe('HIGH')
    expect(mockAnalyzeCard).toHaveBeenCalledWith('card-1', 'user-1', {}, expect.anything())
  })

  // 2. POST /agent/card/analyze — missing cardId
  it('POST /agent/card/analyze with missing cardId returns 422', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/agent/card/analyze',
      headers: { 'x-user-id': 'user-1' },
      payload: {},
    })

    expect(response.statusCode).toBe(422)
    const body = JSON.parse(response.body)
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  // 3. POST /agent/card/analyze — not found
  it('POST /agent/card/analyze returns 404 when card not found', async () => {
    mockAnalyzeCard.mockResolvedValue({ success: false, reason: 'not_found' })

    const response = await app.inject({
      method: 'POST',
      url: '/agent/card/analyze',
      headers: { 'x-user-id': 'user-1' },
      payload: { cardId: 'nonexistent' },
    })

    expect(response.statusCode).toBe(404)
    const body = JSON.parse(response.body)
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('NOT_FOUND')
  })

  // 4. POST /agent/card/analyze — degraded mode
  it('POST /agent/card/analyze returns 200 with degraded:true on LLM failure', async () => {
    const degradedData = {
      card_id: 'card-1',
      identity_tags: [],
      rarity_signal: null,
      liquidity_signal: null,
      price_band: null,
      reasoning_bullets: [],
      confidence: 'LOW',
      actions: [],
      priceConfidence: 'FRESH',
      priceFetchedAt: null,
      degraded: true,
    }
    mockAnalyzeCard.mockResolvedValue({ success: true, data: degradedData, degraded: true })

    const response = await app.inject({
      method: 'POST',
      url: '/agent/card/analyze',
      headers: { 'x-user-id': 'user-1' },
      payload: { cardId: 'card-1' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.degraded).toBe(true)
  })

  // 5. POST /agent/card/analyze-batch — success
  it('POST /agent/card/analyze-batch with cardIds array returns 200 with results array', async () => {
    const batchResults = [
      { success: true, data: { card_id: 'card-1', actions: [] } },
      { success: true, data: { card_id: 'card-2', actions: [] } },
    ]
    mockAnalyzeCardBatch.mockResolvedValue(batchResults)

    const response = await app.inject({
      method: 'POST',
      url: '/agent/card/analyze-batch',
      headers: { 'x-user-id': 'user-1' },
      payload: { cardIds: ['card-1', 'card-2'] },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.results).toBeDefined()
    expect(body.results).toHaveLength(2)
  })

  // 6. POST /agent/card/analyze-batch — passes source:pack_pull
  it('POST /agent/card/analyze-batch passes source:pack_pull to orchestrator', async () => {
    mockAnalyzeCardBatch.mockResolvedValue([])

    await app.inject({
      method: 'POST',
      url: '/agent/card/analyze-batch',
      headers: { 'x-user-id': 'user-1' },
      payload: { cardIds: ['card-1'] },
    })

    expect(mockAnalyzeCardBatch).toHaveBeenCalledWith(
      ['card-1'],
      'user-1',
      { source: 'pack_pull' },
      expect.anything()
    )
  })

  // 7. POST /agent/portfolio/summary — success
  it('POST /agent/portfolio/summary returns 200 with PortfolioSummaryResponse', async () => {
    const summaryData = {
      total_cards: 10,
      total_estimated_value: 250,
      ip_breakdown: [],
      top_cards: [],
      vault_candidates: [],
      actions_summary: '',
    }
    mockSummarizePortfolio.mockResolvedValue({ success: true, data: summaryData })

    const response = await app.inject({
      method: 'POST',
      url: '/agent/portfolio/summary',
      headers: { 'x-user-id': 'user-1' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.total_cards).toBe(10)
    expect(mockSummarizePortfolio).toHaveBeenCalledWith('user-1', expect.anything())
  })

  // 8. POST /agent/archetype — success with archetype
  it('POST /agent/archetype returns 200 with archetype data', async () => {
    const archetypeData = {
      archetype: 'VAULT_BUILDER',
      confidence: 'HIGH',
      badges: ['vault_builder'],
      summary: 'You are a vault builder',
      top_ips: ['Pokemon'],
    }
    mockDetectArchetype.mockResolvedValue({ success: true, data: archetypeData })

    const response = await app.inject({
      method: 'POST',
      url: '/agent/archetype',
      headers: { 'x-user-id': 'user-1' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.archetype).toBe('VAULT_BUILDER')
    expect(mockDetectArchetype).toHaveBeenCalledWith('user-1', expect.anything())
  })

  // 9. POST /agent/archetype — progress nudge (below threshold)
  it('POST /agent/archetype returns 200 with progress nudge for below-threshold', async () => {
    const nudgeData = {
      archetype: null,
      progress: '2/5 cards',
      message: 'Add more cards to unlock your archetype!',
    }
    mockDetectArchetype.mockResolvedValue({ success: true, data: nudgeData })

    const response = await app.inject({
      method: 'POST',
      url: '/agent/archetype',
      headers: { 'x-user-id': 'user-1' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.archetype).toBeNull()
    expect(body.progress).toBeDefined()
  })

  // 10. POST /agent/card/analyze — missing X-User-Id
  it('POST /agent/card/analyze without X-User-Id returns 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/agent/card/analyze',
      payload: { cardId: 'card-1' },
    })

    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.body)
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('MISSING_AUTH')
  })
})
