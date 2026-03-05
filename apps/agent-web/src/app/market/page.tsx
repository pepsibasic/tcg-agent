'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { MarketMoversResponse } from '@/lib/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { CardSkeleton } from '@/components/ui/loading'
import { WatchButton } from '@/components/watch-button'

export default function MarketPage() {
  const [data, setData] = useState<MarketMoversResponse | null>(null)
  const [range, setRange] = useState<'24h' | '7d'>('7d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api
      .getMarketMovers(range)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load market data'))
      .finally(() => setLoading(false))
  }, [range])

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)

  const fmtPct = (n: number) => {
    const sign = n >= 0 ? '+' : ''
    return `${sign}${(n * 100).toFixed(1)}%`
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Market</h1>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {(['24h', '7d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                range === r
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {error && (
        <div className="py-12 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Gainers</CardTitle>
            </CardHeader>
            {data.top_gainers.length === 0 ? (
              <p className="text-sm text-gray-400">No gainers in this period</p>
            ) : (
              <div className="space-y-2">
                {data.top_gainers.map((card) => (
                  <Link
                    key={card.card_key}
                    href={`/card/${encodeURIComponent(card.card_key)}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
                  >
                    <span className="text-sm font-medium text-gray-900">{card.title}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{fmt(card.price)}</span>
                      <span className="text-sm font-medium text-green-600">{fmtPct(card.change_pct)}</span>
                      <WatchButton cardKey={card.card_key} compact />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Losers</CardTitle>
            </CardHeader>
            {data.top_losers.length === 0 ? (
              <p className="text-sm text-gray-400">No losers in this period</p>
            ) : (
              <div className="space-y-2">
                {data.top_losers.map((card) => (
                  <Link
                    key={card.card_key}
                    href={`/card/${encodeURIComponent(card.card_key)}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
                  >
                    <span className="text-sm font-medium text-gray-900">{card.title}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{fmt(card.price)}</span>
                      <span className="text-sm font-medium text-red-600">{fmtPct(card.change_pct)}</span>
                      <WatchButton cardKey={card.card_key} compact />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Most Valuable</CardTitle>
            </CardHeader>
            {data.most_valuable.length === 0 ? (
              <p className="text-sm text-gray-400">No price data available</p>
            ) : (
              <div className="space-y-2">
                {data.most_valuable.map((card, i) => (
                  <Link
                    key={card.card_key}
                    href={`/card/${encodeURIComponent(card.card_key)}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{card.title}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{fmt(card.price)}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
