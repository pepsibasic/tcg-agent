import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @tcg/db before importing the module under test
vi.mock('@tcg/db', () => ({
  prisma: {
    userCard: {
      findMany: vi.fn(),
    },
    externalCard: {
      findMany: vi.fn(),
    },
    actionsLog: {
      findMany: vi.fn(),
    },
  },
}))

// Mock the LLM generate module
vi.mock('../../llm/generate.js', () => ({
  generateWithRetry: vi.fn(),
}))

// Mock renderPrompt
vi.mock('../../llm/prompts.js', () => ({
  renderPrompt: vi.fn(() => ({ system: 'mock system', user: 'mock user' })),
}))

import { detectArchetype } from '../../orchestrators/archetype.js'
import { prisma } from '@tcg/db'
import { generateWithRetry } from '../../llm/generate.js'

const mockPrisma = vi.mocked(prisma)
const mockGenerateWithRetry = vi.mocked(generateWithRetry)

// Helper to create a userCard mock
function makeUserCard(overrides: Record<string, unknown> = {}) {
  return {
    id: 'uc-' + Math.random(),
    userId: 'user-1',
    cardId: 'card-1',
    state: 'VAULTED',
    estimatedValue: 100,
    priceConfidence: 'LIVE',
    certNumber: null,
    userNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    card: {
      id: 'card-1',
      name: 'Charizard',
      ipCategory: 'pokemon',
      setName: 'Base Set',
      language: 'en',
      grade: null,
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  }
}

function makeExternalCard(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ec-' + Math.random(),
    userId: 'user-1',
    name: 'External Card',
    setName: null,
    grade: null,
    certNumber: null,
    estimatedValue: 50,
    priceConfidence: 'NO_DATA',
    priceFetchedAt: null,
    userNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

function makeActionsLog(overrides: Record<string, unknown> = {}) {
  return {
    id: 'al-' + Math.random(),
    userId: 'user-1',
    cardId: null,
    agentRecommended: {},
    userAction: 'WATCHLIST',
    createdAt: new Date(),
    ...overrides,
  }
}

const validArchetypeData = {
  name: 'The Vault Guardian',
  traits: ['strategic', 'patient', 'value-focused'],
  why: 'You lock your best cards away and wait for the right moment.',
  comparable_collectors: ['Warren Buffett of cards'],
  share_card_text: 'My vault is my fortress.',
  share_card_badges: ['llm_badge_should_be_overridden'],
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: empty actions log
  mockPrisma.actionsLog.findMany.mockResolvedValue([])
})

describe('detectArchetype', () => {
  it('returns full CollectorArchetype when total cards >= 5', async () => {
    // 6 VAULTED userCards + 2 externalCards = 8 total (above threshold)
    mockPrisma.userCard.findMany.mockResolvedValue(
      Array.from({ length: 6 }, () => makeUserCard({ state: 'VAULTED' }))
    )
    mockPrisma.externalCard.findMany.mockResolvedValue(
      Array.from({ length: 2 }, () => makeExternalCard())
    )
    mockGenerateWithRetry.mockResolvedValue({
      success: true,
      data: validArchetypeData,
      complianceViolations: [],
      attempts: 1,
    })

    const result = await detectArchetype('user-1')

    expect(result.success).toBe(true)
    if (result.success && result.data && 'name' in result.data) {
      expect(result.data.name).toBeDefined()
      expect(result.data.traits).toBeDefined()
      expect(result.data.why).toBeDefined()
      expect(result.data.comparable_collectors).toBeDefined()
      expect(result.data.share_card_text).toBeDefined()
      expect(result.data.share_card_badges).toBeDefined()
    }
  })

  it('returns progress nudge when total cards < 5 (below threshold)', async () => {
    // 2 userCards + 1 externalCard = 3 total (below threshold)
    mockPrisma.userCard.findMany.mockResolvedValue(
      Array.from({ length: 2 }, () => makeUserCard())
    )
    mockPrisma.externalCard.findMany.mockResolvedValue(
      Array.from({ length: 1 }, () => makeExternalCard())
    )

    const result = await detectArchetype('user-1')

    expect(result.success).toBe(true)
    if (result.success && 'archetype' in result.data) {
      expect(result.data.archetype).toBeNull()
      expect(result.data.progress).toBe('3/5 cards')
      expect(result.data.message).toContain('Add 2 more cards')
    }
    // LLM should NOT be called for below-threshold
    expect(mockGenerateWithRetry).not.toHaveBeenCalled()
  })

  it('computes vault_builder badge deterministically (10+ VAULTED cards)', async () => {
    // 12 VAULTED userCards = vault_builder threshold met
    mockPrisma.userCard.findMany.mockResolvedValue(
      Array.from({ length: 12 }, () => makeUserCard({ state: 'VAULTED' }))
    )
    mockPrisma.externalCard.findMany.mockResolvedValue([])
    mockGenerateWithRetry.mockResolvedValue({
      success: true,
      data: validArchetypeData,
      complianceViolations: [],
      attempts: 1,
    })

    const result = await detectArchetype('user-1')

    expect(result.success).toBe(true)
    if (result.success && result.data && 'share_card_badges' in result.data) {
      expect(result.data.share_card_badges).toContain('vault_builder')
      // LLM badges should be overridden with deterministic ones
      expect(result.data.share_card_badges).not.toContain('llm_badge_should_be_overridden')
    }
  })

  it('computes ip_specialist badge deterministically (60%+ same IP)', async () => {
    // 4 pokemon out of 6 total userCards = 66.7% => ip_specialist
    const pokemonCards = Array.from({ length: 4 }, () =>
      makeUserCard({ state: 'VAULTED', card: { id: 'card-1', name: 'Pikachu', ipCategory: 'pokemon', setName: null, language: 'en', grade: null, imageUrl: null, createdAt: new Date(), updatedAt: new Date() } })
    )
    const otherCards = Array.from({ length: 2 }, () =>
      makeUserCard({ state: 'VAULTED', card: { id: 'card-2', name: 'Goku', ipCategory: 'dragon-ball', setName: null, language: 'en', grade: null, imageUrl: null, createdAt: new Date(), updatedAt: new Date() } })
    )
    mockPrisma.userCard.findMany.mockResolvedValue([...pokemonCards, ...otherCards])
    mockPrisma.externalCard.findMany.mockResolvedValue([])
    mockGenerateWithRetry.mockResolvedValue({
      success: true,
      data: validArchetypeData,
      complianceViolations: [],
      attempts: 1,
    })

    const result = await detectArchetype('user-1')

    expect(result.success).toBe(true)
    if (result.success && result.data && 'share_card_badges' in result.data) {
      expect(result.data.share_card_badges).toContain('ip_specialist')
    }
  })

  it('computes external_collector badge deterministically (5+ external cards)', async () => {
    // 5 userCards + 5 externalCards = 10 total; 5 external = external_collector
    mockPrisma.userCard.findMany.mockResolvedValue(
      Array.from({ length: 5 }, () => makeUserCard({ state: 'VAULTED' }))
    )
    mockPrisma.externalCard.findMany.mockResolvedValue(
      Array.from({ length: 5 }, () => makeExternalCard())
    )
    mockGenerateWithRetry.mockResolvedValue({
      success: true,
      data: validArchetypeData,
      complianceViolations: [],
      attempts: 1,
    })

    const result = await detectArchetype('user-1')

    expect(result.success).toBe(true)
    if (result.success && result.data && 'share_card_badges' in result.data) {
      expect(result.data.share_card_badges).toContain('external_collector')
    }
  })

  it('returns degraded response with deterministic badges when LLM fails', async () => {
    // 10 VAULTED userCards => vault_builder badge; LLM fails
    mockPrisma.userCard.findMany.mockResolvedValue(
      Array.from({ length: 10 }, () => makeUserCard({ state: 'VAULTED' }))
    )
    mockPrisma.externalCard.findMany.mockResolvedValue([])
    mockGenerateWithRetry.mockResolvedValue({
      success: false,
      failure: {
        status: 'failed',
        reason: 'LLM unavailable',
        partial: null,
        retryable: true,
      },
      attempts: 3,
    })

    const result = await detectArchetype('user-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect((result as { success: true; degraded?: boolean }).degraded).toBe(true)
      if (result.data && 'share_card_badges' in result.data) {
        // Badges survive LLM failure
        expect(result.data.share_card_badges).toContain('vault_builder')
        // Name defaults to something generic
        expect(result.data.name).toBeDefined()
        expect(typeof result.data.name).toBe('string')
      }
    }
  })

  it('calls generateWithRetry when total cards = 5 (exactly at threshold)', async () => {
    // 3 userCards + 2 externalCards = 5 (exactly at threshold — should be included)
    mockPrisma.userCard.findMany.mockResolvedValue(
      Array.from({ length: 3 }, () => makeUserCard({ state: 'VAULTED' }))
    )
    mockPrisma.externalCard.findMany.mockResolvedValue(
      Array.from({ length: 2 }, () => makeExternalCard())
    )
    mockGenerateWithRetry.mockResolvedValue({
      success: true,
      data: validArchetypeData,
      complianceViolations: [],
      attempts: 1,
    })

    await detectArchetype('user-1')

    expect(mockGenerateWithRetry).toHaveBeenCalled()
  })
})
