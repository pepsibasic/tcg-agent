import { Card, CardHeader, CardTitle } from '@/components/ui/card'

interface LiquidityCardProps {
  score: number
  level: 'HIGH' | 'MEDIUM' | 'LOW'
}

const LEVEL_COLORS = {
  HIGH: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-red-100 text-red-800',
} as const

export function LiquidityCard({ score, level }: LiquidityCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Liquidity</CardTitle>
      </CardHeader>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-gray-900">{score}</span>
        <span className="mb-1 text-sm text-gray-500">/ 10</span>
      </div>
      <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${LEVEL_COLORS[level]}`}>
        {level}
      </span>
    </Card>
  )
}
