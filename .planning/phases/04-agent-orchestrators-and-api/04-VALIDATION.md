---
phase: 4
slug: agent-orchestrators-and-api
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `packages/agent/vitest.config.ts` |
| **Quick run command** | `pnpm --filter @tcg/agent test` |
| **Full suite command** | `pnpm --filter @tcg/agent test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @tcg/agent test`
- **After every plan wave:** Run `pnpm --filter @tcg/agent test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | CARD-01 | unit | `pnpm --filter @tcg/agent test -- --grep "analyzeCard"` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | CARD-02 | unit | `pnpm --filter @tcg/agent test -- --grep "external card actions"` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | CARD-03 | unit | `pnpm --filter @tcg/agent test -- --grep "pack pull"` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | CARD-04 | unit | `pnpm --filter @tcg/agent test -- --grep "degraded"` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | PORT-01 | unit | `pnpm --filter @tcg/agent test -- --grep "summarizePortfolio"` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | PORT-02 | unit | `pnpm --filter @tcg/agent test -- --grep "portfolio unified"` | ❌ W0 | ⬜ pending |
| 04-02-03 | 02 | 1 | PORT-03 | unit | `pnpm --filter @tcg/agent test -- --grep "concentrationScore"` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 1 | IDENT-01 | unit | `pnpm --filter @tcg/agent test -- --grep "detectArchetype"` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 1 | IDENT-02 | unit | `pnpm --filter @tcg/agent test -- --grep "below threshold"` | ❌ W0 | ⬜ pending |
| 04-03-03 | 03 | 1 | IDENT-03 | unit | `pnpm --filter @tcg/agent test -- --grep "badge"` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | EXTC-01 | unit | `pnpm --filter @tcg/agent test -- --grep "external card create"` | ❌ W0 | ⬜ pending |
| 04-04-02 | 04 | 2 | EXTC-03 | unit | `pnpm --filter @tcg/agent test -- --grep "cert lookup"` | ❌ W0 | ⬜ pending |
| 04-05-01 | 05 | 2 | VAULT-04 | unit | `pnpm --filter @tcg/agent test -- --grep "shipment"` | ❌ W0 | ⬜ pending |
| 04-06-01 | 06 | 2 | API-01 | integration | manual-only (requires running server) | ❌ W0 | ⬜ pending |
| 04-06-02 | 06 | 2 | API-02 | integration | manual-only (requires running server) | ❌ W0 | ⬜ pending |
| 04-06-03 | 06 | 2 | API-03 | integration | manual-only (requires running server) | ❌ W0 | ⬜ pending |
| 04-06-04 | 06 | 2 | API-04 | integration | manual-only (requires running server) | ❌ W0 | ⬜ pending |
| 04-06-05 | 06 | 2 | API-05 | integration | manual-only (requires running server) | ❌ W0 | ⬜ pending |
| 04-06-06 | 06 | 2 | API-06 | integration | manual-only (requires running server) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/agent/src/orchestrators/` — directory does not exist yet
- [ ] `packages/agent/src/__tests__/orchestrators/card-analysis.test.ts` — covers CARD-01 through CARD-04
- [ ] `packages/agent/src/__tests__/orchestrators/portfolio-summary.test.ts` — covers PORT-01 through PORT-03
- [ ] `packages/agent/src/__tests__/orchestrators/archetype.test.ts` — covers IDENT-01 through IDENT-03
- [ ] `apps/api/src/routes/` — directory does not exist yet
- [ ] All orchestrator tests require mocking `prisma` client (same pattern as existing tests using `vi.mock`)

*Existing Vitest infrastructure covers test framework; only test stubs and directories are needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| POST /agent/card/analyze returns 200 | API-01 | Requires running Fastify server | Start server, POST with cardId, verify 200 + shape |
| POST /agent/portfolio/summary returns 200 | API-02 | Requires running Fastify server | Start server, POST with userId, verify 200 + shape |
| POST /agent/archetype returns 200 | API-03 | Requires running Fastify server | Start server, POST with userId, verify 200 + shape |
| POST /external-cards returns 201 | API-04 | Requires running Fastify server | Start server, POST with card data, verify 201 |
| POST /vault/shipments returns 201 | API-05 | Requires running Fastify server | Start server, POST with shipment data, verify 201 |
| POST /actions/execute logs action | API-06 | Requires running Fastify server | Start server, POST action, verify log entry |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
