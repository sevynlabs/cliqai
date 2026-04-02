---
phase: 01-foundation
plan: 04
subsystem: frontend-auth-flow
tags: [better-auth-client, react-hook-form, zod, next-middleware, dashboard-shell, tailwind-v4]
dependency-graph:
  requires: [01-01, 01-03]
  provides: [auth-pages, protected-dashboard, middleware-route-guard, api-client]
  affects: [02-01, 04-01]
tech-stack:
  added: [better-auth/react, react-hook-form, "@hookform/resolvers", "@tailwindcss/postcss"]
  patterns: [cookie-based-session-check-middleware, auth-client-hooks, typed-api-fetch-wrapper, route-group-layouts]
key-files:
  created:
    - apps/web/lib/auth-client.ts
    - apps/web/lib/api.ts
    - apps/web/app/(auth)/layout.tsx
    - apps/web/app/(auth)/login/page.tsx
    - apps/web/app/(auth)/signup/page.tsx
    - apps/web/app/(auth)/forgot-password/page.tsx
    - apps/web/components/auth/login-form.tsx
    - apps/web/components/auth/signup-form.tsx
    - apps/web/components/auth/forgot-password-form.tsx
    - apps/web/app/(dashboard)/layout.tsx
    - apps/web/app/(dashboard)/page.tsx
    - apps/web/postcss.config.mjs
  modified:
    - apps/web/middleware.ts
    - apps/web/app/page.tsx
    - apps/web/package.json
    - apps/web/tsconfig.json
decisions:
  - Used direct fetch to /api/auth/forget-password instead of client method (Better Auth v1.5 client exposes resetPassword for token-based reset, not the email-sending step)
  - Disabled declaration/declarationMap in web tsconfig to fix Better Auth TS2742 type portability errors (Next.js apps do not emit declarations)
  - Added PostCSS config with @tailwindcss/postcss for Tailwind CSS v4 (was missing from Plan 01-01 scaffold)
  - Dashboard layout is client-side rendered with useSession hook for session check (server-side session check deferred to Phase 4 optimization)
metrics:
  duration: 10m
  completed: 2026-04-02T14:48Z
---

# Phase 01 Plan 04: Frontend Auth Pages, Dashboard Shell, and Middleware Summary

Next.js auth flow with Better Auth client hooks, react-hook-form + Zod validation, signup-then-create-clinic flow, cookie-based middleware route protection, and responsive dashboard shell with sidebar.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Auth client, API client, auth pages, and protected dashboard layout | 4595ca9 | DONE |
| 2 | Verify complete Phase 1 auth flow end-to-end | -- | CHECKPOINT (human-verify, skipped) |

## What Was Built

### Auth Client (`apps/web/lib/auth-client.ts`)
- `createAuthClient` from `better-auth/react` with `organizationClient()` plugin
- Exports typed hooks: `useSession`, `signIn`, `signUp`, `signOut`, `useActiveOrganization`
- Base URL from `NEXT_PUBLIC_API_URL` env var (defaults to `http://localhost:3001`)

### API Client (`apps/web/lib/api.ts`)
- Generic typed fetch wrapper: `apiClient.get<T>()`, `.post<T>()`, `.patch<T>()`, `.delete<T>()`
- Includes `credentials: 'include'` for cookie-based auth
- Auto-redirects to `/login` on 401 responses
- Custom `ApiError` class with status code

### Auth Pages
- **Login** (`/login`): Email + password form, react-hook-form + Zod (loginSchema from @cliniq/shared), calls `authClient.signIn.email()`, redirects to `/dashboard`
- **Signup** (`/signup`): Name + email + password + clinic name form, Zod (signupSchema), two-step flow: `authClient.signUp.email()` then `apiClient.post('/api/tenants')`, redirects to `/dashboard`
- **Forgot Password** (`/forgot-password`): Email input, direct fetch to `/api/auth/forget-password`, shows success message with link back to login
- **Auth Layout**: Centered white card on gray-50 background, CliniqAI heading with teal primary color

### Dashboard Shell
- **Layout** (`/dashboard`): Client component with `useSession()` hook, redirects to `/login` if unauthenticated. Responsive sidebar (collapsible on mobile), header with user name and sign-out button
- **Home Page**: Welcome message, 4 placeholder KPI cards (Leads, Agendamentos, Conversao, Tempo de Resposta), user info card

### Middleware (`apps/web/middleware.ts`)
- Checks for `better-auth.session_token` or `__Secure-better-auth.session_token` cookie
- Protected paths: everything except `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/api/*`, `/_next/*`
- Authenticated users visiting auth pages redirect to `/dashboard`
- Unauthenticated users visiting protected pages redirect to `/login` with `callbackUrl` param

### Supporting Changes
- Installed: `better-auth`, `react-hook-form`, `@hookform/resolvers`, `zod`, `tailwindcss`, `@tailwindcss/postcss`, `postcss`
- Added `postcss.config.mjs` for Tailwind CSS v4
- Updated landing page with CLINIQ_ROLES and login/signup CTAs
- Disabled `declaration`/`declarationMap` in web tsconfig

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Better Auth client forgetPassword method does not exist**
- **Found during:** Task 1 typecheck
- **Issue:** `authClient.forgetPassword()` is not a client method in Better Auth v1.5. The client exposes `resetPassword` (for token-based reset), not the email-sending step.
- **Fix:** Used direct `fetch()` to `POST /api/auth/forget-password` endpoint instead
- **Files modified:** apps/web/components/auth/forgot-password-form.tsx
- **Commit:** 4595ca9

**2. [Rule 3 - Blocking] Better Auth TS2742 type portability errors**
- **Found during:** Task 1 typecheck
- **Issue:** `createAuthClient()` return type includes internal Better Auth module paths that TS cannot reference when `declaration: true` is set
- **Fix:** Disabled `declaration` and `declarationMap` in web tsconfig (Next.js apps do not emit declarations)
- **Files modified:** apps/web/tsconfig.json
- **Commit:** 4595ca9

**3. [Rule 3 - Blocking] Tailwind CSS not installed / missing PostCSS config**
- **Found during:** Task 1 build
- **Issue:** `@import "tailwindcss"` in globals.css failed because tailwindcss was not a dependency and no postcss config existed
- **Fix:** Installed `tailwindcss`, `@tailwindcss/postcss`, `postcss` as devDependencies; created `postcss.config.mjs`
- **Files modified:** apps/web/package.json, apps/web/postcss.config.mjs
- **Commit:** 4595ca9

**4. [Rule 1 - Bug] Landing page referenced non-existent UserRole enum**
- **Found during:** Task 1 typecheck
- **Issue:** `page.tsx` imported `UserRole` from @cliniq/shared which doesn't exist (types use `CliniqRole` type + `CLINIQ_ROLES` array)
- **Fix:** Changed to use `CLINIQ_ROLES`, added login/signup navigation links
- **Files modified:** apps/web/app/page.tsx
- **Commit:** 4595ca9

## Verification Results

- `pnpm --filter @cliniq/web typecheck` -- PASS
- `pnpm --filter @cliniq/web build` -- PASS (7 pages generated, middleware compiled at 32.3 kB)

## Self-Check: PASSED

All 13 created files verified present. Commit 4595ca9 verified in git log.
