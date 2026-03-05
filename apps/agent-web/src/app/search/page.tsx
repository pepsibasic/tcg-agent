'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { SearchCardItem } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { WatchButton } from '@/components/watch-button'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchCardItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setResults([])
      setSearched(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.searchCards(query.trim())
        setResults(res.items)
        setSearched(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Search Cards</h1>

      <div className="mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by card name (min 2 characters)..."
          className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          autoFocus
        />
      </div>

      {loading && (
        <p className="text-sm text-gray-500">Searching...</p>
      )}

      {!loading && searched && results.length === 0 && (
        <Card>
          <p className="text-center text-sm text-gray-500">
            No cards found for &ldquo;{query}&rdquo;
          </p>
        </Card>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((item) => (
            <Card key={item.card_key} className="flex items-center justify-between">
              <Link
                href={`/card/${encodeURIComponent(item.card_key)}`}
                className="min-w-0 flex-1"
              >
                <p className="truncate text-sm font-medium text-gray-900">
                  {item.title}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                  {item.latest_price_usd != null && (
                    <span>{fmt(item.latest_price_usd)}</span>
                  )}
                  {item.change_7d != null && (
                    <span className={item.change_7d >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {item.change_7d >= 0 ? '+' : ''}{(item.change_7d * 100).toFixed(1)}%
                    </span>
                  )}
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    item.confidence === 'HIGH' ? 'bg-green-100 text-green-800' :
                    item.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    item.confidence === 'LOW' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {item.confidence}
                  </span>
                </div>
              </Link>
              <div className="ml-3 shrink-0">
                <WatchButton cardKey={item.card_key} initialWatched={item.is_watched} compact />
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && !searched && (
        <Card>
          <p className="text-center text-sm text-gray-500">
            Type at least 2 characters to search the card catalog
          </p>
        </Card>
      )}
    </div>
  )
}
