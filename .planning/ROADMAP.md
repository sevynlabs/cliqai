# Roadmap: CliniqAI

## Overview

CliniqAI is built in five phases, each delivering a complete vertical slice. Phase 1 establishes the multi-tenant foundation with auth and compliance. Phase 2 connects WhatsApp and the AI SDR agent — the core product differentiator. Phase 3 delivers the conversion moment: CRM, human handoff, and Google Calendar scheduling. Phase 4 surfaces everything through the management dashboard and clinic settings. Phase 5 closes the loop with notifications, follow-up sequences, and external webhook integrations.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Foundation** - Multi-tenant infrastructure, auth, RBAC, and LGPD compliance schema
- [ ] **Phase 2: WhatsApp + AI Agent** - Evolution API integration and LangGraph SDR state machine
- [ ] **Phase 3: CRM + Handoff + Scheduling** - Lead pipeline, human takeover, and Google Calendar booking
- [ ] **Phase 4: Dashboard + Settings** - Management UI, KPI views, and clinic configuration
- [ ] **Phase 5: Notifications + Follow-ups + Webhooks** - Automated engagement and external integrations

## Phase Details

### Phase 1: Foundation
**Goal**: A clinic can be created, users can log in with proper roles, and all data is isolated per tenant with LGPD consent schema enforced from day one
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, LGPD-01, LGPD-02, LGPD-03, LGPD-04
**Success Criteria** (what must be TRUE):
  1. Clinic owner can sign up, create a clinic, and log in — session persists across page reloads
  2. Clinic owner can invite a user with attendant role — that user can only see their own clinic's data
  3. An attendant cannot access owner-only routes or another clinic's data (RBAC enforced at API level)
  4. LGPD consent schema exists — no lead record can be created without a `consent_given = true` record
  5. A developer can run `docker compose up` and reach a working local environment with all services
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md — Monorepo scaffold (pnpm workspace, Next.js 16 + NestJS apps, shared packages, Docker Compose)
- [ ] 01-02-PLAN.md — PostgreSQL schema with RLS, pgcrypto PII encryption, Redis/BullMQ setup, multi-tenant middleware, LGPD consent model
- [ ] 01-03-PLAN.md — Auth backend (Better Auth config, RBAC guards, tenant middleware upgrade, clinic/user endpoints)
- [ ] 01-04-PLAN.md — Auth frontend (Next.js auth pages, auth client, protected dashboard layout, middleware)

### Phase 2: WhatsApp + AI Agent
**Goal**: A clinic can connect a WhatsApp number and the AI SDR agent autonomously qualifies inbound leads via natural conversation in PT-BR, including LGPD consent on first contact
**Depends on**: Phase 1
**Requirements**: WHATS-01, WHATS-02, WHATS-03, WHATS-04, WHATS-05, WHATS-06, WHATS-07, AGENT-01, AGENT-02, AGENT-03, AGENT-04, AGENT-05, AGENT-06, AGENT-07, AGENT-08, AGENT-09, AGENT-10
**Success Criteria** (what must be TRUE):
  1. Clinic can scan QR code in the dashboard and connect a WhatsApp number — connection status shows real-time
  2. Inbound WhatsApp message is acknowledged by Evolution API webhook in under 100ms and enqueued to BullMQ — LLM processing happens asynchronously
  3. AI agent sends LGPD consent request as the first message to every new lead — no data is stored until consent is given
  4. Agent holds a multi-turn BANT qualification conversation in natural PT-BR without repeating itself or looping
  5. Agent never produces a message containing medical diagnosis, result promises, or blocked phrases — pre-response classifier blocks them
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Evolution API integration (webhook ingestion to BullMQ, QR code connect, rate limiting, deduplication, reconnection)
- [ ] 02-02-PLAN.md — LangGraph SDR agent (state machine, Redis checkpointer, LGPD consent node, BANT flow, persona config)
- [ ] 02-03-PLAN.md — Agent guardrails (objection handling, loop detection, max-turns handoff, medical ethics classifier, operating hours enforcement)

### Phase 3: CRM + Handoff + Scheduling
**Goal**: Every qualifying conversation creates a lead card in a pipeline, attendants can take over from AI instantly, and the agent can book confirmed appointments in Google Calendar
**Depends on**: Phase 2
**Requirements**: CRM-01, CRM-02, CRM-03, CRM-04, CRM-05, CRM-06, CRM-07, HAND-01, HAND-02, HAND-03, HAND-04, SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05, SCHED-06, SCHED-07
**Success Criteria** (what must be TRUE):
  1. Inbound WhatsApp lead auto-creates a lead card — duplicate phone numbers merge into the existing card
  2. Lead card advances through Kanban stages as the AI qualifies the lead — AI annotations appear after each significant interaction
  3. Attendant can take over a conversation with one click — AI stops responding immediately and attendant sees the full conversation context
  4. Agent presents available appointment slots and books a confirmed Google Calendar event upon lead acceptance — no double-bookings occur
  5. Attendant can return a conversation to AI and the agent resumes without losing context
**Plans**: TBD

Plans:
- [ ] 03-01: CRM service (lead auto-creation, deduplication, Kanban pipeline, AI annotations, timeline, filters, search)
- [ ] 03-02: Human handoff (takeover flow, dual-channel notification, AI/human mutex, return-to-AI)
- [ ] 03-03: Google Calendar integration (OAuth per clinic, availability check, TENTATIVE lock, appointment CRUD, buffer time, holiday blocking)

### Phase 4: Dashboard + Settings
**Goal**: Clinic managers and owners can monitor KPIs, view conversations, manage the calendar, and configure the clinic and AI agent — all from a mobile-friendly web interface
**Depends on**: Phase 3
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08, DASH-09, SET-01, SET-02, SET-03, SET-04, SET-05, SET-06
**Success Criteria** (what must be TRUE):
  1. Dashboard loads with live KPI cards (leads today, appointments today, conversion rate) populated from real backend data
  2. Manager can open the conversation inbox, view a chat thread, and see the lead details side panel without leaving the page
  3. Clinic owner can update the AI agent persona (name, tone, scripts) and the change takes effect on the next conversation
  4. Admin can add a professional, set their working hours and Google Calendar, and the agent immediately respects the new availability
  5. Dashboard is usable on a phone — all key actions reachable without horizontal scroll
**Plans**: TBD

Plans:
- [ ] 04-01: Dashboard UI (KPI cards, funnel chart, activity timeline, today's agenda, agent health indicator)
- [ ] 04-02: Conversation + CRM views (inbox, chat thread, Kanban, lead card, calendar view)
- [ ] 04-03: Settings pages (clinic profile, agent config, procedures CRUD, professionals CRUD, notification/follow-up template editors)

### Phase 5: Notifications + Follow-ups + Webhooks
**Goal**: The system automatically sends appointment confirmations, reminders, and follow-up sequences — and connects to external lead sources and downstream integrations via webhooks
**Depends on**: Phase 4
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, FOLLOW-01, FOLLOW-02, FOLLOW-03, FOLLOW-04, HOOK-01, HOOK-02, HOOK-03, HOOK-04
**Success Criteria** (what must be TRUE):
  1. Lead receives a WhatsApp confirmation message immediately after an appointment is booked by the AI agent
  2. Lead receives a 24h reminder and a 1h reminder before their appointment — reminders stop if the lead opts out
  3. No-show lead receives a recovery message with a re-scheduling option within a configurable window
  4. Follow-up sequence activates for unresponsive leads — pauses when the lead replies — and respects cool-down rules (max 3 attempts, 7-day gap between sequences)
  5. A Meta Lead Ads webhook creates a new lead in the CRM with correct tenant scoping and HMAC signature verification
**Plans**: TBD

Plans:
- [ ] 05-01: Notification service (BullMQ delayed jobs for confirmation, reminders, no-show recovery, opt-out tracking, operating hours enforcement)
- [ ] 05-02: Follow-up sequences (configurable timing, cool-down rules, stop-on-reply, personalized messages from conversation history)
- [ ] 05-03: Webhook system (webhook-in with HMAC verification, webhook-out with retry/backoff for lead.created, appointment.booked, lead.converted)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete | 2026-04-02 |
| 2. WhatsApp + AI Agent | 0/3 | Planning complete | - |
| 3. CRM + Handoff + Scheduling | 0/3 | Not started | - |
| 4. Dashboard + Settings | 0/3 | Not started | - |
| 5. Notifications + Follow-ups + Webhooks | 0/3 | Not started | - |
