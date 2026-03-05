import { z } from 'zod'
import { PortfolioSummarySchema } from '../llm/portfolio-summary.js'
import { ActionSchema } from '../llm/action.js'
import { AgentCommentarySchema } from './commentary.js'
import { CardStateSchema } from '../shared/enums.js'

export const TopCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  grade: z.union([z.string(), z.null()]),
  state: z.enum(['VAULTED', 'EXTERNAL']),
  market_price: z.union([z.number(), z.null()]),
  buyback_price: z.union([z.number(), z.null()]),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE']),
})

export type TopCard = z.infer<typeof TopCardSchema>

export const DecisionSignalSchema = z.object({
  type: z.enum(['SELL_STRENGTH', 'HOLD_DIP', 'DIVERSIFY', 'UNLOCK_LIQUIDITY']),
  title: z.string(),
  body: z.string(),
  severity: z.enum(['info', 'warning']),
  related_card_id: z.string().optional(),
  suggested_action: ActionSchema.optional(),
})

export type DecisionSignal = z.infer<typeof DecisionSignalSchema>

export const PortfolioSummaryResponseSchema = PortfolioSummarySchema.extend({
  recommended_actions: z.array(ActionSchema),
  agent_commentary: AgentCommentarySchema,
  top_cards: z.array(TopCardSchema).optional(),
  portfolio_value_market: z.number().optional(),
  portfolio_value_liquidity: z.number().optional(),
  liquidity_score: z.number().optional(),
  liquidity_level: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  concentration_pct: z.number().optional(),
  concentration_level: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  top_category: z.string().optional(),
  signals: z.array(DecisionSignalSchema).optional(),
})

export type PortfolioSummaryResponse = z.infer<typeof PortfolioSummaryResponseSchema>
