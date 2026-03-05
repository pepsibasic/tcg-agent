import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'

const { mockAnalysis, mockHistory, mockAlerts } = vi.hoisted(() => ({
  mockAnalysis: {
    card_id: 'card-1',
    identity_tags: ['Manga Luffy PSA10'],
    rarity_signal: 'RARE',
    liquidity_signal: 'HIGH',
    price_band: { low: 3500, high: 4200, currency: 'USD' },
    reasoning_bullets: ['Strong recent sales'],
    confidence: 'HIGH' as const,
    actions: [{ type: 'BUYBACK', params: null, ui_copy: 'Sell back', risk_notes: null }],
    priceConfidence: 'RECENT_24H' as const,
    priceFetchedAt: '2026-03-01T00:00:00Z',
    narrative: {
      mode: 'BASIC' as const,
      headline: 'Strong card',
      bullets: ['Top seller'],
    },
  },
  mockHistory: {
    card_key: 'Manga Luffy PSA10',
    range: '90d' as const,
    points: Array.from({ length: 30 }, (_, i) => ({
      as_of: `2026-02-${String(i + 1).padStart(2, '0')}`,
      price_usd: 3500 + i * 20,
    })),
    change_1d: 0.01,
    change_7d: 0.05,
    change_30d: 0.15,
  },
  mockAlerts: [
    { id: 'a1', type: 'PRICE_ABOVE', cardKey: 'Manga Luffy PSA10', threshold: 5000, createdAt: '2026-03-01T00:00:00Z' },
  ],
}))

vi.mock('@/lib/api', () => ({
  api: {
    analyzeCard: vi.fn(async () => mockAnalysis),
    getPriceHistory: vi.fn(async () => mockHistory),
    getAlertsByCard: vi.fn(async () => mockAlerts),
    executeAction: vi.fn(async () => ({ status: 'ok', message: 'done' })),
    createAlert: vi.fn(async () => ({ id: 'new-alert' })),
    getAlerts: vi.fn(async () => mockAlerts),
    addWatchlist: vi.fn(async () => ({ status: 'ok' })),
    removeWatchlist: vi.fn(async () => {}),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ cardId: 'card-1' }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/lib/deep-links', () => ({
  getDeepLink: () => null,
  getInlineMessage: () => 'Action executed',
}))

import CardDetailPage from '@/app/card/[cardId]/page'
import { api } from '@/lib/api'

afterEach(cleanup)

describe('CardDetailPage', () => {
  it('renders card analysis with watch button', async () => {
    render(<CardDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Card Analysis')).toBeInTheDocument()
      expect(screen.getByText('Watch')).toBeInTheDocument()
    })
  })

  it('renders trend and volatility signals', async () => {
    render(<CardDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Signals')).toBeInTheDocument()
    })
    expect(screen.getByText('Trend')).toBeInTheDocument()
    expect(screen.getByText('Volatility')).toBeInTheDocument()
  })

  it('renders create alert form', async () => {
    render(<CardDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Create Alert')).toBeInTheDocument()
    })
    expect(screen.getByText('Create')).toBeInTheDocument()
  })

  it('shows existing alerts for the card', async () => {
    render(<CardDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Active Alerts')).toBeInTheDocument()
    })
    expect(screen.getByText('PRICE ABOVE')).toBeInTheDocument()
    expect(screen.getByText('$5000')).toBeInTheDocument()
  })

  it('submits alert creation', async () => {
    render(<CardDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Create Alert')).toBeInTheDocument()
    })
    const input = screen.getByPlaceholderText('e.g. 500')
    fireEvent.change(input, { target: { value: '4500' } })
    fireEvent.click(screen.getByText('Create'))
    await waitFor(() => {
      expect(api.createAlert).toHaveBeenCalledWith({
        type: 'PRICE_ABOVE',
        cardKey: 'Manga Luffy PSA10',
        threshold: 4500,
      })
    })
  })
})
