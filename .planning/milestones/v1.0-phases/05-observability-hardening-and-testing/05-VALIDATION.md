---
phase: 5
slug: observability-hardening-and-testing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing in packages/agent and apps/api) |
| **Config file** | `packages/agent/vitest.config.ts`, `apps/api/vitest.config.ts` (existing); `packages/schemas/vitest.config.ts` (Wave 0) |
| **Quick run command** | `pnpm --filter @tcg/agent test --run && pnpm --filter @tcg/api test --run` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | API-07, OBS-01 | unit | `pnpm --filter @tcg/api test --run` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | OBS-02 | integration | `pnpm --filter @tcg/api test --run` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | OBS-03 | unit | `pnpm --filter @tcg/agent test --run` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | TEST-01 | unit | `pnpm --filter @tcg/schemas test --run` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | TEST-02 | unit | `pnpm --filter @tcg/agent test --run` | ✅ (gap-fill) | ⬜ pending |
| 05-02-03 | 02 | 1 | TEST-03 | integration | `pnpm --filter @tcg/api test --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/schemas/vitest.config.ts` — Vitest not configured for schemas package
- [ ] `packages/schemas/src/__tests__/schemas.test.ts` — TEST-01 coverage
- [ ] `apps/api/src/__tests__/integration/journeys.test.ts` — TEST-03 coverage
- [ ] `pnpm --filter @tcg/schemas add -D vitest` — if not present

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Log output includes reqId field | API-07 | Requires visual log inspection | Start server, make request, verify reqId in output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
