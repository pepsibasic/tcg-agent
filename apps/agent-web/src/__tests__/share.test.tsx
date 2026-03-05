import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'

const { mockArchetype } = vi.hoisted(() => ({
  mockArchetype: {
    name: 'The Flipper',
    traits: ['Aggressive', 'Market-savvy'],
    why: 'Focuses on short-term value extraction.',
    comparable_collectors: ['Day Trader'],
    share_card_text: "I'm The Flipper on Gacha! Quick profits, big moves.",
    share_card_badges: ['Speed Demon', 'Profit Hunter'],
  },
}))

vi.mock('@/lib/api', () => ({
  api: {
    getArchetype: vi.fn().mockResolvedValue(mockArchetype),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ userId: '0190f0e0-0002-7000-8000-000000000002' }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

import SharePage from '@/app/share/[userId]/page'

describe('SharePage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders archetype name and traits', async () => {
    render(<SharePage />)

    await waitFor(() => {
      expect(screen.getByText('The Flipper')).toBeInTheDocument()
    })

    expect(screen.getByText('Aggressive')).toBeInTheDocument()
    expect(screen.getByText('Market-savvy')).toBeInTheDocument()
  })

  it('renders share text', async () => {
    render(<SharePage />)

    await waitFor(() => {
      expect(
        screen.getByText("I'm The Flipper on Gacha! Quick profits, big moves.")
      ).toBeInTheDocument()
    })
  })

  it('copies to clipboard on button click', async () => {
    render(<SharePage />)

    await waitFor(() => {
      expect(screen.getByText('Copy to Clipboard')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Copy to Clipboard'))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        mockArchetype.share_card_text
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })
  })

  it('renders badges', async () => {
    render(<SharePage />)

    await waitFor(() => {
      expect(screen.getByText('Speed Demon')).toBeInTheDocument()
    })
    expect(screen.getByText('Profit Hunter')).toBeInTheDocument()
  })
})
