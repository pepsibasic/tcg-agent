'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { api } from '@/lib/api'

const TABS = [
  { key: 'vault', label: 'From Gacha Vault' },
  { key: 'psa', label: 'PSA Cert' },
  { key: 'manual', label: 'Manual Add' },
]

function UploadContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'vault'

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`/upload?${params.toString()}`)
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Add Cards</h1>
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setTab} />
      <div className="mt-6">
        {activeTab === 'vault' && <VaultTab />}
        {activeTab === 'psa' && <PsaTab />}
        {activeTab === 'manual' && <ManualTab />}
      </div>
    </div>
  )
}

function VaultTab() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleImport() {
    setLoading(true)
    setError(null)
    try {
      await api.getPortfolioSummary()
      router.push('/portfolio')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch vault data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <p className="mb-4 text-sm text-gray-600">
        Import your vaulted cards from Gacha to get a full portfolio analysis.
      </p>
      {error && (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      )}
      <Button onClick={handleImport} loading={loading}>
        Import Vaulted Cards
      </Button>
      {/* TODO: v1.1 — display individual vaulted cards from API */}
    </Card>
  )
}

function PsaTab() {
  const router = useRouter()
  const [certNumber, setCertNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!certNumber.trim()) return
    setLoading(true)
    setError(null)
    try {
      await api.addExternalCard({
        title: `PSA Cert #${certNumber}`,
        estimatedValue: 0,
        certNumber: certNumber.trim(),
      })
      router.push('/portfolio')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add card')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          PSA Certificate Number
        </label>
        <input
          type="text"
          value={certNumber}
          onChange={(e) => setCertNumber(e.target.value)}
          placeholder="e.g. 12345678"
          className="mb-4 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        {error && (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        )}
        <Button type="submit" loading={loading} disabled={!certNumber.trim()}>
          Look Up & Add
        </Button>
      </form>
    </Card>
  )
}

function ManualTab() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    set: '',
    grade: '',
    estimatedValue: '',
  })

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    setError(null)
    try {
      await api.addExternalCard({
        title: form.title.trim(),
        estimatedValue: parseFloat(form.estimatedValue) || 0,
        set: form.set || undefined,
        grade: form.grade || undefined,
      })
      router.push('/portfolio')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add card')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { key: 'title', label: 'Card Name', required: true, placeholder: 'e.g. Charizard VMAX' },
    { key: 'set', label: 'Set', required: false, placeholder: 'e.g. Champion\'s Path' },
    { key: 'grade', label: 'Grade', required: false, placeholder: 'e.g. PSA 10' },
    { key: 'estimatedValue', label: 'Estimated Price ($)', required: false, placeholder: '0.00', type: 'number' as const },
  ]

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {f.label}{f.required && ' *'}
            </label>
            <input
              type={f.type || 'text'}
              value={form[f.key as keyof typeof form]}
              onChange={(e) => updateField(f.key, e.target.value)}
              placeholder={f.placeholder}
              required={f.required}
              step={f.type === 'number' ? '0.01' : undefined}
              min={f.type === 'number' ? '0' : undefined}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        ))}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <Button type="submit" loading={loading} disabled={!form.title.trim()}>
          Add Card
        </Button>
      </form>
    </Card>
  )
}

export default function UploadPage() {
  return (
    <Suspense>
      <UploadContent />
    </Suspense>
  )
}
