import type { WrappedData } from '@/lib/wrapped'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'

export function Wrapped({ data }: { data: WrappedData }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <CardHeader>
        <h3 className="text-lg font-semibold text-white">
          Your Portfolio Wrapped
        </h3>
      </CardHeader>
      <div className="grid grid-cols-2 gap-4">
        <WrappedStat label="Total Value" value={fmt(data.totalValue)} />
        {data.topIp && (
          <WrappedStat
            label="Top Collection"
            value={`${data.topIp} (${data.topIpPercent}%)`}
          />
        )}
        {data.topCard && (
          <WrappedStat
            label="Highest Value"
            value={`${data.topCard} — ${fmt(data.topCardValue)}`}
          />
        )}
      </div>
    </Card>
  )
}

function WrappedStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  )
}
