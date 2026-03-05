# Phase 7: Cross-Phase Wiring and Test Fidelity - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire four cross-phase integration gaps identified in the v1.0 milestone audit: vault conversion recommendations surfaced via API, LLM diagnostic logging with real request context, batch card analysis audit trail, and schema-valid integration test fixtures. This is the final gap closure phase — no new features.

</domain>

<decisions>
## Implementation Decisions

### Vault conversion API wiring
- Call computeVaultConversionCandidates from the portfolio summary orchestrator (not a dedicated endpoint) — the portfolio summary already has access to all user cards
- Include vault conversion results in the PortfolioSummary API response — extend the response schema if needed
- VAULT-01/02/03: The rules engine function already exists and is tested — this is purely wiring it into the orchestrator and surfacing results

### LLM diagnostic logging
- Thread request.log (Fastify Pino logger) through all 3 orchestrators into generateWithRetry
- Add logger parameter to generateWithRetry function signature (optional, for backward compatibility)
- Log llm_validation_failure and llm_generation_exhausted events with card_id, model, error path, truncated raw output
- OBS-03: LLM validation failures logged with enough context for a developer to diagnose from the log alone

### Batch analysis audit trail
- POST /agent/card/analyze-batch writes RECOMMENDATION entries to actionsLog for each card analyzed
- OBS-02: Records what agent recommended — the "user clicked" side already exists via POST /actions/execute
- CARD-03: After pack pull, each card receives analysis with contextual actions

### Integration test fixture fidelity
- Fix mock fixtures to use valid PriceConfidence enum values (LIVE/RECENT_24H/STALE_7D/NO_DATA)
- Fix mock fixtures to use real ActionSchema shapes ({type, params, ui_copy, risk_notes})
- TEST-03: Integration tests should exercise real schema validation, not pass with structurally invalid mocks

### Claude's Discretion
- Whether to add vaultConversionCandidates as a new field on PortfolioSummaryResponseSchema or return alongside it
- generateWithRetry logger parameter design (options bag vs separate param)
- actionsLog write timing in batch flow (per-card or batched)
- Exact test fixture data values

</decisions>

<specifics>
## Specific Ideas

- The portfolio summary orchestrator already calls computeEligibleActions — adding computeVaultConversionCandidates follows the same pattern
- generateWithRetry already accepts an options object — logger can be added there
- Phase 5 added structured logging infrastructure — this phase threads it through the remaining gaps

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `computeVaultConversionCandidates` in packages/agent/src/rules/ — already tested, returns SHIP_TO_VAULT recommendations
- `generateWithRetry` in packages/agent/src/llm/generate.ts — already has options parameter pattern
- `actionsLog` table in Prisma schema — ready for RECOMMENDATION entries
- `request.log` Pino logger available on all Fastify route handlers
- Integration tests in apps/api/src/__tests__/ — existing fastify.inject patterns

### Established Patterns
- Orchestrators accept options/context parameter — add logger there
- Phase 5 genReqId + onSend hooks provide X-Request-Id on every response
- Mock at orchestrator boundary in journey tests (Phase 5 decision)
- Degraded path pattern: success:true with degraded:true flag

### Integration Points
- Portfolio summary orchestrator: add computeVaultConversionCandidates call
- All 3 orchestrators: thread request.log into generateWithRetry
- Batch analysis route handler: write actionsLog entries
- Journey test files: fix mock fixture shapes

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-cross-phase-wiring-and-test-fidelity*
*Context gathered: 2026-03-05*
