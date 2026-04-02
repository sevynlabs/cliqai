---
phase: 01-foundation
plan: 03
subsystem: auth-rbac-tenants
tags: [better-auth, rbac, organization, multi-tenant, nestjs, prisma]
dependency-graph:
  requires: [01-01, 01-02]
  provides: [auth-routes, rbac-guards, tenant-session-middleware, clinic-endpoints, user-invitation]
  affects: [01-04, 02-01, 02-02]
tech-stack:
  added: [better-auth, "@thallesp/nestjs-better-auth"]
  patterns: [better-auth-organization-plugin, org-roles-decorator, session-based-tenant-middleware, access-control-rbac]
key-files:
  created:
    - apps/api/src/common/auth/auth.config.ts
    - apps/api/src/common/auth/auth.module.ts
    - apps/api/src/common/auth/roles.ts
    - apps/api/src/common/auth/rbac.guard.ts
    - apps/api/src/common/auth/current-user.decorator.ts
    - apps/api/src/modules/tenants/tenants.module.ts
    - apps/api/src/modules/tenants/tenants.service.ts
    - apps/api/src/modules/tenants/tenants.controller.ts
    - apps/api/src/modules/tenants/dto/create-clinic.dto.ts
    - apps/api/src/modules/users/users.module.ts
    - apps/api/src/modules/users/users.service.ts
    - apps/api/src/modules/users/users.controller.ts
    - apps/api/src/modules/users/dto/invite-user.dto.ts
    - packages/shared/src/types/auth.ts
    - packages/shared/src/schemas/auth.schema.ts
    - packages/database/prisma/migrations/20260402140158_add_better_auth_tables/migration.sql
  modified:
    - packages/database/prisma/schema.prisma
    - packages/database/prisma/seed.ts
    - packages/shared/src/index.ts
    - packages/shared/src/types/index.ts
    - apps/api/src/app.module.ts
    - apps/api/src/common/tenant/tenant.middleware.ts
    - apps/api/src/modules/lgpd/lgpd.service.ts
decisions:
  - Used Better Auth organization.id as tenantId (no separate Clinic table; ClinicSettings extends Organization for business-specific fields)
  - Replaced Plan 02 User/Clinic models with Better Auth managed tables (user, session, account, organization, member, invitation)
  - Used @thallesp/nestjs-better-auth for NestJS integration (provides AuthGuard, @Session, @OrgRoles, AuthService)
  - RLS policies use TEXT comparison (not UUID cast) since Better Auth uses TEXT IDs
  - Created custom @MinRole() decorator + RbacGuard for role hierarchy checks alongside @OrgRoles for direct role matching
metrics:
  duration: 7m
  completed: 2026-04-02T14:10Z
---

# Phase 01 Plan 03: Better Auth, RBAC Guards, and Tenant Management Summary

Better Auth with organization plugin providing auth routes at /api/auth/*, RBAC via @OrgRoles and @MinRole decorators, tenant middleware reading activeOrganizationId from session, and clinic/user management endpoints.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Better Auth config, RBAC guards, and tenant middleware integration | 3ee8f92 | DONE |
| 2 | Clinic and user management endpoints | b647e04 | DONE |

## What Was Built

### Task 1: Better Auth + RBAC + Tenant Middleware

- **Better Auth config** (`auth.config.ts`): betterAuth() with Prisma adapter, emailAndPassword enabled, organization plugin with createAccessControl defining 5 resources (clinic, leads, conversations, settings, users) and 4 roles (owner, admin, manager, attendant) with specific permission sets
- **Prisma schema migration**: Replaced Plan 02 Clinic/User models with Better Auth tables (user, session, account, verification, organization, member, invitation) + ClinicSettings extension table. RLS policies on tenant-scoped tables using TEXT comparison
- **AuthModule**: Registers @thallesp/nestjs-better-auth globally, mounts auth routes at /api/auth/*, provides global AuthGuard
- **RBAC guard** (`rbac.guard.ts`): Custom @MinRole() decorator with role hierarchy (owner > admin > manager > attendant). Works alongside @OrgRoles from the library
- **Roles definition** (`roles.ts`): CLINIQ_ROLES array, ROLE_HIERARCHY map, hasMinRole() utility
- **CurrentUser decorator**: createParamDecorator extracting AuthUser with id, email, name, image, activeOrganizationId from session
- **TenantMiddleware upgrade**: Now calls auth.api.getSession() with request headers to resolve session, extracts activeOrganizationId into CLS context. No more x-tenant-id header
- **Shared types**: CliniqRole, LoginInput, SignupInput, InviteUserInput, AuthUserProfile, PermissionResource, PermissionAction
- **Shared schemas**: loginSchema, signupSchema, inviteUserSchema (Zod)
- **LGPD service updated**: clinicId references changed to organizationId throughout

### Task 2: Clinic + User Management Endpoints

- **TenantsService**: createClinic() uses auth.api.createOrganization() + creates ClinicSettings + sets active org; getCurrentClinic() returns org with settings
- **TenantsController**: POST /api/tenants (create clinic), GET /api/tenants/current (get current clinic)
- **UsersService**: inviteUser() via auth.api.createInvitation(), listMembers() with Prisma query, updateRole() via auth.api.updateMemberRole()
- **UsersController**: POST /api/users/invite (@OrgRoles owner/admin), GET /api/users (list members), PATCH /api/users/:id/role (@OrgRoles owner)
- **AppModule**: Updated with TenantsModule and UsersModule imports

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] sendInvitationEmail callback type mismatch**
- **Found during:** Task 1 typecheck
- **Issue:** Used `data.organizationId` but Better Auth passes `data.organization.id` (nested object)
- **Fix:** Changed to `data.organization.id`
- **Files modified:** apps/api/src/common/auth/auth.config.ts
- **Commit:** 3ee8f92

**2. [Rule 1 - Bug] Duplicate type exports between types/auth.ts and schemas/auth.schema.ts**
- **Found during:** Task 1 shared build
- **Issue:** Both files exported LoginInput, SignupInput, InviteUserInput causing TS2308
- **Fix:** Removed type exports from schema file, kept canonical types in types/auth.ts
- **Files modified:** packages/shared/src/schemas/auth.schema.ts
- **Commit:** 3ee8f92

**3. [Rule 3 - Blocking] RLS policies blocked schema migration**
- **Found during:** Task 1 migration
- **Issue:** Existing RLS policies on consent_records/erasure_requests depended on clinic_id column being dropped
- **Fix:** Added DROP POLICY + DISABLE ROW LEVEL SECURITY before column changes, then re-enabled with new organization_id-based policies
- **Files modified:** packages/database/prisma/migrations/20260402140158_add_better_auth_tables/migration.sql
- **Commit:** 3ee8f92

## Verification Results

- `prisma migrate deploy` -- PASS (2 migrations applied)
- `prisma generate` -- PASS (client generated)
- `pnpm --filter @cliniq/shared build` -- PASS
- `pnpm --filter @cliniq/api typecheck` -- PASS
- `pnpm --filter @cliniq/api build` -- PASS

## Self-Check: PASSED

All 15 created files verified present. Commits 3ee8f92 and b647e04 verified in git log.
