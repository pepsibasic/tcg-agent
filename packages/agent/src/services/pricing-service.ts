import { prisma } from '@tcg/db'

// ─── Types ──────────────────────────────────────────────────────────────────

export type PriceConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
export type PriceSource = 'pricecharting' | 'alt' | 'seed'

export interface PriceData {
  market_price: number | null
  buyback_price: number | null
  confidence: PriceConfidenceLevel
  source: PriceSource
  updated_at: string
}

// ─── In-memory cache (10-minute TTL) ────────────────────────────────────────

interface CacheEntry {
  data: PriceData
  expires_at: number
}

const CACHE_TTL_MS = 10 * 60 * 1000
const priceCache = new Map<string, CacheEntry>()

function getCached(key: string): PriceData | null {
  const entry = priceCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires_at) {
    priceCache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: PriceData): void {
  priceCache.set(key, { data, expires_at: Date.now() + CACHE_TTL_MS })
}

// ─── PriceCharting API ──────────────────────────────────────────────────────

async function fetchFromPriceCharting(cardName: string): Promise<PriceData | null> {
  const apiKey = process.env.PRICECHARTING_API_KEY
  if (!apiKey) return null

  try {
    const url = `https://www.pricecharting.com/api/product?t=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(cardName)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null

    const json = await res.json() as Record<string, unknown>

    const marketPrice = typeof json['price'] === 'number' ? json['price'] / 100 : null
    const buybackPrice = typeof json['retail-price'] === 'number' ? (json['retail-price'] as number) / 100 : null

    if (marketPrice === null && buybackPrice === null) return null

    return {
      market_price: marketPrice,
      buyback_price: buybackPrice,
      confidence: 'HIGH',
      source: 'pricecharting',
      updated_at: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

// ─── Alt scrape placeholder (stub) ──────────────────────────────────────────

async function fetchFromAltSource(_cardName: string): Promise<PriceData | null> {
  // Placeholder for alternative price scraping source
  // Implement when alt source is available
  return null
}

// ─── Seeded DB price fallback ───────────────────────────────────────────────

async function fetchFromDb(cardId: string): Promise<PriceData | null> {
  const userCard = await prisma.userCard.findFirst({
    where: { cardId, deletedAt: null, estimatedValue: { not: null } },
    orderBy: { updatedAt: 'desc' },
  })

  if (userCard?.estimatedValue != null) {
    const value = Number(userCard.estimatedValue)
    return {
      market_price: value,
      buyback_price: Math.round(value * 0.7 * 100) / 100, // ~70% buyback estimate
      confidence: 'LOW',
      source: 'seed',
      updated_at: userCard.updatedAt.toISOString(),
    }
  }

  return null
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get price data for a card, trying sources in order:
 * 1. PriceCharting API (HIGH confidence)
 * 2. Alt scrape placeholder (MEDIUM confidence)
 * 3. Seeded DB price (LOW confidence)
 * 4. No data (NONE confidence)
 */
export async function getCardPrice(cardKey: string, cardId?: string): Promise<PriceData> {
  const cached = getCached(cardKey)
  if (cached) return cached

  // Try PriceCharting
  const pcPrice = await fetchFromPriceCharting(cardKey)
  if (pcPrice) {
    setCache(cardKey, pcPrice)
    return pcPrice
  }

  // Try alt source
  const altPrice = await fetchFromAltSource(cardKey)
  if (altPrice) {
    setCache(cardKey, altPrice)
    return altPrice
  }

  // Fall back to seeded DB price
  if (cardId) {
    const dbPrice = await fetchFromDb(cardId)
    if (dbPrice) {
      setCache(cardKey, dbPrice)
      return dbPrice
    }
  }

  // No price available
  const noData: PriceData = {
    market_price: null,
    buyback_price: null,
    confidence: 'NONE',
    source: 'seed',
    updated_at: new Date().toISOString(),
  }
  return noData
}

/** Clear the price cache (useful for testing). */
export function clearPriceCache(): void {
  priceCache.clear()
}
