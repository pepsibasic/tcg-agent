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

export const PortfolioSummaryResponseSchema = PortfolioSummarySchema.extend({
  recommended_actions: z.array(ActionSchema),
  agent_commentary: AgentCommentarySchema,
  top_cards: z.array(TopCardSchema).optional(),
  portfolio_value_market: z.number().optional(),
  portfolio_value_liquidity: z.number().optional(),
})

export type PortfolioSummaryResponse = z.infer<typeof PortfolioSummaryResponseSchema>
