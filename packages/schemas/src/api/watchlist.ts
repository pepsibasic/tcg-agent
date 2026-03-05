import { z } from 'zod'

export const WatchlistEntrySchema = z.object({
  card_key: z.string(),
  title: z.string().optional(),
  latest_price_usd: z.number().nullable().optional(),
  change_7d: z.number().nullable().optional(),
  sparkline_30d: z.array(z.number()).optional(),
})

export type WatchlistEntry = z.infer<typeof WatchlistEntrySchema>

export const WatchlistResponseSchema = z.object({
  items: z.array(WatchlistEntrySchema),
})

export type WatchlistResponse = z.infer<typeof WatchlistResponseSchema>

export const AlertEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  card_key: z.string().nullable().optional(),
  title: z.string(),
  body: z.string(),
  triggered_at: z.string(),
  status: z.enum(['NEW', 'SEEN']),
})

export type AlertEventDTO = z.infer<typeof AlertEventSchema>

export const AlertEventsResponseSchema = z.object({
  events: z.array(AlertEventSchema),
})

export type AlertEventsResponse = z.infer<typeof AlertEventsResponseSchema>
