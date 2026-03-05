'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { AlertEventDTO } from '@/lib/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'

export function NotificationsPanel() {
  const [events, setEvents] = useState<AlertEventDTO[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    api.getNotifications()
      .then((d) => setEvents(d.events))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  if (!loaded || events.length === 0) return null

  const newCount = events.filter((e) => e.status === 'NEW').length

  async function markSeen(id: string) {
    setEvents((prev) => prev.map((e) => e.id === id ? { ...e, status: 'SEEN' as const } : e))
    try { await api.markNotificationSeen(id) } catch { /* optimistic */ }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Notifications</CardTitle>
          {newCount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">{newCount}</span>
          )}
        </div>
      </CardHeader>
      <div className="space-y-3">
        {events.slice(0, 5).map((event) => (
          <div key={event.id} className={`rounded-lg border-l-4 p-3 ${event.status === 'NEW' ? 'border-l-blue-400 bg-blue-50' : 'border-l-gray-200 bg-gray-50'}`}>
            <p className="text-sm font-medium text-gray-900">{event.title}</p>
            <p className="mt-0.5 text-sm text-gray-600">{event.body}</p>
            <div className="mt-2 flex gap-2">
              {event.card_key && (
                <Link href={`/card/${encodeURIComponent(event.card_key)}`} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                  View card
                </Link>
              )}
              {event.status === 'NEW' && (
                <button onClick={() => markSeen(event.id)} className="text-xs font-medium text-gray-500 hover:text-gray-700">
                  Mark seen
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
