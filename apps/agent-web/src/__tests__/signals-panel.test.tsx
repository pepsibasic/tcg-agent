import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/lib/api', () => ({
  api: {
    executeAction: vi.fn(async () => ({ status: 'logged', message: 'Action recorded' })),
  },
}))

import { api } from '@/lib/api'
import { SignalsPanel } from '@/components/portfolio/signals-panel'
import type { DecisionSignal } from '@/lib/types'

afterEach(cleanup)

const mockSignals: DecisionSignal[] = [
  {
    type: 'SELL_STRENGTH',
    title: 'Manga Luffy is surging',
    body: 'Manga Luffy PSA10 is up +12% this week.',
    severity: 'info',
    related_card_id: 'card-1',
    suggested_action: {
      type: 'BUYBACK',
      params: { cardId: 'card-1' },
      ui_copy: 'Sell Manga Luffy while price is high',
      risk_notes: null,
    },
  },
  {
    type: 'DIVERSIFY',
    title: 'High Concentration',
    body: 'Your portfolio is 64% One Piece.',
    severity: 'warning',
  },
]

describe('SignalsPanel', () => {
  it('renders signal titles and bodies', () => {
    render(<SignalsPanel signals={mockSignals} />)

    expect(screen.getByText('Decision Signals')).toBeInTheDocument()
    expect(screen.getByText('Manga Luffy is surging')).toBeInTheDocument()
    expect(screen.getByText('Manga Luffy PSA10 is up +12% this week.')).toBeInTheDocument()
    expect(screen.getByText('High Concentration')).toBeInTheDocument()
    expect(screen.getByText('Your portfolio is 64% One Piece.')).toBeInTheDocument()
  })

  it('renders action button when suggested_action exists', () => {
    render(<SignalsPanel signals={mockSignals} />)

    const btn = screen.getByRole('button', { name: 'Sell Manga Luffy while price is high' })
    expect(btn).toBeInTheDocument()
  })

  it('does not render action button when no suggested_action', () => {
    render(<SignalsPanel signals={[mockSignals[1]]} />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('calls executeAction when CTA button clicked', async () => {
    render(<SignalsPanel signals={mockSignals} />)

    const btn = screen.getByRole('button', { name: 'Sell Manga Luffy while price is high' })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(api.executeAction).toHaveBeenCalledWith({
        cardId: 'card-1',
        action: 'BUYBACK',
      })
    })
  })

  it('returns null when signals array is empty', () => {
    const { container } = render(<SignalsPanel signals={[]} />)
    expect(container.innerHTML).toBe('')
  })
})
