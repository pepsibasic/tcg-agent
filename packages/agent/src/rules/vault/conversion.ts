import type { Action } from '@tcg/schemas'
import type { ExternalCardInput, RulesEngineConfig } from '../types.js'
import { DEFAULT_CONFIG } from '../types.js'
import { buildUnlockReasons } from './unlock-reasons.js'

/**
 * Phase 4 activation point — identity-based vault trigger.
 * Always returns false until identity inference is implemented in Phase 4.
 */
function computeIdentityVaultTrigger(_cards: ExternalCardInput[]): boolean {
  return false
}

/**
 * Computes vault conversion candidates from a portfolio of external cards.
 *
 * - Single-card SHIP_TO_VAULT: triggers when estimatedValue >= vaultSingleCardThreshold (VAULT-01)
 * - BUNDLE_SHIP: triggers when card count >= batchCardCountThreshold OR total value >= batchTotalValueThreshold (VAULT-03)
 * - Every SHIP_TO_VAULT includes 3 unlock reasons (VAULT-02)
 */
export function computeVaultConversionCandidatesImpl(
  externalCards: ExternalCardInput[],
  config: RulesEngineConfig = DEFAULT_CONFIG,
): Action[] {
  const actions: Action[] = []

  // Compute batch eligibility first so batchEligible flag is correct on SHIP_TO_VAULT params
  const totalValue = externalCards.reduce((sum, card) => sum + (card.estimatedValue ?? 0), 0)
  const isBatchEligible =
    externalCards.length >= config.batchCardCountThreshold ||
    totalValue >= config.batchTotalValueThreshold

  // Identity trigger stub — always false (Phase 4 activation point)
  const _identityTrigger = computeIdentityVaultTrigger(externalCards)

  // Single-card SHIP_TO_VAULT
  for (const card of externalCards) {
    const value = card.estimatedValue ?? 0
    if (value >= config.vaultSingleCardThreshold) {
      const unlocks = buildUnlockReasons(card)
      actions.push({
        type: 'SHIP_TO_VAULT',
        params: {
          cardValue: value,
          unlocks,
          batchEligible: isBatchEligible,
        } as Record<string, unknown>,
        ui_copy: `Ship to Vault — Unlock instant liquidity and verified ranking for this $${Math.round(value)} ${card.cardName}`,
        risk_notes: null,
      })
    }
  }

  // Batch BUNDLE_SHIP
  if (isBatchEligible) {
    const savings = (externalCards.length - 1) * config.bundleShipSavingsPerCard
    actions.push({
      type: 'BUNDLE_SHIP',
      params: {
        cardCount: externalCards.length,
        totalValue,
        estimatedSavings: savings,
      } as Record<string, unknown>,
      ui_copy: `Bundle Ship to Vault — Ship ${externalCards.length} cards together and save ~$${savings}`,
      risk_notes: null,
    })
  }

  return actions
}
