import { describe, it, expect } from 'vitest'
import { CollectorArchetypeSchema } from '../llm/archetype.js'
import { ArchetypeResponseSchema } from '../api/archetype.js'

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

  // Missing required fields
  it('rejects missing why', () => {
    const { why, ...rest } = validArchetype
    const result = CollectorArchetypeSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing comparable_collectors', () => {
    const { comparable_collectors, ...rest } = validArchetype
    const result = CollectorArchetypeSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing share_card_text', () => {
    const { share_card_text, ...rest } = validArchetype
    const result = CollectorArchetypeSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing share_card_badges', () => {
    const { share_card_badges, ...rest } = validArchetype
    const result = CollectorArchetypeSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  // Wrong types
  it('rejects string for traits (expects array)', () => {
    const result = CollectorArchetypeSchema.safeParse({ ...validArchetype, traits: 'methodical' })
    expect(result.success).toBe(false)
  })

  it('rejects number for name (expects string)', () => {
    const result = CollectorArchetypeSchema.safeParse({ ...validArchetype, name: 42 })
    expect(result.success).toBe(false)
  })

  it('rejects string for share_card_badges (expects array)', () => {
    const result = CollectorArchetypeSchema.safeParse({ ...validArchetype, share_card_badges: 'Completionist' })
    expect(result.success).toBe(false)
  })

  it('rejects string for comparable_collectors (expects array)', () => {
    const result = CollectorArchetypeSchema.safeParse({ ...validArchetype, comparable_collectors: 'Stamp collectors' })
    expect(result.success).toBe(false)
  })

  it('rejects number in traits array (expects string[])', () => {
    const result = CollectorArchetypeSchema.safeParse({ ...validArchetype, traits: ['methodical', 99] })
    expect(result.success).toBe(false)
  })

  it('rejects number for why (expects string)', () => {
    const result = CollectorArchetypeSchema.safeParse({ ...validArchetype, why: 123 })
    expect(result.success).toBe(false)
  })

  it('rejects number for share_card_text (expects string)', () => {
    const result = CollectorArchetypeSchema.safeParse({ ...validArchetype, share_card_text: 999 })
    expect(result.success).toBe(false)
  })

  // Empty arrays are valid
  it('accepts empty traits array', () => {
    const result = CollectorArchetypeSchema.safeParse({ ...validArchetype, traits: [] })
    expect(result.success).toBe(true)
  })

  it('accepts empty share_card_badges array', () => {
    const result = CollectorArchetypeSchema.safeParse({ ...validArchetype, share_card_badges: [] })
    expect(result.success).toBe(true)
  })

  it('accepts empty comparable_collectors array', () => {
    const result = CollectorArchetypeSchema.safeParse({ ...validArchetype, comparable_collectors: [] })
    expect(result.success).toBe(true)
  })
})

describe('ArchetypeResponseSchema (API)', () => {
  const validArchetype = {
    name: 'The Whale Hunter',
    traits: ['decisive', 'market-savvy'],
    why: 'You focus on acquiring high-value singles',
    comparable_collectors: ['Art gallery curators'],
    share_card_text: 'I am The Whale Hunter!',
    share_card_badges: ['Whale Hunter', 'Market Savvy'],
  }

  it('accepts a valid ArchetypeResponse (same shape as LLM schema)', () => {
    const result = ArchetypeResponseSchema.safeParse(validArchetype)
    expect(result.success).toBe(true)
  })

  it('rejects missing name in ArchetypeResponseSchema', () => {
    const { name, ...rest } = validArchetype
    const result = ArchetypeResponseSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing share_card_badges in ArchetypeResponseSchema', () => {
    const { share_card_badges, ...rest } = validArchetype
    const result = ArchetypeResponseSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })
})
