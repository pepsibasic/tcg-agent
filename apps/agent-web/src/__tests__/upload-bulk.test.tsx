import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'

const mockBulkResult = vi.hoisted(() => ({
  created: 2,
  cards: [
    { id: 'c1', title: 'Manga Luffy PSA10', estimatedValue: 3800, grade: 'PSA 10', cardKey: 'Manga Luffy PSA10' },
    { id: 'c2', title: 'PSA Cert #12345678', estimatedValue: null, grade: null, cardKey: null },
  ],
  portfolio_delta_usd: 3800,
}))

vi.mock('@/lib/api', () => ({
  api: {
    bulkAddExternalCards: vi.fn(async () => mockBulkResult),
    getPortfolioSummary: vi.fn(async () => ({})),
    addExternalCard: vi.fn(async () => ({ id: 'c1' })),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams('tab=bulk'),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import UploadPage from '@/app/upload/page'
import { api } from '@/lib/api'

afterEach(cleanup)

describe('UploadPage - Bulk Tab', () => {
  it('renders bulk add textarea', async () => {
    render(<UploadPage />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('One card per line...')).toBeInTheDocument()
    })
  })

  it('parses bulk input and shows preview', async () => {
    render(<UploadPage />)
    const textarea = screen.getByPlaceholderText('One card per line...')
    fireEvent.change(textarea, {
      target: { value: 'Manga Luffy PSA10 $3800\n12345678' },
    })
    fireEvent.click(screen.getByText('Preview'))
    await waitFor(() => {
      expect(screen.getByText('Preview (2 cards)')).toBeInTheDocument()
    })
  })

  it('submits bulk add and shows receipt', async () => {
    render(<UploadPage />)
    const textarea = screen.getByPlaceholderText('One card per line...')
    fireEvent.change(textarea, {
      target: { value: 'Manga Luffy PSA10 $3800\n12345678' },
    })
    fireEvent.click(screen.getByText('Preview'))
    await waitFor(() => {
      expect(screen.getByText(/Add All/)).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/Add All/))
    await waitFor(() => {
      expect(api.bulkAddExternalCards).toHaveBeenCalled()
      expect(screen.getByText('Cards Added')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  it('shows receipt with portfolio delta', async () => {
    render(<UploadPage />)
    const textarea = screen.getByPlaceholderText('One card per line...')
    fireEvent.change(textarea, {
      target: { value: 'Manga Luffy PSA10 $3800' },
    })
    fireEvent.click(screen.getByText('Preview'))
    await waitFor(() => screen.getByText(/Add All/))
    fireEvent.click(screen.getByText(/Add All/))
    await waitFor(() => {
      expect(screen.getByText(/\+\$3,800/)).toBeInTheDocument()
      expect(screen.getByText('View Portfolio')).toBeInTheDocument()
      expect(screen.getByText('Add More')).toBeInTheDocument()
    })
  })

  it('allows inline editing of parsed rows', async () => {
    render(<UploadPage />)
    const textarea = screen.getByPlaceholderText('One card per line...')
    fireEvent.change(textarea, {
      target: { value: 'Unknown Card' },
    })
    fireEvent.click(screen.getByText('Preview'))
    await waitFor(() => {
      const titleInput = screen.getByDisplayValue('Unknown Card')
      expect(titleInput).toBeInTheDocument()
      fireEvent.change(titleInput, { target: { value: 'Charizard VMAX' } })
      expect(screen.getByDisplayValue('Charizard VMAX')).toBeInTheDocument()
    })
  })
})
