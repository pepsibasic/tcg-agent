'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import type { ArchetypeResponse } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/ui/loading'

export default function SharePage() {
  const params = useParams<{ userId: string }>()
  const [archetype, setArchetype] = useState<ArchetypeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getArchetype(params.userId)
        setArchetype(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load archetype')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.userId])

  async function handleCopy() {
    if (!archetype) return
    const text = archetype.share_card_text
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for environments without clipboard API
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) return <PageLoading />

  if (error || !archetype) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600">{error || 'Archetype not found'}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card className="text-center">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">
          {archetype.name}
        </h1>
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {archetype.traits.map((trait) => (
            <span
              key={trait}
              className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
            >
              {trait}
            </span>
          ))}
        </div>
        <p className="mb-4 text-sm text-gray-600">{archetype.why}</p>

        {archetype.share_card_badges.length > 0 && (
          <div className="mb-4 flex flex-wrap justify-center gap-2">
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

        {archetype.comparable_collectors.length > 0 && (
          <p className="mb-4 text-xs text-gray-500">
            Similar collectors: {archetype.comparable_collectors.join(', ')}
          </p>
        )}

        <div className="rounded-lg bg-gray-50 p-4 text-left">
          <p className="mb-2 text-xs font-medium uppercase text-gray-500">
            Share Text
          </p>
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {archetype.share_card_text}
          </p>
        </div>

        <Button onClick={handleCopy} className="mt-4">
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </Button>
      </Card>
    </div>
  )
}
