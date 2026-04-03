# Requirements: CliniqAI v2.0

**Defined:** 2026-04-03
**Core Value:** AI agent qualifies leads via WhatsApp and converts them into confirmed appointments

## v2.0 Requirements

### Dark Mode & Theming

- [ ] **THEME-01**: User can toggle between light and dark themes via dashboard setting
- [ ] **THEME-02**: System detects OS preference (prefers-color-scheme) and applies automatically on first visit
- [ ] **THEME-03**: Theme preference persists across sessions (localStorage + cookie for SSR)
- [ ] **THEME-04**: All dashboard components render correctly in dark mode (cards, inputs, badges, charts)

### Internationalization (i18n)

- [ ] **I18N-01**: User can switch language between PT-BR, EN, and ES from dashboard header
- [ ] **I18N-02**: All static UI text (labels, buttons, placeholders, error messages) is translated
- [ ] **I18N-03**: Date/time formatting adapts to selected locale (date-fns locale)
- [ ] **I18N-04**: Language preference persists across sessions
- [ ] **I18N-05**: Landing page and auth pages support all 3 languages

### Real-Time Updates (WebSocket)

- [ ] **RT-01**: Dashboard KPIs update instantly when new leads or appointments arrive (no polling)
- [ ] **RT-02**: Conversation messages appear in real-time without manual refresh
- [ ] **RT-03**: Notification badges update instantly when new activity occurs
- [ ] **RT-04**: CRM kanban reflects stage changes by other users in real-time
- [ ] **RT-05**: Agent health status updates push instantly on connection change

### Predictive Analytics

- [ ] **ANAL-01**: Dashboard shows lead conversion probability per lead (ML-based score)
- [ ] **ANAL-02**: Dashboard shows churn risk indicator for leads going cold
- [ ] **ANAL-03**: Dashboard shows weekly/monthly conversion forecast
- [ ] **ANAL-04**: Lead scoring model uses conversation data, engagement, and BANT completion
- [ ] **ANAL-05**: Analytics data exportable as part of PDF reports

### PDF Reports

- [ ] **PDF-01**: User can generate PDF report for KPIs dashboard (daily/weekly/monthly)
- [ ] **PDF-02**: User can generate PDF report for lead pipeline (filtered by date range, stage, source)
- [ ] **PDF-03**: User can generate PDF report for appointments (calendar summary)
- [ ] **PDF-04**: PDF includes clinic branding (name, logo) and generation timestamp
- [ ] **PDF-05**: PDF can be downloaded directly or sent via email

### Payment Integration

- [ ] **PAY-01**: Clinic can connect Stripe account for credit card payments
- [ ] **PAY-02**: Clinic can configure Pix payment (Brazilian instant payment)
- [ ] **PAY-03**: Agent can send payment link during conversation after appointment booking
- [ ] **PAY-04**: Payment status visible in appointment detail (paid/pending/failed)
- [ ] **PAY-05**: Dashboard shows revenue KPIs (total collected, pending, by procedure)

### Instagram DM Channel

- [ ] **INSTA-01**: Clinic can connect Instagram Business account via Meta Graph API
- [ ] **INSTA-02**: Inbound Instagram DMs are processed by the same AI agent
- [ ] **INSTA-03**: Agent can respond via Instagram DM with text and images
- [ ] **INSTA-04**: Conversations inbox shows Instagram and WhatsApp conversations unified
- [ ] **INSTA-05**: Lead source tracks "instagram" for attribution

### Voice AI

- [ ] **VOICE-01**: Clinic can configure a phone number for inbound voice calls
- [ ] **VOICE-02**: AI agent handles inbound calls with speech-to-text and text-to-speech
- [ ] **VOICE-03**: Agent follows same qualification flow (BANT) via voice
- [ ] **VOICE-04**: Call recordings are stored and playable from lead timeline
- [ ] **VOICE-05**: Handoff to human during active call

### Mobile App

- [ ] **MOB-01**: React Native app authenticates with existing Better Auth session
- [ ] **MOB-02**: App shows dashboard KPIs and lead pipeline
- [ ] **MOB-03**: App shows conversation inbox with real-time messages
- [ ] **MOB-04**: App supports push notifications for new leads and appointments
- [ ] **MOB-05**: App supports human handoff (takeover/return) from mobile

## v3.0 Requirements (Deferred)

### A/B Testing
- **AB-01**: Admin can create message variants for the AI agent
- **AB-02**: System randomly assigns variants and tracks conversion rates

### Zapier/n8n
- **ZAP-01**: Native Zapier triggers for lead.created, appointment.booked
- **ZAP-02**: Native Zapier actions for create lead, update stage

## Out of Scope

| Feature | Reason |
|---------|--------|
| Video consultations | Out of core SDR scope, defer to v3+ |
| EMR integration | Build webhook connectors, not EMR itself |
| Desktop app | Web + mobile covers all use cases |
| Multi-clinic marketplace | Single-tenant SaaS model for now |
| Sentiment analysis | ML complexity too high, defer to v3 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| THEME-01..04 | Phase 6 | Pending |
| I18N-01..05 | Phase 6 | Pending |
| RT-01..05 | Phase 7 | Pending |
| ANAL-01..05 | Phase 8 | Pending |
| PDF-01..05 | Phase 8 | Pending |
| PAY-01..05 | Phase 9 | Pending |
| INSTA-01..05 | Phase 10 | Pending |
| VOICE-01..05 | Phase 11 | Pending |
| MOB-01..05 | Phase 12 | Pending |

**Coverage:**
- v2.0 requirements: 39 total
- Mapped to phases: 39
- Unmapped: 0

---
*Requirements defined: 2026-04-03*
*Last updated: 2026-04-03 after v2.0 milestone definition*
