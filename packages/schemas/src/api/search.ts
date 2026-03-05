import { z } from 'zod'

export const SearchCardItemSchema = z.object({
  card_key: z.string(),
  title: z.string(),
  latest_price_usd: z.number().nullable(),
  change_7d: z.number().nullable(),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE']),
  is_watched: z.boolean(),
})

export type SearchCardItem = z.infer<typeof SearchCardItemSchema>

export const SearchCardsResponseSchema = z.object({
  items: z.array(SearchCardItemSchema),
  query: z.string(),
  total: z.number(),
})

export type SearchCardsResponse = z.infer<typeof SearchCardsResponseSchema>
