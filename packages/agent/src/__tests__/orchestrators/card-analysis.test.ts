import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeCard, analyzeCardBatch } from '../../orchestrators/card-analysis.js'

vi.mock('@tcg/db', () => ({
  prisma: {
    userCard: {
      findFirst: vi.fn(),
    },
    actionsLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('../../llm/generate.js', () => ({
  generateWithRetry: vi.fn(),
}))

vi.mock('../../rules/index.js', () => ({
  computeEligibleActions: vi.fn(),
}))

import { prisma } from '@tcg/db'
import { generateWithRetry } from '../../llm/generate.js'
import { computeEligibleActions } from '../../rules/index.js'

const mockFindFirst = vi.mocked(prisma.userCard.findFirst)
const mockGenerateWithRetry = vi.mocked(generateWithRetry)
const mockComputeEligibleActions = vi.mocked(computeEligibleActions)

const WATCHLIST_ACTION = {
  type: 'WATCHLIST' as const,
  ui_copy: 'Watch',
  enabled: true,
  params: {},
}

const SHIP_TO_VAULT_ACTION = {
  type: 'SHIP_TO_VAULT' as const,
  ui_copy: 'Ship to Vault',
  enabled: true,
  params: { cardValue: 100, unlocks: [], batchEligible: false },
}

function makeVaultedCard(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-card-1',
    userId: 'user-1',
    cardId: 'card-1',
    state: 'VAULTED',
    estimatedValue: { toNumber: () => 500, toString: () => '500' } as unknown as never,
    priceFetchedAt: new Date('2026-01-01T00:00:00Z'),
    priceConfidence: 'LIVE',
    certNumber: 'CERT-001',
    userNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    card: {
      id: 'card-1',
      name: 'Charizard',
      ipCategory: 'Pokemon',
      setName: 'Base Set',
      language: 'en',
      grade: 'PSA 10',
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    marketplaceListing: null,
    ...overrides,
  }
}

const VALID_CARD_ANALYSIS = {
  card_id: 'user-card-1',
  identity_tags: ['pokemon', 'holo', 'first-edition'],
  rarity_signal: 'Very rare — top 1% of all Charizard sales',
  liquidity_signal: 'High liquidity — trades frequently on major platforms',
  price_band: { low: 400, high: 600, currency: 'USD' },
  reasoning_bullets: ['Strong demand from collectors', 'Consistent PSA 10 premium'],
  confidence: 'HIGH' as const,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('analyzeCard', () => {
  it('returns full CardAnalysisResponse on LLM success (VAULTED card)', async () => {
    const card = makeVaultedCard()
    mockFindFirst.mockResolvedValueOnce(card as never)
    mockComputeEligibleActions.mockReturnValueOnce([WATCHLIST_ACTION as never])
    mockGenerateWithRetry.mockResolvedValueOnce({
      success: true,
      data: VALID_CARD_ANALYSIS,
      complianceViolations: [],
      attempts: 1,
    })

    const result = await analyzeCard('user-card-1', 'user-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.card_id).toBe('user-card-1')
      expect(result.data.identity_tags).toEqual(['pokemon', 'holo', 'first-edition'])
      expect(result.data.rarity_signal).toBe('Very rare — top 1% of all Charizard sales')
      expect(result.data.liquidity_signal).toBe('High liquidity — trades frequently on major platforms')
      expect(result.data.price_band).toEqual({ low: 400, high: 600, currency: 'USD' })
      expect(result.data.reasoning_bullets).toEqual(['Strong demand from collectors', 'Consistent PSA 10 premium'])
      expect(result.data.confidence).toBe('HIGH')
      expect(result.data.actions).toEqual([WATCHLIST_ACTION])
      expect(result.data.priceConfidence).toBe('LIVE')
      expect(result.data.priceFetchedAt).toBe('2026-01-01T00:00:00.000Z')
      expect(result.data.degraded).toBeUndefined()
    }
  })

  it('calls computeEligibleActions with state=EXTERNAL for external card', async () => {
    const card = makeVaultedCard({ state: 'EXTERNAL' })
    mockFindFirst.mockResolvedValueOnce(card as never)
    mockComputeEligibleActions.mockReturnValueOnce([SHIP_TO_VAULT_ACTION as never, WATCHLIST_ACTION as never])
    mockGenerateWithRetry.mockResolvedValueOnce({
      success: true,
      data: { ...VALID_CARD_ANALYSIS, card_id: 'user-card-1' },
      complianceViolations: [],
      attempts: 1,
    })

    await analyzeCard('user-card-1', 'user-1')

    expect(mockComputeEligibleActions).toHaveBeenCalledWith(
      expect.objectContaining({
        card: expect.objectContaining({ state: 'EXTERNAL' }),
      })
    )
  })

  it('returns degraded response with actions intact on LLM failure', async () => {
    const card = makeVaultedCard()
    mockFindFirst.mockResolvedValueOnce(card as never)
    mockComputeEligibleActions.mockReturnValueOnce([WATCHLIST_ACTION as never])
    mockGenerateWithRetry.mockResolvedValueOnce({
      success: false,
      failure: { status: 'failed', reason: 'validation', partial: null, retryable: true },
      attempts: 3,
    })

    const result = await analyzeCard('user-card-1', 'user-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.degraded).toBe(true)
      expect(result.data.degraded).toBe(true)
      expect(result.data.actions).toEqual([WATCHLIST_ACTION])
      expect(result.data.rarity_signal).toBeNull()
      expect(result.data.reasoning_bullets).toEqual([])
    }
  })

  it('returns not_found when card does not exist', async () => {
    mockFindFirst.mockResolvedValueOnce(null)

    const result = await analyzeCard('nonexistent-id', 'user-1')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.reason).toBe('not_found')
    }
  })

  it('calls computeEligibleActions with hasActiveListing=true when card has ACTIVE listing', async () => {
    const card = makeVaultedCard({
      marketplaceListing: { id: 'listing-1', status: 'ACTIVE', price: 500 },
    })
    mockFindFirst.mockResolvedValueOnce(card as never)
    mockComputeEligibleActions.mockReturnValueOnce([WATCHLIST_ACTION as never])
    mockGenerateWithRetry.mockResolvedValueOnce({
      success: true,
      data: VALID_CARD_ANALYSIS,
      complianceViolations: [],
      attempts: 1,
    })

    await analyzeCard('user-card-1', 'user-1')

    expect(mockComputeEligibleActions).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ hasActiveListing: true }),
      })
    )
  })
})

describe('analyzeCardBatch', () => {
  it('processes multiple cards with packContext=true for pack_pull source', async () => {
    const card1 = makeVaultedCard({ id: 'id1' })
    const card2 = makeVaultedCard({ id: 'id2' })
    mockFindFirst
      .mockResolvedValueOnce(card1 as never)
      .mockResolvedValueOnce(card2 as never)
    mockComputeEligibleActions.mockReturnValue([WATCHLIST_ACTION as never])
    mockGenerateWithRetry.mockResolvedValue({
      success: true,
      data: VALID_CARD_ANALYSIS,
      complianceViolations: [],
      attempts: 1,
    })

    const results = await analyzeCardBatch(['id1', 'id2'], 'user-1', { source: 'pack_pull' })

    expect(results).toHaveLength(2)
    // Both calls should have packContext=true
    const calls = mockComputeEligibleActions.mock.calls
    expect(calls).toHaveLength(2)
    for (const call of calls) {
      expect(call[0]).toMatchObject({
        context: expect.objectContaining({ packContext: true }),
      })
    }
  })
})
