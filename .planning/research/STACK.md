# Stack Research

**Domain:** AI-powered clinic management SaaS with WhatsApp SDR agent
**Project:** CliniqAI
**Researched:** 2026-04-02
**Confidence:** MEDIUM (Next.js verified HIGH via official docs; backend/AI libs at LOW-MEDIUM due to restricted fetch access)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.2 | Frontend dashboard + API gateway | App Router + React 19, Turbopack default, PPR for data-dense dashboards, Server Components reduce bundle size. Verified from official docs March 2026. |
| NestJS | ^10.x | Backend API service + AI agent runtime | Dependency injection, module system, Guards for RBAC, built-in support for WebSockets and microservices. TypeScript-first. Aligns with project architecture decision. |
| PostgreSQL | 16+ | Primary data store (CRM, leads, tenants, scheduling) | ACID compliance required for appointment booking. Row-Level Security enables multi-tenancy. JSONB for flexible AI annotations on lead cards. |
| Redis | 7.x | Cache, session store, pub/sub, BullMQ backing | Message broker for WhatsApp queue, session caching, real-time pub/sub for dashboard updates, LangGraph checkpoint storage. |
| LangGraph JS | ^0.2.x | AI agent orchestration (SDR state machine) | StateGraph with persistent checkpointing maps 1:1 to SDR conversation flow (qualify → propose → close → follow-up). Human-in-the-loop support built in. |
| Evolution API | v2.x | WhatsApp integration (multi-instance) | REST+WebSocket abstraction over Baileys, supports multi-instance (one per clinic), QR code connect, reconnection handling, webhook delivery. Purpose-built for this use case. |
| TypeScript | 5.x | Type safety across entire stack | Enforced by Next.js 16 (minimum v5.1.0 per official docs). Shared types between frontend and backend via monorepo. |

### Supporting Libraries

#### Frontend (Next.js)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | latest | Dashboard component primitives | All UI: Kanban board, data tables, modals, command palette. Copy-paste components, not a dep. |
| Tailwind CSS | v4.x | Utility-first styling | Bundled with Next.js 16 `create-next-app` defaults. Design system with `teal-600` (#0D9488) primary. |
| Recharts | ^2.x | Data visualization | Conversion funnel, lead volume over time, agent performance KPIs on dashboard. |
| TanStack Query | ^5.x | Client-side data fetching/caching | SWR-style cache for dashboard data. Optimistic updates for Kanban drag-and-drop. |
| TanStack Table | ^8.x | Advanced data tables | Lead pipeline table with sorting, filtering, pagination. |
| react-hook-form | ^7.x | Form management | Lead creation, settings, clinic onboarding forms. Zod integration for validation. |
| Zod | ^3.x | Schema validation | Validate both client forms and server API responses. Shared schemas between frontend/backend. |
| Better Auth | latest | Authentication | Recommended by Next.js 16 official docs. Supports RBAC, multi-tenant sessions, App Router compatible. |
| jose | ^5.x | JWT session management | Edge Runtime compatible (required for Next.js Proxy). Recommended by Next.js official docs. |
| Socket.IO client | ^4.x | Real-time dashboard updates | Connect to NestJS WebSocket gateway for live conversation feed and agent status. |
| next-intl | ^3.x | Internationalization | PT-BR primary language. Structured message catalog. Not required for MVP but valuable early. |

#### Backend (NestJS)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Prisma | ^5.x | ORM + migrations | Type-safe DB access, migration management, Prisma Studio for dev inspection. Alternative to Drizzle; Prisma has stronger NestJS ecosystem. |
| BullMQ | ^5.x | Job queues (Redis-backed) | WhatsApp message send queue with retry, dead-letter, rate limiting. Follow-up sequence scheduler. |
| Socket.IO server | ^4.x | WebSocket gateway | Real-time events to dashboard (new message, lead status change, agent state). |
| @nestjs/schedule | ^4.x | Cron jobs | Scheduled follow-up sequences, no-show recovery reminders, daily analytics aggregation. |
| googleapis | ^140.x | Google Calendar integration | Create/read/update/delete appointments, check availability, multi-calendar support. |
| nodemailer | ^6.x | Email notifications | Appointment confirmations, follow-up emails. |
| @anthropic-ai/sdk | ^0.20.x | Claude API client | LLM for SDR agent responses. Can swap with openai SDK if model changes. |
| @langchain/langgraph | ^0.2.x | SDR agent state machine | StateGraph for BANT qualification flow with persistent checkpoints in Redis. |
| @langchain/core | ^0.3.x | LangChain primitives | Message types, tool definitions, prompt templates. |
| class-validator | ^0.14.x | NestJS DTO validation | Validate all incoming API requests. Pairs with class-transformer. |
| class-transformer | ^0.5.x | Object serialization | Transform plain objects to typed DTOs. |
| passport + passport-jwt | ^0.6.x | NestJS auth guards | JWT validation on protected routes. Works with Better Auth tokens. |
| helmet | ^7.x | HTTP security headers | Content-Security-Policy, HSTS, XSS protection on NestJS server. |
| axios | ^1.x | HTTP client | Evolution API calls from NestJS. Prefer over fetch for retry interceptors. |
| ioredis | ^5.x | Redis client | BullMQ, pub/sub, LangGraph checkpointer, session cache. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm workspaces | Monorepo package management | Faster than npm, native workspace support. Run `frontend`, `backend`, `shared` packages together. |
| Turbopack | Next.js dev bundler | Default in Next.js 16. ~400% faster dev startup vs Webpack. Do NOT disable. |
| Biome | Linter + formatter | Supported by Next.js 16 `create-next-app`. Faster than ESLint+Prettier combo. Use for backend too. |
| Docker + Docker Compose | Local dev environment | Run PostgreSQL, Redis, Evolution API locally. Single `docker-compose up` for entire infra. |
| Prisma Studio | Database GUI | `npx prisma studio` — visual editor for dev data inspection. No separate tool needed. |
| vitest | Unit + integration tests | Fast, TypeScript-native. Use for both frontend (component tests) and backend (service tests). |
| Playwright | E2E tests | Critical path testing: WhatsApp receive → AI response → CRM update → calendar event. |

---

## Installation

```bash
# Frontend (apps/web)
pnpm add next react react-dom @tanstack/react-query @tanstack/react-table
pnpm add recharts react-hook-form zod better-auth jose socket.io-client
pnpm add -D tailwindcss @types/react @types/node typescript biome

# Backend (apps/api)
pnpm add @nestjs/core @nestjs/common @nestjs/platform-express
pnpm add @nestjs/websockets @nestjs/schedule @nestjs/passport
pnpm add prisma @prisma/client bullmq ioredis socket.io
pnpm add @langchain/langgraph @langchain/core @anthropic-ai/sdk
pnpm add googleapis nodemailer axios helmet passport passport-jwt
pnpm add class-validator class-transformer
pnpm add -D @nestjs/cli @types/node typescript vitest biome

# Shared (packages/shared)
pnpm add zod
pnpm add -D typescript
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 16 App Router | Remix | If team is uncomfortable with React Server Components and prefers loader/action model. Not recommended here — Next.js has stronger ecosystem for dashboards. |
| NestJS | Fastify (standalone) | If team wants minimal framework overhead. NestJS wins here for DI, guards, decorators — maps well to the complex auth/multi-tenant model. |
| Prisma | Drizzle ORM | If raw SQL performance is critical at scale. Drizzle is faster but less mature tooling. Use Drizzle if migrating to edge runtime later. |
| PostgreSQL | Supabase | If team wants managed Postgres + realtime + auth in one service. Supabase is valid but adds vendor lock-in. Build custom for LGPD control. |
| BullMQ | Temporal | If workflow complexity grows significantly (saga patterns, durable execution). BullMQ is simpler for current scope. |
| Better Auth | Clerk | If team wants fully managed auth with no self-hosting. Clerk has RBAC but vendor lock-in. Use for MVP speed, migrate later if needed. |
| LangGraph JS | Mastra / Vercel AI SDK agents | LangGraph is explicitly referenced in PROJECT.md. Vercel AI SDK is good for simple chains but lacks state machine persistence needed for SDR flow. |
| Evolution API | Twilio WhatsApp API | Twilio is more expensive ($0.005+/msg) and requires WhatsApp Business API approval. Evolution API via Baileys works with personal numbers — critical for Brazilian SMB clinics. |
| Redis + BullMQ | RabbitMQ | RabbitMQ adds operational complexity. Redis already in stack for cache/sessions. BullMQ is purpose-built for Node.js job queues. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Baileys directly | Raw WebSocket connection to WhatsApp; unstable, no multi-instance management, requires custom reconnection logic | Evolution API v2 which wraps Baileys with REST + webhooks + multi-instance |
| tRPC | Adds type-safe RPC but couples frontend to backend. Bad for multi-client architecture (API consumed by future mobile app, webhooks, etc.) | REST with shared Zod schemas for end-to-end type safety |
| Vercel deployment | Next.js 16 runs fine on Vercel but LGPD requires data residency in Brazil. Vercel has no BR region. | Self-host on fly.io (São Paulo region) or AWS São Paulo (sa-east-1) |
| MongoDB | Flexible documents seem attractive for lead data but lose relational integrity for appointments ↔ leads ↔ calendars | PostgreSQL with JSONB for flexible AI annotation fields |
| Supabase Realtime | Adds another service. Real-time already handled by Redis pub/sub → Socket.IO | NestJS WebSocket gateway + Redis pub/sub |
| next-auth v4 | Deprecated. next-auth v4 has known security issues and is not App Router-native | Better Auth or Auth.js v5 (nextauth v5) — both explicitly recommended by Next.js 16 official docs |
| Express.js | Lacks the structure needed for multi-tenant RBAC guards, interceptors, and dependency injection | NestJS which provides these patterns out of the box |
| Bull (v3) | Deprecated in favor of BullMQ. Bull does not support Redis Clusters | BullMQ ^5.x which is the current maintained version |
| Pages Router | Legacy Next.js routing model. No React Server Components, no Partial Prerendering | App Router exclusively — Next.js 16 defaults to App Router |

---

## Stack Patterns by Variant

**For real-time dashboard updates (conversation feed, agent status):**
- Use Redis pub/sub on NestJS backend → Socket.IO gateway → Next.js client via socket.io-client
- Do NOT use long-polling or Next.js SSE for this — Socket.IO handles reconnection and scales across NestJS pods via Redis adapter

**For AI agent state persistence between WhatsApp messages:**
- Use LangGraph MemorySaver with Redis backend (not in-memory) so conversation state survives NestJS restarts
- Checkpoint key: `{clinicId}:{whatsappNumber}` for multi-tenant isolation

**For multi-tenant data isolation:**
- PostgreSQL Row-Level Security (RLS) with `tenant_id` on all tables — enforced at DB level, not just app level
- Each clinic gets isolated Evolution API instance (separate WhatsApp connection)

**For LGPD compliance:**
- Store consent timestamp + source in `lead_consents` table before any AI processing
- Soft-delete with `deleted_at` + 30-day hard-delete cron for "right to erasure"
- Encrypt PII fields (phone, name, health data) at rest using PostgreSQL pgcrypto

**For WhatsApp message queue (rate limiting):**
- BullMQ queue with limiter: `{ max: 1, duration: 1000 }` per Evolution API instance
- WhatsApp will ban numbers sending too fast — never send direct from API handler

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js ^16 | React ^19 | Next.js 16 bundles React 19 canary with stable features. Declare react/react-dom in package.json for tooling. |
| Next.js ^16 | Node.js 20.9+ | Minimum Node.js version per official docs (March 2026). Use Node.js 22 LTS in Docker. |
| @langchain/langgraph ^0.2 | @langchain/core ^0.3 | Must use compatible minor versions. Pin both in package.json. |
| Prisma ^5 | PostgreSQL 14+ | Prisma 5 dropped PostgreSQL 12/13 support. Use PostgreSQL 16. |
| BullMQ ^5 | ioredis ^5 | BullMQ requires ioredis >= 5. Do not use node-redis. |
| Socket.IO ^4 (server) | Socket.IO ^4 (client) | Major versions must match. Both at ^4.x. |
| Better Auth latest | Next.js 16 App Router | Better Auth has App Router adapter. Verify compatibility on install. |

---

## Architecture Boundary: Next.js vs NestJS

This is a critical decision point — what lives in Next.js API routes vs NestJS:

**Next.js handles:**
- Dashboard SSR/RSC pages
- Auth flows (login, session cookies via Better Auth)
- Static assets
- Webhook receivers that forward to NestJS (e.g., Evolution API webhooks via Next.js Route Handler → HTTP POST to NestJS)

**NestJS handles:**
- All business logic (CRM, scheduling, notifications)
- LangGraph AI agent execution
- WhatsApp message processing
- BullMQ job processing
- WebSocket gateway for real-time dashboard
- Google Calendar integration

**Why this split:** Next.js is a frontend-first framework. Running LangGraph, BullMQ workers, and WebSocket servers inside Next.js creates deployment constraints (serverless cold starts, no long-running processes). NestJS is purpose-built for long-running Node.js services. The split keeps concerns clean and allows independent scaling.

---

## Sources

- https://nextjs.org/blog — Next.js 16.2 release (March 18, 2026). Version confirmed HIGH confidence.
- https://nextjs.org/docs/app/getting-started/installation — Node.js 20.9+ minimum, React 19, TypeScript 5.1+. HIGH confidence.
- https://nextjs.org/docs/app/building-your-application/authentication — Auth library recommendations (Better Auth, NextAuth v5, Clerk, jose). HIGH confidence.
- https://nextjs.org/docs/app/guides/self-hosting — Docker, nginx, Redis cache handler patterns. HIGH confidence.
- https://nextjs.org/docs/app/getting-started/caching — `use cache` directive, PPR, Cache Components. HIGH confidence.
- NestJS, LangGraph JS, BullMQ, Prisma, Evolution API versions — MEDIUM confidence (based on training data + ecosystem knowledge as of August 2025; WebFetch denied for these sources). **Verify versions on install.**
- Evolution API v2 capabilities — LOW confidence (could not access docs). Project decision already made per PROJECT.md. Verify multi-instance support and webhook format against current docs before implementation.

---

*Stack research for: AI clinic management SaaS (CliniqAI)*
*Researched: 2026-04-02*
