import { describe, it, expect } from 'vitest'
import { CollectorArchetypeSchema } from '../llm/archetype.js'

describe('CollectorArchetypeSchema', () => {
  const validArchetype = {
    name: 'The Set Completionist',
    traits: ['methodical', 'patient', 'detail-oriented'],
    why: 'You focus on completing full sets rather than chasing individual high-value cards',
    comparable_collectors: ['Stamp collectors who complete series', 'Book collectors who complete first editions'],
    share_card_text: 'I am The Set Completionist! I methodically complete full sets.',
    share_card_badges: ['Completionist', 'Methodical', 'Patient'],
  }

  it('accepts a valid archetype', () => {
    expect(CollectorArchetypeSchema.safeParse(validArchetype).success).toBe(true)
  })

  it('rejects missing name', () => {
    const { name, ...rest } = validArchetype
    expect(CollectorArchetypeSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects missing traits', () => {
    const { traits, ...rest } = validArchetype
    expect(CollectorArchetypeSchema.safeParse(rest).success).toBe(false)
  })
})
