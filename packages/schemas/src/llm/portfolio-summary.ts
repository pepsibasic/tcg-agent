import { z } from 'zod'
import { PriceConfidenceSchema } from '../shared/enums.js'

export const PortfolioSummarySchema = z.object({
  userId: z.string(),
  totalValueEst: z.number(),
  breakdown: z.array(
    z.object({
      ipCategory: z.string(),
      totalValue: z.number(),
      cardCount: z.number(),
      percentOfPortfolio: z.number(),
    })
  ),
  concentrationScore: z.number(),
  liquidityScore: z.number(),
  collectorArchetype: z.union([z.string(), z.null()]),
  missingSetGoals: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  priceDataAsOf: z.union([z.string(), z.null()]),
  priceConfidence: PriceConfidenceSchema,
})

export type PortfolioSummary = z.infer<typeof PortfolioSummarySchema>

/** Schema for LLM-generated fields only. Orchestrator merges DB-computed fields after. */
export const PortfolioSummaryLLMSchema = z.object({
  concentrationScore: z.number(),
  liquidityScore: z.number(),
  collectorArchetype: z.union([z.string(), z.null()]),
  missingSetGoals: z.array(z.string()),
  recommendedActions: z.array(z.string()),
})

export type PortfolioSummaryLLM = z.infer<typeof PortfolioSummaryLLMSchema>
