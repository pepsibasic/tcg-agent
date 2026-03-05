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

export type CommentaryMode = 'LLM' | 'BASIC'

export interface NextBestMove {
  title: string
  rationale: string
  action: Action
}

export interface AgentCommentary {
  mode: CommentaryMode
  headline: string
  bullets: string[]
  next_best_moves: NextBestMove[]
}

export interface Narrative {
  mode: CommentaryMode
  headline: string
  bullets: string[]
  what_people_do?: string[]
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
  narrative?: Narrative
}

export interface PortfolioBreakdown {
  ipCategory: string
  totalValue: number
  cardCount: number
  percentOfPortfolio: number
}

export type PriceConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'

export interface TopCard {
  id: string
  title: string
  grade: string | null
  state: 'VAULTED' | 'EXTERNAL'
  market_price: number | null
  buyback_price: number | null
  confidence: PriceConfidenceLevel
}

export type SignalType = 'SELL_STRENGTH' | 'HOLD_DIP' | 'DIVERSIFY' | 'UNLOCK_LIQUIDITY'

export interface DecisionSignal {
  type: SignalType
  title: string
  body: string
  severity: 'info' | 'warning'
  related_card_id?: string
  suggested_action?: Action
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
  recommended_actions?: Action[]
  agent_commentary?: AgentCommentary
  priceDataAsOf: string | null
  priceConfidence: PriceConfidence
  top_cards?: TopCard[]
  portfolio_value_market?: number
  portfolio_value_liquidity?: number
  liquidity_score?: number
  liquidity_level?: 'HIGH' | 'MEDIUM' | 'LOW'
  concentration_pct?: number
  concentration_level?: 'LOW' | 'MEDIUM' | 'HIGH'
  top_category?: string
  signals?: DecisionSignal[]
}

export interface ArchetypeResponse {
  name: string
  traits: string[]
  why: string
  comparable_collectors: string[]
  share_card_text: string
  share_card_badges: string[]
}

export interface PriceHistoryPoint {
  as_of: string
  price_usd: number | null
}

export interface PriceHistoryResponse {
  card_key: string
  range: '30d' | '90d' | '1y'
  points: PriceHistoryPoint[]
  change_1d?: number | null
  change_7d?: number | null
  change_30d?: number | null
}

export interface TopMover {
  card_key: string
  title: string
  delta_usd: number
  delta_pct: number | null
}

export interface PortfolioChangesResponse {
  range: '7d' | '30d'
  portfolio_value_today_usd: number
  portfolio_value_then_usd: number | null
  delta_usd: number | null
  delta_pct: number | null
  coverage_pct: number
  top_movers: TopMover[]
}

export interface MarketMover {
  card_key: string
  title: string
  price: number
  change_pct: number
}

export interface MarketMoverEntry {
  card_key: string
  title: string
  price: number
}

export interface MarketMoversResponse {
  top_gainers: MarketMover[]
  top_losers: MarketMover[]
  most_valuable: MarketMoverEntry[]
}

export interface WatchlistEntry {
  card_key: string
  title?: string
  latest_price_usd?: number | null
  change_7d?: number | null
  sparkline_30d?: number[]
}

export interface WatchlistResponse {
  items: WatchlistEntry[]
}

export interface AlertEventDTO {
  id: string
  type: string
  card_key?: string | null
  title: string
  body: string
  triggered_at: string
  status: 'NEW' | 'SEEN'
}

export interface AlertEventsResponse {
  events: AlertEventDTO[]
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
  }
}
