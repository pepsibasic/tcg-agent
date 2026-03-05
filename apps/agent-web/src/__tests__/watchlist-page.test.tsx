import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'

const mockItems = vi.hoisted(() => ({
  items: [
    { card_key: 'Manga Luffy PSA10', title: 'Manga Luffy PSA10', latest_price_usd: 350, change_7d: 0.12, sparkline_30d: [300, 320, 350] },
    { card_key: 'Pikachu Promo', title: 'Pikachu Promo', latest_price_usd: 45, change_7d: -0.05, sparkline_30d: [50, 48, 45] },
  ],
}))

vi.mock('@/lib/api', () => ({
  api: {
    getWatchlist: vi.fn(async () => mockItems),
    removeWatchlist: vi.fn(async () => {}),
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import WatchlistPage from '@/app/watchlist/page'

afterEach(cleanup)

describe('WatchlistPage', () => {
  it('renders watched cards with prices', async () => {
    render(<WatchlistPage />)
    await waitFor(() => {
      expect(screen.getByText('Manga Luffy PSA10')).toBeInTheDocument()
      expect(screen.getByText('Pikachu Promo')).toBeInTheDocument()
    })
  })

  it('displays percentage changes', async () => {
    render(<WatchlistPage />)
    await waitFor(() => {
      expect(screen.getByText('+12.0%')).toBeInTheDocument()
      expect(screen.getByText('-5.0%')).toBeInTheDocument()
    })
  })

  it('renders sparklines', async () => {
    render(<WatchlistPage />)
    await waitFor(() => {
      const sparklines = screen.getAllByLabelText('Price sparkline')
      expect(sparklines.length).toBe(2)
    })
  })

  it('has remove buttons', async () => {
    render(<WatchlistPage />)
    await waitFor(() => {
      const buttons = screen.getAllByText('Remove')
      expect(buttons.length).toBe(2)
    })
  })

  it('links to card pages', async () => {
    render(<WatchlistPage />)
    await waitFor(() => {
      const links = screen.getAllByRole('link')
      expect(links.some((l) => l.getAttribute('href')?.includes('Manga%20Luffy%20PSA10'))).toBe(true)
    })
  })
})
