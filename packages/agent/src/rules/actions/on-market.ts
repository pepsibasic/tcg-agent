import type { Action } from '@tcg/schemas'

export function buildOnMarketActions(): Action[] {
  // ON_MARKET cards are locked — no actions available while listed
  return []
}
