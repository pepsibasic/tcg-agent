import { z } from 'zod'

export const PriceHistoryRangeSchema = z.enum(['30d', '90d', '1y'])
export type PriceHistoryRange = z.infer<typeof PriceHistoryRangeSchema>

export const PriceHistoryPointSchema = z.object({
  as_of: z.string(),
  price_usd: z.union([z.number(), z.null()]),
})
export type PriceHistoryPoint = z.infer<typeof PriceHistoryPointSchema>

export const PriceHistoryResponseSchema = z.object({
  card_key: z.string(),
  range: PriceHistoryRangeSchema,
  points: z.array(PriceHistoryPointSchema),
  change_1d: z.union([z.number(), z.null()]).optional(),
  change_7d: z.union([z.number(), z.null()]).optional(),
  change_30d: z.union([z.number(), z.null()]).optional(),
})
export type PriceHistoryResponse = z.infer<typeof PriceHistoryResponseSchema>

export const PortfolioChangesRangeSchema = z.enum(['7d', '30d'])
export type PortfolioChangesRange = z.infer<typeof PortfolioChangesRangeSchema>

export const TopMoverSchema = z.object({
  card_key: z.string(),
  title: z.string(),
  delta_usd: z.number(),
  delta_pct: z.union([z.number(), z.null()]),
})
export type TopMover = z.infer<typeof TopMoverSchema>

export const PortfolioChangesResponseSchema = z.object({
  range: PortfolioChangesRangeSchema,
  portfolio_value_today_usd: z.number(),
  portfolio_value_then_usd: z.union([z.number(), z.null()]),
  delta_usd: z.union([z.number(), z.null()]),
  delta_pct: z.union([z.number(), z.null()]),
  coverage_pct: z.number(),
  top_movers: z.array(TopMoverSchema),
})
export type PortfolioChangesResponse = z.infer<typeof PortfolioChangesResponseSchema>
