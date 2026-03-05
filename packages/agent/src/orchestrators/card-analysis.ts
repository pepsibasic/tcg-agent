import { prisma } from '@tcg/db'
import { CardAnalysisSchema } from '@tcg/schemas'
import type { CardAnalysisResponse, Narrative } from '@tcg/schemas'
import { computeEligibleActions } from '../rules/index.js'
import { rankCardActions } from '../rules/ranking.js'
import { buildBasicCardNarrative } from '../commentary/basic.js'
import { generateWithRetry } from '../llm/generate.js'
import type { LLMLogger } from '../llm/generate.js'
import { renderPrompt } from '../llm/prompts.js'
import { sanitizeInput, wrapUserInput } from '../llm/sanitize.js'
import { DEFAULT_LLM_CONFIG } from '../llm/types.js'

type CardAnalysisSuccess = { success: true; data: CardAnalysisResponse; degraded?: boolean }
type CardAnalysisNotFound = { success: false; reason: 'not_found' }
type CardAnalysisResult = CardAnalysisSuccess | CardAnalysisNotFound

export async function analyzeCard(
  userCardId: string,
  userId: string,
  context: { source?: 'pack_pull' } = {},
  logger?: LLMLogger
): Promise<CardAnalysisResult> {
  // 1. Fetch the user card with relations
  const userCard = await prisma.userCard.findFirst({
    where: { id: userCardId, userId, deletedAt: null },
    include: { card: true, marketplaceListing: true },
  })

  if (!userCard) {
    return { success: false, reason: 'not_found' }
  }

  // 2. Build RulesEngineInput
  const rulesInput = {
    card: {
      state: userCard.state,
      estimatedValue: userCard.estimatedValue ? Number(userCard.estimatedValue) : null,
      priceConfidence: userCard.priceConfidence,
      certNumber: userCard.certNumber,
    },
    context: {
      hasActiveListing: userCard.marketplaceListing?.status === 'ACTIVE',
      packContext: context?.source === 'pack_pull',
    },
  }

  // 3. Compute actions deterministically from rules engine — NEVER from LLM
  const actions = rankCardActions(computeEligibleActions(rulesInput))

  // 4. Render prompt
  const rendered = renderPrompt('card_analysis', {
    card_name: sanitizeInput(userCard.card.name),
    card_set: sanitizeInput(userCard.card.setName ?? ''),
    card_grade: sanitizeInput(userCard.card.grade ?? 'Ungraded'),
    card_state: userCard.state,
    estimated_value: userCard.estimatedValue ? Number(userCard.estimatedValue).toString() : 'Unknown',
    price_confidence: userCard.priceConfidence,
    user_notes: wrapUserInput('notes', userCard.userNotes ?? ''),
  })

  // 5. Call LLM via generateWithRetry
  const llmResult = await generateWithRetry({
    schema: CardAnalysisSchema,
    prompt: rendered.user,
    system: rendered.system,
    config: DEFAULT_LLM_CONFIG,
    narrativeFields: ['rarity_signal', 'liquidity_signal', 'reasoning_bullets'],
    logger,
    cardId: userCardId,
  })

  const priceFetchedAt = userCard.priceFetchedAt?.toISOString() ?? null

  // 6. Build BASIC narrative from heuristics (always available as fallback)
  const basicNarrative = buildBasicCardNarrative({
    card_id: userCardId,
    identity_tags: [],
    rarity_signal: 'UNKNOWN',
    liquidity_signal: 'UNKNOWN',
    price_band: userCard.estimatedValue
      ? { low: Number(userCard.estimatedValue) * 0.9, high: Number(userCard.estimatedValue) * 1.1, currency: 'USD' }
      : null,
    actions,
  })

  // 7. Success path
  if (llmResult.success) {
    // If LLM succeeded, upgrade narrative with LLM-generated text
    const llmNarrative: Narrative = {
      mode: 'LLM',
      headline: llmResult.data.reasoning_bullets.length > 0
        ? llmResult.data.reasoning_bullets[0]
        : basicNarrative.headline,
      bullets: llmResult.data.reasoning_bullets.length > 0
        ? llmResult.data.reasoning_bullets
        : basicNarrative.bullets,
      what_people_do: basicNarrative.what_people_do,
    }

    return {
      success: true,
      data: {
        ...llmResult.data,
        actions,
        priceConfidence: userCard.priceConfidence,
        priceFetchedAt,
        narrative: llmNarrative,
      },
    }
  }

  // 8. Degraded path — LLM failed, return rules engine actions with BASIC narrative
  return {
    success: true,
    degraded: true,
    data: {
      card_id: userCardId,
      identity_tags: [],
      rarity_signal: null as unknown as string,
      liquidity_signal: null as unknown as string,
      price_band: null,
      reasoning_bullets: [],
      confidence: 'LOW',
      actions,
      priceConfidence: userCard.priceConfidence,
      priceFetchedAt,
      degraded: true,
      narrative: basicNarrative,
    },
  }
}

export async function analyzeCardBatch(
  cardIds: string[],
  userId: string,
  context: { source?: 'pack_pull' } = {},
  logger?: LLMLogger
): Promise<CardAnalysisResult[]> {
  const CONCURRENCY = 3
  const results: CardAnalysisResult[] = []

  for (let i = 0; i < cardIds.length; i += CONCURRENCY) {
    const chunk = cardIds.slice(i, i + CONCURRENCY)
    const chunkResults = await Promise.all(chunk.map((id) => analyzeCard(id, userId, context, logger)))
    results.push(...chunkResults)
  }

  // Write RECOMMENDATION actionsLog entries for each successfully analyzed card (CARD-03 / OBS-02)
  for (const result of results) {
    if (result.success) {
      const cardId = result.data.card_id
      const recommendedActions = result.data.actions ?? []
      await prisma.actionsLog.create({
        data: {
          userId,
          cardId,
          agentRecommended: JSON.parse(JSON.stringify({ actions: recommendedActions })),
          userAction: 'RECOMMENDATION',
        },
      })
    }
  }

  return results
}
