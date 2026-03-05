'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import type { DecisionSignal } from '@/lib/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'

const SEVERITY_STYLES = {
  info: 'border-l-blue-400 bg-blue-50',
  warning: 'border-l-amber-400 bg-amber-50',
} as const

export function SignalsPanel({ signals }: { signals: DecisionSignal[] }) {
  if (signals.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Decision Signals</CardTitle>
      </CardHeader>
      <div className="space-y-3">
        {signals.map((signal, i) => (
          <SignalRow key={i} signal={signal} />
        ))}
      </div>
    </Card>
  )
}

function SignalRow({ signal }: { signal: DecisionSignal }) {
  const [executing, setExecuting] = useState(false)

  async function handleAction() {
    if (!signal.suggested_action) return
    setExecuting(true)
    try {
      await api.executeAction({
        cardId: signal.related_card_id,
        action: signal.suggested_action.type,
      })
    } catch {
      // silent fail — action is logged server-side
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className={`rounded-lg border-l-4 p-3 ${SEVERITY_STYLES[signal.severity]}`}>
      <p className="text-sm font-medium text-gray-900">{signal.title}</p>
      <p className="mt-0.5 text-sm text-gray-600">{signal.body}</p>
      {signal.suggested_action && (
        <button
          onClick={handleAction}
          disabled={executing}
          className="mt-2 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {executing ? 'Processing...' : signal.suggested_action.ui_copy}
        </button>
      )}
    </div>
  )
}
