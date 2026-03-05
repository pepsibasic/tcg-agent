---
phase: 02
slug: rules-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | packages/agent/vitest.config.ts (Wave 0 installs) |
| **Quick run command** | `pnpm --filter @tcg/agent test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @tcg/agent test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | RULE-01, RULE-02 | unit | `pnpm --filter @tcg/agent test` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | RULE-03 | unit | `pnpm --filter @tcg/agent test` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | VAULT-01, VAULT-02, VAULT-03 | unit | `pnpm --filter @tcg/agent test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/agent/vitest.config.ts` — vitest configuration (copy from schemas package)
- [ ] `packages/agent/package.json` — add vitest devDependency and test script
- [ ] `packages/agent/src/__tests__/` — test directory structure

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
