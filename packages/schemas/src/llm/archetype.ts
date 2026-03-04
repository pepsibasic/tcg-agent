import { z } from 'zod'

export const CollectorArchetypeSchema = z.object({
  name: z.string(),
  traits: z.array(z.string()),
  why: z.string(),
  comparable_collectors: z.array(z.string()),
  share_card_text: z.string(),
  share_card_badges: z.array(z.string()),
})

export type CollectorArchetype = z.infer<typeof CollectorArchetypeSchema>
