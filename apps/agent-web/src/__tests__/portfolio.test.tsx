import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'

const { mockPortfolio, mockArchetype, mockChanges, mockHistory } = vi.hoisted(() => ({
  mockChanges: {
    range: '7d' as const,
    portfolio_value_today_usd: 5420,
    portfolio_value_then_usd: 5000,
    delta_usd: 420,
    delta_pct: 0.084,
    coverage_pct: 0.8,
    top_movers: [{ card_key: 'Manga Luffy PSA10', title: 'Manga Luffy PSA10', delta_usd: 300, delta_pct: 0.136 }],
  },
  mockHistory: {
    card_key: 'test',
    range: '30d' as const,
    points: [{ as_of: '2026-02-01', price_usd: 100 }, { as_of: '2026-03-01', price_usd: 120 }],
    change_1d: 0.01,
    change_7d: 0.05,
    change_30d: 0.2,
  },
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
      headline: 'Your portfolio is worth $5,420 with $3,100 instantly liquid.',
      bullets: [
        'Your most valuable card is Manga Luffy PSA10.',
        '3 cards are vaulted and can be sold immediately.',
        '2 uploaded cards could unlock liquidity if vaulted.',
      ],
      next_best_moves: [{
        title: 'Buyback',
        rationale: 'Sell back your top card',
        action: { type: 'BUYBACK', params: null, ui_copy: 'Sell back your top card', risk_notes: null },
      }],
    },
    priceDataAsOf: '2024-01-15T00:00:00Z',
    priceConfidence: 'RECENT_24H' as const,
    top_cards: [
      {
        id: 'card-1',
        title: 'Manga Luffy PSA10',
        grade: 'PSA 10',
        state: 'VAULTED' as const,
        market_price: 2500,
        buyback_price: 1800,
        confidence: 'HIGH' as const,
      },
      {
        id: 'card-2',
        title: 'Charizard VMAX',
        grade: 'PSA 9',
        state: 'VAULTED' as const,
        market_price: 1200,
        buyback_price: 850,
        confidence: 'MEDIUM' as const,
      },
      {
        id: 'card-3',
        title: 'Naruto Sage Mode',
        grade: null,
        state: 'EXTERNAL' as const,
        market_price: 320,
        buyback_price: null,
        confidence: 'LOW' as const,
      },
    ],
    portfolio_value_market: 5420,
    portfolio_value_liquidity: 3100,
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
    getPortfolioChanges: vi.fn().mockResolvedValue(mockChanges),
    getPriceHistory: vi.fn().mockResolvedValue(mockHistory),
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

    // Hero stats should show portfolio value, instant liquidity, card count
    await waitFor(() => {
      expect(screen.getByText('Portfolio Value')).toBeInTheDocument()
    })
    expect(screen.getByText('Instant Liquidity')).toBeInTheDocument()
    expect(screen.getByText('Card Count')).toBeInTheDocument()
    expect(screen.getByText('$5,420')).toBeInTheDocument()
    expect(screen.getByText('$3,100')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
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

  it('renders top cards table', async () => {
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Top Cards')).toBeInTheDocument()
    })

    // Card titles
    expect(screen.getByText('Manga Luffy PSA10')).toBeInTheDocument()
    expect(screen.getByText('Charizard VMAX')).toBeInTheDocument()
    expect(screen.getByText('Naruto Sage Mode')).toBeInTheDocument()

    // Grades
    expect(screen.getByText('PSA 10')).toBeInTheDocument()
    expect(screen.getByText('PSA 9')).toBeInTheDocument()

    // Confidence badges
    expect(screen.getByText('HIGH')).toBeInTheDocument()
    expect(screen.getByText('MEDIUM')).toBeInTheDocument()
    expect(screen.getByText('LOW')).toBeInTheDocument()

    // States
    const vaultedBadges = screen.getAllByText('VAULTED')
    expect(vaultedBadges.length).toBe(2)
    expect(screen.getByText('EXTERNAL')).toBeInTheDocument()
  })

  it('renders recommended actions', async () => {
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(
        screen.getAllByText('Sell back your top card').length
      ).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders 7d change label in hero stats', async () => {
    render(<PortfolioPage />)
    await waitFor(() => {
      expect(screen.getByText('Your Portfolio')).toBeInTheDocument()
    })
    expect(screen.getAllByText('7d Change').length).toBeGreaterThanOrEqual(1)
  })

  it('renders agent notes', async () => {
    render(<PortfolioPage />)
    await waitFor(() => {
      expect(screen.getByText('Agent Notes')).toBeInTheDocument()
    })
    expect(screen.getByText('Your portfolio is worth $5,420 with $3,100 instantly liquid.')).toBeInTheDocument()
    expect(screen.getByText('Basic Mode')).toBeInTheDocument()
  })
})
