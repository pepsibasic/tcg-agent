import type { Action } from '@tcg/schemas'
import { buildWatchlistAction } from './shared.js'

export function buildInTransitActions(): Action[] {
  // IN_TRANSIT cards only get WATCHLIST — nothing actionable until card arrives at vault
  return [buildWatchlistAction()]
}
