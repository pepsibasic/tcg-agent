'use client'

import type { ArchetypeResponse } from '@/lib/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export function ArchetypeCard({
  archetype,
  userId,
}: {
  archetype: ArchetypeResponse
  userId: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{archetype.name}</CardTitle>
      </CardHeader>
      <div className="mb-3 flex flex-wrap gap-2">
        {archetype.traits.map((trait) => (
          <span
            key={trait}
            className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
          >
            {trait}
          </span>
        ))}
      </div>
      <p className="mb-3 text-sm text-gray-600">{archetype.why}</p>
      {archetype.share_card_badges.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {archetype.share_card_badges.map((badge) => (
            <span
              key={badge}
              className="rounded-md border border-gray-200 px-2 py-0.5 text-xs text-gray-700"
            >
              {badge}
            </span>
          ))}
        </div>
      )}
      <Link
        href={`/share/${userId}`}
        className="text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        Share your archetype
      </Link>
    </Card>
  )
}
