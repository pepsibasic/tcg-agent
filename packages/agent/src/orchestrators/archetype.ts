import { prisma } from '@tcg/db'
import type { UserCard, ActionsLog } from '@tcg/db'
import { CollectorArchetypeSchema } from '@tcg/schemas'
import type { ArchetypeResponse } from '@tcg/schemas'
import { generateWithRetry } from '../llm/generate.js'
import { renderPrompt } from '../llm/prompts.js'
import { DEFAULT_LLM_CONFIG } from '../llm/types.js'

// ─── Return types ───────────────────────────────────────────────────────────

type ArchetypeSuccess = {
  success: true
  data: ArchetypeResponse
  degraded?: boolean
}

type ArchetypeProgressNudge = {
  success: true
  data: { archetype: null; progress: string; message: string }
}

type ArchetypeResult = ArchetypeSuccess | ArchetypeProgressNudge

// ─── Badge computation ──────────────────────────────────────────────────────

/**
 * Compute collector identity badges deterministically based on portfolio stats.
 * Badges are NOT derived from LLM output — predictable, testable, consistent.
 *
 * - vault_builder: 10+ cards in VAULTED state
 * - ip_specialist: 60%+ of total cards from a single IP/franchise
 * - external_collector: 5+ external cards
 */
export function computeArchetypeBadges(stats: {
  vaultedCount: number
  topIpPercent: number
  externalCount: number
}): string[] {
  const badges: string[] = []
  if (stats.vaultedCount >= 10) badges.push('vault_builder')
  if (stats.topIpPercent >= 0.6) badges.push('ip_specialist')
  if (stats.externalCount >= 5) badges.push('external_collector')
  return badges
}

// ─── Main orchestrator ──────────────────────────────────────────────────────

/**
 * Detect a user's collector archetype based on their full card portfolio.
 *
 * Pipeline:
 * 1. Fetch userCards, externalCards, and recent actions from the DB
 * 2. Check 5-card threshold — below returns a progress nudge (not an error)
 * 3. Compute portfolio stats and deterministic badges
 * 4. Render archetype_identity prompt and call LLM via generateWithRetry
 * 5. Override LLM share_card_badges with deterministic ones
 * 6. On LLM failure: return degraded response with badges still intact
 */
export async function detectArchetype(userId: string): Promise<ArchetypeResult> {
  // 1. Fetch data
  const [userCards, externalCards, recentActions] = await Promise.all([
    prisma.userCard.findMany({
      where: { userId, deletedAt: null },
      include: { card: true },
    }),
    prisma.externalCard.findMany({
      where: { userId, deletedAt: null },
    }),
    prisma.actionsLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  // 2. Check threshold
  const totalCards = userCards.length + externalCards.length
  if (totalCards < 5) {
    const remaining = 5 - totalCards
    return {
      success: true,
      data: {
        archetype: null,
        progress: `${totalCards}/5 cards`,
        message: `Add ${remaining} more card${remaining !== 1 ? 's' : ''} to unlock your collector identity!`,
      },
    }
  }

  // 3. Compute portfolio stats for badge determination

  // Vaulted count: userCards where state === 'VAULTED'
  const vaultedCount = userCards.filter((uc: UserCard) => uc.state === 'VAULTED').length

  // IP distribution: build a frequency map from ipCategory
  const ipCounts = new Map<string, number>()
  for (const uc of userCards) {
    const ip = uc.card.ipCategory
    ipCounts.set(ip, (ipCounts.get(ip) ?? 0) + 1)
  }
  // External cards: count as 'External' category
  for (const _ec of externalCards) {
    ipCounts.set('External', (ipCounts.get('External') ?? 0) + 1)
  }

  // Find the top IP percentage across all cards
  let maxIpCount = 0
  for (const count of ipCounts.values()) {
    if (count > maxIpCount) maxIpCount = count
  }
  const topIpPercent = totalCards > 0 ? maxIpCount / totalCards : 0

  const externalCount = externalCards.length

  // 4. Compute deterministic badges
  const badges = computeArchetypeBadges({ vaultedCount, topIpPercent, externalCount })

  // 5. Compute top IPs string (sorted by count desc, top 3)
  const sortedIps = Array.from(ipCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([ip]) => ip)
  const topIpsString = sortedIps.join(', ')

  // 6. Render prompt
  const portfolioData = {
    totalCards,
    vaultedCount,
    externalCount,
    topIps: Object.fromEntries(ipCounts),
  }
  const actionHistory = recentActions
    .map((a: ActionsLog) => a.userAction)
    .filter((a: string | null): a is string => a !== null)

  const { system, user } = renderPrompt('archetype_identity', {
    user_id: userId,
    portfolio_summary_json: JSON.stringify(portfolioData),
    top_ips: topIpsString,
    action_history: JSON.stringify(actionHistory),
  })

  // 7. Call LLM
  const llmResult = await generateWithRetry({
    schema: CollectorArchetypeSchema,
    prompt: user,
    system,
    config: DEFAULT_LLM_CONFIG,
    narrativeFields: ['why', 'share_card_text', 'traits', 'comparable_collectors'],
  })

  // 8. Success path — override LLM badges with deterministic badges
  if (llmResult.success) {
    return {
      success: true,
      data: {
        ...llmResult.data,
        share_card_badges: badges,
      },
    }
  }

  // 9. Degraded path — LLM failed, return defaults with deterministic badges
  return {
    success: true,
    degraded: true,
    data: {
      name: 'Collector',
      traits: [],
      why: '',
      comparable_collectors: [],
      share_card_text: '',
      share_card_badges: badges,
    },
  }
}
