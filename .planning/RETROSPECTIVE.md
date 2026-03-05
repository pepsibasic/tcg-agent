# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-05
**Phases:** 7 | **Plans:** 22 | **Tests:** 326

### What Was Built
- TypeScript monorepo with 4 packages (schemas, db, agent, api) and Turborepo build pipeline
- Deterministic rules engine computing action eligibility for all card states + vault conversion logic
- Provider-agnostic LLM layer with retry/fallback, compliance guard, and prompt templates
- Three agent orchestrators (card analysis, portfolio summary, archetype) composing rules + LLM
- 7 REST API endpoints with structured logging, request ID propagation, and actions audit trail
- Prompt-schema alignment with contract tests preventing silent drift
- Cross-phase wiring: vault conversion surfaced in API, logger threaded through orchestrators

### What Worked
- **TDD approach** — writing tests before implementation caught design issues early (especially rules engine state coverage)
- **Narrow LLM schema pattern** — separating LLM schemas from API schemas eliminated validation failures on orchestrator-computed fields
- **Contract tests** — simple string-match strategy for prompt-schema alignment catches drift without fragile regex
- **Mock at orchestrator boundary** — integration tests exercise real route handler logic while keeping LLM calls deterministic
- **Gap closure phases** — Phases 6-7 systematically addressed audit findings rather than shipping with known drift

### What Was Inefficient
- **Prompt-schema alignment not caught until Phase 6** — prompt templates written in Phase 3 drifted from schemas; could have been caught with contract tests from the start
- **Vault conversion wiring delayed to Phase 7** — `computeVaultConversionCandidates` existed since Phase 2 but wasn't surfaced via API until Phase 7
- **Nyquist validation never executed** — framework was scaffolded but the validation process was never run; all 7 VALIDATION.md remain draft

### Patterns Established
- **Rules+LLM separation**: Rules engine is sole source of action eligibility; LLM never sees or modifies actions
- **Degraded mode**: Orchestrators return `success: true, degraded: true` on LLM failure — never throw
- **Explicit compliance scrubbing**: `scrubCompliance` requires caller to declare narrative fields — no accidental scrubbing
- **LLMLogger interface**: Minimal info/warn interface keeps agent package decoupled from Fastify
- **Exhaustive switch with TypeScript `never`**: Ensures all card states are handled at compile time

### Key Lessons
1. **Add contract tests at the same time as prompt templates** — waiting until Phase 6 created 15 requirements worth of rework
2. **Wire cross-phase dependencies as soon as the upstream API exists** — vault conversion sat unused for 5 phases
3. **Run validation frameworks, don't just scaffold them** — Nyquist validation was never executed despite being set up in every phase

### Cost Observations
- Model mix: balanced profile (sonnet for agents, opus for orchestration)
- Sessions: ~10 across 2 days
- Notable: 22 plans completed in approximately 76 minutes of execution time; high parallelization via yolo mode

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 7 | 22 | Initial milestone — established TDD, rules+LLM separation, contract testing |

### Cumulative Quality

| Milestone | Tests | Tech Debt Items | Gap Closure Phases |
|-----------|-------|-----------------|--------------------|
| v1.0 | 326 | 5 (all low) | 2 (Phases 6-7) |

### Top Lessons (Verified Across Milestones)

1. Contract tests should be co-located with the code they protect — not deferred to later phases
2. Cross-phase wiring should happen as soon as the upstream function ships — not at milestone end
