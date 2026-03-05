'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { getDeepLink, getInlineMessage } from '@/lib/deep-links'
import type { CardAnalysisResponse, ActionType } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/ui/loading'
import { ModeBadge } from '@/components/portfolio/agent-notes'

const confidenceColors: Record<string, string> = {
  HIGH: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-red-100 text-red-800',
}

const priceConfidenceColors: Record<string, string> = {
  LIVE: 'bg-green-100 text-green-800',
  RECENT_24H: 'bg-blue-100 text-blue-800',
  STALE_7D: 'bg-yellow-100 text-yellow-800',
  NO_DATA: 'bg-gray-100 text-gray-600',
}

export default function CardDetailPage() {
  const params = useParams<{ cardId: string }>()
  const [analysis, setAnalysis] = useState<CardAnalysisResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [executingAction, setExecutingAction] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.analyzeCard(params.cardId)
        setAnalysis(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to analyze card')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.cardId])

  async function handleAction(actionType: ActionType) {
    setExecutingAction(actionType)
    setToast(null)
    try {
      await api.executeAction({
        cardId: params.cardId,
        action: actionType,
      })

      const link = getDeepLink(actionType, params.cardId)
      if (link) {
        window.open(link, '_blank')
      } else {
        setToast(getInlineMessage(actionType))
        setTimeout(() => setToast(null), 3000)
      }
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setExecutingAction(null)
    }
  }

  if (loading) return <PageLoading />

  if (error || !analysis) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600">{error || 'Card not found'}</p>
      </div>
    )
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(n)

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Card Analysis</h1>
      <p className="mb-6 text-sm text-gray-500">ID: {analysis.card_id}</p>

      {toast && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          {toast}
        </div>
      )}

      <div className="space-y-6">
        {/* Narrative / What This Means */}
        {analysis.narrative && (
          <Card className="border-brand-200 bg-brand-50/30">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">What This Means</h3>
              <ModeBadge mode={analysis.narrative.mode} />
            </div>
            <p className="mb-3 text-sm font-medium text-gray-900">{analysis.narrative.headline}</p>
            <ul className="mb-4 space-y-1">
              {analysis.narrative.bullets.map((bullet, i) => (
                <li key={i} className="text-sm text-gray-600">&bull; {bullet}</li>
              ))}
            </ul>
            {analysis.narrative.what_people_do && analysis.narrative.what_people_do.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">What collectors do</p>
                <ul className="space-y-1">
                  {analysis.narrative.what_people_do.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600">&bull; {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {/* Identity & Signals */}
        <Card>
          <div className="mb-3 flex flex-wrap gap-2">
            {analysis.identity_tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Rarity
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {analysis.rarity_signal}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Liquidity
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {analysis.liquidity_signal}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Confidence
              </p>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${confidenceColors[analysis.confidence]}`}
              >
                {analysis.confidence}
              </span>
            </div>
          </div>
        </Card>

        {/* Price */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Price Band
              </p>
              {analysis.price_band ? (
                <p className="text-lg font-bold text-gray-900">
                  {fmt(analysis.price_band.low)} &ndash;{' '}
                  {fmt(analysis.price_band.high)}{' '}
                  <span className="text-sm font-normal text-gray-500">
                    {analysis.price_band.currency}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-gray-500">No price data</p>
              )}
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${priceConfidenceColors[analysis.priceConfidence]}`}
            >
              {analysis.priceConfidence.replace('_', ' ')}
            </span>
          </div>
        </Card>

        {/* Reasoning */}
        {analysis.reasoning_bullets.length > 0 && (
          <Card>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Analysis
            </h3>
            <ul className="space-y-1">
              {analysis.reasoning_bullets.map((bullet, i) => (
                <li key={i} className="text-sm text-gray-600">
                  &bull; {bullet}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Actions */}
        {analysis.actions.length > 0 && (
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Available Actions
            </h3>
            <div className="space-y-2">
              {analysis.actions.map((action) => (
                <div
                  key={action.type}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {action.ui_copy}
                    </p>
                    {action.risk_notes && (
                      <p className="text-xs text-yellow-600">
                        {action.risk_notes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => handleAction(action.type as ActionType)}
                    loading={executingAction === action.type}
                    className="ml-3 shrink-0"
                  >
                    {action.type.replace('_', ' ')}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {analysis.degraded && (
          <p className="text-xs text-yellow-600">
            Note: This analysis may be incomplete due to limited data
            availability.
          </p>
        )}
      </div>
    </div>
  )
}
