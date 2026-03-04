import type { Action } from '@tcg/schemas'
import type { RulesEngineInput } from '../types.js'
import { buildWatchlistAction } from './shared.js'

function buildUnlockReasons(): string[] {
  return [
    'Instant liquidity — access buyback and marketplace listing',
    'Trade into packs — use vault balance for new pulls',
    'Verified portfolio ranking — count toward collector leaderboards',
  ]
}

export function buildExternalActions(input: RulesEngineInput): Action[] {
  const { card } = input
  const { estimatedValue } = card
  const cardValue = estimatedValue ?? 0

  const actions: Action[] = []

  // SHIP_TO_VAULT: always for EXTERNAL cards (not gated on price confidence)
  actions.push({
    type: 'SHIP_TO_VAULT',
    params: {
      cardValue,
      unlocks: buildUnlockReasons(),
      batchEligible: false,
    } as Record<string, unknown>,
    ui_copy: `Ship to Vault — Unlock instant liquidity and verified ranking for this $${Math.round(cardValue)} card`,
    risk_notes: null,
  })

  // WATCHLIST: always for EXTERNAL cards
  actions.push(buildWatchlistAction())

  return actions
}
