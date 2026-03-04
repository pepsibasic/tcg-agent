import { z } from 'zod'

export const ActionTypeSchema = z.enum([
  'BUYBACK',
  'LIST',
  'REDEEM',
  'SHIP_TO_VAULT',
  'OPEN_PACK',
  'WATCHLIST',
  'BUNDLE_SHIP',
])

export type ActionType = z.infer<typeof ActionTypeSchema>

export const ActionSchema = z.object({
  type: ActionTypeSchema,
  params: z.union([z.record(z.unknown()), z.null()]),
  ui_copy: z.string(),
  risk_notes: z.union([z.string(), z.null()]),
})

export type Action = z.infer<typeof ActionSchema>
