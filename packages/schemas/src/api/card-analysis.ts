import { z } from 'zod'
import { CardAnalysisSchema } from '../llm/card-analysis.js'
import { ActionSchema } from '../llm/action.js'
import { PriceConfidenceSchema } from '../shared/enums.js'
import { NarrativeSchema } from './commentary.js'

export const CardAnalysisResponseSchema = CardAnalysisSchema.extend({
  actions: z.array(ActionSchema),
  priceConfidence: PriceConfidenceSchema,
  priceFetchedAt: z.union([z.string(), z.null()]),
  degraded: z.boolean().optional(),
  narrative: NarrativeSchema,
})

export type CardAnalysisResponse = z.infer<typeof CardAnalysisResponseSchema>
