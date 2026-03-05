'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { computeGoals } from '@/lib/goals'
import { computeWrapped } from '@/lib/wrapped'
import type {
  PortfolioSummaryResponse,
  ArchetypeResponse,
} from '@/lib/types'
import { CardSkeleton, PageLoading } from '@/components/ui/loading'
import { HeroStats } from '@/components/portfolio/hero-stats'
import { ArchetypeCard } from '@/components/portfolio/archetype-card'
import { Goals } from '@/components/portfolio/goals'
import { TopAssets } from '@/components/portfolio/top-assets'
import { NextActions } from '@/components/portfolio/next-actions'
import { Wrapped } from '@/components/portfolio/wrapped'

const DEFAULT_USER_ID =
  process.env.NEXT_PUBLIC_DEFAULT_USER_ID ||
  '0190f0e0-0001-7000-8000-000000000001'

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioSummaryResponse | null>(
    null
  )
  const [archetype, setArchetype] = useState<ArchetypeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [p, a] = await Promise.all([
          api.getPortfolioSummary(),
          api.getArchetype(),
        ])
        setPortfolio(p)
        setArchetype(a)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load portfolio')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          Your Portfolio
        </h1>
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  if (error || !portfolio) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600">{error || 'No portfolio data'}</p>
      </div>
    )
  }

  const goals = computeGoals(portfolio.breakdown)
  const wrapped = computeWrapped(portfolio)

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Your Portfolio</h1>
      <div className="space-y-6">
        <HeroStats portfolio={portfolio} />
        {archetype && (
          <ArchetypeCard
            archetype={archetype}
            userId={portfolio.userId || DEFAULT_USER_ID}
          />
        )}
        <Goals goals={goals} />
        <TopAssets breakdown={portfolio.breakdown} />
        <NextActions actions={portfolio.recommendedActions} />
        <Wrapped data={wrapped} />
      </div>
    </div>
  )
}
