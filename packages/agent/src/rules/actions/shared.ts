import type { Action } from '@tcg/schemas'

export function buildWatchlistAction(): Action {
  return {
    type: 'WATCHLIST',
    params: {} as Record<string, unknown>,
    ui_copy: 'Add to Watchlist — Get notified when price signals change',
    risk_notes: null,
  }
}
