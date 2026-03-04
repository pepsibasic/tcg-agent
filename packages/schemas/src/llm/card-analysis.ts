import { z } from 'zod'

export const CardAnalysisSchema = z.object({
  card_id: z.string(),
  identity_tags: z.array(z.string()),
  rarity_signal: z.string(),
  liquidity_signal: z.string(),
  price_band: z.union([
    z.object({
      low: z.number(),
      high: z.number(),
      currency: z.string(),
    }),
    z.null(),
  ]),
  reasoning_bullets: z.array(z.string()),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
})

export type CardAnalysis = z.infer<typeof CardAnalysisSchema>
