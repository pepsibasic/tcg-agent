import { describe, it, expect } from 'vitest'
import { rankCardActions, rankPortfolioActions } from '../ranking.js'
import type { Action } from '@tcg/schemas'

function makeAction(type: Action['type']): Action {
  return { type, params: {}, ui_copy: `Do ${type}`, risk_notes: null }
}

describe('rankCardActions', () => {
  it('sorts actions by card priority (BUYBACK first)', () => {
    const actions = [makeAction('WATCHLIST'), makeAction('BUYBACK'), makeAction('LIST')]
    const ranked = rankCardActions(actions)
    expect(ranked.map(a => a.type)).toEqual(['BUYBACK', 'LIST', 'WATCHLIST'])
  })

  it('returns empty array for empty input', () => {
    expect(rankCardActions([])).toEqual([])
  })

  it('does not mutate the original array', () => {
    const actions = [makeAction('LIST'), makeAction('BUYBACK')]
    rankCardActions(actions)
    expect(actions[0].type).toBe('LIST')
  })

  it('handles single action', () => {
    const actions = [makeAction('REDEEM')]
    expect(rankCardActions(actions).map(a => a.type)).toEqual(['REDEEM'])
  })

  it('preserves full priority order', () => {
    const actions = [
      makeAction('BUNDLE_SHIP'),
      makeAction('WATCHLIST'),
      makeAction('OPEN_PACK'),
      makeAction('SHIP_TO_VAULT'),
      makeAction('LIST'),
      makeAction('REDEEM'),
      makeAction('BUYBACK'),
    ]
    const ranked = rankCardActions(actions)
    expect(ranked.map(a => a.type)).toEqual([
      'BUYBACK', 'REDEEM', 'LIST', 'SHIP_TO_VAULT', 'OPEN_PACK', 'WATCHLIST', 'BUNDLE_SHIP',
    ])
  })
})

describe('rankPortfolioActions', () => {
  it('sorts actions by portfolio priority (BUNDLE_SHIP first)', () => {
    const actions = [makeAction('LIST'), makeAction('BUNDLE_SHIP'), makeAction('BUYBACK')]
    const ranked = rankPortfolioActions(actions)
    expect(ranked.map(a => a.type)).toEqual(['BUNDLE_SHIP', 'BUYBACK', 'LIST'])
  })

  it('returns empty array for empty input', () => {
    expect(rankPortfolioActions([])).toEqual([])
  })

  it('does not mutate the original array', () => {
    const actions = [makeAction('LIST'), makeAction('BUNDLE_SHIP')]
    rankPortfolioActions(actions)
    expect(actions[0].type).toBe('LIST')
  })

  it('preserves full priority order', () => {
    const actions = [
      makeAction('REDEEM'),
      makeAction('WATCHLIST'),
      makeAction('OPEN_PACK'),
      makeAction('LIST'),
      makeAction('BUYBACK'),
      makeAction('SHIP_TO_VAULT'),
      makeAction('BUNDLE_SHIP'),
    ]
    const ranked = rankPortfolioActions(actions)
    expect(ranked.map(a => a.type)).toEqual([
      'BUNDLE_SHIP', 'SHIP_TO_VAULT', 'BUYBACK', 'LIST', 'OPEN_PACK', 'WATCHLIST', 'REDEEM',
    ])
  })
})
