---
phase: 01-foundation
plan: 01
subsystem: monorepo-scaffold
tags: [monorepo, pnpm, nextjs, nestjs, docker, infrastructure]
dependency-graph:
  requires: []
  provides: [workspace-structure, shared-types, docker-infra, health-endpoint]
  affects: [01-02, 01-03, 01-04]
tech-stack:
  added: [pnpm-workspaces, next-15, nestjs-10, prisma-5, redis-7, postgresql-16, biome, tailwind-v4]
  patterns: [monorepo, workspace-protocol, commonjs-shared-package, bodyparser-false]
key-files:
  created:
    - pnpm-workspace.yaml
    - package.json
    - tsconfig.base.json
    - biome.json
    - .env.example
    - .gitignore
    - apps/web/package.json
    - apps/web/tsconfig.json
    - apps/web/next.config.ts
    - apps/web/app/layout.tsx
    - apps/web/app/page.tsx
    - apps/web/app/globals.css
    - apps/web/middleware.ts
    - apps/api/package.json
    - apps/api/tsconfig.json
    - apps/api/nest-cli.json
    - apps/api/src/main.ts
    - apps/api/src/app.module.ts
    - apps/api/src/app.controller.ts
    - apps/api/src/health/health.controller.ts
    - apps/api/src/health/health.module.ts
    - packages/shared/package.json
    - packages/shared/tsconfig.json
    - packages/shared/src/index.ts
    - packages/shared/src/types/index.ts
    - packages/database/package.json
    - packages/database/tsconfig.json
    - packages/database/prisma/schema.prisma
    - packages/database/src/index.ts
    - infrastructure/docker-compose.yml
    - infrastructure/.env.docker
  modified: []
decisions:
  - Used Next.js 15 (latest stable) instead of 16 (not yet released in npm registry)
  - Mapped PostgreSQL to port 5435 and Redis to port 6380 to avoid conflicts with existing local containers
  - Used CommonJS for packages/shared to ensure NestJS compatibility
  - Set bodyParser false in NestJS for Better Auth compatibility in Plan 03
metrics:
  duration: 13m
  completed: 2026-04-02T07:13Z
---

# Phase 01 Plan 01: Monorepo Scaffold Summary

pnpm monorepo with Next.js 15 frontend, NestJS 10 backend, shared CommonJS types package, Prisma database package, and Docker Compose infrastructure (PostgreSQL 16 + Redis 7 + pgAdmin).

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Create monorepo structure with pnpm workspaces and both apps | 99a41f1 | DONE |
| 2 | Create Docker Compose infrastructure and verify full dev environment | 6c8530b | DONE |

## What Was Built

### Task 1: Monorepo Structure
- Root pnpm workspace with `apps/*` and `packages/*`
- **apps/web**: Next.js 15 with Turbopack, Plus Jakarta Sans + Inter fonts, teal-600 primary color via Tailwind v4 CSS theme
- **apps/api**: NestJS 10 with `bodyParser: false`, helmet security headers, ValidationPipe with whitelist+transform, health endpoint at `/api/health`
- **packages/shared**: CommonJS TypeScript package with UserRole enum (OWNER, ADMIN, MANAGER, ATTENDANT) and placeholder interfaces
- **packages/database**: Prisma 5 with PostgreSQL datasource and placeholder Clinic model
- Cross-package imports verified: both apps successfully typecheck importing from `@cliniq/shared`

### Task 2: Docker Infrastructure
- PostgreSQL 16 Alpine on port 5435 with health check
- Redis 7 Alpine on port 6380 with AOF persistence and health check
- pgAdmin on port 5050 for dev database inspection
- All 3 services running and healthy

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Port conflicts with existing Docker containers**
- **Found during:** Task 2
- **Issue:** Ports 5432 (PostgreSQL) and 6379 (Redis) already occupied by other project containers (apilabs-postgres, apilabs-redis)
- **Fix:** Mapped CliniqAI PostgreSQL to port 5435 and Redis to port 6380. Updated .env.example accordingly.
- **Files modified:** infrastructure/docker-compose.yml, .env.example
- **Commit:** 6c8530b

**2. [Rule 3 - Blocking] pnpm build scripts blocked by approval requirement**
- **Found during:** Task 1
- **Issue:** pnpm 10.x requires explicit approval for package build scripts (@biomejs/biome, @prisma/client, etc.)
- **Fix:** Added `onlyBuiltDependencies` list to pnpm-workspace.yaml
- **Files modified:** pnpm-workspace.yaml
- **Commit:** 99a41f1

## Verification Results

- `pnpm install` -- PASS (all workspace packages linked)
- `pnpm --filter @cliniq/shared build` -- PASS (dist/ output with CJS)
- `pnpm --filter @cliniq/api typecheck` -- PASS
- `pnpm --filter @cliniq/web typecheck` -- PASS
- `docker compose ps` -- PASS (3/3 services healthy)
