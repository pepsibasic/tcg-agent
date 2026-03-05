import { z } from 'zod'

export const CardStateSchema = z.enum(['VAULTED', 'EXTERNAL', 'ON_MARKET', 'IN_TRANSIT'])
export type CardState = z.infer<typeof CardStateSchema>

export const PriceConfidenceSchema = z.enum(['LIVE', 'RECENT_24H', 'STALE_7D', 'NO_DATA'])
export type PriceConfidence = z.infer<typeof PriceConfidenceSchema>

export const CommentaryModeSchema = z.enum(['LLM', 'BASIC'])
export type CommentaryMode = z.infer<typeof CommentaryModeSchema>
