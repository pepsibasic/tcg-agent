import type { Action } from '@/lib/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'

export function NextActions({ actions }: { actions: Action[] | string[] }) {
  if (actions.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommended Actions</CardTitle>
      </CardHeader>
      <ul className="space-y-2">
        {actions.slice(0, 3).map((action, i) => {
          const text = typeof action === 'string' ? action : action.ui_copy
          return (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700">
                {i + 1}
              </span>
              <span className="text-gray-700">{text}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
