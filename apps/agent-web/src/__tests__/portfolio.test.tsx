import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'

const { mockPortfolio, mockArchetype } = vi.hoisted(() => ({
  mockPortfolio: {
    userId: '0190f0e0-0001-7000-8000-000000000001',
    totalValueEst: 1250,
    breakdown: [
      { ipCategory: 'Pokemon', totalValue: 800, cardCount: 5, percentOfPortfolio: 64 },
      { ipCategory: 'One Piece', totalValue: 450, cardCount: 3, percentOfPortfolio: 36 },
    ],
    concentrationScore: 72,
    liquidityScore: 65,
    collectorArchetype: 'IP Loyalist',
    missingSetGoals: ["Champion's Path"],
    recommendedActions: ['List high-value duplicates', 'Open new packs'],
    recommended_actions: [
      { type: 'BUYBACK', params: null, ui_copy: 'Sell back your top card', risk_notes: null },
    ],
    agent_commentary: {
      mode: 'BASIC' as const,
      headline: 'Your portfolio is worth $1,250.',
      bullets: ['Total estimated value: $1,250 across 8 cards.', '2 IP categories tracked.'],
      next_best_moves: [{
        title: 'Buyback',
        rationale: 'Sell back your top card',
        action: { type: 'BUYBACK', params: null, ui_copy: 'Sell back your top card', risk_notes: null },
      }],
    },
    priceDataAsOf: '2024-01-15T00:00:00Z',
    priceConfidence: 'RECENT_24H' as const,
  },
  mockArchetype: {
    name: 'IP Loyalist',
    traits: ['Focused', 'Patient'],
    why: 'Concentrates on specific IPs with long-term holding patterns.',
    comparable_collectors: ['Set Completionist'],
    share_card_text: "I'm an IP Loyalist collector!",
    share_card_badges: ['Pokemon Fan', 'Diamond Hands'],
  },
}))

vi.mock('@/lib/api', () => ({
  api: {
    getPortfolioSummary: vi.fn().mockResolvedValue(mockPortfolio),
    getArchetype: vi.fn().mockResolvedValue(mockArchetype),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Must import after mocks are set up
import PortfolioPage from '@/app/portfolio/page'

describe('PortfolioPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders portfolio data after loading', async () => {
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Your Portfolio')).toBeInTheDocument()
    })

    await waitFor(() => {
      // $1,250 appears in both hero stats and wrapped widget
      expect(screen.getAllByText('$1,250').length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.getByText('65/100')).toBeInTheDocument()
    expect(screen.getByText('72/100')).toBeInTheDocument()
    expect(screen.getByText('RECENT 24H')).toBeInTheDocument()
  })

  it('renders archetype card', async () => {
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('IP Loyalist')).toBeInTheDocument()
    })

    expect(screen.getByText('Focused')).toBeInTheDocument()
    expect(screen.getByText('Patient')).toBeInTheDocument()
  })

  it('renders top assets table', async () => {
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Pokemon')).toBeInTheDocument()
    })

    expect(screen.getByText('One Piece')).toBeInTheDocument()
  })

  it('renders recommended actions', async () => {
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(
        screen.getAllByText('Sell back your top card').length
      ).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders agent notes', async () => {
    render(<PortfolioPage />)
    await waitFor(() => {
      expect(screen.getByText('Agent Notes')).toBeInTheDocument()
    })
    expect(screen.getByText('Your portfolio is worth $1,250.')).toBeInTheDocument()
    expect(screen.getByText('Basic Mode')).toBeInTheDocument()
  })
})
