# Feature Research

**Domain:** Collectible card portfolio management agent (embedded in Gacha platform)
**Researched:** 2026-03-04
**Confidence:** MEDIUM — core platform features verified via live product research; AI-agent-specific features extrapolated from comparable tools + project requirements

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features any collector tool must have. Missing these = product feels broken or unprofessional.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Card value lookup per card | Every tracker (PriceCharting, CardLadder, CollX) does this; users assume it | LOW | Gacha context: use internal price data + external signals. No direct market API integration needed for v1 |
| Portfolio total value | Every portfolio tool shows aggregate value; missing this is a dealbreaker | LOW | Sum of per-card estimates; update on card state changes |
| Collection inventory (add/remove cards) | Users need to know what they own; foundational for all other features | LOW | Two card types: vaulted (Gacha DB) + external (user-uploaded). Both must appear in portfolio |
| Card state visibility | Users need to know if a card is vaulted, external, or on market | LOW | Core to the Gacha product model; drives which actions are available |
| Action menu per card | Every marketplace platform shows available actions; missing = users have to guess what they can do | MEDIUM | Must be deterministic — state machine, not LLM. Covers: sell/buyback, list, redeem/ship, trade into packs |
| Price history / trend signal | CardLadder, PriceCharting, Alt all show trend data; users expect "is this card going up or down?" | MEDIUM | Can be simple: recent-sale delta vs 30-day avg. Not full chart in v1 |
| Search and filter collection | Basic UX hygiene; any collection > 20 cards needs this | LOW | Filter by state (vaulted/external), sort by value, search by name |
| Value estimate with uncertainty | Collectors distrust single-point prices; showing a range signals honesty | MEDIUM | Provide estimate range, not exact figure. Required for compliance safety posture |
| External card upload (manual entry) | Collectors own cards outside the platform; ignoring them = incomplete picture | MEDIUM | No image recognition for v1 (per PROJECT.md). Manual entry with card name, set, condition |

### Differentiators (Competitive Advantage)

Features that no off-the-shelf tracker provides and that match the Gacha platform's core value: turning passive holders into active participants.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Context-aware "what next?" per card | No tracker surfaces ranked, state-appropriate next actions with explanations. CollX AI is closest but generic | HIGH | Rules engine maps card state → eligible actions. LLM adds narrative rationale. Core product differentiator |
| Collector archetype inference | No mainstream tracker assigns collector identity. Viral social hook unique to Gacha | HIGH | LLM infers archetype from portfolio composition (concentration by set/player/rarity, action history). Outputs shareable JSON + badge |
| Shareable Collector Identity card | Viral loop driver. Instagram-style personality result that brings new users in | MEDIUM | Text + badge + JSON export for v1. No image rendering (per PROJECT.md) |
| Vault conversion incentive logic | No tracker shows "here's what vaulting your external cards unlocks" with batch thresholds | MEDIUM | Threshold-based nudges: "Vault 3 more cards to unlock instant liquidity on all." Addresses the external-to-vaulted funnel |
| Portfolio concentration signal | Alt and CardLadder show value but not composition risk. "90% of your value is in one player" is high signal | MEDIUM | Gini coefficient or simple % concentration by player/set. No regulatory-grade risk model needed |
| Liquidity classification per card | No tracker distinguishes liquid cards (instantly tradeable) from illiquid ones (stuck, needs grading) | MEDIUM | Classify each card: HIGH / MEDIUM / LOW liquidity based on vaulted status + market depth signals |
| LLM portfolio narrative | Human-readable portfolio summary ("You're a hoarder-turned-flipper with 60% of value in rookie cards") | HIGH | Requires card analysis engine + archetype inference to be built first |
| PSA/BGS cert lookup stub | Collectors care about grading cert verification. Even a stub with grade + cert number builds trust | LOW | Stub only in v1. No live scraping (per PROJECT.md). Accept cert number, return stored grade |
| Pack-pull analysis (post-pull context) | Immediately after opening a pack, tell the user what they got and what to do with it | MEDIUM | Triggered API call. Surfaces value estimate + recommended action for each pulled card |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem obviously good but create significant problems in this context.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| "Buy/Sell/Hold" financial advice | Users want clear direction | Creates securities-advice liability. PSA, Alt, and even CollX AI explicitly avoid investment advice framing | Use "signals" and "options" language. Surface data, not directives. Always add uncertainty framing |
| Real-time price feeds | Collectors want live market prices | Requires expensive data licensing (eBay Sold, PWCC, etc.) + polling infrastructure. Data freshness provides false precision for illiquid assets | Use daily-updated estimates with timestamp shown. "Price as of [date]" is sufficient and honest |
| Image-based card recognition | Magical UX — scan a card to identify it | High engineering cost, high error rate on damaged/edge cards, licensing/IP concerns for card art | Manual entry for v1. Image recognition is a v2 investment after validation |
| Real-time chat / conversational agent | "ChatGPT for my cards" sounds compelling | Conversational pattern requires expensive stateful context management, is hard to test, and doesn't compose well with API-first architecture | Deterministic request/response endpoints. LLM for narrative generation within structured outputs, not open dialogue |
| Full marketplace UI | Users want to buy/sell without leaving the agent | Out of scope — Gacha has a marketplace; this agent provides hooks into it, not a replacement | Integration endpoints that hand off to the Gacha marketplace. Agent surfaces action, marketplace executes |
| Live PSA cert scraping | Automated cert verification feels premium | PSA ToS prohibits scraping. Rate limits and IP bans are likely. Maintenance burden is high | Accept cert number as user input, store grade. Stub cert lookup with clear "not verified in real-time" label |
| Profit/loss tax reporting | Power users ask for this | Requires cost-basis tracking, capital gains calculations — invites financial regulation scrutiny | Export raw transaction data (CSV) and let users bring it to their own tools |
| Social feed / community forum | Community features increase engagement | Massive scope increase. Not core to portfolio intelligence. Existing TCG communities (Reddit, Discord) are entrenched | Shareable Collector Identity card creates social touchpoints without building a social network |
| Mobile app | Collectors are mobile-first | API-first architecture already handles mobile. Building a native app is a separate product surface | Embed in existing Gacha web UI. API is accessible from any client |

---

## Feature Dependencies

```
External Card Upload (manual entry)
    └──required by──> Portfolio Summary (must include external cards)
    └──required by──> Collector Archetype Inference (needs full picture)
    └──required by──> Vault Conversion Incentive Logic (needs external card count)

Card State Model (vaulted / external / market)
    └──required by──> Action Eligibility Rules Engine (state → actions)
    └──required by──> Liquidity Classification (state drives liquidity)
    └──required by──> Portfolio Summary (value depends on state)

Action Eligibility Rules Engine
    └──required by──> Context-aware "What Next?" per card
    └──enhanced by──> LLM Narrative Layer (adds explanation to eligible actions)

Card Value Estimate (per card)
    └──required by──> Portfolio Total Value
    └──required by──> Portfolio Concentration Signal
    └──required by──> Liquidity Classification
    └──required by──> Pack-Pull Analysis

Portfolio Summary (value, concentration, liquidity)
    └──required by──> LLM Portfolio Narrative
    └──required by──> Collector Archetype Inference

Collector Archetype Inference
    └──required by──> Shareable Collector Identity Card

LLM Narrative Layer
    └──enhances──> Context-aware "What Next?" (adds "why" to actions)
    └──enhances──> Collector Archetype Inference (generates archetype text)
    └──enhances──> Pack-Pull Analysis (contextual framing)

PSA/BGS Cert Stub
    └──standalone──> No hard dependencies; enhances card detail view
```

### Dependency Notes

- **Card State Model requires foundational DB schema:** The `user_cards` table with state enum is the root dependency for almost every feature. Nothing meaningful can be built without it.
- **Action Eligibility Rules Engine must precede LLM layer:** LLM must only narrate actions that are truly eligible. If LLM runs before rules engine, it hallucinates actions users cannot actually take.
- **External Card Upload gates Archetype Inference quality:** Archetype inference with only vaulted cards gives an incomplete picture. Both card sources must be integrated before archetype inference is meaningful.
- **Portfolio Summary and Collector Archetype Inference conflict with real-time chat:** Both assume structured, reproducible outputs. Open conversational patterns break JSON schema guarantees.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — validate that contextual "what next?" changes user behavior in the Gacha economy.

- [ ] Card State Model + DB schema — foundational; nothing works without it
- [ ] Card value estimate per card (with range + timestamp) — table stakes for any collector tool
- [ ] Action Eligibility Rules Engine — deterministic state → eligible actions; no LLM hallucinated actions
- [ ] Context-aware "What Next?" per card — core product differentiator; surfaced on card detail
- [ ] Portfolio Summary (total value, top cards, concentration, liquidity breakdown) — users need to see their whole picture
- [ ] External Card Upload (manual entry) — growth lever; collectors have cards outside Gacha
- [ ] Vault Conversion Incentive Logic — drives the external-to-vaulted funnel; core to business model
- [ ] LLM Narrative Layer (with Zod schema validation + retry/fallback) — makes outputs human-readable
- [ ] Collector Archetype Inference + Shareable Identity Card — viral loop; differentiates from every other tracker
- [ ] Pack-Pull Analysis endpoint — hooks into pack opening; immediate post-pull value

### Add After Validation (v1.x)

Features to add once core loop is validated (users act on "what next?" recommendations).

- [ ] PSA/BGS cert stub lookup — users trust grading data; cert verification increases card detail credibility. Add when external card uploads are active
- [ ] Price history trend signal — "is this card trending up?" adds temporal dimension. Add when daily price updates are stable
- [ ] Liquidity classification per card — refine beyond binary vaulted/not-vaulted. Add when portfolio concentration data shows user value
- [ ] Portfolio concentration alerts — "You're 85% concentrated in one player" is a proactive insight. Trigger when users have 10+ cards

### Future Consideration (v2+)

Defer until product-market fit is established.

- [ ] Image-based card recognition — high cost, high payoff; validate manual entry adoption first
- [ ] Real-time price feeds — data licensing cost; validate that daily updates create enough engagement first
- [ ] Image rendering for Collector Identity card — visual cards convert better than text; defer until sharing behavior is validated
- [ ] CSV export / cost-basis tracking — power-user feature; defer until portfolio tools are adopted
- [ ] Multi-user portfolio comparison — social layer; defer until individual portfolio tools are proven

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Card State Model + DB schema | HIGH | LOW | P1 |
| Action Eligibility Rules Engine | HIGH | MEDIUM | P1 |
| Card value estimate per card | HIGH | MEDIUM | P1 |
| External card upload (manual entry) | HIGH | MEDIUM | P1 |
| Portfolio Summary | HIGH | MEDIUM | P1 |
| Context-aware "What Next?" per card | HIGH | HIGH | P1 |
| Vault Conversion Incentive Logic | HIGH | MEDIUM | P1 |
| LLM Narrative Layer (with validation) | HIGH | HIGH | P1 |
| Collector Archetype Inference | HIGH | HIGH | P1 |
| Shareable Collector Identity Card | MEDIUM | MEDIUM | P1 |
| Pack-Pull Analysis endpoint | MEDIUM | MEDIUM | P1 |
| PSA/BGS cert stub | MEDIUM | LOW | P2 |
| Price trend signal | MEDIUM | MEDIUM | P2 |
| Liquidity classification | MEDIUM | MEDIUM | P2 |
| Portfolio concentration alerts | MEDIUM | LOW | P2 |
| Image-based card recognition | HIGH | HIGH | P3 |
| Real-time price feeds | MEDIUM | HIGH | P3 |
| Image rendering for share card | MEDIUM | HIGH | P3 |
| CSV export | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | CardLadder | CollX | Alt | Collectr | Our Approach |
|---------|------------|-------|-----|----------|--------------|
| Portfolio total value | Yes (auto-updated) | Yes (real-time) | Yes | Yes | Yes — includes external + vaulted |
| Per-card value estimate | Yes (algo + history) | Yes (market scan) | Yes | Yes | Yes — with range and uncertainty |
| Price trend signal | Yes (player index) | Basic | Yes (charts) | Yes (market trends) | v1.x — daily delta vs 30-day avg |
| Price alerts / watchlist | Yes (Pro) | No | Yes | No | No in v1 |
| Card scanning / image ID | No | Yes (4.4/5 UX) | No | Yes (AI scan) | Deferred to v2 |
| Grading submission tracking | No | No | Via Alt Vault | No | Stub only (cert number + grade) |
| Vault / physical storage | No | No | Yes (Alt Vault) | No | Via Gacha vault integration |
| Action eligibility per card | No | No | Partial (sell/store) | No | YES — core differentiator |
| "What next?" narrative | No | CollX AI (generic) | No | No | YES — state-aware + LLM narrative |
| Collector archetype / identity | Hobby Spectrum (separate tool) | No | No | No | YES — embedded + shareable |
| Viral share mechanic | No | No | No | No | YES — Collector Identity card |
| Vault conversion nudges | No | No | No | No | YES — threshold-based incentives |
| External card upload | Yes (manual) | Yes (scan) | Yes (graded only) | Yes | Yes — manual entry in v1 |
| Compliance-safe language | No | No | No | No | YES — "signals and options" framing throughout |

---

## Sources

- [CardLadder Pro Features](https://www.cardladder.com/pro-features/collection) — Collection and portfolio tracking
- [CardLadder Sales History](https://www.cardladder.com/pro-features/sales-history) — Price history and value estimation
- [PriceCharting Collection Tracker](https://www.pricecharting.com/page/collection-tracker) — Portfolio management features
- [PriceCharting Premium](https://www.pricecharting.com/pricecharting-pro) — Advanced features
- [CollX Pro](https://www.collx.app/collx-pro) — AI insights, portfolio tracking
- [Collectr](https://getcollectr.com/) — TCG portfolio tracking, market intelligence
- [Alt Vault](https://www.alt.xyz/vault) — Physical card vault, liquidity, lending
- [CardGrader.AI — Best AI Apps 2025](https://cardgrader.ai/blog/best-ai-powered-apps-scan-value-trading-cards) — AI card grading landscape
- [The Hobby Spectrum — Collector Identity](https://www.thehobbyspectrum.com/preview-access) — Collector archetype classification
- [Market Movers App](https://www.marketmoversapp.com/) — Market aggregation, deal surfacing
- [ConsignR — Top Trading Card Platforms](https://consignr.com/blog/top-trading-card-platforms) — Platform comparison
- [SlabTracker](https://slabtracker.app/) — PSA submission management
- [PSA App](https://apps.apple.com/us/app/psa-verify-track-and-vault/id996239729) — Grading, vault, submission tracking
- [CardTechie — The Data Problem Every Card App Faces](https://cardtechie.com/blog/the-data-problem-every-card-app-faces/) — Data silo pitfall research
- [Collector Crypt Gacha Model](https://nftevening.com/collector-crypt-cards/) — Gacha + vault + instant buyback economy reference

---

*Feature research for: Collectible card portfolio management agent (Gacha platform)*
*Researched: 2026-03-04*
