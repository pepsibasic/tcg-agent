import type { PortfolioSummaryResponse } from '@/lib/types'
import { Card } from '@/components/ui/card'

const confidenceColors: Record<string, string> = {
  LIVE: 'bg-green-100 text-green-800',
  RECENT_24H: 'bg-blue-100 text-blue-800',
  STALE_7D: 'bg-yellow-100 text-yellow-800',
  NO_DATA: 'bg-gray-100 text-gray-600',
}

export function HeroStats({
  portfolio,
}: {
  portfolio: PortfolioSummaryResponse
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <Card className="bg-gradient-to-br from-brand-50 to-white">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Market Value" value={fmt(portfolio.totalValueEst)} />
        <Stat
          label="Liquidity Score"
          value={`${portfolio.liquidityScore}/100`}
        />
        <Stat
          label="Concentration"
          value={`${portfolio.concentrationScore}/100`}
        />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Data Freshness
          </p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${confidenceColors[portfolio.priceConfidence] || confidenceColors.NO_DATA}`}
          >
            {portfolio.priceConfidence.replace('_', ' ')}
          </span>
        </div>
      </div>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
