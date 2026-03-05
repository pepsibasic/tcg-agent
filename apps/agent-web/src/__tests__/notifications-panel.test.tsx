import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'

vi.mock('@/lib/api', () => ({
  api: {
    getNotifications: vi.fn(async () => ({
      events: [
        { id: 'e1', type: 'PRICE_ABOVE', card_key: 'Luffy', title: 'Luffy crossed $4,000', body: 'Latest: $4,120 | 7d: +12.0%', triggered_at: '2026-03-05T00:00:00Z', status: 'NEW' },
        { id: 'e2', type: 'PRICE_BELOW', card_key: 'Pikachu', title: 'Pikachu dropped to $40', body: 'Latest: $40', triggered_at: '2026-03-04T00:00:00Z', status: 'SEEN' },
      ],
    })),
    markNotificationSeen: vi.fn(async () => ({ status: 'seen' })),
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import { api } from '@/lib/api'
import { NotificationsPanel } from '@/components/portfolio/notifications-panel'

afterEach(cleanup)

describe('NotificationsPanel', () => {
  it('renders notification events', async () => {
    render(<NotificationsPanel />)
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument()
      expect(screen.getByText('Luffy crossed $4,000')).toBeInTheDocument()
      expect(screen.getByText('Pikachu dropped to $40')).toBeInTheDocument()
    })
  })

  it('shows NEW badge count', async () => {
    render(<NotificationsPanel />)
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  it('shows Mark seen button only for NEW events', async () => {
    render(<NotificationsPanel />)
    await waitFor(() => {
      const markSeenButtons = screen.getAllByText('Mark seen')
      expect(markSeenButtons.length).toBe(1)
    })
  })

  it('calls markNotificationSeen on click', async () => {
    render(<NotificationsPanel />)
    await waitFor(() => screen.getByText('Mark seen'))
    fireEvent.click(screen.getByText('Mark seen'))
    await waitFor(() => {
      expect(api.markNotificationSeen).toHaveBeenCalledWith('e1')
    })
  })

  it('renders View card links', async () => {
    render(<NotificationsPanel />)
    await waitFor(() => {
      const viewLinks = screen.getAllByText('View card')
      expect(viewLinks.length).toBe(2)
      expect(viewLinks[0].closest('a')?.getAttribute('href')).toContain('Luffy')
    })
  })
})
