// Shared enums
export { CardStateSchema, PriceConfidenceSchema, CommentaryModeSchema } from './shared/enums.js'
export type { CardState, PriceConfidence, CommentaryMode } from './shared/enums.js'

// LLM-facing schemas
export { CardAnalysisSchema } from './llm/card-analysis.js'
export type { CardAnalysis } from './llm/card-analysis.js'

export { PortfolioSummarySchema } from './llm/portfolio-summary.js'
export type { PortfolioSummary } from './llm/portfolio-summary.js'
export { PortfolioSummaryLLMSchema } from './llm/portfolio-summary.js'
export type { PortfolioSummaryLLM } from './llm/portfolio-summary.js'

export { CollectorArchetypeSchema } from './llm/archetype.js'
export type { CollectorArchetype } from './llm/archetype.js'

export { ActionSchema, ActionTypeSchema } from './llm/action.js'
export type { Action, ActionType } from './llm/action.js'

// Commentary schemas
export { AgentCommentarySchema, NarrativeSchema, NextBestMoveSchema } from './api/commentary.js'
export type { AgentCommentary, Narrative, NextBestMove } from './api/commentary.js'

// API-facing schemas
export { CardAnalysisResponseSchema } from './api/card-analysis.js'
export type { CardAnalysisResponse } from './api/card-analysis.js'

export { PortfolioSummaryResponseSchema, TopCardSchema, DecisionSignalSchema } from './api/portfolio-summary.js'
export type { PortfolioSummaryResponse, TopCard, DecisionSignal } from './api/portfolio-summary.js'

export { ArchetypeResponseSchema } from './api/archetype.js'
export type { ArchetypeResponse } from './api/archetype.js'

export {
  WatchlistEntrySchema,
  WatchlistResponseSchema,
  AlertEventSchema,
  AlertEventsResponseSchema,
} from './api/watchlist.js'
export type {
  WatchlistEntry,
  WatchlistResponse,
  AlertEventDTO,
  AlertEventsResponse,
} from './api/watchlist.js'

export {
  PriceHistoryRangeSchema,
  PriceHistoryPointSchema,
  PriceHistoryResponseSchema,
  PortfolioChangesRangeSchema,
  TopMoverSchema,
  PortfolioChangesResponseSchema,
} from './api/price-history.js'
export type {
  PriceHistoryRange,
  PriceHistoryPoint,
  PriceHistoryResponse,
  PortfolioChangesRange,
  TopMover,
  PortfolioChangesResponse,
} from './api/price-history.js'

export {
  SearchCardItemSchema,
  SearchCardsResponseSchema,
} from './api/search.js'
export type {
  SearchCardItem,
  SearchCardsResponse,
} from './api/search.js'
