# Phase 2: Rules Engine - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Deterministic rules engine that computes eligible actions per card state and vault conversion candidates. This is the sole source of truth for the `actions` field in CardAnalysis — the LLM never decides action eligibility. Covers RULE-01, RULE-02, RULE-03, VAULT-01, VAULT-02, VAULT-03.

</domain>

<decisions>
## Implementation Decisions

### Action eligibility per state
- **ON_MARKET**: No actions — cards are locked while listed. User manages through marketplace UI
- **IN_TRANSIT**: WATCHLIST only — nothing actionable until card arrives at vault
- **VAULTED**: BUYBACK, LIST, REDEEM, SHIP (physical redemption), WATCHLIST — with conditional visibility based on data quality and state (hide BUYBACK if priceConfidence is NO_DATA, add risk_notes if STALE_7D, suppress LIST if card already has an active marketplace listing)
- **EXTERNAL**: SHIP_TO_VAULT, WATCHLIST
- **WATCHLIST**: Available for all states except ON_MARKET

### Vault conversion thresholds
- Single-card vault recommendation triggers when external card estimated value >= $100
- Batch shipping (BUNDLE_SHIP) triggers when user has 5+ external cards OR total external value >= $500
- Identity-based vault triggers: stub the interface now (always returns false) — will activate when archetype detection is built in Phase 4
- Vault "unlocks" reasons are dynamic with card context (e.g., "Instant liquidity — estimated buyback $85", "Verified ranking — moves you to top 5% Pokemon collectors")

### Action copy and risk tone
- ui_copy uses direct, actionable tone: "List on Marketplace — Recent comps suggest ~$520"
- ui_copy includes card-specific data (prices, price confidence, percentages) via template interpolation
- risk_notes present only when relevant — null for low-risk actions (WATCHLIST). Uses compliance-safe "signals" language per project safety posture
- SHIP_TO_VAULT copy is benefit-forward, not pushy: "Ship to Vault — Unlock instant liquidity and verified ranking for this $180 card"

### Action params structure
- Typed per action type (discriminated union, not loose key-value pairs)
- LIST: `{ suggestedPrice, priceConfidence, currency }`
- BUYBACK: `{ estimatedBuybackValue, priceConfidence }`
- SHIP_TO_VAULT: `{ cardValue, unlocks: string[], batchEligible }`
- BUNDLE_SHIP: `{ cardCount, totalValue, estimatedSavings }`
- REDEEM, OPEN_PACK, WATCHLIST: Claude's discretion on minimal params

### Claude's Discretion
- Exact params shape for REDEEM, OPEN_PACK, and WATCHLIST action types
- Internal architecture of the rules engine (function composition, class-based, etc.)
- Test organization and fixture strategy
- How to structure the configurable thresholds (env vars, config object, etc.)

</decisions>

<specifics>
## Specific Ideas

- Conditional action visibility adds real value: a BUYBACK button with NO_DATA pricing is misleading. Better to hide it than show it with a disclaimer
- The $100 vault threshold is deliberately conservative — avoids recommending vaulting for cards that cost more to ship than they're worth
- Batch shipping at 5+ cards / $500 total is a higher bar to avoid pestering casual users with few external cards

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/schemas/src/llm/action.ts`: ActionSchema and ActionTypeSchema already define the 7 action types with params, ui_copy, risk_notes fields
- `packages/schemas/src/shared/enums.ts`: CardState (VAULTED, EXTERNAL, ON_MARKET, IN_TRANSIT) and PriceConfidence (LIVE, RECENT_24H, STALE_7D, NO_DATA) enums
- `packages/schemas/src/api/card-analysis.ts`: CardAnalysisResponseSchema extends LLM schema with `actions: z.array(ActionSchema)` — this is where rules engine output gets injected

### Established Patterns
- LLM schemas use `z.union([type, z.null()])` not `z.optional()` — rules engine schemas should follow the same nullable convention for consistency
- API schemas derive from LLM schemas via `.extend()` — actions field is API-only by design (Phase 1 decision)
- Seed data uses fixed UUIDs for idempotent upserts — test fixtures should follow the same pattern

### Integration Points
- Rules engine lives in `packages/agent/src/` — currently an empty skeleton with just `index.ts`
- Consumes card data from `packages/db` (Prisma types: UserCard, ExternalCard with state, estimatedValue, priceConfidence, priceFetchedAt)
- Outputs Action[] that gets injected into CardAnalysisResponse by the agent orchestrator (Phase 4)
- Seed data in `packages/db/src/seed-data.ts` provides comprehensive test scenarios: 42 userCards across all 4 states, 6 external cards, price confidence levels from LIVE to NO_DATA

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-rules-engine*
*Context gathered: 2026-03-04*
