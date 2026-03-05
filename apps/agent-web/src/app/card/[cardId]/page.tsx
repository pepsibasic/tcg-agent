'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { getDeepLink, getInlineMessage } from '@/lib/deep-links'
import type { CardAnalysisResponse, ActionType, PriceHistoryResponse, AlertDTO } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/ui/loading'
import { ModeBadge } from '@/components/portfolio/agent-notes'
import { Sparkline } from '@/components/ui/sparkline'
import { WatchButton } from '@/components/watch-button'

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

const ALERT_TYPES = [
  { value: 'PRICE_ABOVE', label: 'Price Above ($)' },
  { value: 'PRICE_BELOW', label: 'Price Below ($)' },
  { value: 'CHANGE_7D_ABOVE_PCT', label: '7d Change Above (%)' },
  { value: 'CHANGE_7D_BELOW_PCT', label: '7d Change Below (%)' },
]

function computeTrend(points: Array<{ price_usd: number | null }>, change7d: number | null): { label: string; color: string } {
  const prices = points.map((p) => p.price_usd).filter((p): p is number => p != null)
  if (prices.length < 3) return { label: 'INSUFFICIENT DATA', color: 'text-gray-500' }

  const last7 = prices.slice(-7)
  const avg7 = last7.reduce((s, v) => s + v, 0) / last7.length
  const latest = prices[prices.length - 1]

  if (latest > avg7 && change7d != null && change7d > 0.03) {
    return { label: 'UP', color: 'text-green-600' }
  }
  if (latest < avg7 && change7d != null && change7d < -0.03) {
    return { label: 'DOWN', color: 'text-red-600' }
  }
  return { label: 'RANGE', color: 'text-yellow-600' }
}

function computeVolatility(points: Array<{ price_usd: number | null }>): { label: string; color: string } {
  const prices = points.map((p) => p.price_usd).filter((p): p is number => p != null)
  if (prices.length < 5) return { label: 'N/A', color: 'text-gray-500' }

  const returns: number[] = []
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }
  }
  if (returns.length === 0) return { label: 'N/A', color: 'text-gray-500' }

  const mean = returns.reduce((s, v) => s + v, 0) / returns.length
  const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length
  const stddev = Math.sqrt(variance)

  if (stddev < 0.02) return { label: 'LOW', color: 'text-green-600' }
  if (stddev < 0.06) return { label: 'MEDIUM', color: 'text-yellow-600' }
  return { label: 'HIGH', color: 'text-red-600' }
}

export default function CardDetailPage() {
  const params = useParams<{ cardId: string }>()
  const [analysis, setAnalysis] = useState<CardAnalysisResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [executingAction, setExecutingAction] = useState<string | null>(null)
  const [priceHistory, setPriceHistory] = useState<PriceHistoryResponse | null>(null)

  // Alert creation state
  const [alertType, setAlertType] = useState('PRICE_ABOVE')
  const [alertThreshold, setAlertThreshold] = useState('')
  const [alertLoading, setAlertLoading] = useState(false)
  const [alerts, setAlerts] = useState<AlertDTO[]>([])

  const cardKey = analysis?.identity_tags?.[0] || params.cardId

  useEffect(() => {
    async function load() {
      try {
        const data = await api.analyzeCard(params.cardId)
        setAnalysis(data)
        const key = data.identity_tags?.[0] || params.cardId
        api.getPriceHistory(key, '90d').then(setPriceHistory).catch(() => {})
        api.getAlertsByCard(key).then(setAlerts).catch(() => {})
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
      await api.executeAction({ cardId: params.cardId, action: actionType })
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

  async function handleCreateAlert(e: React.FormEvent) {
    e.preventDefault()
    const threshold = parseFloat(alertThreshold)
    if (isNaN(threshold)) return
    setAlertLoading(true)
    try {
      const finalThreshold = alertType.includes('PCT') ? threshold / 100 : threshold
      await api.createAlert({ type: alertType, cardKey, threshold: finalThreshold })
      setToast('Alert created')
      setTimeout(() => setToast(null), 3000)
      setAlertThreshold('')
      // Refresh alerts list
      api.getAlertsByCard(cardKey).then(setAlerts).catch(() => {})
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to create alert')
    } finally {
      setAlertLoading(false)
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
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const trend = priceHistory ? computeTrend(priceHistory.points, priceHistory.change_7d ?? null) : null
  const volatility = priceHistory ? computeVolatility(priceHistory.points) : null
  const currentPrice = priceHistory?.points?.length
    ? priceHistory.points[priceHistory.points.length - 1].price_usd
    : null

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Card Analysis</h1>
        <WatchButton cardKey={cardKey} />
      </div>
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
              <p className="text-xs font-medium uppercase text-gray-500">Rarity</p>
              <p className="text-sm font-semibold text-gray-900">{analysis.rarity_signal}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Liquidity</p>
              <p className="text-sm font-semibold text-gray-900">{analysis.liquidity_signal}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Confidence</p>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${confidenceColors[analysis.confidence]}`}>
                {analysis.confidence}
              </span>
            </div>
          </div>
        </Card>

        {/* Price */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Price Band</p>
              {analysis.price_band ? (
                <p className="text-lg font-bold text-gray-900">
                  {fmt(analysis.price_band.low)} &ndash; {fmt(analysis.price_band.high)}{' '}
                  <span className="text-sm font-normal text-gray-500">{analysis.price_band.currency}</span>
                </p>
              ) : (
                <p className="text-sm text-gray-500">No price data</p>
              )}
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priceConfidenceColors[analysis.priceConfidence]}`}>
              {analysis.priceConfidence.replace('_', ' ')}
            </span>
          </div>
        </Card>

        {/* Price History */}
        {priceHistory && priceHistory.points.length > 1 && (
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Price History (90d)</h3>
            <Sparkline points={priceHistory.points.map((p) => p.price_usd)} width={280} height={48} />
            <div className="mt-3 flex gap-4 text-xs">
              {priceHistory.change_1d != null && (
                <span className={priceHistory.change_1d >= 0 ? 'text-green-600' : 'text-red-600'}>
                  1d: {priceHistory.change_1d >= 0 ? '+' : ''}{(priceHistory.change_1d * 100).toFixed(1)}%
                </span>
              )}
              {priceHistory.change_7d != null && (
                <span className={priceHistory.change_7d >= 0 ? 'text-green-600' : 'text-red-600'}>
                  7d: {priceHistory.change_7d >= 0 ? '+' : ''}{(priceHistory.change_7d * 100).toFixed(1)}%
                </span>
              )}
              {priceHistory.change_30d != null && (
                <span className={priceHistory.change_30d >= 0 ? 'text-green-600' : 'text-red-600'}>
                  30d: {priceHistory.change_30d >= 0 ? '+' : ''}{(priceHistory.change_30d * 100).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="mt-2 text-[10px] text-gray-400">
              Last snapshot: {priceHistory.points[priceHistory.points.length - 1].as_of}
            </p>
          </Card>
        )}

        {/* Trend & Volatility Signals */}
        {priceHistory && priceHistory.points.length > 1 && (
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Signals</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {trend && (
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Trend</p>
                  <p className={`text-sm font-semibold ${trend.color}`}>{trend.label}</p>
                </div>
              )}
              {volatility && (
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Volatility</p>
                  <p className={`text-sm font-semibold ${volatility.color}`}>{volatility.label}</p>
                </div>
              )}
              {priceHistory.points.length < 10 && (
                <div>
                  <p className="text-xs font-medium uppercase text-yellow-600">Warning</p>
                  <p className="text-sm text-yellow-600">Sparse history</p>
                </div>
              )}
              {(analysis.priceConfidence === 'NO_DATA' || analysis.priceConfidence === 'STALE_7D') && (
                <div>
                  <p className="text-xs font-medium uppercase text-yellow-600">Warning</p>
                  <p className="text-sm text-yellow-600">Low confidence price</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Create Alert */}
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Create Alert</h3>
          <form onSubmit={handleCreateAlert} className="space-y-3">
            <div>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                {ALERT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                step="any"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                placeholder={alertType.includes('PCT') ? 'e.g. 10' : 'e.g. 500'}
                className="block flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
              <Button type="submit" loading={alertLoading} disabled={!alertThreshold}>
                Create
              </Button>
            </div>
            {/* Quick presets */}
            {currentPrice != null && currentPrice > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setAlertType('PRICE_ABOVE'); setAlertThreshold(Math.round(currentPrice * 1.1).toString()) }}
                  className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                >
                  +10% ({fmt(currentPrice * 1.1)})
                </button>
                <button
                  type="button"
                  onClick={() => { setAlertType('PRICE_BELOW'); setAlertThreshold(Math.round(currentPrice * 0.9).toString()) }}
                  className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                >
                  -10% ({fmt(currentPrice * 0.9)})
                </button>
                <button
                  type="button"
                  onClick={() => { setAlertType('CHANGE_7D_ABOVE_PCT'); setAlertThreshold('10') }}
                  className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                >
                  7d +10%
                </button>
                <button
                  type="button"
                  onClick={() => { setAlertType('CHANGE_7D_BELOW_PCT'); setAlertThreshold('-10') }}
                  className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                >
                  7d -10%
                </button>
              </div>
            )}
          </form>

          {/* Existing alerts for this card */}
          {alerts.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs font-medium uppercase text-gray-500">Active Alerts</p>
              <div className="space-y-1">
                {alerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-xs">
                    <span className="font-medium text-gray-700">{a.type.replace(/_/g, ' ')}</span>
                    <span className="text-gray-500">
                      {a.type.includes('PCT') ? `${((a.threshold ?? 0) * 100).toFixed(1)}%` : `$${a.threshold}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Reasoning */}
        {analysis.reasoning_bullets.length > 0 && (
          <Card>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Analysis</h3>
            <ul className="space-y-1">
              {analysis.reasoning_bullets.map((bullet, i) => (
                <li key={i} className="text-sm text-gray-600">&bull; {bullet}</li>
              ))}
            </ul>
          </Card>
        )}

        {/* Actions */}
        {analysis.actions.length > 0 && (
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Available Actions</h3>
            <div className="space-y-2">
              {analysis.actions.map((action) => (
                <div key={action.type} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{action.ui_copy}</p>
                    {action.risk_notes && (
                      <p className="text-xs text-yellow-600">{action.risk_notes}</p>
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
            Note: This analysis may be incomplete due to limited data availability.
          </p>
        )}
      </div>
    </div>
  )
}
