import { z } from 'zod'
import { PortfolioSummarySchema } from '../llm/portfolio-summary.js'
import { ActionSchema } from '../llm/action.js'
import { AgentCommentarySchema } from './commentary.js'

export const PortfolioSummaryResponseSchema = PortfolioSummarySchema.extend({
  recommended_actions: z.array(ActionSchema),
  agent_commentary: AgentCommentarySchema,
})

export type PortfolioSummaryResponse = z.infer<typeof PortfolioSummaryResponseSchema>
