# CliniqAI

## What This Is

CliniqAI is a SaaS AI platform specialized in converting leads into appointments for medical and aesthetic clinics. It operates as an autonomous SDR (Sales Development Representative), integrating with WhatsApp via Evolution API/Baileys, managing a real-time intelligent CRM, automating scheduling via Google Calendar, and executing strategic follow-ups without human intervention.

## Core Value

The AI agent must successfully qualify leads via WhatsApp and convert them into confirmed appointments — this is the ONE thing that must work. Everything else (dashboard, analytics, multi-channel) supports this core conversion loop.

## Current Milestone: v2.0 — Scale & Premium Features

**Goal:** Transform CliniqAI from MVP into a production-grade multi-channel platform with dark mode, i18n, real-time updates, advanced analytics, payment integration, Instagram DM, Voice AI, PDF reports, and mobile app.

**Target features:**
- Dark mode with system preference detection
- Multi-language support (PT-BR, EN, ES)
- WebSocket real-time dashboard (replace polling)
- Predictive analytics with ML lead scoring
- PDF report generation (KPIs, funnel, leads)
- Payment integration (Stripe + Pix)
- Instagram DM as second channel
- Voice AI for phone calls
- React Native mobile app

## Requirements

### Validated (v1.0)

- [x] AI SDR Agent with configurable persona, BANT qualification flow, objection handling, and human handoff
- [x] WhatsApp integration via Evolution API (multi-instance, QR code connect, message types, reconnection)
- [x] Intelligent CRM with Kanban pipeline, auto-populated lead cards, AI annotations, timeline
- [x] Google Calendar integration for automated scheduling (availability check, create/cancel/reschedule, multi-calendar)
- [x] Automated notification system (confirmation, reminders, no-show recovery) via WhatsApp
- [x] Intelligent follow-up sequences with timing, cool-down rules
- [x] Bidirectional webhook system for external integrations (lead sources, Meta Lead Ads)
- [x] Web dashboard for clinic managers (KPIs, agent status, conversations, calendar, settings)
- [x] Multi-tenant architecture (multi-clinic support with isolated data)
- [x] User management with RBAC (owner, admin, manager, attendant roles)
- [x] LGPD compliance (consent collection, data retention, right to erasure)
- [x] Agent business rules (no medical diagnosis, no result promises, operating hours, rate limiting, emergency escalation)
- [x] Procedures, professionals, and message templates CRUD
- [x] Lead analytics (source, score distribution, top procedures)
- [x] CSV export with filters

### Active (v2.0)

- [ ] Dark mode with system preference detection and manual toggle
- [ ] Multi-language support (PT-BR, EN, ES) with dynamic switching
- [ ] WebSocket real-time updates (dashboard, conversations, notifications)
- [ ] Predictive analytics (churn prediction, lead scoring ML, conversion forecast)
- [ ] PDF report generation (KPIs, funnel, lead pipeline, appointments)
- [ ] Payment integration (Stripe for international, Pix for Brazil)
- [ ] Instagram DM channel (second channel beyond WhatsApp)
- [ ] Voice AI for inbound/outbound phone calls
- [ ] React Native mobile app (iOS + Android)

### Out of Scope

- Video consultations / telemedicine — out of core SDR scope
- Electronic medical records (EMR) — integrate via webhooks, don't build EMR
- Zapier/n8n native integration — webhook system is sufficient for v2
- A/B testing of agent messages — defer to v3
- Native desktop app — web + mobile covers all use cases

## Context

- **Market:** Brazilian medical/aesthetic clinic market. Primary communication channel is WhatsApp.
- **Problem:** Clinics lose 60%+ of hot leads due to 4h+ response delay. 78% don't follow up after first contact.
- **Regulatory:** Must comply with LGPD (Brazilian data protection law) and CFM/CRM regulations on patient data.
- **Language:** Primary language is Brazilian Portuguese. Agent must communicate naturally in PT-BR.
- **Channel:** WhatsApp is the #1 communication channel — Evolution API provides enterprise-grade abstraction over Baileys.
- **Users:** Clinic owners, managers, and receptionists who need a simple, mobile-friendly dashboard.
- **AI Engine:** LangGraph for agent orchestration with state machine, memory, and tool-calling capabilities.
- **v1.0 shipped:** All 5 phases complete. 16 plans executed. Full-stack platform operational.

## Constraints

- **Tech Stack**: Next.js (frontend), Node.js/NestJS (backend), PostgreSQL + Redis, LangGraph (AI), Evolution API (WhatsApp)
- **Language**: Brazilian Portuguese as primary language for all agent interactions
- **Compliance**: LGPD mandatory — consent before data processing, right to erasure
- **Design System**: Plus Jakarta Sans (headings) + Inter (body), teal primary (#0D9488), Tailwind v4 utilities
- **Mobile**: React Native with Expo for cross-platform (shared business logic where possible)
- **Payments**: Stripe for credit card, Pix for Brazilian instant payment
- **Voice**: Twilio or similar for telephony infrastructure

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Evolution API over raw Baileys | Stability, enterprise features, multi-instance management | ✓ Good |
| LangGraph for AI orchestration | State machine + memory + tool-calling, ideal for conversational SDR | ✓ Good |
| BullMQ for message broker | Retry, dead-letter queue, rate limiting for WhatsApp messages | ✓ Good |
| Better Auth for authentication | App Router native, RBAC, multi-tenant sessions, organization plugin | ✓ Good |
| Tailwind v4 with @utility | Custom design system without CSS-in-JS, tree-shakeable | ✓ Good |
| React Query for data fetching | Caching, optimistic updates, refetch intervals | ✓ Good |
| Prisma ORM | Type-safe queries, migrations, multi-tenant scoping | ✓ Good |

---
*Last updated: 2026-04-03 after v2.0 milestone start*
