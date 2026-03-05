# Phase 5: Observability, Hardening, and Testing - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Structured logging with request ID tracing, actions audit trail, LLM failure diagnostics, and comprehensive unit + integration tests covering all MVP user journeys. Covers API-07, OBS-01, OBS-02, OBS-03, TEST-01, TEST-02, TEST-03.

</domain>

<decisions>
## Implementation Decisions

### Structured log design
- Request ID propagation via X-Request-Id header — accept from upstream gateway if present, otherwise generate. Pass through orchestrator calls as context param
- Log levels: info for every API request, warn for LLM failures/retries, error for unrecoverable errors
- Log LLM token usage (input_tokens, output_tokens) and latency_ms per LLM call at info level — enables cost tracking and performance monitoring
- Use Fastify's built-in Pino logger — already active with `logger: true`

### Actions audit trail
- Log both agent recommendations AND user clicks — two entries per interaction
- When card analysis returns, log the full recommended action list to actions_log
- When user executes via POST /actions/execute, log the executed action with reference to the recommendation
- Queryable by user and card (OBS-02 requirement)

### Integration test strategy
- Real HTTP via fastify.inject + mocked LLM layer — tests the full request pipeline without external API dependencies
- 4 MVP journey tests: pack pull → card analysis, external upload → portfolio appearance, portfolio summary request, shareable archetype export
- Mock LLM responses with canned data, but exercise real routing, auth (X-User-Id), error handling, and response shaping

### LLM failure diagnostics
- Log validation failures with: card_id, model, zodError.issues (error path), and truncated raw output (first 500 chars)
- Matches Phase 3 retry prompt truncation (500 chars) — consistent truncation boundary
- A developer should be able to diagnose a prompt failure from the log entry alone (OBS-03)

### Claude's Discretion
- Pino log transport configuration
- Request ID generation strategy (UUID v4 vs nanoid)
- Test file organization for integration tests
- Schema test structure for TEST-01 (valid + invalid inputs)
- Whether to add request logging middleware or use Fastify hooks

</decisions>

<specifics>
## Specific Ideas

- Compliance guard already logs scrubs (Phase 3) — OBS-03 should integrate with that existing pattern, not duplicate it
- 173 agent tests + 24 API tests already exist — Phase 5 adds schema tests (TEST-01) and integration journey tests (TEST-03), not re-testing what's covered
- Rules engine tests (TEST-02) already have 89 tests covering all states x actions from Phase 2 — may only need gap-fill

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Fastify({ logger: true })` in apps/api/src/server.ts — Pino already active
- `actions_log` table in Prisma schema — ready for audit entries
- `ComplianceViolation` type from packages/agent/src/llm/compliance.ts — scrub logging pattern
- `AnalysisFailure` type from packages/agent/src/llm/types.ts — failure diagnostic structure
- 24 existing fastify.inject route tests — pattern for integration tests

### Established Patterns
- Vitest configured in both packages/agent and apps/api
- Route tests use vi.mock for Prisma and orchestrator dependencies
- Compliance scrub already captures field, original text, replacement, card_id, model

### Integration Points
- All 4 route plugins registered in server.ts — logging middleware hooks here
- generateWithRetry already returns attempt count and compliance violations — extend for token/latency logging
- Seed data has 3 user profiles with distinct scenarios — test fixtures for journey tests

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-observability-hardening-and-testing*
*Context gathered: 2026-03-05*
