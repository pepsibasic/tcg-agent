// Frontend types mirroring API response shapes from @tcg/schemas

export type PriceConfidence = 'LIVE' | 'RECENT_24H' | 'STALE_7D' | 'NO_DATA'
export type CardState = 'VAULTED' | 'EXTERNAL' | 'ON_MARKET' | 'IN_TRANSIT'
export type ActionType =
  | 'BUYBACK'
  | 'LIST'
  | 'REDEEM'
  | 'SHIP_TO_VAULT'
  | 'OPEN_PACK'
  | 'WATCHLIST'
  | 'BUNDLE_SHIP'

export interface Action {
  type: ActionType
  params: Record<string, unknown> | null
  ui_copy: string
  risk_notes: string | null
}

export interface PriceBand {
  low: number
  high: number
  currency: string
}

export interface CardAnalysisResponse {
  card_id: string
  identity_tags: string[]
  rarity_signal: string
  liquidity_signal: string
  price_band: PriceBand | null
  reasoning_bullets: string[]
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  actions: Action[]
  priceConfidence: PriceConfidence
  priceFetchedAt: string | null
  degraded?: boolean
}

export interface PortfolioBreakdown {
  ipCategory: string
  totalValue: number
  cardCount: number
  percentOfPortfolio: number
}

export interface PortfolioSummaryResponse {
  userId: string
  totalValueEst: number
  breakdown: PortfolioBreakdown[]
  concentrationScore: number
  liquidityScore: number
  collectorArchetype: string | null
  missingSetGoals: string[]
  recommendedActions: string[]
  priceDataAsOf: string | null
  priceConfidence: PriceConfidence
}

export interface ArchetypeResponse {
  name: string
  traits: string[]
  why: string
  comparable_collectors: string[]
  share_card_text: string
  share_card_badges: string[]
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
  }
}
