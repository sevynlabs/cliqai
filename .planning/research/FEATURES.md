# Feature Research

**Domain:** AI-powered clinic management SaaS — WhatsApp SDR, CRM, scheduling (Brazilian market)
**Researched:** 2026-04-02
**Confidence:** MEDIUM — Research sourced from training data on Brazilian healthtech SaaS market (Clinicorp, iClinic, Doctoralia, Simples Dental, Omie Saude, Zenoti), WhatsApp Business API ecosystem, and LGPD compliance requirements. WebSearch/WebFetch unavailable during session. Critical claims flagged individually. Recommend verification of competitor features via direct product trial before roadmap finalization.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features clinic managers and receptionists assume exist. Missing any of these = product feels broken or incomplete, immediate churn.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| WhatsApp message inbox (real-time) | WhatsApp is the #1 clinic contact channel in BR; staff expects to see conversations | MEDIUM | Evolution API handles transport; UI must show thread per lead/patient |
| Lead intake from WhatsApp (new conversation = new lead) | Without auto-capture, staff manually creates every lead — unacceptable | MEDIUM | Webhook triggers lead creation; deduplication by phone number |
| Kanban lead pipeline | Standard CRM UI; every Brazilian sales/ops tool uses this pattern | MEDIUM | Columns map to funnel stages: Novo → Qualificado → Agendado → Confirmado → Atendido → Perdido |
| Lead card with contact details + history | Receptionists need context without digging through WhatsApp | LOW | Phone, name, procedure interest, interaction timeline |
| Appointment scheduling (calendar view) | Core workflow — clinics live and die by their agenda | HIGH | Google Calendar integration for availability; avoid building own calendar engine |
| Appointment confirmation via WhatsApp | Industry norm; patients expect automated confirmation message | MEDIUM | Template message sent upon booking; requires WhatsApp Business API approved template |
| Appointment reminder (24h / 1h before) | Directly reduces no-show rate — clinics actively measure this | MEDIUM | Scheduled job; configurable timing; WhatsApp + optional email/SMS fallback |
| No-show recovery message | Standard in BR clinic ops; most tools have this | MEDIUM | Sent X hours after missed appointment; auto-triggers re-scheduling flow |
| Operating hours enforcement | Agent must not message patients at 3am — legal and brand risk | LOW | Configurable per clinic; queue messages outside hours; LGPD risk if ignored |
| Manual human takeover / handoff | Not every conversation should be handled by AI; staff needs a kill switch | MEDIUM | "Take over" button stops AI, marks conversation as human-handled, alerts receptionist |
| Basic KPI dashboard | Clinic owners want to see conversion rates, appointments per day, no-show % | MEDIUM | MVP: leads created, appointments booked, conversion rate, no-shows |
| Multi-user access | Clinics have owners, managers, and receptionists — single login is a dealbreaker | MEDIUM | RBAC with at minimum owner/attendant distinction |
| WhatsApp connection status + QR code setup | Staff needs to connect and reconnect their WhatsApp number without developer help | MEDIUM | Evolution API QR code endpoint; reconnection flow; connection health indicator |
| LGPD consent collection | Legally mandatory before storing/processing patient data in Brazil | MEDIUM | Consent message sent before any data storage; log timestamp + response; right-to-erasure flow |
| Brazilian Portuguese UI and agent language | Market expectation; English UI = signal this tool is not built for Brazil | LOW | All copy, notifications, agent scripts in PT-BR; date/currency/phone formats BR |
| Mobile-responsive dashboard | Clinic owners check metrics on phone; receptionists use tablets | MEDIUM | Not a native app but must be fully functional on mobile browser |

---

### Differentiators (Competitive Advantage)

Features that existing Brazilian clinic tools (Clinicorp, iClinic, Doctoralia) do NOT do well or do not have. These are where CliniqAI wins.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Autonomous AI SDR with BANT qualification | Existing tools send template blasts; CliniqAI holds a real conversation that qualifies the lead before booking | HIGH | LangGraph state machine; BANT (Budget, Authority, Need, Timeline) detection; objection handling scripts; persona configuration per clinic |
| Configurable AI persona per clinic | A dermatology clinic sounds different from a dental clinic; persona customization is a B2B differentiator | MEDIUM | Name, tone, specialty vocabulary, persona instructions editable by clinic admin; stored in agent config |
| Objection handling playbook (built-in) | "It's too expensive," "I'll think about it," "Send me info" — AI knows how to respond | HIGH | Pre-built response trees for common objections; clinic can add custom objections; requires ongoing refinement |
| Intelligent follow-up sequences with cool-down | Automated multi-touch follow-up without spamming; respect cool-down windows between messages | HIGH | Configurable cadence; A/B variants; stop-on-reply; cool-down rules (e.g., 48h between touches); BullMQ scheduler |
| Lead scoring + AI annotations on card | AI writes a brief on each lead ("Interested in botox, concerned about price, best contacted mornings") after conversation | HIGH | Post-conversation summarization with GPT; stored as AI annotation on lead card; helps receptionist context-switch fast |
| Real-time conversation takeover with context preserved | Human takes over mid-AI-conversation and sees the full AI context — not just raw messages | MEDIUM | AI annotations + conversation summary shown to human agent; seamless handoff |
| Emergency escalation detection | AI detects medical emergency keywords and immediately alerts human + provides safety message | MEDIUM | Keyword/intent detection layer; configurable escalation list; alert via push + WhatsApp to clinic owner |
| Multi-channel notification (WhatsApp + email + SMS fallback) | WhatsApp fails? Message still gets through via email or SMS | MEDIUM | Twilio or similar for SMS; SMTP for email; fallback logic in notification service |
| A/B testing for follow-up message variants | Clinic owners can test which message template converts better | HIGH | Experimental feature; split traffic between message variants; track conversion per variant |
| Webhook-in integrations from ad platforms | Meta Ads / Google Ads lead forms push directly into CliniqAI CRM with no manual entry | MEDIUM | Generic webhook receiver; mappings for Meta Lead Ads, RD Station, ActiveCampaign |
| Webhook-out to ERPs / payment platforms | When appointment is confirmed, push data to clinic's billing or ERP system automatically | MEDIUM | Outbound webhook with configurable payload; retry on failure; event types: appointment.created, lead.converted |
| Multi-clinic management (agency view) | Agencies or clinic groups managing multiple locations need a single login with clinic switcher | HIGH | Multi-tenant data isolation; clinic switcher in UI; permission scoping per clinic |
| Rate limiting + anti-ban protection for WhatsApp | BR clinics have been banned from WhatsApp for spamming; built-in protection is a key safety feature | MEDIUM | Message rate limiter per number; queue with backpressure; random delay jitter between messages; Evolution API health check |
| Agent performance analytics | How many leads did the AI convert this month? Which step in the funnel has the most drop-offs? | HIGH | Funnel analytics per pipeline stage; AI vs human conversion comparison; message delivery/read rates |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full EMR / electronic medical records | Clinics ask "can it store patient history and procedures?" | Requires CFM/CRM medical record regulations, heavy data sovereignty requirements, LGPD sensitive health data special treatment — scope explosion. Competition with iClinic/Doctoralia on their home turf. | Deep integration via webhook to existing EMR (iClinic, Prontuário Fácil); CliniqAI stores only CRM-level data (name, phone, procedure interest, appointment history) |
| Payment processing / PIX checkout | "Can patients pay the deposit via WhatsApp?" is a common ask | PCI-DSS compliance, financial licensing, fraud liability — completely different regulatory domain from health CRM | Webhook to payment platform (Stripe, PagSeguro, Asaas); send payment link via WhatsApp |
| Voice AI / phone call answering | "Answer missed calls automatically" sounds like AI SDR extension | Telephony stack is a separate infrastructure domain; latency requirements for voice are unforgiving; Brazilian telecom regulations add complexity | Stay WhatsApp-first; mention voice AI as v3 roadmap item only after WhatsApp conversion is proven |
| Real-time sentiment analysis dashboard | "Show me how patients feel about us" sounds like insight | Sentiment at conversation-level is useful; live emotion detection dashboard is noise. Encourages over-monitoring rather than improving conversations | Provide post-conversation sentiment tag (positive/neutral/negative) on lead card; aggregate per week in analytics |
| Social media direct message integration (Instagram DMs, Facebook Messenger) | "We get leads on Instagram too" is true | Each channel is a separate API integration with different rate limits and message types; dramatically multiplies surface area before core WhatsApp flow is validated | Build WhatsApp SDR first; add Instagram DM as a v2 channel via Meta Business API once core is stable |
| AI medical diagnosis or symptom checker | Clinics sometimes request "help screen which patients need urgent care" | CFM (Federal Council of Medicine) regulations prohibit AI from providing medical opinions; LGPD treatment of health data requires special safeguards; legal liability | Agent explicitly disclaims: "Sou a assistente da clínica, não sou médico. Por favor aguarde o contato de um profissional."; escalate to human for any clinical question |
| Native iOS/Android app | "Our receptionists need a phone app" | Doubles development cost and time; App Store / Play Store review cycles; push notification certificates; duplicates web dashboard maintenance | Ship a mobile-first progressive web app (PWA) with push notifications via web push; test if that satisfies usage before investing in native |
| Custom WhatsApp chatbot flow builder (visual) | "Can we drag-and-drop our own flows?" | Most clinic staff can't configure flows correctly; bad configurations break the SDR; support burden spikes | Provide AI persona + objection-handling configuration UI instead; let CliniqAI team manage flow updates via config, not visual builder |
| Internal team chat / collaboration | "Can we message each other about a patient inside the app?" | This is Slack/Teams scope; diverts focus from the core conversion loop | Add internal notes on lead card (not chat); external tools (WhatsApp groups, Slack) for team coordination |

---

## Feature Dependencies

```
[LGPD Consent Collection]
    └──required by──> [Any Lead Data Storage]
                          └──required by──> [Lead Card / CRM]
                                                └──required by──> [Kanban Pipeline]

[WhatsApp Connection (Evolution API)]
    └──required by──> [Message Inbox]
    └──required by──> [AI SDR Agent Messaging]
    └──required by──> [Appointment Confirmation]
    └──required by──> [Follow-up Sequences]
    └──required by──> [No-show Recovery]

[AI SDR Agent]
    └──required by──> [BANT Qualification]
    └──required by──> [Objection Handling]
    └──required by──> [Lead Scoring / AI Annotations]
    └──required by──> [Emergency Escalation Detection]

[Google Calendar Integration]
    └──required by──> [Appointment Scheduling]
    └──required by──> [Availability Check Before Booking]
    └──required by──> [Appointment Reminders (scheduled from booking)]

[Appointment Scheduling]
    └──required by──> [Appointment Confirmation Message]
    └──required by──> [Appointment Reminders]
    └──required by──> [No-show Recovery]

[Lead Card / CRM]
    └──enhanced by──> [AI Annotations]
    └──enhanced by──> [Lead Scoring]
    └──enhanced by──> [Conversation Timeline]

[Multi-tenant Architecture]
    └──required by──> [Multi-clinic Management View]
    └──required by──> [Isolated WhatsApp Instance per Clinic]
    └──required by──> [Per-clinic AI Persona Config]

[Follow-up Sequences]
    └──requires──> [BullMQ / Job Scheduler]
    └──conflicts with──> [Manual Human Takeover] (human takeover must pause sequences)

[Human Takeover]
    └──conflicts with──> [AI SDR Auto-response] (mutual exclusion per conversation)
    └──requires──> [Conversation State flag: ai_active | human_active]

[Webhook-in (Lead Sources)]
    └──requires──> [Lead Intake / CRM]
    └──enhanced by──> [AI SDR Agent] (auto-engages new webhook leads)

[Rate Limiting / Anti-ban]
    └──required by──> [Follow-up Sequences] (sequences must respect rate limits)
    └──required by──> [AI SDR Messaging] (all outbound messages go through rate limiter)
```

### Dependency Notes

- **LGPD Consent requires lead storage:** No data can be persisted before consent is logged. This means the consent collection message is the FIRST thing the AI sends to any new lead, before storing name or procedure interest.
- **WhatsApp Connection is a blocker for all messaging:** The entire SDR, notifications, and follow-up stack is inoperable without a healthy Evolution API connection. Connection health monitoring is therefore a P1 operational feature.
- **Appointment Scheduling requires Google Calendar:** Building a custom calendar engine for MVP is a trap. Google Calendar integration must be established before the scheduling flow can be built.
- **Human Takeover conflicts with AI auto-response:** The conversation must have a single authoritative state (AI or human). Mixed state creates double-messaging bugs. Implement as a mutex flag on the conversation record.
- **Follow-up Sequences must check Human Takeover state:** A sequence firing while a human is mid-conversation with a patient is a critical UX/trust failure. Sequences must query the conversation state flag before firing any message.
- **Rate Limiting is a cross-cutting concern:** Every outbound message (AI SDR, confirmations, reminders, follow-ups) must pass through the rate limiter. Build this as a middleware in the message dispatch layer, not as a feature bolt-on.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — must validate the core conversion loop: lead comes in via WhatsApp → AI qualifies → appointment booked.

- [ ] **WhatsApp connection via Evolution API** — without this, nothing works
- [ ] **LGPD consent collection on first message** — legally mandatory before storing any data
- [ ] **Lead auto-creation from incoming WhatsApp** — core intake; deduplication by phone
- [ ] **AI SDR agent with basic BANT qualification flow** — the core product differentiator; must work before anything else
- [ ] **Human takeover (kill switch)** — safety net; clinic staff won't trust the AI without a reliable escape hatch
- [ ] **Google Calendar integration + appointment booking** — converts a qualified lead into a confirmed appointment; this is the money moment
- [ ] **Appointment confirmation message via WhatsApp** — immediate feedback to patient that booking succeeded
- [ ] **Kanban CRM pipeline (lead cards + pipeline view)** — gives clinic manager visibility into the funnel
- [ ] **Basic KPI dashboard (leads, appointments, conversion rate)** — proves ROI to clinic owner; required for renewal decisions
- [ ] **Operating hours enforcement** — prevents off-hours messaging; brand and legal protection
- [ ] **Multi-user access (owner + attendant roles)** — single-user tool is unusable in a clinic setting

### Add After Validation (v1.x)

Add once core SDR-to-appointment loop is working and at least 3 clinics are using it actively.

- [ ] **Appointment reminders (24h / 1h before)** — validated impact on no-show rate reduction; add once base scheduling works
- [ ] **No-show recovery message** — add once appointment flow is stable
- [ ] **Follow-up sequences with cool-down rules** — drives re-engagement for unconverted leads; add once BANT flow is validated
- [ ] **AI annotations / lead scoring** — summarizes conversation context; add once agent conversations are happening at volume
- [ ] **Configurable AI persona** — allows onboarding more clinic types; add after first cohort validates default persona
- [ ] **Webhook-in from ad platforms (Meta Lead Ads)** — needed once clinics want to pipe ad leads directly; a strong retention feature
- [ ] **Rate limiting / anti-ban protection** — becomes critical once message volume grows; implement before scaling past 5 clinics
- [ ] **RBAC (admin / manager roles)** — needed when clinic groups or agencies onboard

### Future Consideration (v2+)

Defer until product-market fit is established and revenue is predictable.

- [ ] **A/B testing for follow-up variants** — requires sufficient message volume to get significance; premature at MVP stage
- [ ] **Multi-clinic management (agency view)** — valuable for scaling but adds architectural complexity; defer until first multi-location client
- [ ] **Webhook-out to ERPs / payment platforms** — high value for enterprise clinics; requires custom integration work per client
- [ ] **Agent performance analytics (funnel per stage, AI vs human)** — requires enough data history to be meaningful
- [ ] **Multi-channel notifications (email + SMS fallback)** — WhatsApp is sufficient for BR market at MVP; add channels when WhatsApp delivery failures become reported
- [ ] **Emergency escalation detection** — important but edge case at MVP volume; add before reaching 50+ concurrent conversations
- [ ] **Voice AI / phone answering** — completely separate infrastructure; not before v3
- [ ] **Instagram DM / Meta Messenger integration** — additional channels; validate WhatsApp-first model fully before expanding
- [ ] **Native mobile app** — PWA covers the mobile need at MVP; native only if user research demands it

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| WhatsApp connection + message inbox | HIGH | MEDIUM | P1 |
| LGPD consent collection | HIGH | LOW | P1 |
| AI SDR agent (BANT qualification) | HIGH | HIGH | P1 |
| Lead auto-creation from WhatsApp | HIGH | LOW | P1 |
| Human takeover (kill switch) | HIGH | MEDIUM | P1 |
| Google Calendar + appointment booking | HIGH | HIGH | P1 |
| Appointment confirmation message | HIGH | LOW | P1 |
| Kanban CRM pipeline | HIGH | MEDIUM | P1 |
| Operating hours enforcement | HIGH | LOW | P1 |
| Multi-user access (owner + attendant) | HIGH | MEDIUM | P1 |
| Basic KPI dashboard | HIGH | MEDIUM | P1 |
| Appointment reminders (24h/1h) | HIGH | MEDIUM | P2 |
| No-show recovery message | HIGH | LOW | P2 |
| Follow-up sequences with cool-down | HIGH | HIGH | P2 |
| AI lead annotations / lead scoring | MEDIUM | HIGH | P2 |
| Configurable AI persona per clinic | HIGH | MEDIUM | P2 |
| Rate limiting / anti-ban protection | HIGH | MEDIUM | P2 |
| Webhook-in from Meta Lead Ads | MEDIUM | MEDIUM | P2 |
| RBAC (admin / manager) | MEDIUM | MEDIUM | P2 |
| Emergency escalation detection | MEDIUM | MEDIUM | P2 |
| A/B testing for follow-up variants | MEDIUM | HIGH | P3 |
| Multi-clinic management view | MEDIUM | HIGH | P3 |
| Webhook-out to ERPs | MEDIUM | MEDIUM | P3 |
| Agent performance analytics | MEDIUM | HIGH | P3 |
| Multi-channel notifications (email/SMS) | LOW | MEDIUM | P3 |
| Instagram DM integration | MEDIUM | HIGH | P3 |
| Native mobile app | LOW | HIGH | P3 |

---

## Competitor Feature Analysis

Research note: Direct product access was not available during this session. Analysis below is based on training data (through August 2025) on publicly documented features of Brazilian clinic SaaS competitors. Confidence: MEDIUM. Recommend validating via direct trials before finalizing roadmap.

| Feature | Clinicorp / iClinic (BR incumbents) | Doctoralia (marketplace model) | CliniqAI Approach |
|---------|--------------------------------------|-------------------------------|-------------------|
| WhatsApp automation | Template blasts; no AI conversation | Notification messages only; no SDR | Full AI SDR — holds a qualifying conversation, not just sends templates |
| Lead qualification | Manual by receptionist | Patients self-serve booking form | BANT qualification flow by AI before booking |
| CRM pipeline | Basic patient list; limited funnel view | No CRM; marketplace model | Kanban pipeline with AI-annotated lead cards |
| Follow-up sequences | Manual or basic automation | None | Intelligent sequences with cool-down, A/B, stop-on-reply |
| Objection handling | Not present | Not present | Built-in objection playbooks (price, urgency, info-seekers) |
| Google Calendar sync | Some integrations | No (uses own calendar) | Native integration — real-time availability check before booking |
| LGPD compliance | Basic (consent checkbox) | GDPR-aligned (EU parent) | First-message consent flow with timestamped log and erasure endpoint |
| Multi-tenant | Yes (enterprise plans) | Yes (marketplace) | Native multi-tenant from day one; data isolation at DB level |
| Human handoff | Not AI; all human | Not applicable | Explicit AI/human mutex; context preserved on handoff |
| Rate limiting / anti-ban | Not a concern (no mass messaging) | Not applicable | Built-in; critical protection for WhatsApp-first strategy |

---

## Sources

- Training data: Brazilian healthtech SaaS ecosystem knowledge through August 2025 — MEDIUM confidence
- Clinicorp product documentation (training data, not live fetch) — MEDIUM confidence
- iClinic product documentation (training data, not live fetch) — MEDIUM confidence
- Doctoralia platform model (training data, not live fetch) — MEDIUM confidence
- Evolution API documentation on WhatsApp Business API patterns — MEDIUM confidence
- LGPD (Lei Geral de Proteção de Dados, Lei 13.709/2018) — HIGH confidence (public law)
- CFM Resolution 2.227/2018 on telemedicine and AI in medicine — HIGH confidence (public regulation)
- WhatsApp Business Policy on messaging limits and template requirements — MEDIUM confidence (training data)
- LangGraph documentation patterns for conversational agents — MEDIUM confidence (training data)

**Gaps requiring live verification before roadmap finalization:**
- Direct Clinicorp / iClinic product trial to confirm missing WhatsApp AI features
- Evolution API current rate limit documentation (WhatsApp Business API policies change frequently)
- CFM/CRM current regulations on AI-generated patient communications (regulatory landscape is evolving)
- LGPD sensitive health data classification and whether procedure inquiries qualify (legal gray area)

---

*Feature research for: AI-powered clinic management SaaS (CliniqAI) — Brazilian market*
*Researched: 2026-04-02*
