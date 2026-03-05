---
phase: 05-observability-hardening-and-testing
plan: "03"
subsystem: testing
tags: [integration-tests, vitest, fastify-inject, tdd, http-pipeline, observability]

dependency_graph:
  requires:
    - phase: 05-01
      provides: request-id-tracing via genReqId and onSend hook
    - phase: 04-agent-orchestrators-and-api
      provides: all four agent routes and orchestrators
  provides:
    - http-integration-tests for all 4 MVP user journeys
    - x-request-id verification across all journey endpoints
  affects:
    - apps/api

tech-stack:
  added: []
  patterns:
    - "Full-server integration test: register all route plugins with genReqId/onSend hooks in buildServer()"
    - "Mock at @tcg/agent orchestrator boundary (not route level) — exercises full route handler, validation, response shaping"
    - "Separate describe/beforeAll/afterAll per journey — isolated mock state, no cross-journey contamination"
    - "app.inject used for all HTTP assertions — no real server startup needed"

key-files:
  created:
    - apps/api/src/__tests__/integration/journeys.test.ts
  modified: []

key-decisions:
  - "Mock at orchestrator boundary (@tcg/agent) not at LLM layer — exercises real route handler logic including auth checks, request parsing, actionsLog audit write, response shaping, and X-Request-Id reflection"
  - "Build full server in buildServer() with genReqId and onSend hooks — same config as server.ts to verify observability wiring end-to-end"
  - "Per-journey describe blocks with beforeAll/afterAll for server lifecycle — avoids shared mutable state between journeys"
  - "External card journey verifies breakdown.ipCategory=External — confirms externalCards->External mapping works through full pipeline"

patterns-established:
  - "Integration test pattern: buildServer() registers all plugins, genReqId + onSend hooks included for full observability coverage"
  - "Journey test pattern: assert HTTP status + response shape + X-Request-Id header in single test for each journey"

requirements-completed:
  - TEST-03

duration: 2min
completed: 2026-03-05
---

# Phase 5 Plan 03: MVP User Journey Integration Tests Summary

**14 integration tests covering all 4 MVP user journeys end-to-end via fastify.inject, with X-Request-Id header verification confirming observability wiring through the full HTTP pipeline.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T02:33:27Z
- **Completed:** 2026-03-05T02:35:41Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `apps/api/src/__tests__/integration/journeys.test.ts` with 14 tests covering all 4 MVP journeys
- Journey 1 (pack pull to card analysis): verifies `POST /agent/card/analyze-batch` returns results array with actions, passes `source:pack_pull` to orchestrator, propagates X-Request-Id
- Journey 2 (external card upload to portfolio): verifies `POST /external-cards` creates card at 201, subsequent portfolio summary shows External breakdown group
- Journey 3 (portfolio summary): verifies all required fields (`totalValueEst`, `breakdown`, `concentrationScore`, `liquidityScore`, `recommendedActions`), X-Request-Id present
- Journey 4 (archetype export): verifies `name`, `traits`, `why`, `comparable_collectors`, `share_card_text`, `share_card_badges` all present; tests all three deterministic badge types (`vault_builder`, `ip_specialist`, `external_collector`)
- Full monorepo: 186 agent + 38 API = 224 total tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: MVP user journey integration tests** - `6d0ec96` (test)

## Files Created/Modified

- `apps/api/src/__tests__/integration/journeys.test.ts` - 588-line integration test file with 4 journey test suites, 14 tests total

## Decisions Made

- **Mock at orchestrator boundary**: Mocked `@tcg/agent` (analyzeCardBatch, summarizePortfolio, detectArchetype) rather than deeper LLM layer. This exercises real route handler code: auth validation, request body parsing, actionsLog writes, response shaping, degraded flag handling, and X-Request-Id reflection via `onSend` hook.
- **Full server config in buildServer()**: Included `genReqId` and `onSend` hooks matching `server.ts` exactly — this is the key difference from unit tests that only register individual route plugins. Ensures X-Request-Id observability is verified end-to-end.
- **Per-journey describe blocks**: Each journey gets its own `beforeAll`/`afterAll` to build and close a fresh server instance, preventing mock state contamination between journeys.

## Deviations from Plan

None - plan executed exactly as written. Tests pass immediately because the integration points (routes, observability hooks) were built in prior phases. The TDD approach confirmed all 4 MVP journeys work via HTTP with the full pipeline.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 5 is now complete: observability hardening (Plans 01-02) and integration testing (Plan 03) all done
- All 4 MVP user journeys verified end-to-end via HTTP
- X-Request-Id propagation confirmed working through full pipeline
- No blockers for v1.0 release

---
*Phase: 05-observability-hardening-and-testing*
*Completed: 2026-03-05*
