import { describe, it, expect } from 'vitest'
import { computeDecisionSignals } from '../services/decision-signals.js'
import type { SignalInput } from '../services/decision-signals.js'
import type { TopCard } from '@tcg/schemas'

function makeInput(overrides: Partial<SignalInput> = {}): SignalInput {
  return {
    topCards: [],
    priceChanges: new Map(),
    concentration_pct: 0.3,
    concentration_level: 'LOW',
    top_category: 'Pokemon',
    portfolio_value_liquidity: 3000,
    portfolio_value_market: 5000,
    uploaded_value_usd: 0,
    verified_value_usd: 0,
    ...overrides,
  }
}

function makeCard(id: string, title: string): TopCard {
  return {
    id,
    title,
    grade: 'PSA10',
    state: 'VAULTED',
    market_price: 100,
    buyback_price: 80,
    confidence: 'HIGH',
  }
}

describe('computeDecisionSignals', () => {
  it('returns SELL_STRENGTH when card is up >10% in 7d', () => {
    const card = makeCard('card-1', 'Manga Luffy')
    const priceChanges = new Map([['card-1', { change_7d: 0.12, change_30d: 0.05 }]])
    const signals = computeDecisionSignals(makeInput({ topCards: [card], priceChanges }))

    const sell = signals.find((s) => s.type === 'SELL_STRENGTH')
    expect(sell).toBeDefined()
    expect(sell!.title).toContain('Manga Luffy')
    expect(sell!.body).toContain('+12%')
    expect(sell!.suggested_action).toBeDefined()
    expect(sell!.suggested_action!.type).toBe('BUYBACK')
  })

  it('does NOT trigger SELL_STRENGTH at exactly 10%', () => {
    const card = makeCard('card-1', 'Luffy')
    const priceChanges = new Map([['card-1', { change_7d: 0.10, change_30d: 0 }]])
    const signals = computeDecisionSignals(makeInput({ topCards: [card], priceChanges }))
    expect(signals.find((s) => s.type === 'SELL_STRENGTH')).toBeUndefined()
  })

  it('returns HOLD_DIP when card is down >10% in 30d', () => {
    const card = makeCard('card-2', 'Pikachu Promo')
    const priceChanges = new Map([['card-2', { change_7d: -0.02, change_30d: -0.15 }]])
    const signals = computeDecisionSignals(makeInput({ topCards: [card], priceChanges }))

    const hold = signals.find((s) => s.type === 'HOLD_DIP')
    expect(hold).toBeDefined()
    expect(hold!.body).toContain('-15%')
    expect(hold!.body).toContain('hold dips')
  })

  it('returns DIVERSIFY when concentration >= 60%', () => {
    const signals = computeDecisionSignals(
      makeInput({
        concentration_pct: 0.64,
        concentration_level: 'HIGH',
        top_category: 'One Piece',
      })
    )

    const diversify = signals.find((s) => s.type === 'DIVERSIFY')
    expect(diversify).toBeDefined()
    expect(diversify!.body).toContain('64%')
    expect(diversify!.body).toContain('One Piece')
  })

  it('does NOT trigger DIVERSIFY when concentration is MEDIUM', () => {
    const signals = computeDecisionSignals(
      makeInput({ concentration_pct: 0.50, concentration_level: 'MEDIUM' })
    )
    expect(signals.find((s) => s.type === 'DIVERSIFY')).toBeUndefined()
  })

  it('returns UNLOCK_LIQUIDITY when uploaded_value > verified_value', () => {
    const signals = computeDecisionSignals(
      makeInput({ uploaded_value_usd: 1200, verified_value_usd: 500 })
    )

    const unlock = signals.find((s) => s.type === 'UNLOCK_LIQUIDITY')
    expect(unlock).toBeDefined()
    expect(unlock!.body).toContain('$1,200')
    expect(unlock!.suggested_action!.type).toBe('SHIP_TO_VAULT')
  })

  it('does NOT trigger UNLOCK_LIQUIDITY when no uploaded cards', () => {
    const signals = computeDecisionSignals(
      makeInput({ uploaded_value_usd: 0, verified_value_usd: 500 })
    )
    expect(signals.find((s) => s.type === 'UNLOCK_LIQUIDITY')).toBeUndefined()
  })

  it('limits signals to 4 max', () => {
    const cards = Array.from({ length: 10 }, (_, i) => makeCard(`c-${i}`, `Card ${i}`))
    const priceChanges = new Map(
      cards.map((c) => [c.id, { change_7d: 0.20, change_30d: -0.15 }])
    )
    const signals = computeDecisionSignals(
      makeInput({
        topCards: cards,
        priceChanges,
        concentration_pct: 0.70,
        concentration_level: 'HIGH',
        uploaded_value_usd: 1000,
        verified_value_usd: 500,
      })
    )
    expect(signals.length).toBeLessThanOrEqual(4)
  })

  it('sorts signals by priority: UNLOCK > SELL > DIVERSIFY > HOLD', () => {
    const card = makeCard('c-1', 'Test Card')
    const priceChanges = new Map([['c-1', { change_7d: 0.15, change_30d: -0.20 }]])
    const signals = computeDecisionSignals(
      makeInput({
        topCards: [card],
        priceChanges,
        concentration_pct: 0.70,
        concentration_level: 'HIGH',
        uploaded_value_usd: 1000,
        verified_value_usd: 500,
      })
    )

    const types = signals.map((s) => s.type)
    expect(types[0]).toBe('UNLOCK_LIQUIDITY')
    // SELL_STRENGTH should come before DIVERSIFY
    const sellIdx = types.indexOf('SELL_STRENGTH')
    const divIdx = types.indexOf('DIVERSIFY')
    if (sellIdx >= 0 && divIdx >= 0) {
      expect(sellIdx).toBeLessThan(divIdx)
    }
  })

  it('returns empty array when no conditions match', () => {
    const signals = computeDecisionSignals(makeInput())
    expect(signals).toEqual([])
  })
})
