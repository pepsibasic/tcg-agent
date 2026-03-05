---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (latest stable) |
| **Config file** | `packages/schemas/vitest.config.ts` (Wave 0 installs) |
| **Quick run command** | `pnpm --filter @tcg/schemas test` |
| **Full suite command** | `pnpm run test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @tcg/schemas test`
- **After every plan wave:** Run `pnpm build && pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | FOUND-01 | build/smoke | `pnpm build` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | FOUND-02 | unit | `pnpm --filter @tcg/schemas test` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | FOUND-03 | migration/smoke | `pnpm db:migrate` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 2 | FOUND-04 | unit | Verified via migration SQL inspection | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 3 | FOUND-05 | smoke | `pnpm db:seed` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/schemas/vitest.config.ts` — Vitest configuration for schema package
- [ ] `packages/schemas/src/__tests__/card-analysis.test.ts` — covers FOUND-02 (valid/invalid CardAnalysis)
- [ ] `packages/schemas/src/__tests__/portfolio-summary.test.ts` — covers FOUND-02 (PortfolioSummary)
- [ ] `packages/schemas/src/__tests__/archetype.test.ts` — covers FOUND-02 (CollectorArchetype)
- [ ] `packages/schemas/src/__tests__/action.test.ts` — covers FOUND-02 (Action types, all 7)
- [ ] Framework install: `pnpm add -D vitest --filter @tcg/schemas`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Turborepo build order | FOUND-01 | Build graph verified by Turborepo output | Run `pnpm build --dry-run` and verify schemas → db → agent → api order |
| Prisma migration tables | FOUND-03 | Requires running Postgres instance | Run `prisma migrate dev` and inspect tables via `psql` or Prisma Studio |
| Seed data completeness | FOUND-05 | Requires running Postgres instance | Run `pnpm db:seed` and verify card states via query |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
