import { Card, CardHeader, CardTitle } from '@/components/ui/card'

interface RiskCardProps {
  topCategory: string
  concentrationPct: number
  concentrationLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}

const LEVEL_COLORS = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-800',
} as const

export function RiskCard({ topCategory, concentrationPct, concentrationLevel }: RiskCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk</CardTitle>
      </CardHeader>
      <p className="text-sm text-gray-600">{topCategory} concentration</p>
      <div className="mt-1 flex items-end gap-3">
        <span className="text-3xl font-bold text-gray-900">{Math.round(concentrationPct * 100)}%</span>
      </div>
      <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${LEVEL_COLORS[concentrationLevel]}`}>
        {concentrationLevel}
      </span>
    </Card>
  )
}
