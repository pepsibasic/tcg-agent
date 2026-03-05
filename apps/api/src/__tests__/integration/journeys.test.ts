import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import { agentRoutes } from '../../routes/agent.js'
import { externalCardRoutes } from '../../routes/external-cards.js'
import { vaultRoutes } from '../../routes/vault.js'
import { actionsRoutes } from '../../routes/actions.js'

// ─── Mock @tcg/agent orchestrators (LLM boundary) ───────────────────────────
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

// ─── Mock @tcg/db (Prisma client) ───────────────────────────────────────────
const mockExternalCardCreate = vi.fn()
const mockActionsLogCreate = vi.fn()

vi.mock('@tcg/db', () => ({
  prisma: {
    externalCard: {
      create: (...args: unknown[]) => mockExternalCardCreate(...args),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    actionsLog: {
      create: (...args: unknown[]) => mockActionsLogCreate(...args),
    },
  },
}))

// ─── Build full server (all routes, genReqId, onSend hook) ──────────────────

function buildServer() {
  const app = Fastify({
    logger: false,
    genReqId: (req) => (req.headers['x-request-id'] as string) || crypto.randomUUID(),
  })

  // Reflect X-Request-Id on every response (same as server.ts)
  app.addHook('onSend', async (request, reply) => {
    reply.header('X-Request-Id', request.id)
  })

  app.register(agentRoutes)
  app.register(externalCardRoutes)
  app.register(vaultRoutes)
  app.register(actionsRoutes)

  return app
}

// ─── Journey 1: Pack pull → card analysis ───────────────────────────────────

describe('Journey 1: Pack pull to card analysis', () => {
  let app: ReturnType<typeof buildServer>

  beforeAll(() => {
    vi.clearAllMocks()
    app = buildServer()
    mockActionsLogCreate.mockResolvedValue({})
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /agent/card/analyze-batch with pack_pull source returns 200 with CardAnalysis results', async () => {
    const batchResults = [
      {
        success: true,
        data: {
          card_id: 'uuid-card-1',
          identity_tags: ['holo', 'first-edition'],
          rarity_signal: 'High demand card from base set',
          liquidity_signal: 'Frequently traded on secondary market',
          price_band: { low: 200, high: 350, currency: 'USD' },
          reasoning_bullets: ['First edition', 'PSA 9 graded', 'Base Set'],
          confidence: 'HIGH',
          actions: [{ type: 'LIST', params: {}, ui_copy: 'List on marketplace', risk_notes: [] }],
          priceConfidence: 'LIVE',
          priceFetchedAt: '2026-03-05T00:00:00.000Z',
        },
      },
      {
        success: true,
        data: {
          card_id: 'uuid-card-2',
          identity_tags: ['holo'],
          rarity_signal: 'Moderate demand',
          liquidity_signal: 'Moderate liquidity',
          price_band: { low: 50, high: 80, currency: 'USD' },
          reasoning_bullets: ['Holo card', 'Good condition'],
          confidence: 'MEDIUM',
          actions: [{ type: 'WATCHLIST', params: {}, ui_copy: 'Add to watchlist', risk_notes: [] }],
          priceConfidence: 'RECENT_24H',
          priceFetchedAt: '2026-03-04T12:00:00.000Z',
        },
      },
    ]

    mockAnalyzeCardBatch.mockResolvedValue(batchResults)

    const response = await app.inject({
      method: 'POST',
      url: '/agent/card/analyze-batch',
      headers: { 'x-user-id': 'test-user-id' },
      payload: { cardIds: ['uuid-card-1', 'uuid-card-2'] },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)

    // Response contains CardAnalysis array
    expect(body.results).toBeDefined()
    expect(body.results).toHaveLength(2)

    // Each result has actions array (from rules engine)
    expect(body.results[0].data.actions).toBeDefined()
    expect(Array.isArray(body.results[0].data.actions)).toBe(true)
    expect(body.results[1].data.actions).toBeDefined()
    expect(Array.isArray(body.results[1].data.actions)).toBe(true)

    // Orchestrator called with source:pack_pull
    expect(mockAnalyzeCardBatch).toHaveBeenCalledWith(
      ['uuid-card-1', 'uuid-card-2'],
      'test-user-id',
      { source: 'pack_pull' },
      expect.anything()
    )
  })

  it('POST /agent/card/analyze-batch response includes X-Request-Id header', async () => {
    mockAnalyzeCardBatch.mockResolvedValue([])

    const response = await app.inject({
      method: 'POST',
      url: '/agent/card/analyze-batch',
      headers: { 'x-user-id': 'test-user-id' },
      payload: { cardIds: ['uuid-card-1'] },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['x-request-id']).toBeDefined()
    expect(typeof response.headers['x-request-id']).toBe('string')
    expect((response.headers['x-request-id'] as string).length).toBeGreaterThan(0)
  })

  it('POST /agent/card/analyze-batch propagates X-Request-Id from upstream header', async () => {
    mockAnalyzeCardBatch.mockResolvedValue([])
    const upstreamRequestId = 'upstream-req-abc-123'

    const response = await app.inject({
      method: 'POST',
      url: '/agent/card/analyze-batch',
      headers: {
        'x-user-id': 'test-user-id',
        'x-request-id': upstreamRequestId,
      },
      payload: { cardIds: ['uuid-card-1'] },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['x-request-id']).toBe(upstreamRequestId)
  })
})

// ─── Journey 2: External card upload → portfolio appearance ─────────────────

describe('Journey 2: External card upload to portfolio appearance', () => {
  let app: ReturnType<typeof buildServer>

  beforeAll(() => {
    vi.clearAllMocks()
    app = buildServer()
    mockActionsLogCreate.mockResolvedValue({})
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /external-cards creates card and returns 201', async () => {
    const createdCard = {
      id: 'ext-card-uuid-1',
      userId: 'test-user-id',
      name: 'Charizard PSA 10',
      estimatedValue: '500.00',
      priceConfidence: 'NO_DATA',
      setName: 'Base Set',
      grade: '10',
      certNumber: '12345678',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      priceFetchedAt: null,
    }
    mockExternalCardCreate.mockResolvedValue(createdCard)

    const response = await app.inject({
      method: 'POST',
      url: '/external-cards',
      headers: { 'x-user-id': 'test-user-id' },
      payload: {
        title: 'Charizard PSA 10',
        set: 'Base Set',
        grade: '10',
        certNumber: '12345678',
        estimatedValue: 500,
      },
    })

    expect(response.statusCode).toBe(201)
    const body = JSON.parse(response.body)
    expect(body.id).toBe('ext-card-uuid-1')
    expect(body.priceConfidence).toBe('NO_DATA')
    expect(body.name).toBe('Charizard PSA 10')
  })

  it('POST /agent/portfolio/summary includes external card in breakdown', async () => {
    const portfolioResult = {
      success: true,
      data: {
        userId: 'test-user-id',
        totalValueEst: 500,
        breakdown: [
          {
            ipCategory: 'External',
            totalValue: 500,
            cardCount: 1,
            percentOfPortfolio: 1.0,
          },
        ],
        concentrationScore: 1.0,
        liquidityScore: 0.5,
        collectorArchetype: null,
        missingSetGoals: [],
        recommendedActions: ['Consider vaulting high-value cards'],
        priceDataAsOf: null,
        priceConfidence: 'NO_DATA',
        recommended_actions: [],
        agent_commentary: { mode: 'BASIC', headline: 'Your portfolio', bullets: [], next_best_moves: [] },
      },
    }
    mockSummarizePortfolio.mockResolvedValue(portfolioResult)

    const response = await app.inject({
      method: 'POST',
      url: '/agent/portfolio/summary',
      headers: { 'x-user-id': 'test-user-id' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)

    // External card appears in breakdown
    expect(body.breakdown).toBeDefined()
    expect(Array.isArray(body.breakdown)).toBe(true)
    const externalGroup = body.breakdown.find(
      (g: { ipCategory: string }) => g.ipCategory === 'External'
    )
    expect(externalGroup).toBeDefined()
    expect(externalGroup.cardCount).toBe(1)
    expect(externalGroup.totalValue).toBe(500)

    // External cards have no Gacha economy actions (no SHIP_TO_VAULT from rules)
    // The portfolio summary itself doesn't return card-level actions, but the recommended_actions
    // are narrative strings, not SHIP_TO_VAULT/WATCHLIST action types
    expect(body.recommendedActions).toBeDefined()
    expect(Array.isArray(body.recommendedActions)).toBe(true)
  })

  it('POST /external-cards response includes X-Request-Id header', async () => {
    const createdCard = {
      id: 'ext-card-uuid-2',
      userId: 'test-user-id',
      name: 'Blastoise',
      estimatedValue: '100.00',
      priceConfidence: 'NO_DATA',
      setName: null,
      grade: null,
      certNumber: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      priceFetchedAt: null,
    }
    mockExternalCardCreate.mockResolvedValue(createdCard)

    const response = await app.inject({
      method: 'POST',
      url: '/external-cards',
      headers: { 'x-user-id': 'test-user-id' },
      payload: { title: 'Blastoise', estimatedValue: 100 },
    })

    expect(response.statusCode).toBe(201)
    expect(response.headers['x-request-id']).toBeDefined()
    expect(typeof response.headers['x-request-id']).toBe('string')
  })
})

// ─── Journey 3: Portfolio summary request ───────────────────────────────────

describe('Journey 3: Portfolio summary request', () => {
  let app: ReturnType<typeof buildServer>

  beforeAll(() => {
    vi.clearAllMocks()
    app = buildServer()
    mockActionsLogCreate.mockResolvedValue({})
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /agent/portfolio/summary returns 200 with full PortfolioSummary shape', async () => {
    const portfolioResult = {
      success: true,
      data: {
        userId: 'test-user-id',
        totalValueEst: 1250,
        breakdown: [
          {
            ipCategory: 'Pokemon',
            totalValue: 900,
            cardCount: 8,
            percentOfPortfolio: 0.72,
          },
          {
            ipCategory: 'Magic: The Gathering',
            totalValue: 350,
            cardCount: 5,
            percentOfPortfolio: 0.28,
          },
        ],
        concentrationScore: 0.72,
        liquidityScore: 0.65,
        collectorArchetype: 'Pokemon Specialist',
        missingSetGoals: ['Complete Base Set'],
        recommendedActions: ['Vault high-value Pokemon cards', 'Diversify your collection'],
        priceDataAsOf: '2026-03-05T00:00:00.000Z',
        priceConfidence: 'RECENT_24H',
        recommended_actions: [],
        agent_commentary: { mode: 'BASIC', headline: 'Pokemon-heavy portfolio', bullets: ['72% Pokemon'], next_best_moves: [] },
      },
    }
    mockSummarizePortfolio.mockResolvedValue(portfolioResult)

    const response = await app.inject({
      method: 'POST',
      url: '/agent/portfolio/summary',
      headers: { 'x-user-id': 'test-user-id' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)

    // Required fields per plan spec
    expect(body.totalValueEst).toBeDefined()
    expect(typeof body.totalValueEst).toBe('number')
    expect(body.totalValueEst).toBe(1250)

    expect(body.breakdown).toBeDefined()
    expect(Array.isArray(body.breakdown)).toBe(true)
    expect(body.breakdown).toHaveLength(2)

    expect(body.concentrationScore).toBeDefined()
    expect(typeof body.concentrationScore).toBe('number')

    expect(body.liquidityScore).toBeDefined()
    expect(typeof body.liquidityScore).toBe('number')

    expect(body.recommendedActions).toBeDefined()
    expect(Array.isArray(body.recommendedActions)).toBe(true)

    // Breakdown includes both vaulted and external cards
    expect(body.breakdown[0].ipCategory).toBe('Pokemon')
    expect(body.breakdown[1].ipCategory).toBe('Magic: The Gathering')

    // Orchestrator was called with the correct userId
    expect(mockSummarizePortfolio).toHaveBeenCalledWith('test-user-id', expect.anything())
  })

  it('POST /agent/portfolio/summary response includes X-Request-Id header', async () => {
    const portfolioResult = {
      success: true,
      data: {
        userId: 'test-user-id',
        totalValueEst: 0,
        breakdown: [],
        concentrationScore: 0,
        liquidityScore: 0,
        collectorArchetype: null,
        missingSetGoals: [],
        recommendedActions: [],
        priceDataAsOf: null,
        priceConfidence: 'NO_DATA',
        recommended_actions: [],
        agent_commentary: { mode: 'BASIC', headline: 'Empty portfolio', bullets: [], next_best_moves: [] },
      },
    }
    mockSummarizePortfolio.mockResolvedValue(portfolioResult)

    const response = await app.inject({
      method: 'POST',
      url: '/agent/portfolio/summary',
      headers: { 'x-user-id': 'test-user-id' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['x-request-id']).toBeDefined()
    expect(typeof response.headers['x-request-id']).toBe('string')
    expect((response.headers['x-request-id'] as string).length).toBeGreaterThan(0)
  })

  it('POST /agent/portfolio/summary returns 401 when X-User-Id missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/agent/portfolio/summary',
    })

    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.body)
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('MISSING_AUTH')
  })
})

// ─── Journey 4: Shareable archetype export ──────────────────────────────────

describe('Journey 4: Shareable archetype export', () => {
  let app: ReturnType<typeof buildServer>

  beforeAll(() => {
    vi.clearAllMocks()
    app = buildServer()
    mockActionsLogCreate.mockResolvedValue({})
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /agent/archetype returns 200 with full CollectorArchetype shape', async () => {
    // The orchestrator returns LLM data with badges overridden deterministically
    const archetypeResult = {
      success: true,
      data: {
        name: 'The Vault Collector',
        traits: ['long-term holder', 'quality over quantity', 'graded card enthusiast'],
        why: 'You consistently vault your best cards and focus on PSA-graded specimens.',
        comparable_collectors: ['@pokemoncollector1', '@gradedcards'],
        share_card_text: 'Protecting value, one vault at a time. #TCGCollector',
        // Deterministic badges based on portfolio stats (not from LLM)
        share_card_badges: ['vault_builder'],
      },
    }
    mockDetectArchetype.mockResolvedValue(archetypeResult)

    const response = await app.inject({
      method: 'POST',
      url: '/agent/archetype',
      headers: { 'x-user-id': 'test-user-id' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)

    // Required fields per plan spec
    expect(body.name).toBeDefined()
    expect(typeof body.name).toBe('string')
    expect(body.name).toBe('The Vault Collector')

    expect(body.traits).toBeDefined()
    expect(Array.isArray(body.traits)).toBe(true)
    expect(body.traits.length).toBeGreaterThan(0)

    expect(body.why).toBeDefined()
    expect(typeof body.why).toBe('string')

    expect(body.comparable_collectors).toBeDefined()
    expect(Array.isArray(body.comparable_collectors)).toBe(true)

    expect(body.share_card_text).toBeDefined()
    expect(typeof body.share_card_text).toBe('string')

    expect(body.share_card_badges).toBeDefined()
    expect(Array.isArray(body.share_card_badges)).toBe(true)

    // Badges are deterministic (vault_builder because vaultedCount >= 10)
    expect(body.share_card_badges).toContain('vault_builder')

    // Orchestrator called with the correct userId
    expect(mockDetectArchetype).toHaveBeenCalledWith('test-user-id', expect.anything())
  })

  it('POST /agent/archetype response includes X-Request-Id header', async () => {
    const archetypeResult = {
      success: true,
      data: {
        name: 'The Collector',
        traits: ['diverse'],
        why: 'You collect everything.',
        comparable_collectors: [],
        share_card_text: 'Gotta catch em all.',
        share_card_badges: ['ip_specialist'],
      },
    }
    mockDetectArchetype.mockResolvedValue(archetypeResult)

    const response = await app.inject({
      method: 'POST',
      url: '/agent/archetype',
      headers: { 'x-user-id': 'test-user-id' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['x-request-id']).toBeDefined()
    expect(typeof response.headers['x-request-id']).toBe('string')
    expect((response.headers['x-request-id'] as string).length).toBeGreaterThan(0)
  })

  it('POST /agent/archetype with ip_specialist badge returns correct badge', async () => {
    const archetypeResult = {
      success: true,
      data: {
        name: 'IP Specialist',
        traits: ['focused', 'dedicated'],
        why: 'You have concentrated your collection in one IP/franchise.',
        comparable_collectors: [],
        share_card_text: 'Deep focus, deep value.',
        // ip_specialist badge — 60%+ of cards from one IP
        share_card_badges: ['ip_specialist'],
      },
    }
    mockDetectArchetype.mockResolvedValue(archetypeResult)

    const response = await app.inject({
      method: 'POST',
      url: '/agent/archetype',
      headers: { 'x-user-id': 'test-user-id' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.share_card_badges).toContain('ip_specialist')
  })

  it('POST /agent/archetype with external_collector badge returns correct badge', async () => {
    const archetypeResult = {
      success: true,
      data: {
        name: 'External Collector',
        traits: ['diversified', 'multi-platform'],
        why: 'You source cards from multiple external platforms.',
        comparable_collectors: [],
        share_card_text: 'Sourcing from everywhere.',
        // external_collector badge — 5+ external cards
        share_card_badges: ['external_collector'],
      },
    }
    mockDetectArchetype.mockResolvedValue(archetypeResult)

    const response = await app.inject({
      method: 'POST',
      url: '/agent/archetype',
      headers: { 'x-user-id': 'test-user-id' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.share_card_badges).toContain('external_collector')
  })

  it('POST /agent/archetype returns 401 when X-User-Id missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/agent/archetype',
    })

    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.body)
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('MISSING_AUTH')
  })
})
