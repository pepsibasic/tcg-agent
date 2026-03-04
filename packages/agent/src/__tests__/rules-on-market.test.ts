import { describe, it, expect } from 'vitest'
import { computeEligibleActions } from '../rules/index.js'
import type { RulesEngineInput } from '../rules/types.js'

function makeOnMarketInput(overrides: Partial<RulesEngineInput['card']> = {}, contextOverrides: Partial<RulesEngineInput['context']> = {}): RulesEngineInput {
  return {
    card: {
      state: 'ON_MARKET',
      estimatedValue: 150,
      priceConfidence: 'LIVE',
      certNumber: 'CERT-MKT-001',
      ...overrides,
    },
    context: {
      hasActiveListing: true,
      packContext: false,
      ...contextOverrides,
    },
  }
}

describe('ON_MARKET state — always returns empty array', () => {
  it('ON_MARKET card returns empty array []', () => {
    const actions = computeEligibleActions(makeOnMarketInput())
    expect(actions).toEqual([])
  })

  it('ON_MARKET with LIVE price still returns empty array', () => {
    const actions = computeEligibleActions(makeOnMarketInput({ priceConfidence: 'LIVE' }))
    expect(actions).toEqual([])
  })

  it('ON_MARKET with packContext=true still returns empty array (marketplace lock overrides)', () => {
    const actions = computeEligibleActions(makeOnMarketInput({}, { packContext: true }))
    expect(actions).toEqual([])
  })

  it('ON_MARKET with STALE_7D price still returns empty array', () => {
    const actions = computeEligibleActions(makeOnMarketInput({ priceConfidence: 'STALE_7D' }))
    expect(actions).toEqual([])
  })

  it('ON_MARKET with NO_DATA price still returns empty array', () => {
    const actions = computeEligibleActions(makeOnMarketInput({ priceConfidence: 'NO_DATA' }))
    expect(actions).toEqual([])
  })

  it('ON_MARKET with hasActiveListing=false still returns empty array', () => {
    const actions = computeEligibleActions(makeOnMarketInput({}, { hasActiveListing: false }))
    expect(actions).toEqual([])
  })

  it('returns an array (not null/undefined)', () => {
    const actions = computeEligibleActions(makeOnMarketInput())
    expect(Array.isArray(actions)).toBe(true)
    expect(actions).toHaveLength(0)
  })
})
