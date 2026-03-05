import { describe, it, expect, vi, beforeEach } from 'vitest'
import { summarizePortfolio } from '../../orchestrators/portfolio-summary.js'

// Mock @tcg/db
vi.mock('@tcg/db', () => ({
  prisma: {
    userCard: {
      findMany: vi.fn(),
    },
    externalCard: {
      findMany: vi.fn(),
    },
  },
}))

// Mock generateWithRetry
vi.mock('../../llm/generate.js', () => ({
  generateWithRetry: vi.fn(),
}))

// Mock renderPrompt
vi.mock('../../llm/prompts.js', () => ({
  renderPrompt: vi.fn(() => ({ system: 'system prompt', user: 'user prompt' })),
}))

// Mock pricing service
vi.mock('../../services/pricing-service.js', () => ({
  getCardPrice: vi.fn(async () => ({
    market_price: null,
    buyback_price: null,
    confidence: 'NONE',
    source: 'seed',
    updated_at: new Date().toISOString(),
  })),
}))

import { prisma } from '@tcg/db'
import { generateWithRetry } from '../../llm/generate.js'
import { renderPrompt } from '../../llm/prompts.js'

const mockUserCardFindMany = vi.mocked(prisma.userCard.findMany)
const mockExternalCardFindMany = vi.mocked(prisma.externalCard.findMany)
const mockGenerateWithRetry = vi.mocked(generateWithRetry)
const mockRenderPrompt = vi.mocked(renderPrompt)

const USER_ID = 'user-abc-123'

// Minimal LLM success response (orchestrator overrides DB-computed fields)
const llmSuccessData = {
  userId: USER_ID,
  totalValueEst: 0, // will be overridden by DB computed
  breakdown: [],    // will be overridden by DB computed
  concentrationScore: 0.6,
  liquidityScore: 0.4,
  collectorArchetype: 'The Vault Guardian',
  missingSetGoals: ['Base Set'],
  recommendedActions: ['Consider diversifying your portfolio'],
  priceDataAsOf: null,
  priceConfidence: 'LIVE' as const,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRenderPrompt.mockReturnValue({ system: 'system prompt', user: 'user prompt' })
})

describe('portfolio-summary orchestrator', () => {
  describe('summarizePortfolio returns full PortfolioSummaryResponse', () => {
    it('returns success:true with complete PortfolioSummaryResponse shape', async () => {
      // 3 VAULTED userCards with card relations (ipCategory)
      mockUserCardFindMany.mockResolvedValueOnce([
        {
          id: 'uc-1',
          userId: USER_ID,
          cardId: 'card-1',
          state: 'VAULTED',
          estimatedValue: { toString: () => '100', toNumber: () => 100 } as any,
          priceFetchedAt: new Date('2026-03-01'),
          priceConfidence: 'LIVE',
          certNumber: 'CERT-1',
          userNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          card: { id: 'card-1', name: 'Charizard', ipCategory: 'Pokemon', setName: 'Base Set', language: 'en', grade: 'PSA 10', imageUrl: null, createdAt: new Date(), updatedAt: new Date() },
        },
        {
          id: 'uc-2',
          userId: USER_ID,
          cardId: 'card-2',
          state: 'VAULTED',
          estimatedValue: { toString: () => '200', toNumber: () => 200 } as any,
          priceFetchedAt: new Date('2026-03-02'),
          priceConfidence: 'LIVE',
          certNumber: 'CERT-2',
          userNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          card: { id: 'card-2', name: 'Blastoise', ipCategory: 'Pokemon', setName: 'Base Set', language: 'en', grade: 'PSA 9', imageUrl: null, createdAt: new Date(), updatedAt: new Date() },
        },
        {
          id: 'uc-3',
          userId: USER_ID,
          cardId: 'card-3',
          state: 'VAULTED',
          estimatedValue: { toString: () => '50', toNumber: () => 50 } as any,
          priceFetchedAt: new Date('2026-03-03'),
          priceConfidence: 'RECENT_24H',
          certNumber: null,
          userNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          card: { id: 'card-3', name: 'Naruto', ipCategory: 'Naruto', setName: null, language: 'en', grade: null, imageUrl: null, createdAt: new Date(), updatedAt: new Date() },
        },
      ] as any)

      // 2 externalCards
      mockExternalCardFindMany.mockResolvedValueOnce([
        {
          id: 'ec-1',
          userId: USER_ID,
          name: 'Pikachu',
          setName: null,
          grade: null,
          certNumber: null,
          estimatedValue: { toString: () => '30', toNumber: () => 30 } as any,
          priceConfidence: 'LIVE',
          priceFetchedAt: new Date('2026-03-02'),
          userNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 'ec-2',
          userId: USER_ID,
          name: 'Luffy',
          setName: null,
          grade: null,
          certNumber: null,
          estimatedValue: { toString: () => '20', toNumber: () => 20 } as any,
          priceConfidence: 'RECENT_24H',
          priceFetchedAt: null,
          userNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ] as any)

      mockGenerateWithRetry.mockResolvedValueOnce({
        success: true,
        data: llmSuccessData,
        complianceViolations: [],
        attempts: 1,
      })

      const result = await summarizePortfolio(USER_ID)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userId).toBe(USER_ID)
        // totalValueEst = 100 + 200 + 50 + 30 + 20 = 400
        expect(result.data.totalValueEst).toBe(400)
        expect(result.data.breakdown).toBeDefined()
        expect(Array.isArray(result.data.breakdown)).toBe(true)
        // At least one breakdown entry
        expect(result.data.breakdown.length).toBeGreaterThan(0)
        // Each entry has required fields
        for (const entry of result.data.breakdown) {
          expect(entry).toHaveProperty('ipCategory')
          expect(entry).toHaveProperty('totalValue')
          expect(entry).toHaveProperty('cardCount')
          expect(entry).toHaveProperty('percentOfPortfolio')
        }
        expect(result.data.concentrationScore).toBeDefined()
        expect(result.data.liquidityScore).toBeDefined()
        expect(result.data.recommendedActions).toBeDefined()
        expect(Array.isArray(result.data.recommendedActions)).toBe(true)
        expect(result.data.priceDataAsOf).toBeDefined()
        expect(result.data.priceConfidence).toBeDefined()
      }
    })
  })

  describe('Portfolio includes both vaulted and external cards', () => {
    it('includes both vaulted and external cards in totalValueEst', async () => {
      // 2 userCards
      mockUserCardFindMany.mockResolvedValueOnce([
        {
          id: 'uc-1', userId: USER_ID, cardId: 'card-1', state: 'VAULTED',
          estimatedValue: { toString: () => '100' } as any,
          priceFetchedAt: new Date('2026-03-01'),
          priceConfidence: 'LIVE',
          certNumber: null, userNotes: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
          card: { id: 'card-1', name: 'Charizard', ipCategory: 'Pokemon', setName: null, language: 'en', grade: null, imageUrl: null, createdAt: new Date(), updatedAt: new Date() },
        },
        {
          id: 'uc-2', userId: USER_ID, cardId: 'card-2', state: 'ON_MARKET',
          estimatedValue: { toString: () => '50' } as any,
          priceFetchedAt: null,
          priceConfidence: 'NO_DATA',
          certNumber: null, userNotes: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
          card: { id: 'card-2', name: 'Mewtwo', ipCategory: 'Pokemon', setName: null, language: 'en', grade: null, imageUrl: null, createdAt: new Date(), updatedAt: new Date() },
        },
      ] as any)

      // 3 externalCards
      mockExternalCardFindMany.mockResolvedValueOnce([
        {
          id: 'ec-1', userId: USER_ID, name: 'Naruto Card', setName: null, grade: null, certNumber: null,
          estimatedValue: { toString: () => '75' } as any,
          priceConfidence: 'LIVE',
          priceFetchedAt: new Date('2026-03-02'),
          userNotes: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
        },
        {
          id: 'ec-2', userId: USER_ID, name: 'One Piece Card', setName: null, grade: null, certNumber: null,
          estimatedValue: { toString: () => '25' } as any,
          priceConfidence: 'RECENT_24H',
          priceFetchedAt: null,
          userNotes: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
        },
        {
          id: 'ec-3', userId: USER_ID, name: 'Yu-Gi-Oh Card', setName: null, grade: null, certNumber: null,
          estimatedValue: { toString: () => '10' } as any,
          priceConfidence: 'STALE_7D',
          priceFetchedAt: null,
          userNotes: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
        },
      ] as any)

      mockGenerateWithRetry.mockResolvedValueOnce({
        success: true,
        data: { ...llmSuccessData },
        complianceViolations: [],
        attempts: 1,
      })

      const result = await summarizePortfolio(USER_ID)

      expect(result.success).toBe(true)
      if (result.success) {
        // totalValueEst = 100 + 50 + 75 + 25 + 10 = 260
        expect(result.data.totalValueEst).toBe(260)
      }

      // Verify cards_json slot was passed to renderPrompt including breakdown data
      expect(mockRenderPrompt).toHaveBeenCalledWith(
        'portfolio_summary',
        expect.objectContaining({
          user_id: USER_ID,
          cards_json: expect.any(String),
          total_count: expect.any(String),
          vaulted_count: expect.any(String),
          external_count: expect.any(String),
        })
      )

      // external_count should be '3'
      const renderCall = mockRenderPrompt.mock.calls[0]!
      expect(renderCall[1].external_count).toBe('3')
      // vaulted_count should be '1' (only VAULTED state)
      expect(renderCall[1].vaulted_count).toBe('1')
    })
  })

  describe('concentrationScore reflects IP over-concentration', () => {
    it('returns breakdown with single entry at 100% when all cards are same IP', async () => {
      // All cards with same ipCategory = 'Pokemon'
      mockUserCardFindMany.mockResolvedValueOnce([
        {
          id: 'uc-1', userId: USER_ID, cardId: 'card-1', state: 'VAULTED',
          estimatedValue: { toString: () => '100' } as any,
          priceFetchedAt: new Date('2026-03-01'),
          priceConfidence: 'LIVE',
          certNumber: null, userNotes: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
          card: { id: 'card-1', name: 'Charizard', ipCategory: 'Pokemon', setName: null, language: 'en', grade: null, imageUrl: null, createdAt: new Date(), updatedAt: new Date() },
        },
        {
          id: 'uc-2', userId: USER_ID, cardId: 'card-2', state: 'VAULTED',
          estimatedValue: { toString: () => '200' } as any,
          priceFetchedAt: new Date('2026-03-01'),
          priceConfidence: 'LIVE',
          certNumber: null, userNotes: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
          card: { id: 'card-2', name: 'Blastoise', ipCategory: 'Pokemon', setName: null, language: 'en', grade: null, imageUrl: null, createdAt: new Date(), updatedAt: new Date() },
        },
        {
          id: 'uc-3', userId: USER_ID, cardId: 'card-3', state: 'ON_MARKET',
          estimatedValue: { toString: () => '50' } as any,
          priceFetchedAt: null,
          priceConfidence: 'NO_DATA',
          certNumber: null, userNotes: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
          card: { id: 'card-3', name: 'Pikachu', ipCategory: 'Pokemon', setName: null, language: 'en', grade: null, imageUrl: null, createdAt: new Date(), updatedAt: new Date() },
        },
      ] as any)

      mockExternalCardFindMany.mockResolvedValueOnce([] as any)

      mockGenerateWithRetry.mockResolvedValueOnce({
        success: true,
        data: { ...llmSuccessData },
        complianceViolations: [],
        attempts: 1,
      })

      const result = await summarizePortfolio(USER_ID)

      expect(result.success).toBe(true)
      if (result.success) {
        // All Pokemon — single breakdown entry
        expect(result.data.breakdown).toHaveLength(1)
        expect(result.data.breakdown[0]!.ipCategory).toBe('Pokemon')
        // percentOfPortfolio = 1.0 (100%)
        expect(result.data.breakdown[0]!.percentOfPortfolio).toBe(1.0)
      }
    })
  })

  describe('Degraded response when LLM fails', () => {
    it('returns success:true with degraded:true and DB-computed fields when LLM fails', async () => {
      mockUserCardFindMany.mockResolvedValueOnce([
        {
          id: 'uc-1', userId: USER_ID, cardId: 'card-1', state: 'VAULTED',
          estimatedValue: { toString: () => '500' } as any,
          priceFetchedAt: new Date('2026-03-01'),
          priceConfidence: 'LIVE',
          certNumber: null, userNotes: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
          card: { id: 'card-1', name: 'Charizard', ipCategory: 'Pokemon', setName: null, language: 'en', grade: null, imageUrl: null, createdAt: new Date(), updatedAt: new Date() },
        },
      ] as any)

      mockExternalCardFindMany.mockResolvedValueOnce([
        {
          id: 'ec-1', userId: USER_ID, name: 'Naruto', setName: null, grade: null, certNumber: null,
          estimatedValue: { toString: () => '100' } as any,
          priceConfidence: 'LIVE',
          priceFetchedAt: new Date('2026-03-02'),
          userNotes: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
        },
      ] as any)

      // LLM fails
      mockGenerateWithRetry.mockResolvedValueOnce({
        success: false,
        failure: { status: 'failed', reason: 'LLM API error', partial: null, retryable: true },
        attempts: 3,
      } as any)

      const result = await summarizePortfolio(USER_ID)

      expect(result.success).toBe(true)
      if (result.success) {
        // degraded flag
        expect(result.degraded).toBe(true)
        // DB-computed fields intact
        expect(result.data.totalValueEst).toBe(600)
        expect(result.data.breakdown).toBeDefined()
        expect(Array.isArray(result.data.breakdown)).toBe(true)
        // Narrative fields are defaults
        expect(result.data.recommendedActions).toEqual([])
        expect(result.data.missingSetGoals).toEqual([])
        expect(result.data.collectorArchetype).toBeNull()
        // Scores are 0 in degraded mode
        expect(result.data.concentrationScore).toBe(0)
        expect(result.data.liquidityScore).toBe(0)
      }
    })
  })

  describe('Empty portfolio returns zero-value response', () => {
    it('returns totalValueEst:0 and breakdown:[] for empty portfolio', async () => {
      mockUserCardFindMany.mockResolvedValueOnce([] as any)
      mockExternalCardFindMany.mockResolvedValueOnce([] as any)

      mockGenerateWithRetry.mockResolvedValueOnce({
        success: true,
        data: {
          ...llmSuccessData,
          totalValueEst: 0,
          breakdown: [],
          recommendedActions: [],
          missingSetGoals: [],
          collectorArchetype: null,
        },
        complianceViolations: [],
        attempts: 1,
      })

      const result = await summarizePortfolio(USER_ID)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.totalValueEst).toBe(0)
        expect(result.data.breakdown).toEqual([])
      }
    })
  })
})
