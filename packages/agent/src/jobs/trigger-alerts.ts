import { prisma } from '@tcg/db'

interface TriggerResult {
  request_id: string
  job_name: string
  alerts_checked: number
  triggered_count: number
  duration_ms: number
}

export async function runTriggerAlerts(requestId: string): Promise<TriggerResult> {
  const start = Date.now()

  const alerts = await prisma.alert.findMany()

  const now = new Date()
  const asOfDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const target7d = new Date(now.getTime() - 7 * 86400000)

  let triggeredCount = 0

  for (const alert of alerts) {
    if (!alert.cardKey || alert.threshold == null) continue

    // Check idempotency: skip if event already exists for this alert+date
    const existing = await prisma.alertEvent.findFirst({
      where: {
        alertId: alert.id,
        triggeredAt: { gte: asOfDate },
      },
    })
    if (existing) continue

    // Fetch latest price
    const latestRow = await prisma.cardPriceHistory.findFirst({
      where: { cardKey: alert.cardKey, marketPriceUsd: { not: null } },
      orderBy: { asOfDate: 'desc' },
    })
    if (!latestRow?.marketPriceUsd) continue

    const latestPrice = latestRow.marketPriceUsd
    let triggered = false
    let comparisonPrice: number | null = null
    let change7d: number | null = null

    if (alert.type === 'PRICE_ABOVE' || alert.type === 'PRICE_THRESHOLD') {
      triggered = latestPrice >= alert.threshold
    } else if (alert.type === 'PRICE_BELOW') {
      triggered = latestPrice <= alert.threshold
    } else if (alert.type === 'CHANGE_7D_ABOVE_PCT' || alert.type === 'CHANGE_7D_BELOW_PCT') {
      // Find price ~7d ago
      const histRow = await prisma.cardPriceHistory.findFirst({
        where: {
          cardKey: alert.cardKey,
          asOfDate: {
            gte: new Date(target7d.getTime() - 2 * 86400000),
            lte: new Date(target7d.getTime() + 2 * 86400000),
          },
          marketPriceUsd: { not: null },
        },
        orderBy: { asOfDate: 'desc' },
      })

      if (histRow?.marketPriceUsd && histRow.marketPriceUsd !== 0) {
        comparisonPrice = histRow.marketPriceUsd
        change7d = (latestPrice - comparisonPrice) / comparisonPrice

        if (alert.type === 'CHANGE_7D_ABOVE_PCT') {
          triggered = change7d >= alert.threshold
        } else {
          triggered = change7d <= alert.threshold
        }
      }
    }

    if (triggered) {
      await prisma.alertEvent.create({
        data: {
          alertId: alert.id,
          userId: alert.userId,
          cardKey: alert.cardKey,
          payload: {
            alert_type: alert.type,
            card_key: alert.cardKey,
            latest_price_usd: latestPrice,
            comparison_price_usd: comparisonPrice,
            change_7d: change7d,
            threshold: alert.threshold,
            as_of_date: asOfDate.toISOString(),
          },
        },
      })
      triggeredCount++
    }
  }

  return {
    request_id: requestId,
    job_name: 'trigger-alerts',
    alerts_checked: alerts.length,
    triggered_count: triggeredCount,
    duration_ms: Date.now() - start,
  }
}
