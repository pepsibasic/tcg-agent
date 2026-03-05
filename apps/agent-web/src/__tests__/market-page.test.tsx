import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'

const mockMarketData = vi.hoisted(() => ({
  top_gainers: [
    { card_key: 'Manga Luffy PSA10', title: 'Manga Luffy PSA10', price: 350, change_pct: 0.15 },
    { card_key: 'Charizard VMAX', title: 'Charizard VMAX', price: 220, change_pct: 0.08 },
  ],
  top_losers: [
    { card_key: 'Pikachu Promo', title: 'Pikachu Promo', price: 45, change_pct: -0.12 },
  ],
  most_valuable: [
    { card_key: 'Manga Luffy PSA10', title: 'Manga Luffy PSA10', price: 350 },
    { card_key: 'Charizard VMAX', title: 'Charizard VMAX', price: 220 },
  ],
}))

vi.mock('@/lib/api', () => ({
  api: {
    getMarketMovers: vi.fn(async () => mockMarketData),
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import MarketPage from '@/app/market/page'

afterEach(cleanup)

describe('MarketPage', () => {
  it('renders all three sections', async () => {
    render(<MarketPage />)

    await waitFor(() => {
      expect(screen.getByText('Top Gainers')).toBeInTheDocument()
      expect(screen.getByText('Top Losers')).toBeInTheDocument()
      expect(screen.getByText('Most Valuable')).toBeInTheDocument()
    })
  })

  it('displays card names and prices', async () => {
    render(<MarketPage />)

    await waitFor(() => {
      expect(screen.getAllByText('Manga Luffy PSA10').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Charizard VMAX').length).toBeGreaterThan(0)
      expect(screen.getByText('Pikachu Promo')).toBeInTheDocument()
    })
  })

  it('displays percentage changes with correct formatting', async () => {
    render(<MarketPage />)

    await waitFor(() => {
      expect(screen.getByText('+15.0%')).toBeInTheDocument()
      expect(screen.getByText('+8.0%')).toBeInTheDocument()
      expect(screen.getByText('-12.0%')).toBeInTheDocument()
    })
  })

  it('renders links to card pages', async () => {
    render(<MarketPage />)

    await waitFor(() => {
      const links = screen.getAllByRole('link')
      const cardLinks = links.filter((l) => l.getAttribute('href')?.startsWith('/card/'))
      expect(cardLinks.length).toBeGreaterThan(0)
      expect(cardLinks[0].getAttribute('href')).toContain('Manga%20Luffy%20PSA10')
    })
  })

  it('renders range toggle buttons', async () => {
    render(<MarketPage />)

    expect(screen.getByText('24h')).toBeInTheDocument()
    expect(screen.getByText('7d')).toBeInTheDocument()
  })
})
