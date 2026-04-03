# Roadmap: CliniqAI

## Overview

CliniqAI v1.0 shipped with 5 phases covering the full MVP (foundation, WhatsApp AI agent, CRM, dashboard, notifications). v2.0 extends the platform with dark mode, i18n, real-time WebSocket, predictive analytics, PDF reports, payments, Instagram DM, Voice AI, and a React Native mobile app.

## Phases

**Phase Numbering:**
- Phases 1-5: v1.0 (complete)
- Phases 6-12: v2.0 (current milestone)

### v1.0 Phases (Complete)

- [x] **Phase 1: Foundation** - Multi-tenant infrastructure, auth, RBAC, LGPD
- [x] **Phase 2: WhatsApp + AI Agent** - Evolution API, LangGraph SDR state machine
- [x] **Phase 3: CRM + Handoff + Scheduling** - Lead pipeline, human takeover, Google Calendar
- [x] **Phase 4: Dashboard + Settings** - Management UI, KPIs, conversations, settings
- [x] **Phase 5: Notifications + Follow-ups + Webhooks** - Automated engagement, external integrations

### v2.0 Phases

- [ ] **Phase 6: Dark Mode + i18n** - Theme system with dark mode, multi-language (PT-BR, EN, ES)
- [ ] **Phase 7: Real-Time WebSocket** - Replace polling with Socket.io for live updates across dashboard
- [ ] **Phase 8: Analytics + PDF Reports** - Predictive ML scoring, conversion forecast, exportable PDF reports
- [ ] **Phase 9: Payment Integration** - Stripe + Pix, payment links in agent flow, revenue dashboard
- [ ] **Phase 10: Instagram DM Channel** - Meta Graph API, unified inbox, multi-channel agent
- [ ] **Phase 11: Voice AI** - Telephony integration, STT/TTS, voice qualification flow
- [ ] **Phase 12: Mobile App** - React Native (Expo), push notifications, mobile handoff

## Phase Details

### Phase 6: Dark Mode + i18n
**Goal**: Users can switch between light/dark themes and choose their preferred language (PT-BR, EN, ES) across the entire application
**Depends on**: v1.0 (complete)
**Requirements**: THEME-01, THEME-02, THEME-03, THEME-04, I18N-01, I18N-02, I18N-03, I18N-04, I18N-05
**Success Criteria:**
  1. User toggles dark mode and ALL components render correctly (no white flash, no broken colors)
  2. User switches language to EN and all UI text changes instantly without page reload
  3. Date formatting respects selected locale (e.g., "April 3" in EN, "3 de abril" in PT-BR)
  4. Preferences persist across sessions and new tabs
  5. Landing page and auth pages also support dark mode and i18n

### Phase 7: Real-Time WebSocket
**Goal**: Dashboard updates instantly when events occur — no more polling intervals, all changes push in real-time
**Depends on**: Phase 6
**Requirements**: RT-01, RT-02, RT-03, RT-04, RT-05
**Success Criteria:**
  1. New lead arriving via WhatsApp triggers instant KPI update on dashboard without refresh
  2. Chat messages appear in conversation thread within 500ms of being received
  3. Sidebar notification badges increment instantly when events occur
  4. CRM kanban updates when another user moves a lead (multi-user real-time)
  5. Agent connection status changes push immediately (no 10s polling delay)

### Phase 8: Analytics + PDF Reports
**Goal**: Clinic managers can see predictive insights (conversion probability, churn risk) and export professional PDF reports
**Depends on**: Phase 7
**Requirements**: ANAL-01, ANAL-02, ANAL-03, ANAL-04, ANAL-05, PDF-01, PDF-02, PDF-03, PDF-04, PDF-05
**Success Criteria:**
  1. Each lead card shows a conversion probability percentage (0-100%) calculated from engagement data
  2. Dashboard shows "leads going cold" section with churn risk indicators
  3. User can click "Generate PDF" and receive a branded report with KPIs, funnel, and lead data
  4. PDF report respects date range filter and includes clinic branding
  5. Weekly conversion forecast chart visible on analytics dashboard

### Phase 9: Payment Integration
**Goal**: Clinics can accept payments via Stripe and Pix, and the AI agent can send payment links during conversations
**Depends on**: Phase 8
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05
**Success Criteria:**
  1. Clinic owner connects Stripe account via OAuth in settings
  2. Agent sends Pix payment link after booking appointment
  3. Payment status (paid/pending/failed) visible in appointment detail
  4. Dashboard revenue KPIs show total collected and pending amounts
  5. Payment webhooks update status in real-time

### Phase 10: Instagram DM Channel
**Goal**: Clinics can receive and respond to Instagram DMs through the same AI agent, with conversations unified in one inbox
**Depends on**: Phase 9
**Requirements**: INSTA-01, INSTA-02, INSTA-03, INSTA-04, INSTA-05
**Success Criteria:**
  1. Clinic connects Instagram Business account via Meta Graph API in settings
  2. Inbound Instagram DM triggers AI agent with same qualification flow as WhatsApp
  3. Conversations inbox shows Instagram messages with channel indicator
  4. Lead source correctly tracks "instagram" for analytics attribution
  5. Agent can send text and images via Instagram DM

### Phase 11: Voice AI
**Goal**: Clinics can receive phone calls that are handled by the AI agent using speech-to-text and text-to-speech
**Depends on**: Phase 10
**Requirements**: VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05
**Success Criteria:**
  1. Clinic configures a phone number via Twilio in settings
  2. Inbound call is answered by AI with natural PT-BR voice
  3. Agent qualifies caller using BANT flow via voice conversation
  4. Call recording is stored and playable from lead timeline
  5. Human can take over active call during handoff

### Phase 12: Mobile App
**Goal**: Clinic staff can manage leads, view conversations, and handle handoffs from a native mobile app
**Depends on**: Phase 7 (WebSocket required for real-time)
**Requirements**: MOB-01, MOB-02, MOB-03, MOB-04, MOB-05
**Success Criteria:**
  1. User logs in on mobile app and sees same data as web dashboard
  2. Push notification received when new lead arrives
  3. User can read conversation and take over from AI on mobile
  4. KPI cards and pipeline are readable and navigable on mobile
  5. App works on both iOS and Android

## Progress

**Execution Order:**
Phase 6 → 7 → 8 → 9 → 10 → 11 → 12 (Phase 12 can start after Phase 7)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete | 2026-04-02 |
| 2. WhatsApp + AI Agent | 3/3 | Complete | 2026-04-02 |
| 3. CRM + Handoff + Scheduling | 3/3 | Complete | 2026-04-03 |
| 4. Dashboard + Settings | 3/3 | Complete | 2026-04-03 |
| 5. Notifications + Follow-ups + Webhooks | 3/3 | Complete | 2026-04-03 |
| 6. Dark Mode + i18n | 0/? | Not started | - |
| 7. Real-Time WebSocket | 0/? | Not started | - |
| 8. Analytics + PDF Reports | 0/? | Not started | - |
| 9. Payment Integration | 0/? | Not started | - |
| 10. Instagram DM Channel | 0/? | Not started | - |
| 11. Voice AI | 0/? | Not started | - |
| 12. Mobile App | 0/? | Not started | - |
