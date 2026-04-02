# Requirements: CliniqAI

**Defined:** 2026-04-02
**Core Value:** AI agent qualifies leads via WhatsApp and converts them into confirmed appointments

## v1 Requirements

### Foundation

- [x] **FOUND-01**: System uses TypeScript monorepo (Next.js 16 frontend + NestJS backend + shared types)
- [ ] **FOUND-02**: PostgreSQL database with multi-tenant row-level security from migration 0001
- [x] **FOUND-03**: Redis for caching, sessions, BullMQ queues, and LangGraph checkpointer
- [x] **FOUND-04**: Docker Compose for local development environment

### Authentication & Multi-Tenancy

- [ ] **AUTH-01**: User can sign up and create a clinic (tenant)
- [ ] **AUTH-02**: User can log in with email/password and stay logged in across sessions (JWT + refresh tokens)
- [ ] **AUTH-03**: User can reset password via email link
- [ ] **AUTH-04**: Clinic owner can invite users with roles (admin, manager, attendant)
- [ ] **AUTH-05**: RBAC enforces permissions per role (owner full access, attendant conversations only)
- [ ] **AUTH-06**: All data queries are tenant-scoped (no cross-clinic data leakage)

### WhatsApp Integration

- [ ] **WHATS-01**: Clinic can connect WhatsApp number via QR code in dashboard
- [ ] **WHATS-02**: System receives messages via Evolution API webhooks and enqueues to BullMQ in <100ms
- [ ] **WHATS-03**: System sends text, image, document, audio, and location messages via WhatsApp
- [ ] **WHATS-04**: Auto-reconnection with retry and admin notification on disconnection
- [ ] **WHATS-05**: Connection status visible in real-time on dashboard
- [ ] **WHATS-06**: Rate limiting per WhatsApp number with queue backpressure and jitter
- [ ] **WHATS-07**: Message deduplication to prevent duplicate processing

### AI SDR Agent

- [ ] **AGENT-01**: LangGraph-based agent with state machine, memory (Redis checkpointer), and tool-calling
- [ ] **AGENT-02**: Configurable persona per clinic (name, tone, specialty vocabulary, emoji usage)
- [ ] **AGENT-03**: BANT qualification flow via natural conversation (Budget, Authority, Need, Timeline)
- [ ] **AGENT-04**: Objection handling for common objections (price, fear, timing, "send me info")
- [ ] **AGENT-05**: Agent NEVER provides medical diagnosis or promises specific procedure results
- [ ] **AGENT-06**: Agent respects operating hours (configurable per clinic, default 8h-20h)
- [ ] **AGENT-07**: Max conversation turns before human handoff (configurable, default 20)
- [ ] **AGENT-08**: Emergency escalation detection (medical emergencies, complaints, legal requests)
- [ ] **AGENT-09**: Loop guard with max-turn limits and fallback to human handoff
- [ ] **AGENT-10**: LGPD consent collection as first interaction before any data storage

### CRM

- [ ] **CRM-01**: New WhatsApp conversation auto-creates lead card (deduplicated by phone number)
- [ ] **CRM-02**: Kanban pipeline view with drag-and-drop (Novo → Qualificado → Agendado → Confirmado → Atendido → Perdido)
- [ ] **CRM-03**: Lead card with auto-populated data (name, phone, email, procedure, score, tags, timeline)
- [ ] **CRM-04**: AI generates annotations after each significant interaction (summary, objections, next steps)
- [ ] **CRM-05**: Table view and list view alternatives to Kanban
- [ ] **CRM-06**: Filters by source, procedure, professional, date, score, tags
- [ ] **CRM-07**: Global search by name, phone, email, or any field

### Human Handoff

- [ ] **HAND-01**: Attendant can take over conversation from AI with one click
- [ ] **HAND-02**: AI context (summary, annotations) visible to human during takeover
- [ ] **HAND-03**: Attendant can return conversation to AI agent
- [ ] **HAND-04**: AI/human mutex prevents both from responding simultaneously

### Scheduling

- [ ] **SCHED-01**: Google Calendar OAuth integration per clinic (multi-calendar per professional)
- [ ] **SCHED-02**: Agent checks real-time availability before suggesting appointment slots
- [ ] **SCHED-03**: Agent creates calendar event with patient details upon confirmation
- [ ] **SCHED-04**: Agent can cancel and reschedule appointments via conversation
- [ ] **SCHED-05**: Buffer time between appointments (configurable per procedure/professional)
- [ ] **SCHED-06**: TENTATIVE event lock pattern to prevent double-booking race conditions
- [ ] **SCHED-07**: Operating hours and holiday blocking on calendar

### Notifications

- [ ] **NOTIF-01**: Appointment confirmation message via WhatsApp after booking
- [ ] **NOTIF-02**: Appointment reminders (24h and 1h before) via WhatsApp
- [ ] **NOTIF-03**: No-show recovery message with re-scheduling option
- [ ] **NOTIF-04**: Opt-out tracking per lead (stop sending if requested)
- [ ] **NOTIF-05**: Operating hours enforcement for all outbound messages

### Follow-ups

- [ ] **FOLLOW-01**: Automated follow-up sequences with configurable timing
- [ ] **FOLLOW-02**: Cool-down rules (max 3 attempts per sequence, 7-day cool-down between sequences)
- [ ] **FOLLOW-03**: Stop-on-reply (follow-up pauses when lead responds)
- [ ] **FOLLOW-04**: Personalized messages based on conversation history (never generic repeated)

### Dashboard

- [ ] **DASH-01**: KPI cards: Leads today, Appointments today, Conversion rate, Revenue pipeline
- [ ] **DASH-02**: Conversion funnel chart (last 30 days)
- [ ] **DASH-03**: Recent activity timeline (agent actions, bookings, follow-ups)
- [ ] **DASH-04**: Today's agenda with confirmation status
- [ ] **DASH-05**: Agent health indicator (connected, messages/hour, errors, latency)
- [ ] **DASH-06**: WhatsApp conversation view (inbox, chat thread, lead details side panel)
- [ ] **DASH-07**: Calendar view (month/week/day) with color-coded events per procedure
- [ ] **DASH-08**: Mobile-responsive layout (touch-friendly, works on phone/tablet)
- [ ] **DASH-09**: Sidebar navigation with clinic selector (multi-clinic support)

### Settings

- [ ] **SET-01**: Clinic profile (name, logo, address, hours, timezone)
- [ ] **SET-02**: Agent configuration (persona name, tone, scripts, knowledge base)
- [ ] **SET-03**: Procedures CRUD (name, duration, price, prep instructions, authorized professionals)
- [ ] **SET-04**: Professionals CRUD (name, calendar, specialties, working hours)
- [ ] **SET-05**: Follow-up sequence templates editor
- [ ] **SET-06**: Notification templates editor

### Compliance

- [ ] **LGPD-01**: Consent collected and logged before any personal data processing
- [ ] **LGPD-02**: Right to erasure — complete data deletion upon lead request
- [ ] **LGPD-03**: Data retention policy with configurable retention periods
- [ ] **LGPD-04**: PII encrypted at rest (pgcrypto)

### Webhooks

- [ ] **HOOK-01**: Webhook-in receiver for Meta Lead Ads, Google Ads, and generic lead sources
- [ ] **HOOK-02**: Webhook-out for key events (lead.created, appointment.booked, lead.converted)
- [ ] **HOOK-03**: HMAC-SHA256 signature verification on all inbound webhooks
- [ ] **HOOK-04**: Retry with exponential backoff for failed outbound webhooks

## v2 Requirements

### Advanced AI

- **AI-V2-01**: Sentiment analysis with emotion tagging per conversation
- **AI-V2-02**: Predictive lead scoring based on conversion history
- **AI-V2-03**: Audio message transcription via Whisper
- **AI-V2-04**: AI copilot suggestions when human is handling conversation

### Growth & Marketing

- **GROW-01**: A/B testing for follow-up message variants
- **GROW-02**: Agent performance analytics (AI vs human conversion rates)
- **GROW-03**: Campaign tracking (UTM → lead source attribution)
- **GROW-04**: Referral tracking between leads

### Operations

- **OPS-01**: Waitlist when no slots available
- **OPS-02**: Overbooking rules (configurable per clinic)
- **OPS-03**: Email and SMS fallback channels for notifications
- **OPS-04**: Multi-clinic agency view with consolidated dashboard

## Out of Scope

| Feature | Reason |
|---------|--------|
| Electronic Medical Records (EMR) | CFM regulations, scope explosion — integrate via webhooks to existing EMR |
| Payment processing / PIX checkout | PCI-DSS compliance, financial licensing — send payment links via WhatsApp |
| Voice AI / phone calls | Separate telephony infrastructure — WhatsApp-first, voice in v3+ |
| Native iOS/Android app | Mobile-first PWA sufficient — native app after product-market fit |
| Visual chatbot flow builder | Clinic staff can't configure correctly; support burden — use persona config UI |
| Social media DMs (Instagram, Facebook) | Separate APIs, rate limits — validate WhatsApp first, add channels in v2 |
| Internal team chat | Slack/Teams scope — use internal notes on lead card |
| AI medical diagnosis / symptom checker | CFM prohibits AI medical opinions — agent always disclaims and escalates |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| LGPD-01 | Phase 1 | Pending |
| LGPD-02 | Phase 1 | Pending |
| LGPD-03 | Phase 1 | Pending |
| LGPD-04 | Phase 1 | Pending |
| WHATS-01 | Phase 2 | Pending |
| WHATS-02 | Phase 2 | Pending |
| WHATS-03 | Phase 2 | Pending |
| WHATS-04 | Phase 2 | Pending |
| WHATS-05 | Phase 2 | Pending |
| WHATS-06 | Phase 2 | Pending |
| WHATS-07 | Phase 2 | Pending |
| AGENT-01 | Phase 2 | Pending |
| AGENT-02 | Phase 2 | Pending |
| AGENT-03 | Phase 2 | Pending |
| AGENT-04 | Phase 2 | Pending |
| AGENT-05 | Phase 2 | Pending |
| AGENT-06 | Phase 2 | Pending |
| AGENT-07 | Phase 2 | Pending |
| AGENT-08 | Phase 2 | Pending |
| AGENT-09 | Phase 2 | Pending |
| AGENT-10 | Phase 2 | Pending |
| CRM-01 | Phase 3 | Pending |
| CRM-02 | Phase 3 | Pending |
| CRM-03 | Phase 3 | Pending |
| CRM-04 | Phase 3 | Pending |
| CRM-05 | Phase 3 | Pending |
| CRM-06 | Phase 3 | Pending |
| CRM-07 | Phase 3 | Pending |
| HAND-01 | Phase 3 | Pending |
| HAND-02 | Phase 3 | Pending |
| HAND-03 | Phase 3 | Pending |
| HAND-04 | Phase 3 | Pending |
| SCHED-01 | Phase 3 | Pending |
| SCHED-02 | Phase 3 | Pending |
| SCHED-03 | Phase 3 | Pending |
| SCHED-04 | Phase 3 | Pending |
| SCHED-05 | Phase 3 | Pending |
| SCHED-06 | Phase 3 | Pending |
| SCHED-07 | Phase 3 | Pending |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| DASH-05 | Phase 4 | Pending |
| DASH-06 | Phase 4 | Pending |
| DASH-07 | Phase 4 | Pending |
| DASH-08 | Phase 4 | Pending |
| DASH-09 | Phase 4 | Pending |
| SET-01 | Phase 4 | Pending |
| SET-02 | Phase 4 | Pending |
| SET-03 | Phase 4 | Pending |
| SET-04 | Phase 4 | Pending |
| SET-05 | Phase 4 | Pending |
| SET-06 | Phase 4 | Pending |
| NOTIF-01 | Phase 5 | Pending |
| NOTIF-02 | Phase 5 | Pending |
| NOTIF-03 | Phase 5 | Pending |
| NOTIF-04 | Phase 5 | Pending |
| NOTIF-05 | Phase 5 | Pending |
| FOLLOW-01 | Phase 5 | Pending |
| FOLLOW-02 | Phase 5 | Pending |
| FOLLOW-03 | Phase 5 | Pending |
| FOLLOW-04 | Phase 5 | Pending |
| HOOK-01 | Phase 5 | Pending |
| HOOK-02 | Phase 5 | Pending |
| HOOK-03 | Phase 5 | Pending |
| HOOK-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 77 total (recount from file — original estimate of 60 was incorrect)
- Mapped to phases: 77
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 after roadmap creation — all requirements mapped*
