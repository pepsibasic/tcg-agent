const PULL_BASE =
  process.env.NEXT_PUBLIC_PULL_BASE || 'https://pull.gacha.game'

export const deepLinks = {
  sell: (cardId: string) => `${PULL_BASE}/sell?card_id=${cardId}`,
  redeem: (cardId: string) => `${PULL_BASE}/redeem?card_id=${cardId}`,
  packs: (packId?: string) =>
    `${PULL_BASE}/packs${packId ? `?packId=${packId}` : ''}`,
}

export type ActionType =
  | 'BUYBACK'
  | 'LIST'
  | 'REDEEM'
  | 'SHIP_TO_VAULT'
  | 'OPEN_PACK'
  | 'WATCHLIST'
  | 'BUNDLE_SHIP'

/**
 * Returns a deep link URL for the given action, or null if the action
 * should be handled inline (e.g. toast/confirmation only).
 */
export function getDeepLink(
  action: ActionType,
  cardId?: string
): string | null {
  switch (action) {
    case 'BUYBACK':
    case 'LIST':
      return cardId ? deepLinks.sell(cardId) : null
    case 'REDEEM':
      return cardId ? deepLinks.redeem(cardId) : null
    case 'OPEN_PACK':
      return deepLinks.packs()
    case 'SHIP_TO_VAULT':
    case 'WATCHLIST':
    case 'BUNDLE_SHIP':
      return null
  }
}

/** User-facing message for actions that don't deep-link */
export function getInlineMessage(action: ActionType): string {
  switch (action) {
    case 'SHIP_TO_VAULT':
      return 'Ship-to-vault request submitted.'
    case 'WATCHLIST':
      return 'Added to watchlist.'
    case 'BUNDLE_SHIP':
      return 'Bundle ship request submitted.'
    default:
      return 'Action recorded.'
  }
}
