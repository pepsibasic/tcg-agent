# Requirements: Gacha Portfolio Agent

**Defined:** 2026-03-04
**Core Value:** Every card interaction surfaces a clear, contextual "what next?" action — turning passive collectors into active Gacha economy participants.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: TypeScript pnpm monorepo with apps/api, packages/agent, packages/schemas, packages/db structure
- [x] **FOUND-02**: Zod schemas defined for CardAnalysis, PortfolioSummary, CollectorArchetype, and Action types with nullable (not optional) fields for LLM compatibility
- [x] **FOUND-03**: Prisma schema with users, cards, user_cards (state enum: vaulted/external/on_market/in_transit), external_cards, packs, pack_cards, marketplace_listings (stub), actions_log tables
- [x] **FOUND-04**: All price fields include priceFetchedAt timestamp and priceConfidence enum (LIVE/RECENT_24H/STALE_7D/NO_DATA)
- [x] **FOUND-05**: Seed data fixtures for local development covering all card states and user scenarios

### Card Analysis

- [ ] **CARD-01**: User can request analysis of any card (vaulted or external) and receive CardAnalysis JSON with identity_tags, rarity_signal, liquidity_signal, price_band, reasoning_bullets, confidence, and eligible actions
- [ ] **CARD-02**: Card analysis includes state-aware action eligibility — vaulted cards show sell/buyback/list/redeem/trade actions; external cards show ship-to-vault/watchlist actions
- [ ] **CARD-03**: After pack pull, user receives CardAnalysis for each pulled card with "What next?" actions contextual to the pull
- [ ] **CARD-04**: Card analysis outputs validated against zod schema with retry/fallback on invalid LLM response

### Portfolio

- [ ] **PORT-01**: User can view PortfolioSummary with total_value_est, breakdown by IP and language, concentration score, liquidity_score, collector_archetype, missing_set_goals, and recommended_actions
- [ ] **PORT-02**: Portfolio includes both vaulted and external cards in unified view
- [ ] **PORT-03**: Portfolio concentration signal identifies over-concentration in single IP/set/player

### External Cards

- [ ] **EXTC-01**: User can upload external cards via manual entry (title, set, grade, cert number, estimated value)
- [ ] **EXTC-02**: External cards appear in portfolio with read-only intelligence (analysis but no Gacha economy actions)
- [ ] **EXTC-03**: PSA cert lookup stub accepts cert number and returns stored grade (no live scraping)

### Vault Conversion

- [ ] **VAULT-01**: Agent recommends vaulting when external card estimated value >= configurable threshold OR matches user identity goals OR user has enough cards to batch ship
- [ ] **VAULT-02**: Vault recommendation includes "unlocks" reasons: instant liquidity (buyback/list), trade into packs, verified portfolio ranking
- [ ] **VAULT-03**: Batching prompt triggers when user has >= N external cards or total external value >= X, recommending BUNDLE_SHIP action
- [ ] **VAULT-04**: User can create shipment intent (stub execution with action logging)

### Collector Identity

- [ ] **IDENT-01**: User receives CollectorArchetype with name, traits, why, comparable_collectors, share_card_text, and share_card_badges
- [ ] **IDENT-02**: Archetype inference uses portfolio composition (IP concentration, language spread, rarity distribution, action history)
- [ ] **IDENT-03**: Shareable collector identity as exportable JSON + short text + badges (no image rendering)

### Rules Engine

- [x] **RULE-01**: Deterministic rules engine computes eligible actions per card based on card state — LLM never decides action eligibility
- [x] **RULE-02**: Action types include BUYBACK, LIST, REDEEM, SHIP_TO_VAULT, OPEN_PACK, WATCHLIST, BUNDLE_SHIP with params, ui_copy, and risk_notes
- [ ] **RULE-03**: Rules engine output is the sole source of the actions field in CardAnalysis — LLM cannot add or remove actions

### LLM Layer

- [ ] **LLM-01**: LLM provider abstraction supporting OpenAI and Anthropic via Vercel AI SDK generateObject with zod schema validation
- [ ] **LLM-02**: Prompt templates for card narrative, portfolio summary, and archetype identity with slot injection
- [ ] **LLM-03**: Retry with schema-aware error feedback (validation error appended to prompt) and deterministic fallback after max retries
- [ ] **LLM-04**: Compliance guard scrubs financial advice language from all LLM outputs — no guarantees of profit, always present uncertainty
- [ ] **LLM-05**: Input sanitization for user-supplied card names and notes before prompt interpolation (prompt injection prevention)

### API

- [ ] **API-01**: POST /agent/card/analyze endpoint returns CardAnalysis JSON
- [ ] **API-02**: POST /agent/portfolio/summary endpoint returns PortfolioSummary JSON
- [ ] **API-03**: POST /agent/archetype endpoint returns CollectorArchetype JSON
- [ ] **API-04**: POST /external-cards endpoint for creating/uploading external cards
- [ ] **API-05**: POST /vault/shipments endpoint for creating shipment intent
- [ ] **API-06**: POST /actions/execute endpoint (stub execution, logs action)
- [ ] **API-07**: Structured logs with request IDs on all endpoints

### Observability

- [ ] **OBS-01**: Structured logging with request IDs across all agent operations
- [ ] **OBS-02**: Actions log records what agent recommended and what user clicked
- [ ] **OBS-03**: LLM validation failures logged with card_id, model, error path, and truncated raw output

### Testing

- [ ] **TEST-01**: Vitest unit tests for all zod schemas (valid and invalid inputs)
- [ ] **TEST-02**: Vitest unit tests for rules engine (all card states × action eligibility)
- [ ] **TEST-03**: Integration tests for MVP user journeys via HTTP (pack pull, external upload, portfolio summary, share card)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Analytics

- **ENH-01**: Price history trend signal (daily delta vs 30-day average)
- **ENH-02**: Portfolio concentration alerts triggered proactively at threshold
- **ENH-03**: Liquidity classification refinement beyond binary vaulted/not-vaulted

### Advanced Features

- **ADV-01**: Image-based card recognition for upload flow
- **ADV-02**: Real-time price feeds from external data sources
- **ADV-03**: Image rendering for Collector Identity share cards
- **ADV-04**: CSV export of portfolio data for tax/cost-basis tracking
- **ADV-05**: Redis LLM result caching for performance
- **ADV-06**: Adversarial prompt test suite (injection + advisory language)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full marketplace UI | Agent provides hooks into Gacha marketplace, not a replacement |
| Pack-opening UI | Only post-pull analysis, not the opening experience |
| Direct buy/sell/hold advice | Regulatory risk — signals and options only |
| Real-time chat / conversational agent | Deterministic request/response; not stateful dialogue |
| Image recognition for card upload | High cost, high error rate — manual entry for v1 |
| Live PSA cert scraping | PSA ToS prohibits; stub with stored grade is sufficient |
| Image rendering for share cards | Text + badges + JSON keeps v1 simple |
| Mobile app | API-first; embed in existing Gacha web UI |
| Social feed / community features | Out of core scope; shareable identity covers social touchpoints |
| Profit/loss tax reporting | Invites regulatory scrutiny; export raw data instead |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| RULE-01 | Phase 2 | Complete |
| RULE-02 | Phase 2 | Complete |
| RULE-03 | Phase 2 | Pending |
| VAULT-01 | Phase 2 | Pending |
| VAULT-02 | Phase 2 | Pending |
| VAULT-03 | Phase 2 | Pending |
| LLM-01 | Phase 3 | Pending |
| LLM-02 | Phase 3 | Pending |
| LLM-03 | Phase 3 | Pending |
| LLM-04 | Phase 3 | Pending |
| LLM-05 | Phase 3 | Pending |
| CARD-01 | Phase 4 | Pending |
| CARD-02 | Phase 4 | Pending |
| CARD-03 | Phase 4 | Pending |
| CARD-04 | Phase 4 | Pending |
| PORT-01 | Phase 4 | Pending |
| PORT-02 | Phase 4 | Pending |
| PORT-03 | Phase 4 | Pending |
| EXTC-01 | Phase 4 | Pending |
| EXTC-02 | Phase 4 | Pending |
| EXTC-03 | Phase 4 | Pending |
| VAULT-04 | Phase 4 | Pending |
| IDENT-01 | Phase 4 | Pending |
| IDENT-02 | Phase 4 | Pending |
| IDENT-03 | Phase 4 | Pending |
| API-01 | Phase 4 | Pending |
| API-02 | Phase 4 | Pending |
| API-03 | Phase 4 | Pending |
| API-04 | Phase 4 | Pending |
| API-05 | Phase 4 | Pending |
| API-06 | Phase 4 | Pending |
| API-07 | Phase 5 | Pending |
| OBS-01 | Phase 5 | Pending |
| OBS-02 | Phase 5 | Pending |
| OBS-03 | Phase 5 | Pending |
| TEST-01 | Phase 5 | Pending |
| TEST-02 | Phase 5 | Pending |
| TEST-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0

---
*Requirements defined: 2026-03-04*
*Last updated: 2026-03-04 after roadmap creation — traceability table finalized*
