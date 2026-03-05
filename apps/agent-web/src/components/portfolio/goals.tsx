import type { Goal } from '@/lib/goals'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'

export function Goals({ goals }: { goals: Goal[] }) {
  if (goals.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collection Goals</CardTitle>
      </CardHeader>
      <div className="space-y-4">
        {goals.map((goal) => (
          <div key={goal.title}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-gray-700">{goal.title}</span>
              <span className="text-xs text-gray-500">
                {goal.current}/{goal.target}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${goal.percent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Suggested: {goal.suggestedAction.replace('_', ' ').toLowerCase()}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}
