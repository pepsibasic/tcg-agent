'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { WatchlistEntry } from '@/lib/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { CardSkeleton } from '@/components/ui/loading'
import { Sparkline } from '@/components/ui/sparkline'

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getWatchlist()
      .then((d) => setItems(d.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)

  async function handleRemove(cardKey: string) {
    setItems((prev) => prev.filter((i) => i.card_key !== cardKey))
    try { await api.removeWatchlist(cardKey) } catch { /* already removed optimistically */ }
  }

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Watchlist</h1>
        <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Watchlist</h1>
      {items.length === 0 ? (
        <Card><p className="text-sm text-gray-400">No cards watched yet. Watch cards from the Market or Card pages.</p></Card>
      ) : (
        <Card>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.card_key} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50">
                <Link href={`/card/${encodeURIComponent(item.card_key)}`} className="flex items-center gap-4 min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-900 truncate">{item.title || item.card_key}</span>
                  {item.sparkline_30d && item.sparkline_30d.length > 1 && (
                    <Sparkline points={item.sparkline_30d} width={80} height={24} />
                  )}
                </Link>
                <div className="flex items-center gap-4 shrink-0">
                  {item.latest_price_usd != null && (
                    <span className="text-sm text-gray-600">{fmt(item.latest_price_usd)}</span>
                  )}
                  {item.change_7d != null && (
                    <span className={`text-sm font-medium ${item.change_7d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.change_7d >= 0 ? '+' : ''}{(item.change_7d * 100).toFixed(1)}%
                    </span>
                  )}
                  <button
                    onClick={() => handleRemove(item.card_key)}
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
