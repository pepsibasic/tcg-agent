import type { Action } from '@tcg/schemas'
import type { RulesEngineInput } from '../types.js'
import { buildWatchlistAction } from './shared.js'

export function buildVaultedActions(input: RulesEngineInput): Action[] {
  const { card, context } = input
  const { estimatedValue, priceConfidence, certNumber } = card
  const { hasActiveListing, packContext } = context

  const actions: Action[] = []

  // BUYBACK: only when price data is available AND estimatedValue is not null
  // NO_DATA skips BUYBACK entirely — no price to base buyback on
  if (priceConfidence !== 'NO_DATA' && estimatedValue !== null) {
    const buybackRiskNotes =
      priceConfidence === 'STALE_7D'
        ? 'Price signal is 7+ days old — verify current comps before accepting buyback'
        : null

    actions.push({
      type: 'BUYBACK',
      params: {
        estimatedBuybackValue: estimatedValue,
        priceConfidence,
      } as Record<string, unknown>,
      ui_copy: `Request Buyback — Estimated value ~$${Math.round(estimatedValue)}`,
      risk_notes: buybackRiskNotes,
    })
  }

  // LIST: only when card does not have an active listing AND estimatedValue is not null
  if (!hasActiveListing && estimatedValue !== null) {
    const listRiskNotes =
      priceConfidence === 'STALE_7D'
        ? 'Price signal is 7+ days old — verify current comps before listing'
        : null

    actions.push({
      type: 'LIST',
      params: {
        suggestedPrice: estimatedValue,
        priceConfidence,
        currency: 'USD',
      } as Record<string, unknown>,
      ui_copy: `List on Marketplace — Recent comps suggest ~$${Math.round(estimatedValue)}`,
      risk_notes: listRiskNotes,
    })
  }

  // REDEEM: always for VAULTED cards
  actions.push({
    type: 'REDEEM',
    params: {
      certNumber,
    } as Record<string, unknown>,
    ui_copy: 'Redeem Physical Card — Request shipment to your address',
    risk_notes: null,
  })

  // OPEN_PACK: only when card came from a pack pull
  if (packContext) {
    actions.push({
      type: 'OPEN_PACK',
      params: {
        packId: null,
      } as Record<string, unknown>,
      ui_copy: 'Open Pack — See what else you pulled',
      risk_notes: null,
    })
  }

  // WATCHLIST: always for VAULTED cards
  actions.push(buildWatchlistAction())

  return actions
}
