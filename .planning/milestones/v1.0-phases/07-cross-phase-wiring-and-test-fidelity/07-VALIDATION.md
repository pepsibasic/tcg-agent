---
phase: 7
slug: cross-phase-wiring-and-test-fidelity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `pnpm test --filter apps/api -- journeys` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --filter apps/api -- journeys`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | VAULT-01, VAULT-02, VAULT-03 | integration | `pnpm test` | yes (existing) | pending |
| 07-01-02 | 01 | 1 | OBS-02, OBS-03 | unit+integration | `pnpm test` | yes (existing) | pending |
| 07-01-03 | 01 | 1 | CARD-03, OBS-02 | integration | `pnpm test --filter apps/api -- journeys` | yes (existing) | pending |
| 07-01-04 | 01 | 1 | TEST-03 | integration | `pnpm test --filter apps/api -- journeys` | yes (existing) | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed — changes are fixture fixes and new assertions in existing test files.

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
