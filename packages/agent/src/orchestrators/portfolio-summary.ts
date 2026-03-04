import { prisma } from '@tcg/db'
import { PortfolioSummarySchema } from '@tcg/schemas'
import type { PortfolioSummaryResponse, PriceConfidence } from '@tcg/schemas'
import { generateWithRetry } from '../llm/generate.js'
import { renderPrompt } from '../llm/prompts.js'
import { DEFAULT_LLM_CONFIG } from '../llm/types.js'

// ─── Return types ───────────────────────────────────────────────────────────

type PortfolioSummarySuccess = {
  success: true
  data: PortfolioSummaryResponse
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
 * 4. Success path: merge LLM output with DB-computed fields
 * 5. Degraded path: return DB-computed fields with narrative defaults
 */
export async function summarizePortfolio(userId: string): Promise<PortfolioSummaryResult> {
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
  const ucDates = userCards
    .map((uc) => uc.priceFetchedAt)
    .filter((d): d is Date => d !== null)
  const ecDates = externalCards
    .map((ec) => ec.priceFetchedAt)
    .filter((d): d is Date => d !== null)
  const allDates = [...ucDates, ...ecDates]
  const priceDataAsOf =
    allDates.length > 0
      ? new Date(Math.max(...allDates.map((d) => d.getTime()))).toISOString()
      : null

  // priceConfidence: worst across all cards
  const ucConfidences = userCards.map((uc) => uc.priceConfidence as PriceConfidence)
  const ecConfidences = externalCards.map((ec) => ec.priceConfidence as PriceConfidence)
  const overallPriceConfidence = worstPriceConfidence([...ucConfidences, ...ecConfidences])

  // 3. Render prompt
  const vaultedCount = userCards.filter((uc) => uc.state === 'VAULTED').length
  const totalCards = userCards.length + externalCards.length

  const { system, user } = renderPrompt('portfolio_summary', {
    user_id: userId,
    cards_json: JSON.stringify(dbBreakdown),
    total_count: totalCards.toString(),
    vaulted_count: vaultedCount.toString(),
    external_count: externalCards.length.toString(),
  })

  // 4. Call LLM
  const llmResult = await generateWithRetry({
    schema: PortfolioSummarySchema,
    prompt: user,
    system,
    config: DEFAULT_LLM_CONFIG,
    narrativeFields: ['recommendedActions', 'missingSetGoals'],
  })

  // 5. Success path: merge LLM output with DB-computed fields
  if (llmResult.success) {
    return {
      success: true,
      data: {
        ...llmResult.data,
        userId,
        totalValueEst,
        breakdown: dbBreakdown,
        priceDataAsOf,
        priceConfidence: overallPriceConfidence,
      },
    }
  }

  // 6. Degraded path: return deterministic fields with narrative defaults
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
    },
  }
}
