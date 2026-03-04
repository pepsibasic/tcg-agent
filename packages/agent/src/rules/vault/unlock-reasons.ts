import type { ExternalCardInput } from '../types.js'

/**
 * Builds dynamic unlock reasons for a SHIP_TO_VAULT action.
 * Returns exactly 3 reasons per VAULT-02 requirement.
 * Pure function — no side effects.
 */
export function buildUnlockReasons(card: ExternalCardInput): string[] {
  const liquidityReason =
    card.estimatedValue != null
      ? `Instant liquidity — estimated buyback ~$${Math.round(card.estimatedValue)}`
      : `Instant liquidity — access buyback and marketplace listing`

  return [
    liquidityReason,
    `Trade into packs — use vault balance for new pulls`,
    `Verified portfolio ranking — count toward collector leaderboards`,
  ]
}
