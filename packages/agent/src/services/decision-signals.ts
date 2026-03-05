import type { DecisionSignal, Action, TopCard } from '@tcg/schemas'

export interface SignalInput {
  topCards: TopCard[]
  priceChanges: Map<string, { change_7d: number | null; change_30d: number | null }>
  concentration_pct: number
  concentration_level: 'LOW' | 'MEDIUM' | 'HIGH'
  top_category: string
  portfolio_value_liquidity: number
  portfolio_value_market: number
  uploaded_value_usd: number
  verified_value_usd: number
}

const SIGNAL_PRIORITY: DecisionSignal['type'][] = [
  'UNLOCK_LIQUIDITY',
  'SELL_STRENGTH',
  'DIVERSIFY',
  'HOLD_DIP',
]

const MAX_SIGNALS = 4

export function computeDecisionSignals(input: SignalInput): DecisionSignal[] {
  const signals: DecisionSignal[] = []

  // UNLOCK_LIQUIDITY: uploaded value exceeds verified value
  if (input.uploaded_value_usd > 0 && input.verified_value_usd < input.uploaded_value_usd) {
    const uploadedFmt = `$${Math.round(input.uploaded_value_usd).toLocaleString()}`
    signals.push({
      type: 'UNLOCK_LIQUIDITY',
      title: 'Unlock Liquidity',
      body: `You have ${uploadedFmt} in uploaded cards. Vaulting unlocks trading and liquidity.`,
      severity: 'warning',
      suggested_action: {
        type: 'SHIP_TO_VAULT',
        params: null,
        ui_copy: 'Vault your uploaded cards to unlock liquidity',
        risk_notes: null,
      },
    })
  }

  // SELL_STRENGTH: cards up >10% in 7d
  for (const card of input.topCards) {
    const changes = input.priceChanges.get(card.id)
    if (changes?.change_7d != null && changes.change_7d > 0.10) {
      const pctStr = `+${Math.round(changes.change_7d * 100)}%`
      signals.push({
        type: 'SELL_STRENGTH',
        title: `${card.title} is surging`,
        body: `${card.title}${card.grade ? ` ${card.grade}` : ''} is up ${pctStr} this week. Consider selling into strength.`,
        severity: 'info',
        related_card_id: card.id,
        suggested_action: {
          type: 'BUYBACK',
          params: { cardId: card.id },
          ui_copy: `Sell ${card.title} while price is high`,
          risk_notes: 'Price may continue to rise',
        },
      })
    }
  }

  // DIVERSIFY: high concentration
  if (input.concentration_level === 'HIGH') {
    const pctStr = Math.round(input.concentration_pct * 100)
    signals.push({
      type: 'DIVERSIFY',
      title: 'High Concentration',
      body: `Your portfolio is ${pctStr}% ${input.top_category}. Diversification may reduce risk.`,
      severity: 'warning',
    })
  }

  // HOLD_DIP: cards down >10% in 30d
  for (const card of input.topCards) {
    const changes = input.priceChanges.get(card.id)
    if (changes?.change_30d != null && changes.change_30d < -0.10) {
      const pctStr = `${Math.round(changes.change_30d * 100)}%`
      signals.push({
        type: 'HOLD_DIP',
        title: `${card.title} is dipping`,
        body: `${card.title}${card.grade ? ` ${card.grade}` : ''} is down ${pctStr} this month. Long-term collectors often hold dips.`,
        severity: 'info',
        related_card_id: card.id,
      })
    }
  }

  // Sort by priority, limit to MAX_SIGNALS
  signals.sort((a, b) => SIGNAL_PRIORITY.indexOf(a.type) - SIGNAL_PRIORITY.indexOf(b.type))
  return signals.slice(0, MAX_SIGNALS)
}
