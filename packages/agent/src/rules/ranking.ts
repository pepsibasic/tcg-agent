import type { Action, ActionType } from '@tcg/schemas'

// Priority order for card-level actions
const CARD_ACTION_PRIORITY: ActionType[] = [
  'BUYBACK', 'REDEEM', 'LIST', 'SHIP_TO_VAULT', 'OPEN_PACK', 'WATCHLIST', 'BUNDLE_SHIP'
]

// Priority order for portfolio-level recommendations
const PORTFOLIO_ACTION_PRIORITY: ActionType[] = [
  'BUNDLE_SHIP', 'SHIP_TO_VAULT', 'BUYBACK', 'LIST', 'OPEN_PACK', 'WATCHLIST', 'REDEEM'
]

export function rankCardActions(actions: Action[]): Action[] {
  return [...actions].sort((a, b) => {
    const ai = CARD_ACTION_PRIORITY.indexOf(a.type)
    const bi = CARD_ACTION_PRIORITY.indexOf(b.type)
    return ai - bi
  })
}

export function rankPortfolioActions(actions: Action[]): Action[] {
  return [...actions].sort((a, b) => {
    const ai = PORTFOLIO_ACTION_PRIORITY.indexOf(a.type)
    const bi = PORTFOLIO_ACTION_PRIORITY.indexOf(b.type)
    return ai - bi
  })
}
