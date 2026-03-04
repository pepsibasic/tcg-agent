import type { CardState, PriceConfidence } from '@tcg/schemas'

export interface RulesEngineInput {
  card: {
    state: CardState
    estimatedValue: number | null   // Already coerced from Prisma Decimal
    priceConfidence: PriceConfidence
    certNumber: string | null
  }
  context: {
    hasActiveListing: boolean        // True if card has ACTIVE marketplace listing
    packContext: boolean             // True if card came from a pack pull (enables OPEN_PACK)
  }
}

export interface RulesEngineConfig {
  vaultSingleCardThreshold: number   // Default: 100 (USD)
  batchCardCountThreshold: number    // Default: 5 cards
  batchTotalValueThreshold: number   // Default: 500 (USD)
  bundleShipSavingsPerCard: number   // Default: 5 (USD) per additional card
}

export const DEFAULT_CONFIG: RulesEngineConfig = {
  vaultSingleCardThreshold: 100,
  batchCardCountThreshold: 5,
  batchTotalValueThreshold: 500,
  bundleShipSavingsPerCard: 5,
}

export interface ListParams {
  suggestedPrice: number
  priceConfidence: PriceConfidence
  currency: string
}

export interface BuybackParams {
  estimatedBuybackValue: number
  priceConfidence: PriceConfidence
}

export interface ShipToVaultParams {
  cardValue: number
  unlocks: string[]
  batchEligible: boolean
}

export interface BundleShipParams {
  cardCount: number
  totalValue: number
  estimatedSavings: number
}

export interface RedeemParams {
  certNumber: string | null
}

export interface OpenPackParams {
  packId: string | null  // Pack context ID if available
}

export interface WatchlistParams {}  // No data needed

export interface ExternalCardInput {
  id: string
  estimatedValue: number | null  // Already coerced from Prisma Decimal
  priceConfidence: PriceConfidence
  certNumber: string | null
  cardName: string              // For dynamic ui_copy
}
