'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { api } from '@/lib/api'
import type { BulkUploadItem, BulkUploadResponse } from '@/lib/types'

const TABS = [
  { key: 'vault', label: 'From Gacha Vault' },
  { key: 'psa', label: 'PSA Cert' },
  { key: 'manual', label: 'Manual Add' },
  { key: 'bulk', label: 'Bulk Add' },
]

function UploadContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'vault'
  const [receipt, setReceipt] = useState<BulkUploadResponse | null>(null)

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`/upload?${params.toString()}`)
    setReceipt(null)
  }

  if (receipt) {
    return <UploadReceipt receipt={receipt} onAddMore={() => setReceipt(null)} />
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Add Cards</h1>
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setTab} />
      <div className="mt-6">
        {activeTab === 'vault' && <VaultTab />}
        {activeTab === 'psa' && <PsaTab onSuccess={(r) => setReceipt(r)} />}
        {activeTab === 'manual' && <ManualTab onSuccess={(r) => setReceipt(r)} />}
        {activeTab === 'bulk' && <BulkTab onSuccess={(r) => setReceipt(r)} />}
      </div>
    </div>
  )
}

function UploadReceipt({ receipt, onAddMore }: { receipt: BulkUploadResponse; onAddMore: () => void }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Cards Added</h1>
      <Card>
        <div className="mb-4 text-center">
          <p className="text-3xl font-bold text-green-600">{receipt.created}</p>
          <p className="text-sm text-gray-500">cards added</p>
        </div>
        {receipt.portfolio_delta_usd > 0 && (
          <p className="mb-4 text-center text-sm text-gray-600">
            Estimated portfolio value <span className="font-semibold text-green-600">+{fmt(receipt.portfolio_delta_usd)}</span>
          </p>
        )}
        {receipt.cards.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-medium uppercase text-gray-500">Top Cards Added</p>
            {receipt.cards.slice(0, 3).map((card) => (
              <div key={card.id} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm">
                <span className="font-medium text-gray-900">{card.title}</span>
                <span className="text-gray-500">
                  {card.grade && <span className="mr-2 text-xs">{card.grade}</span>}
                  {card.estimatedValue != null && card.estimatedValue > 0 && fmt(card.estimatedValue)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <Link href="/portfolio">
            <Button>View Portfolio</Button>
          </Link>
          <Button variant="secondary" onClick={onAddMore}>Add More</Button>
        </div>
      </Card>
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
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <Button onClick={handleImport} loading={loading}>
        Import Vaulted Cards
      </Button>
    </Card>
  )
}

function PsaTab({ onSuccess }: { onSuccess: (r: BulkUploadResponse) => void }) {
  const [certNumber, setCertNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!certNumber.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.bulkAddExternalCards([{
        title: `PSA Cert #${certNumber}`,
        certNumber: certNumber.trim(),
        estimatedValue: 0,
      }])
      onSuccess(result)
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
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading} disabled={!certNumber.trim()}>
          Look Up & Add
        </Button>
      </form>
    </Card>
  )
}

function ManualTab({ onSuccess }: { onSuccess: (r: BulkUploadResponse) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', set: '', grade: '', estimatedValue: '' })

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.bulkAddExternalCards([{
        title: form.title.trim(),
        estimatedValue: parseFloat(form.estimatedValue) || 0,
        grade: form.grade || undefined,
      }])
      onSuccess(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add card')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { key: 'title', label: 'Card Name', required: true, placeholder: 'e.g. Charizard VMAX' },
    { key: 'set', label: 'Set', required: false, placeholder: "e.g. Champion's Path" },
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading} disabled={!form.title.trim()}>
          Add Card
        </Button>
      </form>
    </Card>
  )
}

interface ParsedLine {
  raw: string
  title: string
  grade: string | null
  certNumber: string | null
  estimatedValue: number | null
  status: 'OK' | 'NEEDS_EDIT'
}

function parseBulkLine(line: string): ParsedLine {
  const trimmed = line.trim()
  if (!trimmed) return { raw: line, title: '', grade: null, certNumber: null, estimatedValue: null, status: 'NEEDS_EDIT' }

  // Try PSA cert number pattern (all digits, 6-12 chars)
  if (/^\d{6,12}$/.test(trimmed)) {
    return {
      raw: line,
      title: `PSA Cert #${trimmed}`,
      grade: null,
      certNumber: trimmed,
      estimatedValue: null,
      status: 'OK',
    }
  }

  // Try free text: "Card Name PSA10 $3800" or "Card Name PSA 10 $3800"
  let title = trimmed
  let grade: string | null = null
  let estimatedValue: number | null = null

  // Extract price at end: $3800 or $3,800 or $3800.00
  const priceMatch = title.match(/\$[\d,]+(?:\.\d{1,2})?\s*$/)
  if (priceMatch) {
    estimatedValue = parseFloat(priceMatch[0].replace(/[$,]/g, ''))
    title = title.slice(0, -priceMatch[0].length).trim()
  }

  // Extract grade: PSA10, PSA 10, BGS 9.5, CGC 10
  const gradeMatch = title.match(/\b(PSA|BGS|CGC|SGC)\s*(\d+(?:\.\d+)?)\s*$/i)
  if (gradeMatch) {
    grade = `${gradeMatch[1].toUpperCase()} ${gradeMatch[2]}`
    title = title.slice(0, -gradeMatch[0].length).trim()
  }

  return {
    raw: line,
    title: title || 'Unknown Card',
    grade,
    certNumber: null,
    estimatedValue,
    status: title ? 'OK' : 'NEEDS_EDIT',
  }
}

function BulkTab({ onSuccess }: { onSuccess: (r: BulkUploadResponse) => void }) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedLine[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleParse() {
    const lines = text.split('\n').filter((l) => l.trim())
    if (lines.length === 0) return
    setParsed(lines.map(parseBulkLine))
    setShowPreview(true)
  }

  function updateParsedRow(index: number, field: keyof ParsedLine, value: string) {
    setParsed((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        const updated = { ...row, [field]: field === 'estimatedValue' ? (parseFloat(value) || null) : value }
        if (field === 'title' && value.trim()) updated.status = 'OK'
        return updated
      })
    )
  }

  function removeRow(index: number) {
    setParsed((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    const items: BulkUploadItem[] = parsed
      .filter((p) => p.title.trim())
      .map((p) => ({
        title: p.title,
        grade: p.grade || undefined,
        certNumber: p.certNumber || undefined,
        estimatedValue: p.estimatedValue ?? 0,
      }))

    if (items.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.bulkAddExternalCards(items)
      onSuccess(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add cards')
    } finally {
      setLoading(false)
    }
  }

  if (!showPreview) {
    return (
      <Card>
        <p className="mb-2 text-sm text-gray-600">
          Paste multiple cards, one per line. Supports PSA cert numbers or free text like:
        </p>
        <p className="mb-4 text-xs text-gray-400">
          Manga Luffy OP05 PSA10 $3800<br />
          Charizard VMAX PSA 9<br />
          12345678
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="One card per line..."
          rows={8}
          className="mb-4 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <Button onClick={handleParse} disabled={!text.trim()}>
          Preview
        </Button>
      </Card>
    )
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Preview ({parsed.length} cards)
        </h3>
        <button onClick={() => setShowPreview(false)} className="text-xs text-gray-500 hover:text-gray-700">
          Edit text
        </button>
      </div>

      <div className="mb-4 space-y-2">
        {parsed.map((row, i) => (
          <div key={i} className="flex items-start gap-2 rounded border border-gray-200 p-2">
            <div className="min-w-0 flex-1 space-y-1">
              <input
                value={row.title}
                onChange={(e) => updateParsedRow(i, 'title', e.target.value)}
                className="block w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none"
                placeholder="Card title"
              />
              <div className="flex gap-2">
                <input
                  value={row.grade || ''}
                  onChange={(e) => updateParsedRow(i, 'grade', e.target.value)}
                  className="block w-24 rounded border border-gray-200 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
                  placeholder="Grade"
                />
                <input
                  type="number"
                  step="0.01"
                  value={row.estimatedValue ?? ''}
                  onChange={(e) => updateParsedRow(i, 'estimatedValue', e.target.value)}
                  className="block w-24 rounded border border-gray-200 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
                  placeholder="$ Value"
                />
                <span className={`self-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  row.status === 'OK' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {row.status}
                </span>
              </div>
            </div>
            <button
              onClick={() => removeRow(i)}
              className="shrink-0 rounded p-1 text-xs text-red-500 hover:bg-red-50"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button onClick={handleSubmit} loading={loading} disabled={parsed.length === 0}>
          Add All ({parsed.filter((p) => p.title.trim()).length} cards)
        </Button>
        <Button variant="secondary" onClick={() => setShowPreview(false)}>
          Back
        </Button>
      </div>
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
