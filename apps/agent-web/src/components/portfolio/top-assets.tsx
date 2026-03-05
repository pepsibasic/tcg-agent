import type { PortfolioBreakdown } from '@/lib/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'

export function TopAssets({
  breakdown,
}: {
  breakdown: PortfolioBreakdown[]
}) {
  const sorted = [...breakdown]
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5)

  if (sorted.length === 0) return null

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Assets</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="pb-2">Category</th>
              <th className="pb-2 text-right">Cards</th>
              <th className="pb-2 text-right">Value</th>
              <th className="pb-2 text-right">% of Portfolio</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => (
              <tr key={entry.ipCategory} className="border-b last:border-0">
                <td className="py-2 font-medium text-gray-900">
                  {entry.ipCategory}
                </td>
                <td className="py-2 text-right text-gray-600">
                  {entry.cardCount}
                </td>
                <td className="py-2 text-right text-gray-900">
                  {fmt(entry.totalValue)}
                </td>
                <td className="py-2 text-right text-gray-600">
                  {entry.percentOfPortfolio}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
