# Phase 1: Foundation - Research

**Researched:** 2026-04-02
**Domain:** TypeScript monorepo (pnpm workspaces), PostgreSQL RLS multi-tenancy, Better Auth RBAC, LGPD consent schema
**Confidence:** MEDIUM-HIGH (Better Auth and NestJS patterns verified via official docs; Prisma RLS verified via official examples; pnpm workspace patterns verified via community sources)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | TypeScript monorepo: Next.js 16 frontend + NestJS backend + shared types | pnpm workspace.yaml pattern verified; apps/web + apps/api + packages/shared structure confirmed |
| FOUND-02 | PostgreSQL with multi-tenant RLS from migration 0001 | Prisma + set_config pattern verified via atlasgo.io official guide; policy structure confirmed |
| FOUND-03 | Redis for caching, sessions, BullMQ queues, LangGraph checkpointer | BullMQ NestJS module verified via official docs; ioredis connection pattern confirmed |
| FOUND-04 | Docker Compose for local dev environment | Standard pattern; PostgreSQL 16 + Redis 7 + pgadmin in single compose file |
| AUTH-01 | User can sign up and create a clinic (tenant) | Better Auth email/password + organization plugin; clinic creation = org creation |
| AUTH-02 | JWT + refresh tokens, sessions persist across browser sessions | Better Auth session-based with rememberMe; scrypt password hashing |
| AUTH-03 | Password reset via email link | Better Auth sendResetPassword callback; 1h token expiry default |
| AUTH-04 | Clinic owner can invite users with roles | Better Auth organization plugin sendInvitationEmail; owner/admin/member default roles |
| AUTH-05 | RBAC enforces permissions per role | Better Auth organization plugin createAccessControl; custom permissions per resource |
| AUTH-06 | All queries tenant-scoped (no cross-clinic data leakage) | Prisma forTenant extension + PostgreSQL RLS + nestjs-cls for request context propagation |
| LGPD-01 | Consent collected and logged before any personal data processing | consent_records table with timestamp, version, channel; agent checks consent_given before CRM write |
| LGPD-02 | Right to erasure — complete data deletion on request | Soft-delete with deleted_at; hard-delete cron job; pgcrypto key destruction pattern |
| LGPD-03 | Data retention policy with configurable retention periods | clinic_settings.retention_days column; BullMQ cron job evaluates and purges |
| LGPD-04 | PII encrypted at rest (pgcrypto) | pgcrypto extension; bytea columns for phone/name/email; 18-25% query overhead expected |
</phase_requirements>

---

## Summary

Phase 1 establishes every load-bearing structural component the rest of the system sits on. The monorepo uses pnpm workspaces with three packages: `apps/web` (Next.js 16), `apps/api` (NestJS), and `packages/shared` (Zod schemas + TypeScript types). A critical early decision is that **PostgreSQL RLS must be in migration 0001** — it cannot be retrofitted without auditing every query in a mature codebase.

Better Auth with its `organization` plugin handles the full auth/tenant lifecycle: signup → clinic creation (org creation) → member invitations → role-based access. The NestJS community package `@thallesp/nestjs-better-auth` provides a globally-registered AuthGuard. Tenant context flows through requests via `nestjs-cls` (async local storage), which feeds a Prisma client extension that wraps every query with `SET LOCAL app.current_tenant` before execution, letting PostgreSQL RLS enforce isolation at the database layer as a second defense.

LGPD compliance is wired in from the start: a `consent_records` table captures consent timestamp, message version, and channel before any lead data is written; PII columns use pgcrypto for at-rest encryption; a configurable retention policy is modeled in the initial migration. Phase 1 produces a running monorepo where a user can register, create a clinic, log in, and have all subsequent requests automatically scoped to that clinic's data.

**Primary recommendation:** Scaffold pnpm workspace first, then Prisma schema with RLS, then Better Auth integration — in that order. Each step depends on the previous being correct.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pnpm | ^9.x | Monorepo package manager + workspace orchestration | Hard-link node_modules saves disk; `workspace:*` protocol for internal packages; faster than npm/yarn at scale |
| Next.js | 16.2.2 | Frontend dashboard + BFF API routes | App Router + React 19; PPR for data-dense dashboards; official auth library recommendations baked in |
| NestJS | ^10.x | Backend API service + business logic runtime | DI container, Guards for RBAC, class-validator pipes, built-in WebSocket and BullMQ integration patterns |
| PostgreSQL | 16+ | Primary data store | ACID compliance; RLS for multi-tenancy at DB layer; JSONB for AI annotations; pgcrypto for PII |
| Prisma | ^5.x | ORM + migrations + schema source of truth | Type-safe queries; Prisma Client Extensions for RLS tenant scoping; Prisma Studio for dev inspection |
| Redis | 7.x | Cache, session store, BullMQ backing, rate limits | Required for BullMQ; LangGraph checkpointer in Phase 2; session cache |
| BullMQ | ^5.x | Job queue (Redis-backed) | Queue-first webhook processing; Phase 1 sets up queue infrastructure even if no jobs run yet |
| Better Auth | latest | Auth + RBAC + multi-tenant organizations | App Router native; organization plugin maps 1:1 to clinic = tenant model; scrypt hashing |
| TypeScript | ^5.4 | Type safety across entire stack | Enforced by Next.js 16 (min 5.1); shared types via packages/shared eliminate API contract drift |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @thallesp/nestjs-better-auth | latest | NestJS AuthGuard + Session decorator for Better Auth | Bridges Better Auth session validation into NestJS DI/guard system |
| nestjs-cls | ^4.x | Continuation-local storage for request context | Propagates tenantId from middleware through to Prisma extension without prop-drilling |
| ioredis | ^5.x | Redis client used by BullMQ and session store | BullMQ requires ioredis; do NOT use node-redis with BullMQ |
| @nestjs/bullmq | ^10.x | NestJS BullMQ module with DI | Registers Queue and Processor as injectable NestJS providers |
| class-validator | ^0.14.x | DTO validation in NestJS controllers | Validate all API request bodies via ValidationPipe |
| class-transformer | ^0.5.x | DTO object transformation | Pairs with class-validator; strips unknown fields |
| Zod | ^3.x | Schema validation in shared package + Next.js | Shared validation schemas between frontend forms and backend DTOs |
| helmet | ^7.x | HTTP security headers on NestJS | CSP, HSTS, XSS protection from day one |
| nodemailer | ^6.x | Transactional email for Better Auth callbacks | Password reset, invitation emails; configure SMTP or Resend |
| dotenv / @nestjs/config | ^3.x | Environment variable management | Validate env schema on startup via Zod |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Better Auth | Clerk | Clerk is fully managed and faster to prototype — but vendor lock-in, no data residency control (LGPD). Avoid. |
| Better Auth | Auth.js v5 / next-auth v5 | Auth.js v5 works but is Next.js-centric. Better Auth has NestJS adapter and organization plugin out of box. |
| Prisma | Drizzle ORM | Drizzle is faster at runtime and edge-compatible. However, Prisma's Client Extensions for RLS are better documented. Use Drizzle if migrating to edge runtime in v2. |
| nestjs-cls | REQUEST scope providers | REQUEST scope in NestJS creates a new DI container per request — heavy. CLS is lightweight async context. |
| pnpm workspaces | Turborepo + npm | Turborepo adds build caching benefit but adds config complexity. pnpm alone is sufficient for Phase 1. Add Turborepo if build times become a problem. |

**Installation:**
```bash
# Root setup
npm install -g pnpm
pnpm init
# Create pnpm-workspace.yaml (see Architecture Patterns)

# apps/api (NestJS)
pnpm --filter api add @nestjs/core @nestjs/common @nestjs/platform-express @nestjs/config
pnpm --filter api add @nestjs/bullmq bullmq ioredis
pnpm --filter api add @thallesp/nestjs-better-auth better-auth
pnpm --filter api add nestjs-cls prisma @prisma/client
pnpm --filter api add class-validator class-transformer helmet nodemailer
pnpm --filter api add -D @nestjs/cli typescript vitest

# apps/web (Next.js)
pnpm --filter web add next react react-dom better-auth
pnpm --filter web add @tanstack/react-query zod react-hook-form
pnpm --filter web add -D tailwindcss typescript @types/react @types/node

# packages/shared
pnpm --filter shared add zod
pnpm --filter shared add -D typescript
```

---

## Architecture Patterns

### Recommended Project Structure

```
cliniqai/
├── pnpm-workspace.yaml          # Declares apps/* and packages/* as workspace packages
├── package.json                 # Root scripts: dev, build, lint, typecheck
├── .env.example                 # Root env template (DB, Redis, Better Auth secret)
├── apps/
│   ├── api/                     # NestJS backend
│   │   ├── src/
│   │   │   ├── main.ts          # bootstrap() — bodyParser: false for Better Auth
│   │   │   ├── app.module.ts    # Root module: AuthModule, PrismaModule, BullMQ
│   │   │   ├── common/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.module.ts       # Better Auth NestJS module
│   │   │   │   │   └── current-user.decorator.ts
│   │   │   │   ├── tenant/
│   │   │   │   │   ├── tenant.middleware.ts  # Extracts tenantId → ClsService
│   │   │   │   │   └── tenant.guard.ts       # Asserts tenantId is present
│   │   │   │   └── prisma/
│   │   │   │       ├── prisma.module.ts
│   │   │   │       └── prisma.service.ts     # forTenant() extension method
│   │   │   └── modules/
│   │   │       ├── tenants/     # Clinic CRUD, onboarding
│   │   │       ├── users/       # User profile, role management
│   │   │       └── lgpd/        # Consent recording, erasure requests
│   │   └── test/
│   └── web/                     # Next.js 16 dashboard
│       ├── app/
│       │   ├── (auth)/          # /login, /signup, /forgot-password
│       │   │   └── layout.tsx
│       │   └── (dashboard)/     # Protected routes (require active session)
│       │       └── layout.tsx   # Server component checks session
│       ├── lib/
│       │   ├── auth-client.ts   # Better Auth client instance
│       │   └── api.ts           # Typed fetch wrapper to NestJS API
│       └── middleware.ts        # Next.js middleware: session check → redirect
├── packages/
│   ├── shared/                  # Shared Zod schemas + TypeScript types
│   │   ├── src/
│   │   │   ├── schemas/         # auth.schema.ts, clinic.schema.ts
│   │   │   └── types/           # User, Clinic, Role enums
│   │   └── package.json         # name: "@cliniq/shared"
│   └── database/                # Prisma schema + migrations
│       ├── prisma/
│       │   ├── schema.prisma    # Single source of truth for all models
│       │   └── migrations/      # 0001_init.sql contains RLS policies
│       └── package.json         # name: "@cliniq/database"
└── infrastructure/
    ├── docker-compose.yml       # PostgreSQL 16, Redis 7, pgadmin
    └── .env.docker              # Docker-specific overrides
```

### Pattern 1: pnpm Workspace Bootstrap

**What:** Root `pnpm-workspace.yaml` declares all workspace packages. Internal cross-package imports use `workspace:*` protocol. Root `package.json` scripts orchestrate all apps.

**When to use:** At monorepo scaffold time — this is the first file created.

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// Root package.json scripts
{
  "scripts": {
    "dev": "pnpm --parallel run dev",
    "build": "pnpm --filter shared build && pnpm --parallel --filter !shared run build",
    "typecheck": "pnpm --parallel run typecheck",
    "lint": "pnpm --parallel run lint"
  }
}
```

```json
// apps/api/package.json — consuming shared package
{
  "dependencies": {
    "@cliniq/shared": "workspace:*",
    "@cliniq/database": "workspace:*"
  }
}
```

### Pattern 2: PostgreSQL RLS with Prisma Client Extension

**What:** Every table has `clinic_id` (UUID FK to `clinics`). PostgreSQL RLS policy uses `current_setting('app.current_tenant')` to filter rows. Prisma client extension wraps every query in a transaction that calls `SET LOCAL app.current_tenant` first.

**When to use:** Every database query in the application — this is the mandatory data isolation layer.

```sql
-- packages/database/prisma/migrations/0001_init.sql (appended after Prisma generates base DDL)

-- Enable RLS on all tenant-scoped tables
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
-- ... repeat for every table that carries clinic_id

-- RLS policy: row is visible only if clinic_id matches session setting
CREATE POLICY tenant_isolation ON "leads"
  USING ("clinic_id" = current_setting('app.current_tenant', TRUE)::uuid);

CREATE POLICY tenant_isolation ON "users"
  USING ("clinic_id" = current_setting('app.current_tenant', TRUE)::uuid);

-- pgcrypto for PII encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

```typescript
// apps/api/src/common/prisma/prisma.service.ts
// Source: atlasgo.io/guides/orms/prisma/row-level-security

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  // Returns a Prisma client scoped to a specific tenant
  forTenant(tenantId: string) {
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const [, result] = await this.$transaction([
              this.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`,
              query(args),
            ]);
            return result;
          },
        },
      },
    });
  }
}
```

### Pattern 3: Tenant Context via nestjs-cls

**What:** HTTP middleware extracts `tenantId` from the resolved JWT session and stores it in `ClsService`. The `PrismaService.forTenant()` reads from `ClsService` to scope all queries automatically.

**When to use:** Every HTTP request after authentication — this replaces manual `tenantId` prop-passing through service call stacks.

```typescript
// apps/api/src/common/tenant/tenant.middleware.ts
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: Request, res: Response, next: () => void) {
    // Better Auth session has been validated by AuthGuard before this runs
    const tenantId = (req as any).user?.activeOrganizationId;
    if (!tenantId) {
      throw new UnauthorizedException('No active organization (tenant) in session');
    }
    this.cls.set('tenantId', tenantId);
    next();
  }
}
```

```typescript
// apps/api/src/app.module.ts
import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './common/auth/auth.config';
import { TenantMiddleware } from './common/tenant/tenant.middleware';

@Module({
  imports: [
    ClsModule.forRoot({ middleware: { mount: false } }), // Manual mount via TenantMiddleware
    AuthModule.forRoot({ auth }),
    // ... other modules
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
```

### Pattern 4: Better Auth Configuration with Organization Plugin

**What:** Better Auth is initialized once with email/password + organization plugin. The organization plugin maps directly to "clinic" — creating a clinic means creating a Better Auth organization. Roles (owner, admin, manager, attendant) are customized via `createAccessControl`.

**When to use:** Clinic signup, member invitation, role enforcement — all auth flows.

```typescript
// apps/api/src/common/auth/auth.config.ts
// Source: better-auth.com/docs/plugins/organization

import { betterAuth } from 'better-auth';
import { organization } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '../prisma/prisma.service';

// Custom permissions for CliniqAI roles
const ac = createAccessControl({
  clinic: ['manage', 'view'],
  leads: ['create', 'read', 'update', 'delete'],
  conversations: ['read', 'respond', 'manage'],
  settings: ['read', 'write'],
  users: ['invite', 'manage'],
});

const owner = ac.newRole({
  clinic: ['manage', 'view'],
  leads: ['create', 'read', 'update', 'delete'],
  conversations: ['read', 'respond', 'manage'],
  settings: ['read', 'write'],
  users: ['invite', 'manage'],
});

const manager = ac.newRole({
  leads: ['create', 'read', 'update'],
  conversations: ['read', 'respond', 'manage'],
  settings: ['read'],
});

const attendant = ac.newRole({
  conversations: ['read', 'respond'],
  leads: ['read'],
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Enable in production
    sendResetPassword: async ({ user, url }) => {
      // Send email via nodemailer
    },
  },
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        const inviteLink = `${process.env.WEB_URL}/accept-invitation/${data.id}`;
        // Send email via nodemailer
      },
      ac,
      roles: { owner, manager, attendant },
    }),
  ],
});
```

### Pattern 5: NestJS Bootstrap with Better Auth Body Parser Requirement

**What:** Better Auth requires NestJS to disable its built-in body parser so Better Auth can consume raw request bodies directly.

**CRITICAL:** Missing `bodyParser: false` causes all auth routes to return 400 silently.

```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // REQUIRED for Better Auth — must be false
  });

  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

### Pattern 6: LGPD Consent Schema (Migration 0001)

**What:** The `consent_records` table captures every consent event with a verifiable audit trail. The `clinics` table has `retention_days` for configurable data retention. PII fields use pgcrypto encryption.

**When to use:** This schema is part of the initial migration — it cannot be added later without data migration.

```prisma
// packages/database/prisma/schema.prisma (Phase 1 relevant models)

model Clinic {
  id             String   @id @default(uuid())
  name           String
  slug           String   @unique
  timezone       String   @default("America/Sao_Paulo")
  retentionDays  Int      @default(365)     // LGPD-03: configurable retention
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  users          User[]
  consentRecords ConsentRecord[]
}

model User {
  id        String   @id @default(uuid())
  clinicId  String
  email     String
  name      String
  role      UserRole @default(ATTENDANT)
  createdAt DateTime @default(now())

  clinic    Clinic   @relation(fields: [clinicId], references: [id])
}

enum UserRole {
  OWNER
  ADMIN
  MANAGER
  ATTENDANT
}

// LGPD-01: Consent audit log — immutable records
model ConsentRecord {
  id               String   @id @default(uuid())
  clinicId         String
  leadPhone        String   // Encrypted at rest via pgcrypto (see migration SQL)
  consentGiven     Boolean
  consentVersion   String   // Version of privacy policy shown
  consentChannel   String   // "whatsapp", "web", "sms"
  consentMessage   String   // Exact text shown to the lead
  ipAddress        String?
  createdAt        DateTime @default(now())

  clinic           Clinic   @relation(fields: [clinicId], references: [id])

  @@index([clinicId, createdAt])
}

// LGPD-02: Erasure requests tracking
model ErasureRequest {
  id          String   @id @default(uuid())
  clinicId    String
  leadPhone   String
  requestedAt DateTime @default(now())
  processedAt DateTime?
  status      String   @default("pending") // pending | processing | complete
}
```

### Anti-Patterns to Avoid

- **Skipping bodyParser: false in NestJS:** Better Auth silently fails auth requests. Always set `bodyParser: false` in `NestFactory.create()`.
- **RLS in a later migration:** Row-Level Security retrofitted after data is populated requires policy backfill and a full query audit. Do it in migration 0001.
- **Using next-auth v4:** Deprecated, not App Router native, known security issues. Use Better Auth exclusively.
- **Tenant context via request scope providers:** NestJS REQUEST scope creates a new DI container per request — heavy. Use nestjs-cls instead.
- **Missing `TRUE` in `current_setting('app.current_tenant', TRUE)`:** Without the second argument (missing_ok = TRUE), the function throws if the setting is not set (e.g., during migrations or admin queries). Always use the two-argument form.
- **Hardcoding clinic_id in app layer only:** Never rely solely on application-level `WHERE clinic_id = x` — this is error-prone. PostgreSQL RLS is the mandatory second layer.
- **Storing consent as a UI checkbox without a database event:** Consent must be a `consent_records` row with timestamp, version, and message text — this is your legal evidence under LGPD.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth (signup, login, session, refresh) | Custom JWT auth system | Better Auth | Session rotation, scrypt hashing, CSRF protection, token expiry — all edge cases already handled |
| RBAC permission checks | Custom role/permission tables + middleware | Better Auth organization plugin `createAccessControl` | Permissions are composable, versioned, and tested. Custom RBAC inevitably misses edge cases |
| Password hashing | Custom bcrypt wrapper | Better Auth's built-in scrypt (OWASP-recommended) | Hashing parameters, upgrade paths, timing attacks — not your problem |
| Password reset tokens | Custom token generation + expiry | Better Auth `sendResetPassword` callback | Token invalidation, replay protection, 1h expiry default handled |
| Member invitation flow | Custom email → token → accept flow | Better Auth organization plugin invitation system | Invitation expiry, acceptance state machine, multi-invite handling |
| Tenant context propagation | Request-scoped services passed through call stacks | nestjs-cls + Prisma extension | CLS is the standard pattern; avoids N-argument pollution across service methods |
| Multi-tenant DB isolation | Application-level WHERE clause on every query | PostgreSQL RLS + Prisma Client Extension | DB enforces even if app layer has a bug; defense in depth |
| Queue infrastructure | Custom retry/dead-letter logic | BullMQ | At-least-once delivery, exponential backoff, dead-letter queues, concurrency limiting — all built in |

**Key insight:** The auth, multi-tenancy, and queue problems each have rewrite-inducing edge cases (timing attacks, data leakage, message loss). Using proven libraries eliminates an entire class of production incidents.

---

## Common Pitfalls

### Pitfall 1: Better Auth bodyParser Conflict
**What goes wrong:** Auth routes return 400 "Invalid body" errors intermittently or always.
**Why it happens:** NestJS parses the request body before Better Auth's handler can read it.
**How to avoid:** Set `bodyParser: false` in `NestFactory.create()` — first line of configuration. Verify by testing `/api/auth/sign-in` endpoint after any NestJS bootstrap changes.
**Warning signs:** Auth works in isolation but breaks after adding NestJS middleware or global pipes.

### Pitfall 2: RLS Policy Missing `TRUE` Second Argument
**What goes wrong:** Database migrations fail, or queries throw `unrecognized configuration parameter "app.current_tenant"` during admin operations (e.g., Prisma migrations).
**Why it happens:** `current_setting('app.current_tenant')` without `TRUE` throws if the setting is not set in the current session.
**How to avoid:** Always write `current_setting('app.current_tenant', TRUE)::uuid`. The `TRUE` makes the function return NULL instead of throwing when the setting is absent.
**Warning signs:** Works in application context but fails when running `prisma migrate deploy`.

### Pitfall 3: Organization ID vs Clinic ID Confusion
**What goes wrong:** Better Auth creates `organization.id` (UUID). Your business models use `clinic_id`. If these are different UUIDs (or one is stored and the other is not), tenant scoping breaks.
**Why it happens:** Developers create a separate `clinics` table and forget to link it to the Better Auth `organization` record.
**How to avoid:** Use Better Auth's `organization.id` AS the `clinic_id` everywhere. When a user creates a clinic (via Better Auth `createOrganization`), the returned `organization.id` is the `tenantId` for all subsequent data. Store it on the user's session via `activeOrganizationId`.
**Warning signs:** User creates a clinic but subsequent API calls return empty data or 403s.

### Pitfall 4: LGPD Consent After Data Collection
**What goes wrong:** Leads are stored in the CRM before consent is recorded. LGPD Article 7 violation.
**Why it happens:** Consent collection is added as an afterthought. The WhatsApp message handler creates a lead record first, consent second.
**How to avoid:** The lead creation path must check for an existing `consent_records` row with `consent_given = true` BEFORE any data is persisted. This check must be enforced at the service layer, not just the UI.
**Warning signs:** Any `Lead` row in the database with no corresponding `ConsentRecord` row.

### Pitfall 5: pnpm Workspace Shared Package Not Transpiled
**What goes wrong:** `apps/api` imports from `@cliniq/shared` and gets `SyntaxError: Cannot use import statement in a module` at runtime.
**Why it happens:** NestJS expects CommonJS by default. The shared package exports ESM. No transpile step is configured.
**How to avoid:** Configure `packages/shared` to emit both ESM and CJS (`tsconfig.json` with `moduleResolution: bundler` for ESM consumers; add a CJS build for NestJS). Alternatively, use `tsconfig-paths` with `paths` mappings and run the NestJS app via `ts-node` or `@swc/cli` which handles transpilation.
**Warning signs:** Build succeeds but `node dist/main.js` crashes with import errors.

### Pitfall 6: Cross-Tenant Data Exposure via Missing RLS Tables
**What goes wrong:** New tables added in Phase 2+ have no RLS policy. A query inadvertently returns data from another tenant.
**Why it happens:** Developer adds a new Prisma model, runs `prisma migrate dev`, and forgets to add the RLS policy in the migration SQL appendix.
**How to avoid:** Establish a migration template that includes the RLS `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` statements. Add a test that verifies every table with a `clinic_id` column has RLS enabled.
**Warning signs:** `SELECT rls_enabled FROM pg_tables WHERE tablename = 'your_table'` returns `f`.

---

## Code Examples

### Docker Compose for Local Dev

```yaml
# infrastructure/docker-compose.yml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: cliniqai_dev
      POSTGRES_USER: cliniqai
      POSTGRES_PASSWORD: cliniqai_dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cliniqai"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  pgadmin:
    image: dpage/pgadmin4:latest
    environment:
      PGADMIN_DEFAULT_EMAIL: dev@cliniqai.com
      PGADMIN_DEFAULT_PASSWORD: dev
    ports:
      - "5050:80"
    depends_on:
      - postgres

volumes:
  postgres_data:
  redis_data:
```

### BullMQ NestJS Module Setup

```typescript
// apps/api/src/app.module.ts
// Source: docs.bullmq.io/guide/nestjs

import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    // Register queues for use in Phase 2
    BullModule.registerQueue({ name: 'whatsapp.inbound' }),
    BullModule.registerQueue({ name: 'notifications' }),
  ],
})
export class AppModule {}
```

### Next.js Auth Client Setup

```typescript
// apps/web/lib/auth-client.ts
// Source: better-auth.com/docs/integrations/nestjs

import { createAuthClient } from 'better-auth/client';
import { organizationClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // Points to NestJS backend
  plugins: [organizationClient()],
});

export type Session = typeof authClient.$Infer.Session;
```

### LGPD Consent Check Before Lead Creation

```typescript
// apps/api/src/modules/leads/leads.service.ts

async createLead(clinicId: string, phone: string, data: CreateLeadDto): Promise<Lead> {
  // LGPD-01: Verify consent exists before any data storage
  const consent = await this.prisma.consentRecord.findFirst({
    where: {
      clinicId,
      leadPhone: phone, // Use hashed phone for lookup
      consentGiven: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!consent) {
    throw new ForbiddenException(
      'LGPD consent required before lead data can be stored'
    );
  }

  return this.prisma.forTenant(clinicId).lead.create({ data: { clinicId, ...data } });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-auth v4 | Better Auth (2024+) | next-auth v4 deprecated ~2024 | Better Auth is App Router native, has organization plugin, avoids known next-auth security CVEs |
| Bull (v3) | BullMQ v5+ | 2022, Bull deprecated | BullMQ supports Redis Cluster, has better TypeScript types, active maintenance |
| TypeORM | Prisma ^5 | Prisma became dominant 2022-2023 | Prisma Client Extensions (for RLS) only available in Prisma v5+. TypeORM lacks equivalent. |
| Pages Router | App Router | Next.js 13+ (stable 14+) | Server Components reduce client bundle; required for Better Auth App Router adapter |
| REQUEST scope in NestJS | nestjs-cls | 2022-2023 | CLS is 10x lighter than per-request DI containers; standard pattern for tenant context |
| bcrypt | scrypt (via Better Auth) | OWASP recommendation 2022+ | scrypt is OWASP's first recommendation when Argon2 unavailable; better memory-hard properties |

**Deprecated/outdated:**
- `next-auth v4`: Do not use. Has security issues and is not App Router compatible.
- `Bull` (npm: `bull`, not `bullmq`): Deprecated. Does not support Redis Cluster. Use `bullmq` exclusively.
- `passport-local + passport-jwt` strategy for NestJS: Still works but adds boilerplate. Better Auth replaces the entire auth stack.
- `@nestjs/passport` standalone: Redundant when using Better Auth NestJS adapter.

---

## Open Questions

1. **Better Auth `organization.id` as `clinic_id` — schema design confirmed?**
   - What we know: Better Auth organization plugin creates an `organization` table with a UUID `id`. This can serve as the `tenantId` everywhere.
   - What's unclear: Does the Prisma adapter for Better Auth coexist cleanly with a custom `clinics` table, or does it conflict on table naming?
   - Recommendation: During scaffold, test `betterAuth({ database: prismaAdapter(prisma) })` with the organization plugin and inspect what tables are created. Use `organization.id` as FK reference in all custom tables, not a separate `clinics.id`.

2. **pgcrypto encryption key management in development vs production**
   - What we know: pgcrypto encrypts columns at rest using a symmetric key. The key must not live in the database.
   - What's unclear: For Phase 1 MVP, how should encryption keys be managed? Doppler? `.env`?
   - Recommendation: Phase 1 uses an environment variable `PGCRYPTO_KEY` stored in `.env` and injected via Docker Compose. Document that this must move to a secrets manager (AWS Secrets Manager, Doppler) before any real patient data is processed.

3. **NestJS + Better Auth: bodyParser vs raw body for webhooks**
   - What we know: `bodyParser: false` is required for Better Auth. But Evolution API webhooks (Phase 2) also need the raw body for HMAC verification.
   - What's unclear: How to handle routes that need parsed body (API endpoints) vs raw body (webhook endpoints) when global bodyParser is disabled.
   - Recommendation: Implement a selective body parser middleware in Phase 2 that parses JSON for all routes except `/api/webhooks/*` which uses raw buffer. Research this before Phase 2 starts.

---

## Sources

### Primary (HIGH confidence)
- [Better Auth official docs — NestJS integration](https://better-auth.com/docs/integrations/nestjs) — AuthGuard, bodyParser requirement, Session decorator
- [Better Auth official docs — Organization plugin](https://better-auth.com/docs/plugins/organization) — Roles, invitations, createAccessControl, database tables created
- [Better Auth official docs — Email & Password](https://better-auth.com/docs/authentication/email-password) — signup, signin, password reset, scrypt hashing
- [Atlas guides — Prisma Row Level Security](https://atlasgo.io/guides/orms/prisma/row-level-security) — `forTenant()` Prisma extension pattern, `set_config` transaction wrapping
- [pnpm official docs — Workspaces](https://pnpm.io/next/workspaces) — workspace:* protocol, pnpm-workspace.yaml structure
- [BullMQ official docs — NestJS guide](https://docs.bullmq.io/guide/nestjs) — BullModule.forRoot, forRootAsync, registerQueue patterns

### Secondary (MEDIUM confidence)
- [DEV Community — NestJS + Prisma + PostgreSQL RLS multi-tenancy using nestjs-cls](https://dev.to/moofoo/nestjspostgresprisma-multi-tenancy-using-nestjs-prisma-nestjs-cls-and-prisma-client-extensions-ok7) — confirms nestjs-cls + Prisma extension is the community-standard pattern
- [ZenStack blog — Better Auth + multi-tenant](https://zenstack.dev/blog/better-auth) — confirms organization plugin maps to multi-tenant use case
- [OneUptime — Row Level Security PostgreSQL 2026](https://oneuptime.com/blog/post/2026-01-25-row-level-security-postgresql/view) — confirms RLS pattern for SaaS isolation
- [Crunchy Data — Row Level Security for Tenants in Postgres](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres) — policy structure, USING + WITH CHECK clauses

### Tertiary (LOW confidence — flag for validation)
- pgcrypto 18-25% overhead estimate — from Medium article, not officially benchmarked against this stack
- Better Auth `@thallesp/nestjs-better-auth` community package stability — community-maintained, not official; verify activity before committing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Better Auth, pnpm, NestJS, Prisma all verified via official docs and recent sources
- Architecture: HIGH — Prisma RLS extension verified via atlasgo.io official guide; nestjs-cls verified via library docs
- Pitfalls: MEDIUM-HIGH — bodyParser issue verified via Better Auth official docs; other pitfalls from community sources cross-referenced with official docs
- LGPD schema: MEDIUM — LGPD lei 13.709/2018 is public law (HIGH); schema design patterns are derived (MEDIUM)

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable libraries; Better Auth is actively developed, verify organization plugin API on install)
