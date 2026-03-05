import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'

const mockSearchResults = vi.hoisted(() => ({
  items: [
    { card_key: 'Manga Luffy PSA10', title: 'Manga Luffy PSA10', latest_price_usd: 3800, change_7d: 0.12, confidence: 'HIGH' as const, is_watched: false },
    { card_key: 'Pikachu Promo', title: 'Pikachu Promo', latest_price_usd: 45, change_7d: -0.05, confidence: 'MEDIUM' as const, is_watched: true },
  ],
  query: 'luffy',
  total: 2,
}))

vi.mock('@/lib/api', () => ({
  api: {
    searchCards: vi.fn(async () => mockSearchResults),
    addWatchlist: vi.fn(async () => ({ status: 'ok' })),
    removeWatchlist: vi.fn(async () => {}),
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import SearchPage from '@/app/search/page'

afterEach(cleanup)

describe('SearchPage', () => {
  it('renders search input', () => {
    render(<SearchPage />)
    expect(screen.getByPlaceholderText(/Search by card name/)).toBeInTheDocument()
  })

  it('shows results after typing', async () => {
    render(<SearchPage />)
    const input = screen.getByPlaceholderText(/Search by card name/)
    fireEvent.change(input, { target: { value: 'luffy' } })

    await waitFor(() => {
      expect(screen.getByText('Manga Luffy PSA10')).toBeInTheDocument()
      expect(screen.getByText('Pikachu Promo')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('shows watch toggle for results', async () => {
    render(<SearchPage />)
    const input = screen.getByPlaceholderText(/Search by card name/)
    fireEvent.change(input, { target: { value: 'luffy' } })

    await waitFor(() => {
      expect(screen.getByText('Watch')).toBeInTheDocument()
      expect(screen.getByText('Watching')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('shows confidence badges', async () => {
    render(<SearchPage />)
    const input = screen.getByPlaceholderText(/Search by card name/)
    fireEvent.change(input, { target: { value: 'luffy' } })

    await waitFor(() => {
      expect(screen.getByText('HIGH')).toBeInTheDocument()
      expect(screen.getByText('MEDIUM')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('links to card detail pages', async () => {
    render(<SearchPage />)
    const input = screen.getByPlaceholderText(/Search by card name/)
    fireEvent.change(input, { target: { value: 'luffy' } })

    await waitFor(() => {
      const links = screen.getAllByRole('link')
      expect(links.some((l) => l.getAttribute('href')?.includes('Manga%20Luffy%20PSA10'))).toBe(true)
    }, { timeout: 3000 })
  })
})
