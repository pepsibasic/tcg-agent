import type { Action, AgentCommentary, Narrative, NextBestMove, TopCard } from '@tcg/schemas'

interface PortfolioContext {
  totalValueEst: number
  breakdown: Array<{ ipCategory: string; totalValue: number; cardCount: number; percentOfPortfolio: number }>
  priceConfidence: string
  liquidityScore: number
  concentrationScore: number
  topCards?: TopCard[]
  portfolioValueMarket?: number
  portfolioValueLiquidity?: number
  vaultedCount?: number
  externalCount?: number
}

export function buildBasicPortfolioCommentary(
  ctx: PortfolioContext,
  rankedActions: Action[]
): AgentCommentary {
  const totalCards = ctx.breakdown.reduce((sum, b) => sum + b.cardCount, 0)
  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`

  const marketValue = ctx.portfolioValueMarket ?? ctx.totalValueEst
  const liquidityValue = ctx.portfolioValueLiquidity ?? 0

  const topIp = ctx.breakdown.length > 0
    ? [...ctx.breakdown].sort((a, b) => b.totalValue - a.totalValue)[0]
    : null

  // Headline: reference portfolio value and liquidity, or IP concentration as fallback
  let headline: string
  if (liquidityValue > 0) {
    headline = `Your portfolio is worth ${fmt(marketValue)} with ${fmt(liquidityValue)} instantly liquid.`
  } else if (topIp) {
    headline = `Your portfolio is worth ${fmt(marketValue)}, concentrated in ${topIp.ipCategory} (${Math.round(topIp.percentOfPortfolio * 100)}%).`
  } else {
    headline = `Your portfolio is worth ${fmt(marketValue)} across ${totalCards} cards.`
  }

  const bullets: string[] = []

  // Reference top card if available
  if (ctx.topCards && ctx.topCards.length > 0) {
    const top = ctx.topCards[0]
    bullets.push(`Your most valuable card is ${top.title}${top.grade ? ` ${top.grade}` : ''}.`)
  }

  // Reference vaulted vs external cards
  const vaultedCount = ctx.vaultedCount ?? 0
  const externalCount = ctx.externalCount ?? 0
  if (vaultedCount > 0) {
    bullets.push(`${vaultedCount} card${vaultedCount === 1 ? ' is' : 's are'} vaulted and can be sold immediately.`)
  }
  if (externalCount > 0) {
    bullets.push(`${externalCount} uploaded card${externalCount === 1 ? '' : 's'} could unlock liquidity if vaulted.`)
  }

  // Fallback general bullets if no card-level data available
  if (bullets.length === 0) {
    bullets.push(`Total estimated value: ${fmt(marketValue)} across ${totalCards} cards.`)
    bullets.push(`${ctx.breakdown.length} IP categories tracked.`)
    bullets.push(`Price data confidence: ${ctx.priceConfidence.replaceAll('_', ' ').toLowerCase()}.`)
  } else if (ctx.breakdown.length > 0) {
    // Supplement card-level bullets with IP tracking info
    bullets.push(`${ctx.breakdown.length} IP categories tracked.`)
  }

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
