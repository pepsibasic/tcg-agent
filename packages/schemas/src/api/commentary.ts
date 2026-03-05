import { z } from 'zod'
import { ActionSchema } from '../llm/action.js'
import { CommentaryModeSchema } from '../shared/enums.js'

export const NextBestMoveSchema = z.object({
  title: z.string(),
  rationale: z.string(),
  action: ActionSchema,
})
export type NextBestMove = z.infer<typeof NextBestMoveSchema>

export const AgentCommentarySchema = z.object({
  mode: CommentaryModeSchema,
  headline: z.string(),
  bullets: z.array(z.string()),
  next_best_moves: z.array(NextBestMoveSchema),
})
export type AgentCommentary = z.infer<typeof AgentCommentarySchema>

export const NarrativeSchema = z.object({
  mode: CommentaryModeSchema,
  headline: z.string(),
  bullets: z.array(z.string()),
  what_people_do: z.array(z.string()).optional(),
})
export type Narrative = z.infer<typeof NarrativeSchema>
