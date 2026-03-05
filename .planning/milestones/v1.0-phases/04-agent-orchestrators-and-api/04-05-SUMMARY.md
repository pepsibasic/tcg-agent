---
phase: 04-agent-orchestrators-and-api
plan: "05"
subsystem: api
tags: [fastify, prisma, vitest, agent-routes, vault, actions, orchestrators]

# Dependency graph
requires:
  - phase: 04-agent-orchestrators-and-api
    provides: analyzeCard, analyzeCardBatch, summarizePortfolio, detectArchetype orchestrators
  - phase: 04-agent-orchestrators-and-api
    provides: externalCardRoutes plugin and vitest test infrastructure for @tcg/api
  - phase: 01-foundation
    provides: Prisma ActionsLog model with userId, cardId, agentRecommended, userAction fields
provides:
  - agentRoutes Fastify plugin with POST /agent/card/analyze, /agent/card/analyze-batch, /agent/portfolio/summary, /agent/archetype
  - vaultRoutes Fastify plugin with POST /vault/shipments (creates ActionsLog entry)
  - actionsRoutes Fastify plugin with POST /actions/execute (logs to ActionsLog)
  - server.ts wired with all 4 route plugins (agent, external-cards, vault, actions)
  - 15 route handler unit tests across 3 test files
affects: [future-api-integration, phase-05-sharing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fastify plugin function as route group (agentRoutes, vaultRoutes, actionsRoutes)
    - vi.mock('@tcg/agent') + fastify.inject() for agent route testing
    - Union type narrowing with 'degraded' in result guard for ArchetypeResult discriminated union
    - Auth: X-User-Id header check returns 401 MISSING_AUTH on all endpoints

key-files:
  created:
    - apps/api/src/routes/agent.ts
    - apps/api/src/routes/vault.ts
    - apps/api/src/routes/actions.ts
    - apps/api/src/__tests__/routes/agent.test.ts
    - apps/api/src/__tests__/routes/vault.test.ts
    - apps/api/src/__tests__/routes/actions.test.ts
  modified:
    - apps/api/src/server.ts

key-decisions:
  - "Agent routes return degraded:true in body alongside 200 — degraded is partial data, not an error"
  - "analyze-batch always passes source:pack_pull context to analyzeCardBatch orchestrator"
  - "archetype and portfolio/summary return 200 for both success and progress nudge — below-threshold is not an error"
  - "vault and actions routes use prisma.actionsLog.create for all state changes — stub implementation"
  - "Union type narrowing: 'degraded' in result guard for ArchetypeResult (ArchetypeProgressNudge has no degraded field)"

patterns-established:
  - "Route plugin test pattern: vi.mock('@tcg/agent'), register plugin on test Fastify instance, fastify.inject()"
  - "Error envelope: { error: { code, message } } for all error responses (401, 422, 404)"
  - "Auth gate: getUserIdOrFail helper returns null + sends 401, caller returns immediately"
  - "Degraded response: spread result.data into responseBody, conditionally add degraded:true"

requirements-completed: [API-01, API-02, API-03, API-05, API-06, VAULT-04]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 04 Plan 05: API Routes Wired to Orchestrators Summary

**Fastify route plugins agentRoutes, vaultRoutes, actionsRoutes wired to orchestrators with prisma ActionsLog writes, all 6 API requirements covered by 15 vitest unit tests using fastify.inject()**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T14:37:10Z
- **Completed:** 2026-03-04T14:39:53Z
- **Tasks:** 3 (TDD: test RED + agent GREEN + vault/actions/server GREEN)
- **Files modified:** 7

## Accomplishments
- Wrote 15 failing tests across 3 test files (10 agent, 2 vault, 3 actions) before implementation existed
- Implemented agentRoutes with 4 endpoints calling analyzeCard, analyzeCardBatch, summarizePortfolio, detectArchetype
- Implemented vaultRoutes and actionsRoutes as stubs that log to ActionsLog via Prisma
- Wired all 4 route plugins (agentRoutes, externalCardRoutes, vaultRoutes, actionsRoutes) in server.ts
- All 24 API route tests pass (15 new + 9 external cards from Plan 04)
- Full build passes with no TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing tests for agent, vault, and actions routes (TDD RED)** - `70b330e` (test)
2. **Task 2: Create agent routes (analyze, analyze-batch, portfolio, archetype) (TDD GREEN)** - `4af4cbd` (feat)
3. **Task 3: Create vault + actions stub routes and wire all routes in server.ts** - `8e0feb2` (feat)

_Note: TDD tasks have two commits (test RED → feat GREEN)_

## Files Created/Modified
- `apps/api/src/routes/agent.ts` - Fastify plugin with 4 agent endpoints calling orchestrators
- `apps/api/src/routes/vault.ts` - Fastify plugin with POST /vault/shipments stub (ActionsLog create)
- `apps/api/src/routes/actions.ts` - Fastify plugin with POST /actions/execute stub (ActionsLog create)
- `apps/api/src/server.ts` - Updated to register all 4 route plugins with health endpoint preserved
- `apps/api/src/__tests__/routes/agent.test.ts` - 10 unit tests for agent route handlers
- `apps/api/src/__tests__/routes/vault.test.ts` - 2 unit tests for vault route handlers
- `apps/api/src/__tests__/routes/actions.test.ts` - 3 unit tests for actions route handlers

## Decisions Made
- Agent routes return `degraded:true` in the response body alongside HTTP 200 — degraded is partial data, not an error condition
- `analyze-batch` always passes `{ source: 'pack_pull' }` context to `analyzeCardBatch` — consistent with the batch use case
- Both `archetype` and `portfolio/summary` return 200 for progress nudge responses — below-threshold is informational, not an error
- `vault/shipments` and `actions/execute` are stubs that only log to ActionsLog — real processing deferred to later phases

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript union type narrowing for ArchetypeResult**
- **Found during:** Task 2 (agent routes implementation — build verification)
- **Issue:** `result.degraded` caused TS error `Property 'degraded' does not exist on type 'ArchetypeResult'` because `ArchetypeProgressNudge` union member has no `degraded` field
- **Fix:** Changed `if (result.degraded)` to `if ('degraded' in result && result.degraded)` — uses `in` operator for discriminated union narrowing
- **Files modified:** apps/api/src/routes/agent.ts
- **Verification:** `pnpm build` passes with no TypeScript errors
- **Committed in:** 4af4cbd (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript type error)
**Impact on plan:** Minimal fix — one-line change for correct type narrowing. No scope creep.

## Issues Encountered
- vitest `--grep` flag not supported in this version (3.2.4) — ran full test suite instead; agent tests confirmed passing by count (19 tests with vault/actions still failing due to missing modules)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 6 API requirements (API-01 through API-06 and VAULT-04) are now satisfied
- Full API surface live: analyze, analyze-batch, portfolio/summary, archetype, vault shipments, action execute
- server.ts registers all route plugins — ready for integration testing or Phase 5
- PSA cert stub and vault/actions stubs have clean replacement points for real implementation

## Self-Check: PASSED

All files created and commits verified:
- FOUND: apps/api/src/routes/agent.ts
- FOUND: apps/api/src/routes/vault.ts
- FOUND: apps/api/src/routes/actions.ts
- FOUND: apps/api/src/__tests__/routes/agent.test.ts
- FOUND: apps/api/src/__tests__/routes/vault.test.ts
- FOUND: apps/api/src/__tests__/routes/actions.test.ts
- FOUND: apps/api/src/server.ts (modified)
- COMMIT 70b330e: test(04-05): add failing tests for agent, vault, and actions routes
- COMMIT 4af4cbd: feat(04-05): implement agent routes plugin with analyze, analyze-batch, portfolio/summary, archetype
- COMMIT 8e0feb2: feat(04-05): add vault/actions stub routes and wire all routes in server.ts

---
*Phase: 04-agent-orchestrators-and-api*
*Completed: 2026-03-04*
