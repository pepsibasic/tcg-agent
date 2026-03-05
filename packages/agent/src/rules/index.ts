import type { Action } from '@tcg/schemas'
import type { RulesEngineInput, RulesEngineConfig, ExternalCardInput } from './types.js'
import { DEFAULT_CONFIG } from './types.js'
import { buildVaultedActions } from './actions/vaulted.js'
import { buildExternalActions } from './actions/external.js'
import { buildOnMarketActions } from './actions/on-market.js'
import { buildInTransitActions } from './actions/in-transit.js'
import { computeVaultConversionCandidatesImpl } from './vault/conversion.js'

export { rankCardActions, rankPortfolioActions } from './ranking.js'

export function computeEligibleActions(input: RulesEngineInput): Action[] {
  switch (input.card.state) {
    case 'VAULTED':
      return buildVaultedActions(input)

    case 'EXTERNAL':
      return buildExternalActions(input)

    case 'ON_MARKET':
      return buildOnMarketActions()

    case 'IN_TRANSIT':
      return buildInTransitActions()

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
  return computeVaultConversionCandidatesImpl(externalCards, config)
}
