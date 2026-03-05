'use client'

import { useState } from 'react'
import { api } from '@/lib/api'

export function WatchButton({ cardKey, initialWatched = false, compact = false }: { cardKey: string; initialWatched?: boolean; compact?: boolean }) {
  const [watched, setWatched] = useState(initialWatched)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const prev = watched
    setWatched(!prev) // optimistic
    try {
      if (prev) {
        await api.removeWatchlist(cardKey)
      } else {
        await api.addWatchlist(cardKey)
      }
    } catch {
      setWatched(prev) // rollback
    } finally {
      setLoading(false)
    }
  }

  if (compact) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); toggle() }}
        disabled={loading}
        className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${watched ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
      >
        {watched ? 'Watching' : 'Watch'}
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${watched ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
    >
      <span>{watched ? '\u2605' : '\u2606'}</span>
      {watched ? 'Watching' : 'Watch'}
    </button>
  )
}
