---
phase: 01-foundation
plan: 02
subsystem: database-rls-lgpd
tags: [postgresql, rls, pgcrypto, prisma, redis, bullmq, lgpd, multi-tenant]
dependency-graph:
  requires: [01-01]
  provides: [rls-policies, tenant-scoped-prisma, pgcrypto-encryption, lgpd-consent-api, redis-connection, bullmq-queues]
  affects: [01-03, 01-04, 02-01, 02-02]
tech-stack:
  added: [nestjs-cls, ioredis, bullmq, nestjs-bullmq, class-validator, class-transformer]
  patterns: [prisma-forTenant-extension, rls-tenant-isolation, cls-context-propagation, pgcrypto-pii-encryption]
key-files:
  created:
    - packages/database/prisma/schema.prisma
    - packages/database/prisma/migrations/20260402071553_init/migration.sql
    - packages/database/prisma/seed.ts
    - packages/database/src/crypto.ts
    - packages/shared/src/types/lgpd.ts
    - packages/shared/src/schemas/consent.schema.ts
    - apps/api/src/common/prisma/prisma.module.ts
    - apps/api/src/common/prisma/prisma.service.ts
    - apps/api/src/common/tenant/tenant.middleware.ts
    - apps/api/src/common/tenant/tenant.guard.ts
    - apps/api/src/common/tenant/public.decorator.ts
    - apps/api/src/common/redis/redis.module.ts
    - apps/api/src/common/redis/redis.service.ts
    - apps/api/src/common/queue/queue.module.ts
    - apps/api/src/modules/lgpd/lgpd.module.ts
    - apps/api/src/modules/lgpd/lgpd.service.ts
    - apps/api/src/modules/lgpd/lgpd.controller.ts
    - apps/api/src/modules/lgpd/dto/record-consent.dto.ts
    - apps/api/src/modules/lgpd/dto/erasure-request.dto.ts
  modified:
    - packages/database/src/index.ts
    - packages/shared/src/index.ts
    - packages/shared/src/types/index.ts
    - apps/api/src/app.module.ts
    - apps/api/src/app.controller.ts
    - apps/api/src/health/health.controller.ts
decisions:
  - Used PrismaLike interface in crypto.ts to accept both PrismaClient and PrismaService without type conflicts
  - Used `as any` cast on forTenant() return for model access since Prisma $extends loses model type info
  - Added @Public() decorator pattern for exempting health/root endpoints from TenantGuard
  - Changed health endpoint path from /health to /api/health to match API prefix convention
metrics:
  duration: 8m
  completed: 2026-04-02T07:23Z
---

# Phase 01 Plan 02: Database Schema, RLS, and LGPD Compliance Summary

PostgreSQL multi-tenant RLS with pgcrypto PII encryption, Prisma forTenant() extension via CLS context propagation, Redis/BullMQ infrastructure, and LGPD consent/erasure API endpoints.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Prisma schema with RLS policies, pgcrypto PII encryption helpers, and LGPD models | 4a044a4 | DONE |
| 2 | Prisma tenant service, CLS middleware, Redis/BullMQ, and LGPD endpoints | 5c79e05 | DONE |

## What Was Built

### Task 1: Prisma Schema + Migration + Shared Types

- **Full Prisma schema**: Clinic (uuid, name, slug, timezone, retentionDays), User (with clinicId FK and unique [clinicId, email]), ConsentRecord (encrypted leadPhone, consentGiven, version, channel, message), ErasureRequest (encrypted leadPhone, status workflow)
- **Migration 20260402071553_init**: Creates all tables, enables pgcrypto extension, creates encrypt_pii/decrypt_pii SQL functions, enables RLS on users/consent_records/erasure_requests, creates tenant_isolation policies using `current_setting('app.current_tenant', TRUE)::uuid`
- **crypto.ts**: TypeScript helpers wrapping pgp_sym_encrypt/decrypt via $queryRawUnsafe using PGCRYPTO_KEY env var
- **Shared LGPD types**: ConsentChannel, ErasureStatus, RecordConsentInput, ErasureRequestInput
- **Zod schemas**: recordConsentSchema, erasureRequestSchema for input validation
- **Seed file**: Demo clinic + admin user for development

### Task 2: Tenant Infrastructure + LGPD API

- **PrismaService**: Extends PrismaClient with forTenant(tenantId) that wraps every query in a transaction calling `SET LOCAL app.current_tenant` via set_config
- **TenantMiddleware**: Reads x-tenant-id header (Plan 03 switches to Better Auth session), stores in ClsService
- **TenantGuard**: Global APP_GUARD that enforces tenantId presence, respects @Public() decorator
- **RedisModule**: Global ioredis connection from REDIS_URL env var
- **QueueModule**: BullMQ with whatsapp.inbound and notifications queues registered
- **LgpdModule**: POST /api/lgpd/consent (record consent with encrypted phone), GET /api/lgpd/consent/:phone (check consent), POST /api/lgpd/erasure (create erasure request), processErasure() service method for status workflow

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @prisma/client not found in API package**
- **Found during:** Task 2 typecheck
- **Issue:** PrismaService imports from @prisma/client but it wasn't in API's dependencies
- **Fix:** Added @prisma/client as dependency to apps/api
- **Files modified:** apps/api/package.json

**2. [Rule 1 - Bug] PrismaService type incompatible with crypto helper PrismaClient parameter**
- **Found during:** Task 2 typecheck
- **Issue:** encryptPii/decryptPii required PrismaClient but PrismaService (which extends it) wasn't assignable due to TypeScript structural typing with private members
- **Fix:** Created PrismaLike interface in crypto.ts that only requires $queryRawUnsafe, making it compatible with any Prisma-like client
- **Files modified:** packages/database/src/crypto.ts

**3. [Rule 1 - Bug] DTO properties missing definite assignment assertions**
- **Found during:** Task 2 typecheck
- **Issue:** class-validator decorated DTO properties need `!:` since they're populated by NestJS pipes, not constructors
- **Fix:** Added `!` definite assignment assertions to all DTO properties
- **Files modified:** apps/api/src/modules/lgpd/dto/record-consent.dto.ts, erasure-request.dto.ts

**4. [Rule 3 - Blocking] @types/node missing in database package**
- **Found during:** Task 1 typecheck
- **Issue:** crypto.ts uses process.env which requires @types/node
- **Fix:** Added @types/node as dev dependency to packages/database
- **Files modified:** packages/database/package.json

## Verification Results

- `prisma migrate deploy` -- PASS (migration 20260402071553_init applied)
- `prisma generate` -- PASS (client generated)
- `pnpm --filter @cliniq/shared build` -- PASS
- `pnpm --filter @cliniq/database typecheck` -- PASS
- `pnpm --filter @cliniq/database build` -- PASS
- `pnpm --filter @cliniq/api typecheck` -- PASS
- `pnpm --filter @cliniq/api build` -- PASS
- RLS enabled on users, consent_records, erasure_requests -- PASS (verified via pg_class)
- encrypt_pii/decrypt_pii roundtrip -- PASS (verified via SQL query)
- Clinic.retention_days column exists -- PASS (verified via information_schema)
