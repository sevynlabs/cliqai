# CliniqAI

## What This Is

CliniqAI is a SaaS AI platform specialized in converting leads into appointments for medical and aesthetic clinics. It operates as an autonomous SDR (Sales Development Representative), integrating with WhatsApp via Evolution API/Baileys, managing a real-time intelligent CRM, automating scheduling via Google Calendar, and executing strategic follow-ups without human intervention.

## Core Value

The AI agent must successfully qualify leads via WhatsApp and convert them into confirmed appointments — this is the ONE thing that must work. Everything else (dashboard, analytics, multi-channel) supports this core conversion loop.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] AI SDR Agent with configurable persona, BANT qualification flow, objection handling, and human handoff
- [ ] WhatsApp integration via Evolution API (multi-instance, QR code connect, message types, reconnection)
- [ ] Intelligent CRM with Kanban pipeline, auto-populated lead cards, AI annotations, timeline
- [ ] Google Calendar integration for automated scheduling (availability check, create/cancel/reschedule, multi-calendar)
- [ ] Automated notification system (confirmation, reminders, no-show recovery) via WhatsApp/email/SMS
- [ ] Intelligent follow-up sequences with timing, A/B testing, cool-down rules
- [ ] Bidirectional webhook system for external integrations (ERPs, lead sources, payment platforms)
- [ ] Web dashboard for clinic managers (KPIs, agent status, conversations, calendar, settings)
- [ ] Multi-tenant architecture (multi-clinic support with isolated data)
- [ ] User management with RBAC (owner, admin, manager, attendant roles)
- [ ] LGPD compliance (consent collection, data retention, right to erasure)
- [ ] Agent business rules (no medical diagnosis, no result promises, operating hours, rate limiting, emergency escalation)

### Out of Scope

- Voice AI / phone calls — complexity too high for MVP, defer to v2+
- Native mobile app — web dashboard is mobile-first responsive, native app later
- Video consultations / telemedicine — out of core SDR scope
- Payment processing — integrate via webhooks, don't build payment infrastructure
- Electronic medical records (EMR) — integrate via webhooks, don't build EMR
- Sentiment analysis with emotion detection — defer to premium features phase
- Predictive analytics / churn prediction — defer to premium features phase

## Context

- **Market:** Brazilian medical/aesthetic clinic market. Primary communication channel is WhatsApp.
- **Problem:** Clinics lose 60%+ of hot leads due to 4h+ response delay. 78% don't follow up after first contact.
- **Regulatory:** Must comply with LGPD (Brazilian data protection law) and CFM/CRM regulations on patient data.
- **Language:** Primary language is Brazilian Portuguese. Agent must communicate naturally in PT-BR.
- **Channel:** WhatsApp is the #1 communication channel — Evolution API provides enterprise-grade abstraction over Baileys.
- **Users:** Clinic owners, managers, and receptionists who need a simple, mobile-friendly dashboard.
- **AI Engine:** LangGraph for agent orchestration with state machine, memory, and tool-calling capabilities.

## Constraints

- **Tech Stack**: Next.js (frontend), Node.js/NestJS (backend), PostgreSQL + Redis, LangGraph (AI), Evolution API (WhatsApp)
- **Language**: Brazilian Portuguese as primary language for all agent interactions
- **Compliance**: LGPD mandatory — consent before data processing, right to erasure
- **WhatsApp**: Must support both WhatsApp Business and personal WhatsApp numbers
- **Operating Hours**: Agent must respect clinic operating hours (configurable, default 8h-20h)
- **Medical Ethics**: Agent NEVER provides medical diagnosis or promises specific procedure results
- **Design System**: Plus Jakarta Sans (headings) + Inter (body), clinical color palette with teal primary (#0D9488)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Evolution API over raw Baileys | Stability, enterprise features, multi-instance management, webhook support | — Pending |
| LangGraph for AI orchestration | State machine + memory + tool-calling, ideal for conversational SDR flow | — Pending |
| Event-driven microservices architecture | Horizontal scaling, low latency for real-time conversations | — Pending |
| Redis/BullMQ for message broker | Retry, dead-letter queue, rate limiting for WhatsApp messages | — Pending |
| Next.js for dashboard | SSR for SEO, React ecosystem, mobile-first responsive | — Pending |
| PostgreSQL + Redis for data layer | Relational for CRM/leads, Redis for cache/sessions/queues | — Pending |
| Multi-tenant with isolated data | Each clinic gets own WhatsApp instance, calendar, and data | — Pending |
| Plus Jakarta Sans + Inter typography | Modern, professional, high legibility for data-dense dashboards | — Pending |

---
*Last updated: 2026-04-02 after initialization*
