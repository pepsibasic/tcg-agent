'use client'

import { useEffect, useState } from 'react'
import type { PortfolioSummaryResponse, PortfolioChangesResponse } from '@/lib/types'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'

export function HeroStats({ portfolio }: { portfolio: PortfolioSummaryResponse }) {
  const [changes, setChanges] = useState<PortfolioChangesResponse | null>(null)

  useEffect(() => {
    api.getPortfolioChanges('7d').then(setChanges).catch(() => {})
  }, [])

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const totalCards = portfolio.breakdown.reduce((sum, b) => sum + b.cardCount, 0)

  return (
    <Card className="bg-gradient-to-br from-brand-50 to-white">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          label="Portfolio Value"
          value={fmt(portfolio.portfolio_value_market ?? portfolio.totalValueEst)}
        />
        <Stat
          label="Instant Liquidity"
          value={fmt(portfolio.portfolio_value_liquidity ?? 0)}
        />
        <Stat label="Card Count" value={String(totalCards)} />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">7d Change</p>
          {changes && changes.delta_usd != null ? (
            <div className="mt-1">
              <span className={`text-xl font-bold ${changes.delta_usd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {changes.delta_usd >= 0 ? '+' : ''}{fmt(changes.delta_usd)}
              </span>
              {changes.delta_pct != null && (
                <span className={`ml-1 text-sm ${changes.delta_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ({changes.delta_pct >= 0 ? '+' : ''}{(changes.delta_pct * 100).toFixed(1)}%)
                </span>
              )}
              {changes.top_movers.length > 0 && (
                <p className="mt-0.5 text-xs text-gray-500">
                  Top mover: {changes.top_movers[0].title} ({changes.top_movers[0].delta_usd >= 0 ? '+' : ''}{fmt(changes.top_movers[0].delta_usd)})
                </p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-400">No history yet</p>
          )}
        </div>
      </div>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
