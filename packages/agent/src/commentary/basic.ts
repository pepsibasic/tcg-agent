import type { Action, AgentCommentary, Narrative, NextBestMove } from '@tcg/schemas'

interface PortfolioContext {
  totalValueEst: number
  breakdown: Array<{ ipCategory: string; totalValue: number; cardCount: number; percentOfPortfolio: number }>
  priceConfidence: string
  liquidityScore: number
  concentrationScore: number
}

export function buildBasicPortfolioCommentary(
  ctx: PortfolioContext,
  rankedActions: Action[]
): AgentCommentary {
  const topIp = ctx.breakdown.length > 0
    ? [...ctx.breakdown].sort((a, b) => b.totalValue - a.totalValue)[0]
    : null

  const totalCards = ctx.breakdown.reduce((sum, b) => sum + b.cardCount, 0)
  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`

  const headline = topIp
    ? `Your portfolio is worth ${fmt(ctx.totalValueEst)}, concentrated in ${topIp.ipCategory} (${Math.round(topIp.percentOfPortfolio * 100)}%).`
    : `Your portfolio is worth ${fmt(ctx.totalValueEst)} across ${totalCards} cards.`

  const bullets: string[] = [
    `Total estimated value: ${fmt(ctx.totalValueEst)} across ${totalCards} cards.`,
    `${ctx.breakdown.length} IP categories tracked.`,
    `Price data confidence: ${ctx.priceConfidence.replaceAll('_', ' ').toLowerCase()}.`,
  ]

  if (rankedActions.length > 0) {
    bullets.push(`Top suggested action: ${rankedActions[0].ui_copy}`)
  }

  const next_best_moves: NextBestMove[] = rankedActions.slice(0, 3).map((action) => ({
    title: action.type.replaceAll('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()),
    rationale: action.ui_copy,
    action,
  }))

  return { mode: 'BASIC', headline, bullets, next_best_moves }
}

interface CardContext {
  card_id: string
  identity_tags: string[]
  rarity_signal: string
  liquidity_signal: string
  price_band: { low: number; high: number; currency: string } | null
  actions: Action[]
}

export function buildBasicCardNarrative(ctx: CardContext): Narrative {
  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`
  const tags = ctx.identity_tags.join(', ') || 'untagged'

  const headline = ctx.price_band
    ? `This card (${tags}) is valued at ${fmt(ctx.price_band.low)}\u2013${fmt(ctx.price_band.high)} with ${ctx.liquidity_signal.toLowerCase()} liquidity.`
    : `This card (${tags}) has ${ctx.rarity_signal.toLowerCase()} rarity and ${ctx.liquidity_signal.toLowerCase()} liquidity.`

  const bullets: string[] = [
    `Rarity: ${ctx.rarity_signal}. Liquidity: ${ctx.liquidity_signal}.`,
  ]
  if (ctx.price_band) {
    bullets.push(`Price range: ${fmt(ctx.price_band.low)}\u2013${fmt(ctx.price_band.high)} ${ctx.price_band.currency}.`)
  }
  if (ctx.actions.length > 0) {
    bullets.push(`Top action: ${ctx.actions[0].ui_copy}`)
  }

  const what_people_do: string[] = []
  for (const action of ctx.actions.slice(0, 3)) {
    what_people_do.push(action.ui_copy)
  }

  return { mode: 'BASIC', headline, bullets, what_people_do }
}
