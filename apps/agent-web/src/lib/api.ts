import type {
  CardAnalysisResponse,
  PortfolioSummaryResponse,
  ArchetypeResponse,
  PriceHistoryResponse,
  PortfolioChangesResponse,
  MarketMoversResponse,
  WatchlistResponse,
  AlertEventsResponse,
  SearchCardsResponse,
  BulkUploadItem,
  BulkUploadResponse,
  AlertDTO,
  ApiErrorBody,
} from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const DEFAULT_USER_ID =
  process.env.NEXT_PUBLIC_DEFAULT_USER_ID ||
  '0190f0e0-0001-7000-8000-000000000001'

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: ApiErrorBody
  ) {
    super(body.error?.message || `API error ${status}`)
    this.name = 'ApiError'
  }
}

function getUserId(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userId') || DEFAULT_USER_ID
  }
  return DEFAULT_USER_ID
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const requestId = crypto.randomUUID()
  const headers: Record<string, string> = {
    'X-Request-Id': requestId,
    'X-User-Id': getUserId(),
  }
  if (opts?.body) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      ...headers,
      ...opts?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({
      error: { code: 'UNKNOWN', message: res.statusText },
    }))
    throw new ApiError(res.status, body)
  }
  return res.json()
}

export const api = {
  getPortfolioSummary() {
    return apiFetch<PortfolioSummaryResponse>('/agent/portfolio/summary', {
      method: 'POST',
    })
  },

  getArchetype(userId?: string) {
    return apiFetch<ArchetypeResponse>('/agent/archetype', {
      method: 'POST',
      headers: userId ? { 'X-User-Id': userId } : undefined,
    })
  },

  analyzeCard(cardId: string) {
    return apiFetch<CardAnalysisResponse>('/agent/card/analyze', {
      method: 'POST',
      body: JSON.stringify({ cardId }),
    })
  },

  addExternalCard(data: {
    title: string
    estimatedValue: number
    set?: string
    grade?: string
    certNumber?: string
  }) {
    return apiFetch<{ id: string }>('/external-cards', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  lookupCert(certNumber: string) {
    return apiFetch<{ grade: string | null }>(
      `/external-cards/cert/${encodeURIComponent(certNumber)}`
    )
  },

  executeAction(data: { cardId?: string; action: string }) {
    return apiFetch<{ status: string; message: string }>('/actions/execute', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getPriceHistory(cardKey: string, range: '30d' | '90d' | '1y' = '30d') {
    return apiFetch<PriceHistoryResponse>(
      `/pricing/history/${encodeURIComponent(cardKey)}?range=${range}`
    )
  },

  getPortfolioChanges(range: '7d' | '30d' = '7d') {
    return apiFetch<PortfolioChangesResponse>(`/portfolio/changes?range=${range}`)
  },

  createAlert(data: { type: string; cardKey: string; threshold: number }) {
    return apiFetch<{ id: string }>('/alerts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getAlerts() {
    return apiFetch<Array<{ id: string; type: string; cardKey: string | null; threshold: number | null; createdAt: string }>>('/alerts')
  },

  getMarketMovers(range: '24h' | '7d' = '7d') {
    return apiFetch<MarketMoversResponse>(`/market/movers?range=${range}`)
  },

  getWatchlist() {
    return apiFetch<WatchlistResponse>('/watchlist')
  },

  addWatchlist(cardKey: string) {
    return apiFetch<{ status: string }>('/watchlist', {
      method: 'POST',
      body: JSON.stringify({ cardKey }),
    })
  },

  removeWatchlist(cardKey: string) {
    return apiFetch<void>(`/watchlist/${encodeURIComponent(cardKey)}`, {
      method: 'DELETE',
    })
  },

  getNotifications() {
    return apiFetch<AlertEventsResponse>('/notifications')
  },

  markNotificationSeen(id: string) {
    return apiFetch<{ status: string }>(`/notifications/${encodeURIComponent(id)}/seen`, {
      method: 'POST',
    })
  },

  searchCards(q: string, limit = 20) {
    return apiFetch<SearchCardsResponse>(
      `/search/cards?q=${encodeURIComponent(q)}&limit=${limit}`
    )
  },

  bulkAddExternalCards(items: BulkUploadItem[]) {
    return apiFetch<BulkUploadResponse>('/external-cards/bulk', {
      method: 'POST',
      body: JSON.stringify({ items }),
    })
  },

  getAlertsByCard(cardKey: string) {
    return apiFetch<AlertDTO[]>('/alerts').then((alerts) =>
      alerts.filter((a) => a.cardKey === cardKey)
    )
  },
}
