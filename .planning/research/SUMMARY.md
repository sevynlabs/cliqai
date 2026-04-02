# Project Research Summary

**Project:** CliniqAI
**Domain:** AI-powered clinic management SaaS — WhatsApp SDR agent, CRM, scheduling (Brazilian market)
**Researched:** 2026-04-02
**Confidence:** MEDIUM

## Executive Summary

CliniqAI is a multi-tenant B2B SaaS product built for Brazilian aesthetic and medical clinics. Its core differentiator is a WhatsApp-native AI SDR agent that holds real qualifying conversations (using BANT methodology) with inbound leads, books appointments via Google Calendar, and hands off to human receptionists when needed — all surfaced through a real-time CRM dashboard. Existing Brazilian competitors (Clinicorp, iClinic, Doctoralia) offer only template message blasts; none have an AI that actually qualifies leads conversationally. This is the wedge.

The recommended build approach is a TypeScript monorepo: Next.js 16 (App Router) for the dashboard frontend, NestJS as a long-running backend service hosting LangGraph, BullMQ, and a WebSocket gateway, with PostgreSQL (multi-tenant RLS) and Redis (queue, session, agent state) as the data layer. Evolution API provides the WhatsApp transport layer via a REST + webhook abstraction over Baileys. This stack is well-matched to the requirements: LangGraph's persistent state machine handles multi-turn SDR conversations reliably, BullMQ decouples async AI processing from webhook ingestion (preventing timeouts), and Redis-backed checkpointing ensures agent state survives restarts.

The three highest-risk areas are legal/regulatory, data isolation, and WhatsApp infrastructure. LGPD mandates consent before any data collection — this must be the first AI action on every new conversation, with a versioned database record as legal evidence. PostgreSQL Row-Level Security must be enforced on every table from the initial migration, as retrofitting multi-tenant isolation post-launch requires auditing every query in the codebase. WhatsApp number bans are a production-killing risk: rate limiting and inbound-only outreach policy must be implemented before any real clinic traffic, not treated as a future hardening item.

---

## Key Findings

### Recommended Stack

The stack centers on a pnpm monorepo with two deployable applications: `apps/web` (Next.js 16) and `apps/api` (NestJS). A shared `packages/database` package owns the Prisma schema, preventing migration drift. LangGraph JS orchestrates the SDR state machine with a Redis-backed checkpointer — this is a hard architectural requirement, not an optimization; without it, multi-turn conversations break on any restart. Evolution API v2 (self-hosted Docker) manages WhatsApp connections with one named instance per clinic.

**Core technologies:**
- **Next.js 16 (App Router):** Dashboard SSR/RSC + BFF route handlers — PPR and Server Components reduce bundle size for data-dense views. Node.js 22 LTS minimum.
- **NestJS ^10:** Backend API runtime with DI, RBAC guards, and module system — handles all business logic, AI execution, BullMQ workers, and WebSocket gateway. Never run LangGraph or BullMQ inside Next.js API routes.
- **PostgreSQL 16+:** Primary data store with Row-Level Security for multi-tenant isolation and JSONB for AI annotations on lead cards.
- **Redis 7.x:** Serves four roles simultaneously: BullMQ backing, LangGraph checkpointer, real-time pub/sub, and session cache. Do not substitute with a single-purpose alternative.
- **LangGraph JS ^0.2 + @langchain/core ^0.3:** SDR state machine — must pin both versions together. Provides persistent conversation state, conditional routing, and human-in-the-loop support.
- **Evolution API v2:** WhatsApp multi-instance transport — purpose-built for Brazilian SMB use case; avoids Twilio's cost structure and Meta Business API approval friction.
- **BullMQ ^5 + ioredis ^5:** All async message processing goes through BullMQ queues. Webhook processing must be queue-first — synchronous processing causes timeouts and duplicate messages.
- **Better Auth:** Next.js 16 App Router-native auth with RBAC and multi-tenant sessions. Do not use next-auth v4 (deprecated, security issues).

Critical version constraint: `@langchain/langgraph ^0.2` requires `@langchain/core ^0.3` — pin both. Prisma ^5 requires PostgreSQL 14+; use 16. BullMQ ^5 requires ioredis ^5 — do not use `node-redis`.

### Expected Features

The core feature loop is: inbound WhatsApp lead → LGPD consent → AI SDR BANT qualification → Google Calendar booking → confirmation message → CRM pipeline update. Everything else is secondary to validating this loop with real clinics.

**Must have — table stakes (v1):**
- WhatsApp connection via Evolution API + QR code setup UI
- LGPD consent collection on first message (legally mandatory before any data storage)
- Lead auto-creation from inbound WhatsApp with phone-based deduplication
- AI SDR agent with BANT qualification flow (the core differentiator)
- Human takeover kill switch — clinic staff won't trust AI without an escape hatch
- Google Calendar integration + appointment booking
- Appointment confirmation message via WhatsApp
- Kanban CRM pipeline with lead cards
- Basic KPI dashboard (leads, appointments, conversion rate)
- Operating hours enforcement (off-hours messaging is legal and brand risk)
- Multi-user access with at minimum owner/attendant roles
- Mobile-responsive dashboard (clinic owners check metrics on phones)

**Should have — competitive differentiators (v1.x, add after first 3 clinics validate core loop):**
- Appointment reminders (24h/1h before) — validated no-show reduction
- No-show recovery messages
- Follow-up sequences with cool-down rules
- AI lead annotations (post-conversation summarization)
- Configurable AI persona per clinic (name, tone, specialty vocabulary)
- Rate limiting / anti-ban protection — implement before scaling past 5 clinics
- Webhook-in from Meta Lead Ads
- RBAC expansion (admin/manager roles)
- Emergency escalation detection

**Defer to v2+:**
- A/B testing for follow-up variants (needs message volume for significance)
- Multi-clinic management agency view
- Webhook-out to ERPs / payment platforms
- Agent performance analytics (funnel per stage)
- Multi-channel notifications (email/SMS fallback)
- Instagram DM / Facebook Messenger integration
- Native mobile app (PWA covers mobile at MVP)
- Voice AI phone answering

**Anti-features — never build these in v1:**
- Full EMR / electronic medical records (CFM compliance, scope explosion — integrate with iClinic via webhook instead)
- Payment processing / PIX checkout (PCI-DSS, financial licensing — send Asaas/PagSeguro link via WhatsApp)
- Visual chatbot flow builder (support burden, misconfiguration risk)
- AI medical diagnosis or symptom checker (CFM prohibition, legal liability)

### Architecture Approach

The system follows an event-driven architecture with a clear three-layer split: client layer (Next.js dashboard + WhatsApp), service layer (NestJS modules + BullMQ message bus), and data layer (PostgreSQL + Redis + object store). The critical architectural decision is that the webhook handler must enqueue immediately and return 200 in under 500ms — LLM calls take 5–30 seconds, and synchronous processing causes webhook timeouts and duplicate event delivery.

**Major components:**
1. **NestJS API Gateway** — JWT auth, tenant resolution middleware, RBAC guards, request routing. Every request must have `tenantId` resolved before any module processes it.
2. **WhatsApp Service** — Evolution API REST proxy, webhook ingestion to BullMQ, QR code management, per-tenant instance isolation.
3. **AI Agent Service** — LangGraph SDR state machine with Redis checkpointer. Thread ID format: `{tenantId}:{conversationId}`. Nodes: greet → qualify → handle_objection → schedule → confirm → human_handoff.
4. **CRM Service** — Lead lifecycle, Kanban pipeline, timeline events, AI annotations written by agent tools.
5. **Scheduling Service** — Google Calendar OAuth per clinic, availability with TENTATIVE event locks, appointment CRUD.
6. **Notification Service** — BullMQ delayed jobs for reminders, follow-up sequences, no-show recovery. Every outbound message passes through the rate limiter.
7. **Realtime Gateway** — Socket.IO WebSocket gateway broadcasting tenant-namespaced events to dashboard. Driven by other services; owns no data.
8. **Next.js Dashboard** — Real-time conversation view, CRM Kanban, calendar view, KPIs. Connects to NestJS via REST + Socket.IO.

The NestJS backend starts as a monolith with clear module boundaries (`whatsapp/`, `agent/`, `crm/`, `scheduling/`, `notifications/`) that can be extracted to microservices if scale requires, without premature complexity.

### Critical Pitfalls

1. **WhatsApp number bans (CRITICAL — pre-launch):** Sending proactive outbound messages or messaging too fast gets the clinic's WhatsApp number banned by Meta with no appeal. Mitigation: only respond to inbound leads who messaged first; max 1 message/turn; mandatory 3-second delays; implement warm-up for new numbers; keep backup numbers ready. This must be in place before the first production clinic goes live.

2. **LGPD consent too late (CRITICAL — foundation phase):** Storing any lead data before explicit LGPD consent is a legal violation — doubly so for health-intent data (procedure inquiries are sensitive data under Article 11). Consent must be the first AI action, stored as a database event with timestamp, consent message version, and channel. No data persisted until `consent_given = true`.

3. **Multi-tenant data isolation failure (CRITICAL — foundation phase):** A data leak in healthcare is an ANPD-reportable breach with fines up to 2% of revenue. PostgreSQL RLS must be on every table, Redis keys must include `tenantId`, and cross-tenant access tests must be part of the CI suite from day one. Never use a default tenant fallback — missing context must throw.

4. **Synchronous AI processing in webhook handler (CRITICAL — whatsapp phase):** LLM calls take 5–30 seconds. Evolution API expects acknowledgment in under 5 seconds. Synchronous processing causes timeouts, triggering retries and duplicate message delivery. The fix is architectural: BullMQ queue-first processing from day one. This cannot be retrofitted cheaply.

5. **LangGraph agent infinite loops (HIGH — agent phase):** Agents loop on unexpected inputs (voice messages, stickers, "??", emojis only). Build a `fallback_node` that triggers human handoff after 2 consecutive unresolvable inputs, a `max_turns_without_progress` counter in state, and explicit media-type detection before routing to the LLM. These must be in the initial graph topology — changing LangGraph graph structure after the fact is expensive.

6. **Calendar booking race conditions (HIGH — scheduling phase):** Two concurrent agents presenting the same slot results in double-bookings. Fix: immediately create a TENTATIVE calendar event when a slot is presented to a lead (acts as a distributed lock with 5-minute TTL); only convert to CONFIRMED on explicit lead confirmation. Your PostgreSQL `appointments` table — not Google Calendar — is the source of truth for availability.

7. **Human handoff that traps the lead (HIGH — agent + CRM phase):** The AI marks a conversation for handoff but the attendant receives no notification and picks it up hours later. The lead is gone. Handoff and attendant notification are one feature, not two. Build them in the same sprint: instant dual-channel notification to attendant, SLA timer in dashboard, automated lead message with wait time, escalation if not picked up within X minutes.

8. **CFM/CRM medical ethics violations (HIGH — agent guardrails):** LLMs will answer "will this procedure fix my problem?" with medical certainty unless explicitly prevented. Build a pre-response classifier that checks every agent response before sending. Include a phrase blocklist ("vai curar", "garante resultado", "o seu problema é"). Any clinical question must redirect to "Essa pergunta deve ser respondida pelo médico — posso agendar?".

---

## Implications for Roadmap

Based on architecture dependency chains, pitfall phase assignments, and feature priority matrix, the build order is dictated by hard dependencies. The AI agent cannot receive messages without WhatsApp; it cannot book appointments without the scheduling service; the dashboard is only useful when backend modules produce data.

### Phase 1: Foundation — Infrastructure, Auth, and Multi-Tenancy
**Rationale:** Everything else depends on this. RLS and tenant middleware cannot be retrofitted — they must be in the initial schema migration. Auth and RBAC gates every subsequent module. LGPD consent schema must be in the initial migration (no data can exist before consent, so the schema must enforce this from day one).
**Delivers:** PostgreSQL schema with RLS on all tables, Redis + BullMQ setup, Docker Compose for local infra, JWT auth with Better Auth, tenant middleware (throws on missing context), RBAC roles (owner/attendant), LGPD consent data model with versioning.
**Addresses:** Multi-user access, LGPD foundation, multi-tenant isolation
**Avoids:** Multi-tenant isolation failure (Pitfall 6), LGPD consent too late (Pitfall 3)
**Research flag:** Standard patterns — NestJS auth, Prisma multi-tenancy, PostgreSQL RLS are well-documented.

### Phase 2: WhatsApp Integration — Evolution API + Queue-First Ingestion
**Rationale:** The entire SDR stack, notifications, and scheduling are blocked without a healthy WhatsApp connection. BullMQ queue-first architecture must be established here — it cannot be added later without rewriting the webhook handler and processor. Rate limiting is also in this phase (required before any real traffic).
**Delivers:** Evolution API webhook ingestion to BullMQ (`whatsapp.inbound` queue), message deduplication via Redis SET NX on `message_id`, per-tenant instance isolation, QR code connect UI, operating hours enforcement, basic message send capability (no AI yet — echo test), rate limiter middleware for all outbound messages.
**Addresses:** WhatsApp connection setup, operating hours enforcement
**Avoids:** WhatsApp number bans (Pitfall 1), webhook duplicate processing (Pitfall 7), synchronous AI in webhook handler (Pitfall 4)
**Research flag:** Verify current Evolution API v2 webhook payload format and rate limit documentation before implementation — this is LOW confidence from research.

### Phase 3: AI Agent Core — LangGraph SDR + LGPD Consent Flow
**Rationale:** The core product differentiator. LGPD consent must be the first node in the graph — this is legally required and architecturally cleanest to build into the initial graph topology. LangGraph graph structure changes are expensive after the fact, so guardrails (loop detection, max turns, medical ethics classifier, fallback node) must be built in now.
**Delivers:** LangGraph SDR state machine with nodes: consent → greet → qualify (BANT) → handle_objection → schedule → confirm → human_handoff → fallback. Redis checkpointer with thread ID format `{tenantId}:{conversationId}`. Structured state schema (lead name, procedure, bantScore, qualificationStage, humanHandoffRequested). Loop detection (max_turns_without_progress counter). Media-type detection (voice/sticker/location handling). Pre-response medical ethics classifier. Agent persona loaded from `tenant_agent_config` table at runtime.
**Addresses:** AI SDR agent with BANT qualification, LGPD consent on first message, AI persona per clinic
**Avoids:** Agent infinite loops (Pitfall 2), LGPD consent too late (Pitfall 3), context window overflow (Pitfall 10), CFM ethics violations (Pitfall 8), hardcoded persona anti-pattern
**Research flag:** Needs phase research — LangGraph JS Redis checkpointer setup and medical ethics pre-classifier pattern warrant deeper investigation before implementation.

### Phase 4: CRM Service + Human Handoff
**Rationale:** The agent (Phase 3) needs a CRM to write lead data to; it uses CRM tools during qualification. Human handoff is in this phase — it must be built alongside CRM, not after it. A handoff without attendant notification is functionally broken (Pitfall 5).
**Delivers:** Lead auto-creation from WhatsApp (deduplication by phone), Kanban pipeline (stages: Novo → Qualificado → Agendado → Confirmado → Atendido → Perdido), lead card with contact details and AI annotations, conversation timeline, human takeover with dual-channel attendant notification, SLA timer for open handoffs, conversation state mutex (ai_active | human_active), follow-up sequences pause on human takeover.
**Addresses:** Kanban CRM pipeline, lead auto-creation, human takeover kill switch, lead card with history
**Avoids:** Human handoff traps lead (Pitfall 5)
**Research flag:** Standard CRM patterns — NestJS/Prisma CRUD is well-documented. No research needed.

### Phase 5: Scheduling Service — Google Calendar Integration
**Rationale:** Appointment booking is the "money moment" — the conversion event. Cannot be built without Google Calendar OAuth working correctly per clinic. The TENTATIVE lock pattern must be built into the initial booking flow.
**Delivers:** Google Calendar OAuth per clinic (refresh tokens encrypted in PostgreSQL), availability check (freeBusy query with Redis 5-minute slot cache), TENTATIVE event lock on slot presentation, confirmed appointment creation on lead acceptance, appointment CRUD in PostgreSQL as source of truth, Google OAuth token expiry dashboard alert.
**Addresses:** Google Calendar integration + appointment booking, appointment confirmation message
**Avoids:** Calendar booking race conditions (Pitfall 4)
**Research flag:** Verify current Google Calendar freeBusy API limits and TENTATIVE event behavior — standard patterns but worth confirming before implementation.

### Phase 6: Dashboard — Next.js Frontend
**Rationale:** Dashboard is only useful when backend modules produce real data. Building it earlier means building against mock data and rebuilding when the real API arrives. Build after backend modules are validated.
**Delivers:** Real-time conversation view (Socket.IO), Kanban CRM pipeline UI, calendar/appointment view, basic KPI dashboard (leads created, appointments booked, conversion rate, no-shows), WhatsApp connection status + QR code setup UI, multi-user management UI, clinic settings (persona config, operating hours, timezone), mobile-responsive layout, PT-BR localization.
**Addresses:** Basic KPI dashboard, WhatsApp connection UI, multi-user access UI, mobile-responsive dashboard, Brazilian Portuguese UI
**Avoids:** UTC timestamp display (must show Brazil timezone), reminder fatigue UX issues
**Research flag:** shadcn/ui + Next.js 16 App Router patterns are well-documented. No research needed.

### Phase 7: Notifications + Follow-up Sequences
**Rationale:** Requires stable appointments (Phase 5) and WhatsApp send (Phase 2). Notification frequency caps and opt-out tracking must be in the initial design — retrofitting them means auditing all notification paths.
**Delivers:** Appointment confirmation message on booking, 24h and 2h appointment reminders (max 3 messages per appointment lifecycle), no-show recovery message, follow-up sequences with configurable cool-down rules and stop-on-reply, global cooldown (max 1 message/patient/4h window across all notification types), opt-out tracking in database, BullMQ delayed job idempotency guards.
**Addresses:** Appointment reminders, no-show recovery, follow-up sequences
**Avoids:** Reminder fatigue opt-outs (Pitfall 9), follow-up sequences firing during human takeover
**Research flag:** BullMQ delayed job patterns are HIGH confidence. No research needed.

### Phase 8: Advanced Features (v1.x → v2)
**Rationale:** Add after at least 3 clinics are using the core loop and producing conversion data. Features here require data volume to be meaningful or architectural complexity that shouldn't block launch.
**Delivers:** AI lead scoring and annotations (post-conversation summarization), webhook-in from Meta Lead Ads and RD Station, RBAC expansion (admin/manager), rate limiting UI (visible anti-ban status), emergency escalation detection, per-patient notification preferences.
**Addresses:** Webhook-in from ad platforms, RBAC expansion, AI annotations, emergency escalation
**Research flag:** Meta Lead Ads webhook format and Evolution API anti-ban mechanisms need phase research before implementation.

### Phase Ordering Rationale

- **Foundation must be phase 1** because PostgreSQL RLS and LGPD consent schema are impossible to retrofit cleanly. Every subsequent phase builds on the tenant isolation and auth that foundation establishes.
- **WhatsApp before AI** because the agent has no input source without Evolution API. The BullMQ queue architecture must also be established in this phase — the agent processor plugs into the queue that WhatsApp integration creates.
- **AI agent before CRM** because the agent's tool calls write to CRM. The CRM service needs to be available as a dependency when the agent is tested, but the agent defines what data it needs to write — so agent design precedes CRM entity design.
- **Human handoff in CRM phase** because they are functionally one feature. A conversation state mutex (AI/human) lives in the CRM, and attendant notifications depend on CRM lead data.
- **Scheduling before dashboard** because the dashboard's calendar view is meaningless without real appointment data from Google Calendar integration.
- **Dashboard after all backend modules** avoids building against mock data and reduces rework.
- **Notifications last among core features** because they depend on the most upstream modules (WhatsApp send, appointments, CRM) all being stable first.

### Research Flags

Phases needing deeper research during planning:
- **Phase 2 (WhatsApp Integration):** Evolution API v2 current webhook payload format, rate limiting behavior, and multi-instance reconnection patterns — LOW confidence from initial research. Verify against live docs before implementation.
- **Phase 3 (AI Agent Core):** LangGraph JS Redis checkpointer setup, pre-response medical classifier implementation pattern — MEDIUM confidence. The medical ethics constraint is Brazil-specific and under-documented. Needs phase research.
- **Phase 8 (Advanced Features):** Meta Lead Ads webhook format and Evolution API anti-ban detection mechanisms — LOW confidence on specifics.

Phases with standard, well-documented patterns (can skip phase research):
- **Phase 1 (Foundation):** NestJS + Better Auth + Prisma + PostgreSQL RLS — HIGH confidence, mature ecosystem.
- **Phase 4 (CRM):** NestJS CRUD + Prisma — standard patterns, no research needed.
- **Phase 6 (Dashboard):** Next.js 16 App Router + shadcn/ui + TanStack Table — HIGH confidence official docs.
- **Phase 7 (Notifications):** BullMQ delayed jobs — HIGH confidence, well-documented.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Next.js 16 stack verified HIGH via official docs. NestJS, LangGraph, BullMQ, Prisma versions at MEDIUM — training knowledge as of Aug 2025; verify on install. Evolution API v2 at LOW — could not access live docs. |
| Features | MEDIUM | Competitor analysis (Clinicorp, iClinic, Doctoralia) based on training data, not live product trials. LGPD/CFM legal requirements HIGH confidence (public law). WhatsApp Business policies MEDIUM. |
| Architecture | MEDIUM-HIGH | NestJS module patterns, BullMQ, Google Calendar API at HIGH confidence (stable, well-documented). LangGraph Redis checkpointer at MEDIUM. Evolution API webhook patterns at MEDIUM. |
| Pitfalls | MEDIUM | LGPD/CFM legal pitfalls HIGH confidence (law text). Technical pitfalls (loops, race conditions, bans) MEDIUM — based on known patterns, not live incident data from this specific stack. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Evolution API v2 live documentation:** Webhook payload schema, multi-instance API, rate limit thresholds. Verify before Phase 2 implementation starts. Confidence is LOW.
- **Competitor product trial:** Direct Clinicorp/iClinic product access would validate or challenge feature priority assumptions. Recommend 1-week trial before roadmap is finalized.
- **LGPD health data classification:** Whether "procedure interest" data (e.g., "interested in botox") qualifies as sensitive health data under Article 11 is a legal gray area. Recommend legal review before agent qualification flow is designed.
- **CFM digital health regulations 2025-2026:** CFM Resolução 2.336/2023 may have been updated. Verify current AI/telemedicine rules with a Brazilian healthcare legal advisor before agent goes live with real patients.
- **LangGraph JS ^0.2 Redis checkpointer API:** Verify exact checkpointer initialization pattern against current LangGraph JS docs — API surface may have changed since training cutoff.

---

## Sources

### Primary (HIGH confidence)
- https://nextjs.org/blog — Next.js 16.2 release notes (March 18, 2026)
- https://nextjs.org/docs/app/getting-started/installation — Node.js 20.9+ minimum, React 19, TypeScript 5.1+
- https://nextjs.org/docs/app/building-your-application/authentication — Better Auth and Auth.js v5 recommendations
- https://nextjs.org/docs/app/guides/self-hosting — Docker, Redis cache handler, self-hosting patterns
- LGPD Lei 13.709/2018 — Articles 7, 11, 46, 48 (Brazilian data protection law, public text)
- PostgreSQL Row Level Security documentation — https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- NestJS documentation — https://docs.nestjs.com (stable, well-established patterns)
- BullMQ documentation — https://docs.bullmq.io
- Google Calendar API — https://developers.google.com/calendar

### Secondary (MEDIUM confidence)
- LangGraph.js documentation concepts — training knowledge through Aug 2025
- NestJS multi-tenant patterns — community documentation and Prisma multi-tenancy guide
- Evolution API v2 capabilities — project decision per PROJECT.md + training knowledge; live docs unverified
- Brazilian healthtech SaaS ecosystem (Clinicorp, iClinic, Doctoralia feature sets) — training data through Aug 2025
- CFM Resolução 2.336/2023 on AI in digital health — training knowledge
- WhatsApp Business Policy anti-spam guidelines — training knowledge

### Tertiary (LOW confidence)
- Evolution API v2 current webhook payload format — could not access live docs; verify before implementation
- Brazilian clinic software post-mortems — training knowledge only, no live sources
- LGPD procedure-interest data classification as Article 11 sensitive data — legal inference, not legal advice

---
*Research completed: 2026-04-02*
*Ready for roadmap: yes*
