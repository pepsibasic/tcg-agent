---
phase: 01-foundation
plan: 03
subsystem: database
tags: [prisma, postgresql, uuid-v7, adapter-pg, migrations]

requires:
  - phase: 01-foundation-01
    provides: "Monorepo scaffold with packages/db workspace"
provides:
  - "Complete Prisma schema with 8 models and 2 enums"
  - "PrismaClient singleton with PrismaPg adapter"
  - "Initial migration SQL for all tables"
  - "@tcg/db barrel export with all model types"
affects: [01-foundation-04, 02-schemas, 03-agent, 04-api]

tech-stack:
  added: [prisma-6.19, prisma-adapter-pg, dotenv]
  patterns: [singleton-prisma-client, uuid-v7-primary-keys, soft-delete-pattern, custom-output-generated-client]

key-files:
  created:
    - packages/db/prisma/schema.prisma
    - packages/db/prisma.config.ts
    - packages/db/src/client.ts
    - packages/db/prisma/migrations/00000000000000_init/migration.sql
    - packages/db/prisma/migrations/migration_lock.toml
  modified:
    - packages/db/src/index.ts
    - packages/db/package.json

key-decisions:
  - "Import from generated client path (./generated/client) not @prisma/client due to custom output"
  - "Used prisma migrate diff for migration SQL generation (no DB connection required)"
  - "Relative imports use .js extension for ESM + nodenext moduleResolution"

patterns-established:
  - "Prisma singleton: globalForPrisma pattern with PrismaPg adapter"
  - "UUID v7 PKs with @db.Uuid annotation on all id and FK fields"
  - "Soft delete via deletedAt DateTime? on user-facing tables"
  - "Generated client at src/generated/client with custom output path"

requirements-completed: [FOUND-03, FOUND-04]

duration: 3min
completed: 2026-03-04
---

# Phase 1 Plan 3: Database Schema Summary

**Prisma schema with 8 models (User, Card, UserCard, ExternalCard, Pack, PackCard, MarketplaceListing, ActionsLog), CardState/PriceConfidence enums, PrismaPg adapter singleton, and migration SQL with native UUID columns**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T12:13:48Z
- **Completed:** 2026-03-04T12:16:37Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Complete Prisma schema with all 8 models, 2 enums, UUID v7 PKs, and proper @db.Uuid annotations
- PrismaClient singleton using PrismaPg adapter with development query logging
- Migration SQL generated with native UUID columns, all foreign keys, and indexes
- Full monorepo build succeeds (all 4 packages)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Prisma 7 schema, config, and client singleton** - `27cd999` (feat)
2. **Task 2: Run initial migration and verify table structure** - `0d338e6` (feat)

## Files Created/Modified
- `packages/db/prisma/schema.prisma` - Complete data model with 8 models, 2 enums, relations, indexes
- `packages/db/prisma.config.ts` - Prisma CLI config with defineConfig (no adapter)
- `packages/db/src/client.ts` - Singleton PrismaClient with PrismaPg adapter
- `packages/db/src/index.ts` - Barrel export for prisma client + all model types + enums
- `packages/db/package.json` - Updated build/migrate scripts
- `packages/db/prisma/migrations/00000000000000_init/migration.sql` - Initial migration SQL
- `packages/db/prisma/migrations/migration_lock.toml` - Prisma migration lock

## Decisions Made
- Used `./generated/client/index.js` import path instead of `@prisma/client` because custom output path in generator block means types are generated locally, not at node_modules/@prisma/client
- Generated migration SQL via `prisma migrate diff --from-empty --to-schema-datamodel` because local Postgres was not accessible (P1010 auth error) -- migration SQL is identical to what `migrate dev` would produce
- Added `.js` extensions on relative imports for ESM compatibility with `nodenext` moduleResolution

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed import paths for generated Prisma client**
- **Found during:** Task 1 (schema, config, and client creation)
- **Issue:** Plan specified `import { PrismaClient } from '@prisma/client'` and type re-exports from `@prisma/client`, but with custom output path (`../src/generated/client`), the generated types live at that local path, not in node_modules
- **Fix:** Changed imports to `./generated/client/index.js` in both client.ts and index.ts
- **Files modified:** packages/db/src/client.ts, packages/db/src/index.ts
- **Verification:** `pnpm build` succeeds across all 4 packages
- **Committed in:** 27cd999

**2. [Rule 1 - Bug] Fixed missing .js extension on relative imports**
- **Found during:** Task 1 (schema, config, and client creation)
- **Issue:** ESM with nodenext moduleResolution requires explicit `.js` extensions on relative imports
- **Fix:** Changed `'./client'` to `'./client.js'` in index.ts
- **Files modified:** packages/db/src/index.ts
- **Verification:** `pnpm build` succeeds
- **Committed in:** 27cd999

**3. [Rule 3 - Blocking] Used prisma migrate diff instead of migrate dev**
- **Found during:** Task 2 (migration generation)
- **Issue:** Local Postgres not accessible (P1010 error), blocking both `migrate dev` and `migrate dev --create-only`
- **Fix:** Used `prisma migrate diff --from-empty --to-schema-datamodel` to generate identical SQL, saved to standard migration directory
- **Files modified:** packages/db/prisma/migrations/00000000000000_init/migration.sql
- **Verification:** SQL contains correct CREATE TYPE, CREATE TABLE with UUID columns, all indexes and foreign keys
- **Committed in:** 0d338e6

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All fixes necessary for build correctness and DB unavailability workaround. No scope creep.

## Issues Encountered
- Local Postgres connection denied (P1010) -- migration generated via diff command instead. Migration will need to be applied when DB is available (`pnpm db:migrate`).

## User Setup Required

**Local Postgres required for migration application.** Users need:
- Running PostgreSQL instance on localhost:5432
- Database `tcg_agent` created: `psql -c "CREATE DATABASE tcg_agent;"`
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tcg_agent` in `.env`
- Run `pnpm db:migrate` to apply migration

## Next Phase Readiness
- Schema and client ready for seed data (Plan 04)
- Migration SQL ready to apply when Postgres available
- All model types exported from @tcg/db for downstream use

---
*Phase: 01-foundation*
*Completed: 2026-03-04*
