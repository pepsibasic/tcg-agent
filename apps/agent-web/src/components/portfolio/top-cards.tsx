'use client'

import { useEffect, useState } from 'react'
import type { TopCard, PriceHistoryResponse } from '@/lib/types'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkline } from '@/components/ui/sparkline'

const confidenceBadge: Record<string, string> = {
  HIGH: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-gray-100 text-gray-600',
  NONE: 'bg-gray-100 text-gray-400',
}

const stateBadge: Record<string, string> = {
  VAULTED: 'bg-blue-100 text-blue-800',
  EXTERNAL: 'bg-orange-100 text-orange-800',
}

function ChangeBadge({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-xs text-gray-400">—</span>
  const pct = (value * 100).toFixed(1)
  const isPositive = value >= 0
  return (
    <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
      {isPositive ? '+' : ''}{pct}%
    </span>
  )
}

export function TopCards({ cards }: { cards: TopCard[] }) {
  const [histories, setHistories] = useState<Map<string, PriceHistoryResponse>>(new Map())

  useEffect(() => {
    let cancelled = false
    async function loadHistories() {
      const CONCURRENCY = 3
      const results = new Map<string, PriceHistoryResponse>()
      for (let i = 0; i < cards.length; i += CONCURRENCY) {
        const batch = cards.slice(i, i + CONCURRENCY)
        const fetched = await Promise.allSettled(
          batch.map((c) => api.getPriceHistory(c.title, '30d'))
        )
        if (cancelled) return
        for (let j = 0; j < batch.length; j++) {
          const r = fetched[j]
          if (r.status === 'fulfilled') results.set(batch[j].title, r.value)
        }
      }
      if (!cancelled) setHistories(results)
    }
    loadHistories()
    return () => { cancelled = true }
  }, [cards])

  if (cards.length === 0) return null

  const fmt = (n: number | null) =>
    n != null
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
      : '—'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Cards</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="pb-2 pr-4">Card</th>
              <th className="pb-2 pr-4">Grade</th>
              <th className="pb-2 pr-4">Market Value</th>
              <th className="pb-2 pr-4">30d</th>
              <th className="pb-2 pr-4">7d Change</th>
              <th className="pb-2 pr-4">Sell Now</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => {
              const history = histories.get(card.title)
              const sparkPoints = history?.points.map((p) => p.price_usd) ?? []
              return (
                <tr key={card.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 pr-4">
                    <a href={`/card/${card.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                      {card.title}
                    </a>
                    <span className={`ml-2 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${confidenceBadge[card.confidence] || confidenceBadge.NONE}`}>
                      {card.confidence}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{card.grade ?? '—'}</td>
                  <td className="py-3 pr-4 font-medium text-gray-900">{fmt(card.market_price)}</td>
                  <td className="py-3 pr-4">
                    <Sparkline points={sparkPoints} />
                  </td>
                  <td className="py-3 pr-4">
                    <ChangeBadge value={history?.change_7d} />
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{fmt(card.buyback_price)}</td>
                  <td className="py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${stateBadge[card.state] || ''}`}>
                      {card.state}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
