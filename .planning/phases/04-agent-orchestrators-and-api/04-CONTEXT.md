# Phase 4: Agent Orchestrators and API - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Three agent orchestrators (card analysis, portfolio summary, archetype detection) compose the rules engine and LLM layer into complete user-facing flows, exposed via REST endpoints that accept requests and return validated JSON. Covers CARD-01, CARD-02, CARD-03, CARD-04, PORT-01, PORT-02, PORT-03, EXTC-01, EXTC-02, EXTC-03, VAULT-04, IDENT-01, IDENT-02, IDENT-03, API-01, API-02, API-03, API-04, API-05, API-06.

</domain>

<decisions>
## Implementation Decisions

### API contract design
- All agent endpoints accept card/entity IDs, not inline data — server fetches from DB
- Authentication: X-User-Id header (stub auth — assumes upstream gateway handles real auth in production)
- Error shape: consistent envelope `{ error: { code, message, details? } }` with appropriate HTTP status codes
- LLM failure handling: return 200 with partial data (rules engine actions + null narrative fields) and a `degraded: true` flag. User always gets their actions even when LLM is unavailable

### Pack pull analysis flow
- Batch endpoint: `POST /agent/card/analyze-batch` with `{ cardIds: string[] }` — server runs analyses in parallel
- Pull-aware action copy: same eligible actions as normal analysis, but `ui_copy` is contextual to pull event (e.g., "Just pulled! List now while demand is fresh"). Rules engine receives a `source: 'pack_pull'` context hint
- Partial failure: per-card status in batch results — each card has its own success/degraded flag. Client renders individually
- Concurrency limit on parallel LLM calls: Claude's discretion (reasonable default for typical pack sizes)

### External card lifecycle
- Upload via `POST /external-cards` returns the card record only — does NOT auto-trigger analysis. Client calls analyze separately
- Validation: title and estimatedValue required. Set, grade, certNumber optional. Value is needed for vault conversion logic
- PSA cert stub (EXTC-03): lookup stored grade by cert number. Returns grade if found, null otherwise. Clean replacement point for future real API
- Full CRUD: POST (create), PATCH (update fields), DELETE (soft delete via deletedAt). Users can correct mistakes on uploaded cards

### Archetype inference rules
- Minimum card threshold: 5 cards required for archetype detection
- Below-threshold response: `{ archetype: null, progress: '2/5 cards', message: 'Add 3 more cards to unlock your collector identity!' }` — friendly nudge encouraging growth, not an error
- Card scope: all cards count (vaulted + external) — full collection picture. A user with 20 external Pokemon cards IS a Pokemon collector
- Badge assignment: deterministic rules-based from predefined criteria (e.g., `vault_builder` if 10+ vaulted cards, `ip_specialist` if 60%+ one IP). No LLM involvement in badges — predictable, testable

### Claude's Discretion
- Concurrency limit on batch LLM calls (reasonable default)
- Orchestrator internal architecture (function composition, class-based, etc.)
- Fastify route organization (file-per-route, grouped by domain, etc.)
- Request validation middleware approach
- Shipment intent stub implementation details (VAULT-04)
- Action execute stub implementation details (API-06)

</decisions>

<specifics>
## Specific Ideas

- The `degraded` flag on partial responses means the client can always render something useful — rules engine actions are the safety net when LLM fails
- Pull-aware copy is a copy-level change, not a new action type — keeps the rules engine simple while adding contextual value
- Archetype progress nudge turns a gate into a growth mechanic — users see "3/5 cards" and want to add more
- Deterministic badges are testable and predictable — avoids LLM hallucinating badge names that don't exist in the UI

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `generateWithRetry` (packages/agent/src/llm/generate.ts): Full retry + compliance pipeline ready for orchestrators to call
- `renderPrompt` + `PROMPTS` (packages/agent/src/llm/prompts.ts): Templates for card_analysis, portfolio_summary, archetype_identity already defined with slot injection
- `scrubCompliance` (packages/agent/src/llm/compliance.ts): Compliance guard with explicit narrativeFields list
- `computeEligibleActions` + `computeVaultConversionCandidates` (packages/agent/src/rules/): Rules engine exports ready for orchestrator composition
- `CardAnalysisResponseSchema` (packages/schemas/src/api/card-analysis.ts): Extends LLM schema with actions array — orchestrator injects rules engine output here
- `PortfolioSummarySchema`, `CollectorArchetypeSchema` (packages/schemas/src/api/): API response schemas ready
- `sanitizeInput`, `wrapUserInput` (packages/agent/src/llm/sanitize.ts): Input sanitization for user-supplied strings

### Established Patterns
- LLM schemas use `z.union([type, z.null()])` not `z.optional()` — API response schemas follow same convention
- API schemas extend LLM schemas via `.extend()` — actions field is API-only (rules engine injection point)
- `AnalysisFailure` type designed for reuse across all three orchestrators
- Vitest configured in packages/agent with 89+ tests — orchestrator tests go here

### Integration Points
- Fastify server skeleton at `apps/api/src/server.ts` — routes to be registered here
- Orchestrators live in `packages/agent/src/` — new directory alongside `rules/` and `llm/`
- Prisma client from `packages/db` for card/user data fetching
- Seed data provides test scenarios: 42 userCards across all 4 states, 6 external cards, 3 users with distinct profiles

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-agent-orchestrators-and-api*
*Context gathered: 2026-03-04*
