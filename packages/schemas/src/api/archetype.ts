import { z } from 'zod'
import { CollectorArchetypeSchema } from '../llm/archetype.js'

export const ArchetypeResponseSchema = CollectorArchetypeSchema

export type ArchetypeResponse = z.infer<typeof ArchetypeResponseSchema>
