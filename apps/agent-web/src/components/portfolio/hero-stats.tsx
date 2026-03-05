import type { PortfolioSummaryResponse } from '@/lib/types'
import { Card } from '@/components/ui/card'

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

  const totalCards = portfolio.breakdown.reduce(
    (sum, b) => sum + b.cardCount,
    0
  )

  return (
    <Card className="bg-gradient-to-br from-brand-50 to-white">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat
          label="Portfolio Value"
          value={fmt(portfolio.portfolio_value_market ?? portfolio.totalValueEst)}
        />
        <Stat
          label="Instant Liquidity"
          value={fmt(portfolio.portfolio_value_liquidity ?? 0)}
        />
        <Stat label="Card Count" value={String(totalCards)} />
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
