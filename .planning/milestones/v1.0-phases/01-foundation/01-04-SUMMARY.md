---
phase: 01-foundation
plan: "04"
subsystem: database
tags: [prisma, postgres, seed-data, typescript, tsx]

requires:
  - phase: 01-02
    provides: Zod schemas as types reference for data shapes
  - phase: 01-03
    provides: Prisma schema, migration SQL, and generated client

provides:
  - Idempotent seed script populating all 8 database tables
  - 3 user personas (collector/flipper/new user) with realistic profiles
  - 50 cards across 4 IPs (pokemon, one-piece, sports, yugioh) with fixed UUIDs
  - UserCards in all 4 states (VAULTED/EXTERNAL/ON_MARKET/IN_TRANSIT)
  - ExternalCards, packs, packCards, marketplace listing stubs, actionsLog entries
  - Verified end-to-end Phase 1 build pipeline (install -> build -> test)

affects:
  - 02-rules-engine
  - 03-llm-agent
  - 04-api-layer
  - 05-integration

tech-stack:
  added: []
  patterns:
    - Fixed UUID v7-format strings for all seed records ensure idempotent upserts
    - Seed script uses prisma.model.upsert() with where: { id } for all records
    - Seed data and seed script split into two files (data constants vs. execution logic)

key-files:
  created:
    - packages/db/src/seed-data.ts
    - packages/db/src/seed.ts
  modified: []

key-decisions:
  - "Fixed UUID format strings (not runtime generation) guarantee same IDs across seed runs"
  - "Upsert-by-id pattern for all 8 tables provides idempotency without delete-all strategy"
  - "Seed summary logs count by state (VAULTED/EXTERNAL/ON_MARKET/IN_TRANSIT) for quick verification"

patterns-established:
  - "Seed data constants in seed-data.ts, execution logic in seed.ts — easy to update fixtures without changing logic"
  - "All optional fields use ?? null coercion in upsert calls for explicit null handling"

requirements-completed: [FOUND-05]

duration: 5min
completed: 2026-03-04
---

# Phase 1 Plan 4: Seed Data Summary

**Idempotent seed script with 50 cards across 4 IPs (pokemon/one-piece/sports/yugioh), all 4 CardState values, and end-to-end Phase 1 pipeline verification**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-04T12:21:44Z
- **Completed:** 2026-03-04T12:26:03Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `seed-data.ts` with 3 users, 50 cards, 42 userCards (20 VAULTED / 10 EXTERNAL / 8 ON_MARKET / 4 IN_TRANSIT), 6 externalCards, 2 packs, 5 packCards, 4 marketplace listings, 3 actionsLog entries — all with fixed UUIDs for idempotent upserts
- Created `seed.ts` with `main()` function using `prisma.model.upsert()` for every record, catch/finally with `$disconnect()`, and a per-state summary log
- Verified `pnpm db:seed` runs without error and is fully idempotent (second run produces identical output, no duplicate errors)
- Verified Phase 1 success criteria: `pnpm install && pnpm build` (all 4 packages in correct order), 26 schema unit tests pass, Turborepo dependency graph correct (schemas -> db -> agent -> api)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create seed data fixtures and idempotent seed script** - `cdf83a9` (feat)
2. **Task 2: End-to-end build and seed verification** - no additional commit (verification only — all SC passed)

## Files Created/Modified

- `packages/db/src/seed-data.ts` - All seed data as typed constants with fixed UUIDs; 3 users, 50 cards, 42 userCards, 6 externalCards, 2 packs, 5 packCards, 4 listings, 3 actionsLog entries
- `packages/db/src/seed.ts` - Idempotent seed entry point using upsert for all 8 tables, with summary logging

## Decisions Made

- Fixed UUID format strings (not runtime-generated UUIDs) are stored in `seed-data.ts` constants so every re-run references the same IDs, enabling upsert-by-id idempotency
- Split data constants and execution logic into two files for maintainability — updating fixtures doesn't require touching seed logic
- Accessed only fields present in seed data objects in seed.ts (omitted `imageUrl` from card upserts since seed data defines no image URLs — Rule 1 auto-fix)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed imageUrl access from card upsert**
- **Found during:** Task 1 (TypeScript compilation of seed.ts)
- **Issue:** seed.ts referenced `card.imageUrl` but CARDS array in seed-data.ts did not define `imageUrl` on card objects — TypeScript error TS2339
- **Fix:** Removed `imageUrl` field from card upsert update/create blocks (imageUrl defaults to null in DB, acceptable for seed data)
- **Files modified:** packages/db/src/seed.ts
- **Verification:** `pnpm --filter @tcg/db build` succeeds with zero TypeScript errors
- **Committed in:** cdf83a9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Minor fix required for TypeScript correctness. No scope creep. imageUrl remains nullable in DB and can be populated in future phases.

## Issues Encountered

- Postgres `postgres` role did not exist locally — created it with CREATEDB privilege and granted access to `tcg_agent` database. This is a local dev environment setup step, not a code issue.
- `tcg_agent` database did not exist — created it before running migration.

## User Setup Required

None for subsequent phases — seed data is in place. Local Postgres setup was done during this plan's verification.

## Next Phase Readiness

Phase 1 foundation is complete:
- All 4 packages build in correct Turborepo order (schemas -> db -> agent -> api)
- 26 Zod schema unit tests pass
- Database seeded with realistic development data covering all card states and user personas
- Ready for Phase 2: Rules Engine

---
*Phase: 01-foundation*
*Completed: 2026-03-04*
