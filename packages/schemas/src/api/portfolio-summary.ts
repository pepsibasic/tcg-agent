import { z } from 'zod'
import { PortfolioSummarySchema } from '../llm/portfolio-summary.js'

export const PortfolioSummaryResponseSchema = PortfolioSummarySchema

export type PortfolioSummaryResponse = z.infer<typeof PortfolioSummaryResponseSchema>
