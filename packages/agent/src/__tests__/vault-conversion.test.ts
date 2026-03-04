import { describe, it, expect } from 'vitest'
import { ActionSchema } from '@tcg/schemas'
import { computeVaultConversionCandidates } from '../rules/index.js'
import { DEFAULT_CONFIG } from '../rules/types.js'
import type { ExternalCardInput } from '../rules/types.js'

// Fixtures derived from seed data
const highValueCard: ExternalCardInput = {
  id: 'test-001',
  estimatedValue: 180,
  priceConfidence: 'STALE_7D',
  certNumber: null,
  cardName: 'Umbreon VMAX Alt',
}

const lowValueCard: ExternalCardInput = {
  id: 'test-002',
  estimatedValue: 25,
  priceConfidence: 'STALE_7D',
  certNumber: null,
  cardName: 'Snorlax VMAX',
}

const mediumCard: ExternalCardInput = {
  id: 'test-003',
  estimatedValue: 310,
  priceConfidence: 'RECENT_24H',
  certNumber: 'PSA-77234567',
  cardName: 'Zoro Leader',
}

const nullValueCard: ExternalCardInput = {
  id: 'test-004',
  estimatedValue: null,
  priceConfidence: 'NO_DATA',
  certNumber: null,
  cardName: 'Ace Rare',
}

const belowThresholdCard: ExternalCardInput = {
  id: 'test-005',
  estimatedValue: 95,
  priceConfidence: 'STALE_7D',
  certNumber: 'PSA-66234567',
  cardName: 'Blastoise EX',
}

const boundaryCard: ExternalCardInput = {
  id: 'test-006',
  estimatedValue: 100,
  priceConfidence: 'RECENT_24H',
  certNumber: null,
  cardName: 'Charizard Base',
}

const belowBoundaryCard: ExternalCardInput = {
  id: 'test-007',
  estimatedValue: 99,
  priceConfidence: 'RECENT_24H',
  certNumber: null,
  cardName: 'Pikachu Promo',
}

describe('computeVaultConversionCandidates', () => {
  describe('Single-card SHIP_TO_VAULT', () => {
    it('returns SHIP_TO_VAULT for card with estimatedValue=$180', () => {
      const result = computeVaultConversionCandidates([highValueCard])
      const vaultActions = result.filter(a => a.type === 'SHIP_TO_VAULT')
      expect(vaultActions).toHaveLength(1)
    })

    it('returns SHIP_TO_VAULT for card at exactly $100 boundary (>= threshold)', () => {
      const result = computeVaultConversionCandidates([boundaryCard])
      const vaultActions = result.filter(a => a.type === 'SHIP_TO_VAULT')
      expect(vaultActions).toHaveLength(1)
    })

    it('does NOT return SHIP_TO_VAULT for card at $99 (below threshold)', () => {
      const result = computeVaultConversionCandidates([belowBoundaryCard])
      const vaultActions = result.filter(a => a.type === 'SHIP_TO_VAULT')
      expect(vaultActions).toHaveLength(0)
    })

    it('does NOT return SHIP_TO_VAULT for card at $25', () => {
      const result = computeVaultConversionCandidates([lowValueCard])
      const vaultActions = result.filter(a => a.type === 'SHIP_TO_VAULT')
      expect(vaultActions).toHaveLength(0)
    })

    it('does NOT return SHIP_TO_VAULT for card with estimatedValue=null', () => {
      const result = computeVaultConversionCandidates([nullValueCard])
      const vaultActions = result.filter(a => a.type === 'SHIP_TO_VAULT')
      expect(vaultActions).toHaveLength(0)
    })

    it('SHIP_TO_VAULT params include cardValue, unlocks (3 strings), batchEligible=false at single-card level', () => {
      const result = computeVaultConversionCandidates([highValueCard])
      const action = result.find(a => a.type === 'SHIP_TO_VAULT')
      expect(action).toBeDefined()
      const params = action!.params as { cardValue: number; unlocks: string[]; batchEligible: boolean }
      expect(params.cardValue).toBe(180)
      expect(params.unlocks).toHaveLength(3)
      expect(params.batchEligible).toBe(false)
    })

    it('SHIP_TO_VAULT ui_copy contains "Ship to Vault" and card value', () => {
      const result = computeVaultConversionCandidates([highValueCard])
      const action = result.find(a => a.type === 'SHIP_TO_VAULT')
      expect(action!.ui_copy).toContain('Ship to Vault')
      expect(action!.ui_copy).toContain('180')
    })

    it('SHIP_TO_VAULT ui_copy contains card name for context', () => {
      const result = computeVaultConversionCandidates([highValueCard])
      const action = result.find(a => a.type === 'SHIP_TO_VAULT')
      expect(action!.ui_copy).toContain('Umbreon VMAX Alt')
    })

    it('SHIP_TO_VAULT risk_notes is null (benefit-forward, not pushy)', () => {
      const result = computeVaultConversionCandidates([highValueCard])
      const action = result.find(a => a.type === 'SHIP_TO_VAULT')
      expect(action!.risk_notes).toBeNull()
    })

    it('custom config with threshold=$50: card at $75 returns SHIP_TO_VAULT', () => {
      const customCard: ExternalCardInput = {
        id: 'test-custom',
        estimatedValue: 75,
        priceConfidence: 'RECENT_24H',
        certNumber: null,
        cardName: 'Custom Card',
      }
      const customConfig = { ...DEFAULT_CONFIG, vaultSingleCardThreshold: 50 }
      const result = computeVaultConversionCandidates([customCard], customConfig)
      const vaultActions = result.filter(a => a.type === 'SHIP_TO_VAULT')
      expect(vaultActions).toHaveLength(1)
    })
  })

  describe('VAULT-02 unlock reasons', () => {
    it('every SHIP_TO_VAULT action unlocks array has exactly 3 elements', () => {
      const result = computeVaultConversionCandidates([highValueCard])
      const action = result.find(a => a.type === 'SHIP_TO_VAULT')
      const params = action!.params as { unlocks: string[] }
      expect(params.unlocks).toHaveLength(3)
    })

    it('unlocks include "instant liquidity" language', () => {
      const result = computeVaultConversionCandidates([highValueCard])
      const action = result.find(a => a.type === 'SHIP_TO_VAULT')
      const params = action!.params as { unlocks: string[] }
      expect(params.unlocks.some(u => u.toLowerCase().includes('instant liquidity'))).toBe(true)
    })

    it('unlocks include "trade into packs" language', () => {
      const result = computeVaultConversionCandidates([highValueCard])
      const action = result.find(a => a.type === 'SHIP_TO_VAULT')
      const params = action!.params as { unlocks: string[] }
      expect(params.unlocks.some(u => u.toLowerCase().includes('trade into packs'))).toBe(true)
    })

    it('unlocks include "verified" or "ranking" language', () => {
      const result = computeVaultConversionCandidates([highValueCard])
      const action = result.find(a => a.type === 'SHIP_TO_VAULT')
      const params = action!.params as { unlocks: string[] }
      expect(
        params.unlocks.some(u => u.toLowerCase().includes('verified') || u.toLowerCase().includes('ranking')),
      ).toBe(true)
    })

    it('unlocks contain card-specific value when estimatedValue is available', () => {
      const result = computeVaultConversionCandidates([highValueCard])
      const action = result.find(a => a.type === 'SHIP_TO_VAULT')
      const params = action!.params as { unlocks: string[] }
      // Should mention the ~$180 value
      expect(params.unlocks.some(u => u.includes('180'))).toBe(true)
    })
  })

  describe('Batch BUNDLE_SHIP', () => {
    it('5 external cards (all under $100): BUNDLE_SHIP triggered (count threshold)', () => {
      const fiveCards: ExternalCardInput[] = Array.from({ length: 5 }, (_, i) => ({
        id: `card-${i}`,
        estimatedValue: 50,
        priceConfidence: 'STALE_7D' as const,
        certNumber: null,
        cardName: `Card ${i}`,
      }))
      const result = computeVaultConversionCandidates(fiveCards)
      const bundleActions = result.filter(a => a.type === 'BUNDLE_SHIP')
      expect(bundleActions).toHaveLength(1)
    })

    it('6 external cards: BUNDLE_SHIP triggered', () => {
      const sixCards: ExternalCardInput[] = Array.from({ length: 6 }, (_, i) => ({
        id: `card-${i}`,
        estimatedValue: 50,
        priceConfidence: 'STALE_7D' as const,
        certNumber: null,
        cardName: `Card ${i}`,
      }))
      const result = computeVaultConversionCandidates(sixCards)
      const bundleActions = result.filter(a => a.type === 'BUNDLE_SHIP')
      expect(bundleActions).toHaveLength(1)
    })

    it('4 external cards: NO BUNDLE_SHIP (under count threshold)', () => {
      const fourCards: ExternalCardInput[] = Array.from({ length: 4 }, (_, i) => ({
        id: `card-${i}`,
        estimatedValue: 50,
        priceConfidence: 'STALE_7D' as const,
        certNumber: null,
        cardName: `Card ${i}`,
      }))
      const result = computeVaultConversionCandidates(fourCards)
      const bundleActions = result.filter(a => a.type === 'BUNDLE_SHIP')
      expect(bundleActions).toHaveLength(0)
    })

    it('3 external cards totaling $600: BUNDLE_SHIP triggered (value threshold)', () => {
      const threeHighValueCards: ExternalCardInput[] = [
        { id: 'h1', estimatedValue: 200, priceConfidence: 'RECENT_24H', certNumber: null, cardName: 'Card A' },
        { id: 'h2', estimatedValue: 200, priceConfidence: 'RECENT_24H', certNumber: null, cardName: 'Card B' },
        { id: 'h3', estimatedValue: 200, priceConfidence: 'RECENT_24H', certNumber: null, cardName: 'Card C' },
      ]
      const result = computeVaultConversionCandidates(threeHighValueCards)
      const bundleActions = result.filter(a => a.type === 'BUNDLE_SHIP')
      expect(bundleActions).toHaveLength(1)
    })

    it('3 external cards totaling $499: NO BUNDLE_SHIP (under both thresholds)', () => {
      const threeCards: ExternalCardInput[] = [
        { id: 'l1', estimatedValue: 166, priceConfidence: 'RECENT_24H', certNumber: null, cardName: 'Card A' },
        { id: 'l2', estimatedValue: 166, priceConfidence: 'RECENT_24H', certNumber: null, cardName: 'Card B' },
        { id: 'l3', estimatedValue: 167, priceConfidence: 'RECENT_24H', certNumber: null, cardName: 'Card C' },
      ]
      const result = computeVaultConversionCandidates(threeCards)
      const bundleActions = result.filter(a => a.type === 'BUNDLE_SHIP')
      expect(bundleActions).toHaveLength(0)
    })

    it('BUNDLE_SHIP params: cardCount, totalValue, estimatedSavings = (cardCount - 1) * bundleShipSavingsPerCard', () => {
      const fiveCards: ExternalCardInput[] = Array.from({ length: 5 }, (_, i) => ({
        id: `card-${i}`,
        estimatedValue: 50,
        priceConfidence: 'STALE_7D' as const,
        certNumber: null,
        cardName: `Card ${i}`,
      }))
      const result = computeVaultConversionCandidates(fiveCards)
      const action = result.find(a => a.type === 'BUNDLE_SHIP')
      expect(action).toBeDefined()
      const params = action!.params as { cardCount: number; totalValue: number; estimatedSavings: number }
      expect(params.cardCount).toBe(5)
      expect(params.totalValue).toBe(250) // 5 * 50
      expect(params.estimatedSavings).toBe(20) // (5 - 1) * 5
    })

    it('BUNDLE_SHIP ui_copy: "Bundle Ship to Vault — Ship N cards together and save ~$X"', () => {
      const fiveCards: ExternalCardInput[] = Array.from({ length: 5 }, (_, i) => ({
        id: `card-${i}`,
        estimatedValue: 50,
        priceConfidence: 'STALE_7D' as const,
        certNumber: null,
        cardName: `Card ${i}`,
      }))
      const result = computeVaultConversionCandidates(fiveCards)
      const action = result.find(a => a.type === 'BUNDLE_SHIP')
      expect(action!.ui_copy).toContain('Bundle Ship to Vault')
      expect(action!.ui_copy).toContain('5')
      expect(action!.ui_copy).toContain('save')
    })

    it('BUNDLE_SHIP risk_notes is null', () => {
      const fiveCards: ExternalCardInput[] = Array.from({ length: 5 }, (_, i) => ({
        id: `card-${i}`,
        estimatedValue: 50,
        priceConfidence: 'STALE_7D' as const,
        certNumber: null,
        cardName: `Card ${i}`,
      }))
      const result = computeVaultConversionCandidates(fiveCards)
      const action = result.find(a => a.type === 'BUNDLE_SHIP')
      expect(action!.risk_notes).toBeNull()
    })

    it('custom config with batchCardCountThreshold=3: 3 cards triggers BUNDLE_SHIP', () => {
      const threeCards: ExternalCardInput[] = Array.from({ length: 3 }, (_, i) => ({
        id: `card-${i}`,
        estimatedValue: 50,
        priceConfidence: 'STALE_7D' as const,
        certNumber: null,
        cardName: `Card ${i}`,
      }))
      const customConfig = { ...DEFAULT_CONFIG, batchCardCountThreshold: 3 }
      const result = computeVaultConversionCandidates(threeCards, customConfig)
      const bundleActions = result.filter(a => a.type === 'BUNDLE_SHIP')
      expect(bundleActions).toHaveLength(1)
    })
  })

  describe('Mixed scenario', () => {
    it('5 cards with mixed values: SHIP_TO_VAULT for $180 and $310, BUNDLE_SHIP for all 5', () => {
      // $180 (highValueCard), $95 (belowThresholdCard), $310 (mediumCard), $25 (lowValueCard), $75 card
      const seventyFiveCard: ExternalCardInput = {
        id: 'test-075',
        estimatedValue: 75,
        priceConfidence: 'STALE_7D',
        certNumber: null,
        cardName: 'Raichu Holo',
      }
      const fiveMixedCards = [highValueCard, belowThresholdCard, mediumCard, lowValueCard, seventyFiveCard]
      const result = computeVaultConversionCandidates(fiveMixedCards)

      // SHIP_TO_VAULT only for $180 and $310
      const vaultActions = result.filter(a => a.type === 'SHIP_TO_VAULT')
      expect(vaultActions).toHaveLength(2)

      const vaultValues = vaultActions.map(a => (a.params as { cardValue: number }).cardValue).sort((x, y) => x - y)
      expect(vaultValues).toEqual([180, 310])

      // BUNDLE_SHIP triggered (5 cards = count threshold)
      const bundleActions = result.filter(a => a.type === 'BUNDLE_SHIP')
      expect(bundleActions).toHaveLength(1)

      const bundleParams = bundleActions[0]!.params as { cardCount: number }
      expect(bundleParams.cardCount).toBe(5)
    })

    it('empty cards array: returns [] (no actions)', () => {
      const result = computeVaultConversionCandidates([])
      expect(result).toHaveLength(0)
    })

    it('single card below threshold: returns [] (no single or batch actions)', () => {
      const result = computeVaultConversionCandidates([lowValueCard])
      expect(result).toHaveLength(0)
    })
  })

  describe('Identity trigger stub', () => {
    it('identity-based vault trigger is always false — no additional SHIP_TO_VAULT from identity matching', () => {
      // Even with cards that might trigger identity match, only value-based filtering applies
      const result = computeVaultConversionCandidates([belowThresholdCard])
      const vaultActions = result.filter(a => a.type === 'SHIP_TO_VAULT')
      // belowThresholdCard ($95) should NOT get SHIP_TO_VAULT from identity trigger
      expect(vaultActions).toHaveLength(0)
    })
  })

  describe('ActionSchema validation', () => {
    it('every action returned validates against ActionSchema.parse() without throwing', () => {
      const fiveCards: ExternalCardInput[] = [highValueCard, lowValueCard, mediumCard, belowThresholdCard, nullValueCard]
      const result = computeVaultConversionCandidates(fiveCards)
      expect(() => {
        for (const action of result) {
          ActionSchema.parse(action)
        }
      }).not.toThrow()
    })

    it('validates mixed scenario actions against ActionSchema', () => {
      const seventyFiveCard: ExternalCardInput = {
        id: 'test-075',
        estimatedValue: 75,
        priceConfidence: 'STALE_7D',
        certNumber: null,
        cardName: 'Raichu Holo',
      }
      const result = computeVaultConversionCandidates(
        [highValueCard, belowThresholdCard, mediumCard, lowValueCard, seventyFiveCard],
      )
      expect(() => {
        for (const action of result) {
          ActionSchema.parse(action)
        }
      }).not.toThrow()
    })
  })
})
