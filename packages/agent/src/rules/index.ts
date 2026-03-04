import type { Action } from '@tcg/schemas'
import type { RulesEngineInput, RulesEngineConfig, ExternalCardInput } from './types.js'
import { DEFAULT_CONFIG } from './types.js'
import { buildWatchlistAction } from './actions/shared.js'

export function computeEligibleActions(input: RulesEngineInput): Action[] {
  switch (input.card.state) {
    case 'VAULTED':
      // Placeholder — Plan 02 fills in real logic (BUYBACK, LIST, REDEEM, SHIP, WATCHLIST)
      return [buildWatchlistAction()]

    case 'EXTERNAL':
      // Placeholder — Plan 02 fills in real logic (SHIP_TO_VAULT, WATCHLIST)
      return [buildWatchlistAction()]

    case 'ON_MARKET':
      // Final — no actions while listed, user manages through marketplace UI
      return []

    case 'IN_TRANSIT':
      // Final — WATCHLIST only, nothing actionable until card arrives at vault
      return [buildWatchlistAction()]

    default: {
      // Exhaustive check — TypeScript will error if a new CardState is added without handling
      const _exhaustive: never = input.card.state
      return []
    }
  }
}

export function computeVaultConversionCandidates(
  externalCards: ExternalCardInput[],
  config: RulesEngineConfig = DEFAULT_CONFIG,
): Action[] {
  // Placeholder — Plan 03 fills in real logic
  void externalCards
  void config
  return []
}
