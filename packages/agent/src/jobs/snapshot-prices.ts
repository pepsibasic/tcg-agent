import { prisma } from '@tcg/db'
import { getCardPrice } from '../services/pricing-service.js'

interface SnapshotResult {
  request_id: string
  job_name: string
  total_keys: number
  success_count: number
  fail_count: number
  duration_ms: number
}

/**
 * Snapshot today's prices for all cards in user portfolios.
 * Upserts CardPriceHistory rows for today's UTC date.
 * Processes in batches of 20 with a small delay to avoid rate limiting.
 */
export async function runPriceSnapshot(requestId: string): Promise<SnapshotResult> {
  const start = Date.now()

  // Collect distinct card keys from user_cards (via card name) and external_cards
  const userCards = await prisma.userCard.findMany({
    where: { deletedAt: null },
    include: { card: true },
    distinct: ['cardId'],
  })

  const externalCards = await prisma.externalCard.findMany({
    where: { deletedAt: null },
    distinct: ['name'],
  })

  // Build unique card keys map: cardKey -> cardId (optional, for DB fallback)
  const cardKeyMap = new Map<string, string | undefined>()
  for (const uc of userCards) {
    cardKeyMap.set(uc.card.name, uc.cardId)
  }
  for (const ec of externalCards) {
    if (!cardKeyMap.has(ec.name)) {
      cardKeyMap.set(ec.name, undefined)
    }
  }

  const cardKeys = Array.from(cardKeyMap.entries())
  const totalKeys = cardKeys.length

  // Today's date at UTC midnight
  const now = new Date()
  const asOfDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  let successCount = 0
  let failCount = 0
  const BATCH_SIZE = 20

  for (let i = 0; i < cardKeys.length; i += BATCH_SIZE) {
    const batch = cardKeys.slice(i, i + BATCH_SIZE)

    const results = await Promise.allSettled(
      batch.map(async ([cardKey, cardId]) => {
        const price = await getCardPrice(cardKey, cardId)

        await prisma.cardPriceHistory.upsert({
          where: { cardKey_asOfDate: { cardKey, asOfDate } },
          create: {
            cardKey,
            asOfDate,
            marketPriceUsd: price.market_price,
            confidence: price.confidence,
            source: price.source,
          },
          update: {
            marketPriceUsd: price.market_price,
            confidence: price.confidence,
            source: price.source,
          },
        })

        // Upsert catalog entry
        await prisma.cardCatalog.upsert({
          where: { cardKey },
          create: { cardKey, title: cardKey },
          update: { title: cardKey },
        })
      })
    )

    for (const r of results) {
      if (r.status === 'fulfilled') successCount++
      else failCount++
    }

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < cardKeys.length) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  return {
    request_id: requestId,
    job_name: 'snapshot-prices',
    total_keys: totalKeys,
    success_count: successCount,
    fail_count: failCount,
    duration_ms: Date.now() - start,
  }
}
