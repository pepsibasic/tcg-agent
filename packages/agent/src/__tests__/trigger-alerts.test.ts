import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runTriggerAlerts } from '../jobs/trigger-alerts.js'

vi.mock('@tcg/db', () => ({
  prisma: {
    alert: { findMany: vi.fn() },
    alertEvent: { findFirst: vi.fn(), create: vi.fn() },
    cardPriceHistory: { findFirst: vi.fn() },
  },
}))

import { prisma } from '@tcg/db'

const mockAlertFindMany = vi.mocked(prisma.alert.findMany)
const mockEventFindFirst = vi.mocked(prisma.alertEvent.findFirst)
const mockEventCreate = vi.mocked(prisma.alertEvent.create)
const mockPriceFindFirst = vi.mocked(prisma.cardPriceHistory.findFirst)

beforeEach(() => vi.clearAllMocks())

describe('runTriggerAlerts', () => {
  it('creates event when PRICE_ABOVE threshold met', async () => {
    mockAlertFindMany.mockResolvedValue([
      { id: 'a1', userId: 'u1', cardKey: 'Luffy', threshold: 100, type: 'PRICE_ABOVE', createdAt: new Date() },
    ] as never)
    mockEventFindFirst.mockResolvedValue(null as never)
    mockPriceFindFirst.mockResolvedValue({ marketPriceUsd: 150, asOfDate: new Date() } as never)
    mockEventCreate.mockResolvedValue({} as never)

    const result = await runTriggerAlerts('req-1')
    expect(result.triggered_count).toBe(1)
    expect(mockEventCreate).toHaveBeenCalledTimes(1)
  })

  it('does NOT trigger when price below threshold', async () => {
    mockAlertFindMany.mockResolvedValue([
      { id: 'a2', userId: 'u1', cardKey: 'Luffy', threshold: 200, type: 'PRICE_ABOVE', createdAt: new Date() },
    ] as never)
    mockEventFindFirst.mockResolvedValue(null as never)
    mockPriceFindFirst.mockResolvedValue({ marketPriceUsd: 150, asOfDate: new Date() } as never)

    const result = await runTriggerAlerts('req-2')
    expect(result.triggered_count).toBe(0)
    expect(mockEventCreate).not.toHaveBeenCalled()
  })

  it('is idempotent — skips if event already exists for today', async () => {
    mockAlertFindMany.mockResolvedValue([
      { id: 'a3', userId: 'u1', cardKey: 'Luffy', threshold: 100, type: 'PRICE_ABOVE', createdAt: new Date() },
    ] as never)
    mockEventFindFirst.mockResolvedValue({ id: 'existing' } as never)

    const result = await runTriggerAlerts('req-3')
    expect(result.triggered_count).toBe(0)
    expect(mockEventCreate).not.toHaveBeenCalled()
  })

  it('triggers PRICE_BELOW correctly', async () => {
    mockAlertFindMany.mockResolvedValue([
      { id: 'a4', userId: 'u1', cardKey: 'Card', threshold: 100, type: 'PRICE_BELOW', createdAt: new Date() },
    ] as never)
    mockEventFindFirst.mockResolvedValue(null as never)
    mockPriceFindFirst.mockResolvedValue({ marketPriceUsd: 80, asOfDate: new Date() } as never)
    mockEventCreate.mockResolvedValue({} as never)

    const result = await runTriggerAlerts('req-4')
    expect(result.triggered_count).toBe(1)
  })

  it('triggers CHANGE_7D_ABOVE_PCT correctly', async () => {
    mockAlertFindMany.mockResolvedValue([
      { id: 'a5', userId: 'u1', cardKey: 'Card', threshold: 0.10, type: 'CHANGE_7D_ABOVE_PCT', createdAt: new Date() },
    ] as never)
    mockEventFindFirst.mockResolvedValue(null as never)
    // First call: latest price. Second call: historical 7d price
    mockPriceFindFirst
      .mockResolvedValueOnce({ marketPriceUsd: 120, asOfDate: new Date() } as never)
      .mockResolvedValueOnce({ marketPriceUsd: 100, asOfDate: new Date() } as never)
    mockEventCreate.mockResolvedValue({} as never)

    const result = await runTriggerAlerts('req-5')
    expect(result.triggered_count).toBe(1)
  })

  it('returns zero when no alerts exist', async () => {
    mockAlertFindMany.mockResolvedValue([] as never)
    const result = await runTriggerAlerts('req-6')
    expect(result.alerts_checked).toBe(0)
    expect(result.triggered_count).toBe(0)
  })
})
