import { prisma } from '@tcg/db'
import { PortfolioSummaryLLMSchema } from '@tcg/schemas'
import type { PortfolioSummaryResponse, PriceConfidence, Action, AgentCommentary, TopCard } from '@tcg/schemas'
import { generateWithRetry } from '../llm/generate.js'
import type { LLMLogger } from '../llm/generate.js'
import { renderPrompt } from '../llm/prompts.js'
import { wrapUserInput } from '../llm/sanitize.js'
import { DEFAULT_LLM_CONFIG } from '../llm/types.js'
import { computeVaultConversionCandidates } from '../rules/index.js'
import { rankPortfolioActions } from '../rules/ranking.js'
import { buildBasicPortfolioCommentary } from '../commentary/basic.js'
import { getCardPrice } from '../services/pricing-service.js'
import type { PriceConfidenceLevel } from '../services/pricing-service.js'

// ─── Return types ───────────────────────────────────────────────────────────

type PortfolioSummarySuccess = {
  success: true
  data: PortfolioSummaryResponse & { vaultConversionCandidates: Action[] }
  degraded?: boolean
}

type PortfolioSummaryResult = PortfolioSummarySuccess

// ─── Price confidence ordering (worst to best) ──────────────────────────────

const PRICE_CONFIDENCE_ORDER: PriceConfidence[] = [
  'NO_DATA',
  'STALE_7D',
  'RECENT_24H',
  'LIVE',
]

/**
 * Returns the worst (lowest quality) PriceConfidence among all values.
 * NO_DATA < STALE_7D < RECENT_24H < LIVE
 */
function worstPriceConfidence(confidences: PriceConfidence[]): PriceConfidence {
  if (confidences.length === 0) return 'NO_DATA'
  let worstIdx = PRICE_CONFIDENCE_ORDER.length - 1
  for (const c of confidences) {
    const idx = PRICE_CONFIDENCE_ORDER.indexOf(c)
    if (idx < worstIdx) worstIdx = idx
  }
  return PRICE_CONFIDENCE_ORDER[worstIdx]!
}

// ─── Main orchestrator ──────────────────────────────────────────────────────

/**
 * Produce a portfolio summary for a user.
 *
 * Pipeline:
 * 1. Fetch all userCards (with card relation) and externalCards from the DB
 * 2. Compute DB-derived fields deterministically:
 *    - totalValueEst, breakdown (grouped by ipCategory), priceDataAsOf, priceConfidence
 * 3. Render the portfolio_summary prompt and call LLM via generateWithRetry
 * 4. Success path: merge LLM output with DB-computed fields + agent commentary
 * 5. Degraded path: return DB-computed fields with narrative defaults + BASIC commentary
 */
export async function summarizePortfolio(userId: string, logger?: LLMLogger): Promise<PortfolioSummaryResult> {
  // 1. Fetch all cards
  const [userCards, externalCards] = await Promise.all([
    prisma.userCard.findMany({
      where: { userId, deletedAt: null },
      include: { card: true },
    }),
    prisma.externalCard.findMany({
      where: { userId, deletedAt: null },
    }),
  ])

  // 1b. Compute vault conversion candidates from external cards
  const externalCardInputs: import('../rules/types.js').ExternalCardInput[] = []
  for (const ec of externalCards) {
    externalCardInputs.push({
      id: ec.id,
      estimatedValue: ec.estimatedValue ? Number(ec.estimatedValue) : null,
      priceConfidence: ec.priceConfidence as PriceConfidence,
      certNumber: ec.certNumber,
      cardName: ec.name,
    })
  }
  const vaultConversionCandidates = computeVaultConversionCandidates(externalCardInputs)

  // 2. Compute DB-derived fields

  // totalValueEst: sum of estimatedValue across all cards
  let totalValueEst = 0
  for (const uc of userCards) {
    totalValueEst += Number(uc.estimatedValue ?? 0)
  }
  for (const ec of externalCards) {
    totalValueEst += Number(ec.estimatedValue ?? 0)
  }

  // breakdown: group all cards by ipCategory
  // userCards: use card.ipCategory; externalCards: use 'External'
  const groupMap = new Map<string, { totalValue: number; cardCount: number }>()

  for (const uc of userCards) {
    const ip = uc.card.ipCategory
    const entry = groupMap.get(ip) ?? { totalValue: 0, cardCount: 0 }
    entry.totalValue += Number(uc.estimatedValue ?? 0)
    entry.cardCount += 1
    groupMap.set(ip, entry)
  }

  for (const ec of externalCards) {
    const ip = 'External'
    const entry = groupMap.get(ip) ?? { totalValue: 0, cardCount: 0 }
    entry.totalValue += Number(ec.estimatedValue ?? 0)
    entry.cardCount += 1
    groupMap.set(ip, entry)
  }

  const dbBreakdown = Array.from(groupMap.entries()).map(([ipCategory, stats]) => ({
    ipCategory,
    totalValue: stats.totalValue,
    cardCount: stats.cardCount,
    percentOfPortfolio: totalValueEst > 0 ? stats.totalValue / totalValueEst : 0,
  }))

  // priceDataAsOf: most recent priceFetchedAt across all cards (ISO string), or null
  const allDates: Date[] = []
  for (const uc of userCards) {
    if (uc.priceFetchedAt !== null) allDates.push(uc.priceFetchedAt)
  }
  for (const ec of externalCards) {
    if (ec.priceFetchedAt !== null) allDates.push(ec.priceFetchedAt)
  }
  const priceDataAsOf =
    allDates.length > 0
      ? new Date(Math.max(...allDates.map((d) => d.getTime()))).toISOString()
      : null

  // priceConfidence: worst across all cards
  const allConfidences: PriceConfidence[] = []
  for (const uc of userCards) {
    allConfidences.push(uc.priceConfidence as PriceConfidence)
  }
  for (const ec of externalCards) {
    allConfidences.push(ec.priceConfidence as PriceConfidence)
  }
  const overallPriceConfidence = worstPriceConfidence(allConfidences)

  // 2b. Rank portfolio-level actions from vault conversion candidates
  const rankedActions = rankPortfolioActions(vaultConversionCandidates)

  // 2c. Build top_cards with pricing data
  type CardCandidate = {
    id: string
    title: string
    grade: string | null
    state: 'VAULTED' | 'EXTERNAL'
    cardId?: string
    estimatedValue: number
  }

  const cardCandidates: CardCandidate[] = []
  for (const uc of userCards) {
    cardCandidates.push({
      id: uc.id,
      title: uc.card.name,
      grade: uc.card.grade,
      state: uc.state === 'VAULTED' ? 'VAULTED' : 'EXTERNAL',
      cardId: uc.cardId,
      estimatedValue: Number(uc.estimatedValue ?? 0),
    })
  }
  for (const ec of externalCards) {
    cardCandidates.push({
      id: ec.id,
      title: ec.name,
      grade: ec.grade,
      state: 'EXTERNAL',
      estimatedValue: Number(ec.estimatedValue ?? 0),
    })
  }

  // Fetch prices in parallel for all cards
  const priceResults = await Promise.all(
    cardCandidates.map((c) => getCardPrice(c.title, c.cardId))
  )

  const topCards: TopCard[] = cardCandidates
    .map((c, i) => {
      const price = priceResults[i]
      return {
        id: c.id,
        title: c.title,
        grade: c.grade,
        state: c.state,
        market_price: price.market_price ?? (c.estimatedValue || null),
        buyback_price: price.buyback_price,
        confidence: price.confidence as PriceConfidenceLevel,
      }
    })
    .sort((a, b) => (b.market_price ?? 0) - (a.market_price ?? 0))
    .slice(0, 10)

  // Compute portfolio-level values from pricing
  let portfolioValueMarket = 0
  let portfolioValueLiquidity = 0
  for (let i = 0; i < cardCandidates.length; i++) {
    const price = priceResults[i]
    const fallbackValue = cardCandidates[i].estimatedValue
    portfolioValueMarket += price.market_price ?? fallbackValue ?? 0
    portfolioValueLiquidity += price.buyback_price ?? 0
  }

  // 3. Render prompt
  let vaultedCount = 0
  for (const uc of userCards) {
    if (uc.state === 'VAULTED') vaultedCount++
  }
  const totalCards = userCards.length + externalCards.length

  const { system, user } = renderPrompt('portfolio_summary', {
    user_id: userId,
    cards_json: wrapUserInput('portfolio_data', JSON.stringify(dbBreakdown)),
    total_count: totalCards.toString(),
    vaulted_count: vaultedCount.toString(),
    external_count: externalCards.length.toString(),
  })

  // 4. Call LLM
  const llmResult = await generateWithRetry({
    schema: PortfolioSummaryLLMSchema,  // Only 5 LLM-generated fields
    prompt: user,
    system,
    config: DEFAULT_LLM_CONFIG,
    narrativeFields: ['recommendedActions', 'missingSetGoals'],
    logger,
  })

  // 4b. Build BASIC commentary (always available as fallback)
  const basicCommentary = buildBasicPortfolioCommentary(
    {
      totalValueEst,
      breakdown: dbBreakdown,
      priceConfidence: overallPriceConfidence,
      liquidityScore: 0,
      concentrationScore: 0,
      topCards,
      portfolioValueMarket,
      portfolioValueLiquidity,
      vaultedCount,
      externalCount: externalCards.length,
    },
    rankedActions
  )

  // 5. Success path: merge LLM output with DB-computed fields
  if (llmResult.success) {
    // If LLM succeeded, upgrade commentary headline/bullets with LLM text
    const llmCommentary: AgentCommentary = {
      mode: 'LLM',
      headline: llmResult.data.recommendedActions.length > 0
        ? llmResult.data.recommendedActions[0]
        : basicCommentary.headline,
      bullets: llmResult.data.recommendedActions.length > 0
        ? llmResult.data.recommendedActions
        : basicCommentary.bullets,
      next_best_moves: basicCommentary.next_best_moves,
    }

    return {
      success: true,
      data: {
        ...llmResult.data,
        userId,
        totalValueEst,
        breakdown: dbBreakdown,
        priceDataAsOf,
        priceConfidence: overallPriceConfidence,
        vaultConversionCandidates,
        recommended_actions: rankedActions,
        agent_commentary: llmCommentary,
        top_cards: topCards,
        portfolio_value_market: portfolioValueMarket,
        portfolio_value_liquidity: portfolioValueLiquidity,
      },
    }
  }

  // 6. Degraded path: return deterministic fields with narrative defaults + BASIC commentary
  return {
    success: true,
    degraded: true,
    data: {
      userId,
      totalValueEst,
      breakdown: dbBreakdown,
      concentrationScore: 0,
      liquidityScore: 0,
      collectorArchetype: null,
      missingSetGoals: [],
      recommendedActions: [],
      priceDataAsOf,
      priceConfidence: overallPriceConfidence,
      vaultConversionCandidates,
      recommended_actions: rankedActions,
      agent_commentary: basicCommentary,
      top_cards: topCards,
      portfolio_value_market: portfolioValueMarket,
      portfolio_value_liquidity: portfolioValueLiquidity,
    },
  }
}
