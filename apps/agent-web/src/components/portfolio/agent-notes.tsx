'use client'

import type { AgentCommentary, ActionType } from '@/lib/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { getDeepLink, getInlineMessage } from '@/lib/deep-links'
import { useState } from 'react'

function ModeBadge({ mode }: { mode: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
      mode === 'LLM'
        ? 'bg-green-100 text-green-800'
        : 'bg-gray-100 text-gray-600'
    }`}>
      {mode === 'LLM' ? 'AI-Powered' : 'Basic Mode'}
    </span>
  )
}

export function AgentNotesCard({ commentary }: { commentary: AgentCommentary }) {
  const [toast, setToast] = useState<string | null>(null)
  const [executingAction, setExecutingAction] = useState<string | null>(null)

  async function handleAction(actionType: ActionType, cardId?: string) {
    setExecutingAction(actionType)
    setToast(null)
    try {
      await api.executeAction({ action: actionType, cardId })
      const link = getDeepLink(actionType, cardId)
      if (link) {
        window.open(link, '_blank')
      } else {
        setToast(getInlineMessage(actionType))
        setTimeout(() => setToast(null), 3000)
      }
    } catch {
      setToast('Action failed')
    } finally {
      setExecutingAction(null)
    }
  }

  return (
    <Card className="border-brand-200 bg-brand-50/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Agent Notes</CardTitle>
          <ModeBadge mode={commentary.mode} />
        </div>
      </CardHeader>

      <p className="mb-3 text-sm font-medium text-gray-900">{commentary.headline}</p>

      <ul className="mb-4 space-y-1">
        {commentary.bullets.map((bullet, i) => (
          <li key={i} className="text-sm text-gray-600">&bull; {bullet}</li>
        ))}
      </ul>

      {toast && (
        <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {toast}
        </div>
      )}

      {commentary.next_best_moves.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Next Best Moves</p>
          <div className="space-y-2">
            {commentary.next_best_moves.map((move, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{move.title}</p>
                  <p className="text-xs text-gray-500">{move.rationale}</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => handleAction(move.action.type as ActionType)}
                  loading={executingAction === move.action.type}
                  className="ml-3 shrink-0"
                >
                  Go
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

export { ModeBadge }
