# Pitfalls Research

**Domain:** AI-powered clinic management SaaS — WhatsApp SDR agent, CRM, scheduling, Brazilian medical market
**Researched:** 2026-04-02
**Confidence:** MEDIUM (training knowledge + official docs patterns; WebSearch/WebFetch unavailable for live verification)

---

## Critical Pitfalls

### Pitfall 1: WhatsApp Number Bans from Unsolicited Automated Messages

**What goes wrong:**
The clinic's WhatsApp number gets banned by Meta within days of production launch. The AI SDR sends proactive messages to leads who never initiated contact, or sends too many messages too fast. Meta's anti-spam systems flag the number. Evolution API/Baileys operates outside the official Meta Business API, making bans more likely and harder to appeal.

**Why it happens:**
Developers focus on "does the message send?" and ignore Meta's behavior policies. Testing with small volumes passes fine. Production volume with outbound prospecting triggers detection. The Baileys-based approach (unofficial API) has zero protection — no official business account status to protect. Teams assume "it's a business use case" exempts them.

**How to avoid:**
- Implement strict rate limiting: maximum 1 message per contact per conversation turn, with minimum 3-second delays between sequential messages
- Never send first-contact outbound messages — only respond to inbound leads who messaged first
- Use message templates for confirmations/reminders (even in Baileys, structured messages look less spammy)
- Implement a warm-up period for new WhatsApp numbers (gradually increase volume over 2–4 weeks)
- Keep a backup WhatsApp number ready for instant failover
- Document the number's "age" and activity history before attaching to the platform

**Warning signs:**
- Messages delivered but no read receipts appearing (shadow block)
- QR code scanning fails on reconnection without clear error
- Evolution API webhook returns 200 but contact reports not receiving messages
- Sudden drop in conversation reply rates without content changes

**Phase to address:**
WhatsApp integration phase — rate limiting and message policy must be implemented before any production traffic, not added later.

---

### Pitfall 2: LangGraph Agent Enters Infinite Loops on Edge Cases

**What goes wrong:**
The AI SDR agent gets stuck in a loop when a lead sends unexpected input — a voice message the agent can't process, a sticker, a location pin, or simply replies "??" to every question. The agent repeatedly tries to interpret the input, fails, apologizes, and asks the same clarifying question in a loop. In production, this consumes tokens, confuses leads, and can flood the conversation.

**Why it happens:**
LangGraph state machines are designed for happy-path flows. Developers build the qualification flow (BANT, objection handling) thoroughly but don't design explicit fallback nodes for unrecognized inputs, non-text media, or conversation stalls. The retry/error handling is left to the LLM prompt which may just regenerate a similar response.

**How to avoid:**
- Add a dedicated `fallback_node` that fires after 2 consecutive unresolvable inputs — it sends a human handoff trigger
- Implement a `max_turns_without_progress` counter in state (e.g., if 3 turns pass without moving pipeline stage, escalate)
- Add explicit media-type detection before routing to LLM: voice messages → "I can't listen to audios, please type your message"; stickers/images → ignore or acknowledge briefly
- Set a hard maximum turn count per conversation session in graph config
- Test with adversarial inputs: all caps, emojis only, very long messages, phone numbers/CPF embedded in text

**Warning signs:**
- Agent apology messages appearing 3+ times in a single conversation log
- Token usage spiking disproportionately on specific conversation threads
- A single conversation consuming more than 15 LLM turns
- "I didn't understand" appearing as the agent's last N responses

**Phase to address:**
AI agent core phase — loop guards must be built into the initial state machine design, not retrofitted. LangGraph graph topology changes after initial build are expensive.

---

### Pitfall 3: LGPD Consent Collected Too Late in the Flow

**What goes wrong:**
The AI SDR starts collecting lead information (name, phone, health condition of interest, procedure interest) before obtaining explicit LGPD consent. Even if consent is eventually collected, the data processing that happened before it violates LGPD Article 7. In a medical context this is especially severe because health-related data is "sensitive personal data" under LGPD Article 11, requiring explicit consent and stricter handling.

**Why it happens:**
Developers add a consent checkbox/message as an afterthought — often as the last step of onboarding or buried in terms. The BANT qualification flow naturally collects health-intent data (e.g., "What procedure are you interested in?") which constitutes sensitive health data under LGPD even if not a medical record.

**How to avoid:**
- Consent MUST be the first interaction — before the agent asks any qualifying question
- The consent message must explicitly name: (a) what data is collected, (b) who processes it, (c) the purpose, (d) retention period, (e) the right to erasure contact
- Store consent timestamp, IP/channel, and the exact consent message version shown — this is your legal evidence
- Build consent versioning into the data model from day one — when the privacy policy changes, existing leads need re-consent or data deletion
- Never allow the agent to continue qualification flow if consent is declined — it must stop and acknowledge
- Treat "procedure interest" data as sensitive health data requiring the stricter Article 11 basis

**Warning signs:**
- Any lead data stored in CRM before consent_given = true in the database
- Consent message text hardcoded anywhere (not in a versioned config)
- No consent_version or consent_timestamp columns in the leads table
- Missing DSAR (Data Subject Access Request) handler — a lead asks for their data and no one knows how to respond

**Phase to address:**
Foundation/data model phase — consent schema must be in the initial database migration. It cannot be added without a full data migration later.

---

### Pitfall 4: Google Calendar Scheduling Race Conditions

**What goes wrong:**
Two leads booked by the same agent (or two concurrent agent instances) get confirmed for the same time slot. The calendar availability check and the slot booking are not atomic — between the check and the create event call, another booking can sneak in. Leads arrive expecting an appointment that doesn't exist or conflicts with another patient.

**Why it happens:**
Developers query calendar availability (Google Calendar API freeBusy query), find a free slot, present it to the lead, wait for confirmation, then create the event. This confirmation wait (30 seconds to 5 minutes) is a wide race window. With even 10 concurrent leads, collisions happen within the first week.

**How to avoid:**
- Implement a slot reservation lock: when a slot is presented to a lead, immediately create a "tentative" calendar event (status: TENTATIVE) to block it
- Set a 5-minute TTL on tentative events — if lead doesn't confirm, auto-cancel via a scheduled cleanup job
- Convert TENTATIVE to CONFIRMED only when lead replies yes
- Use database-level slot locking (PostgreSQL advisory locks or an `appointments` table with UNIQUE constraint on `(clinic_id, start_time)`) as a second guard
- Never rely on Google Calendar alone as the source of truth for slot availability — your own database is authoritative

**Warning signs:**
- Duplicate bookings appearing in calendar even at low volume during testing
- Agent presenting the same time slot to two different leads in parallel test sessions
- No `appointments` table in the database schema (relying only on Google Calendar)
- Calendar sync happening only one-way (database to calendar, not calendar to database)

**Phase to address:**
Scheduling integration phase — the tentative-lock pattern must be designed into the booking flow from the start. Retrofitting it requires rewriting the entire booking confirmation flow.

---

### Pitfall 5: Human Handoff That Actually Traps the Lead

**What goes wrong:**
The AI agent correctly detects it cannot handle a situation and sends a "transferring you to a specialist" message. But the human attendant receives no notification, doesn't see the conversation in the dashboard, or responds hours later. The lead already moved on. The "handoff" feature technically works but functionally fails because the operational process around it was never built.

**Why it happens:**
Developers build the handoff trigger (agent stops responding, tags conversation as "needs human") and call it done. The notification to the human (push notification, WhatsApp message to attendant, dashboard alert, email) is deprioritized or treated as a future feature. The CRM lead card shows the handoff happened but no one acts on it.

**How to avoid:**
- Handoff must include: (a) instant notification to the assigned attendant via at least two channels, (b) SLA timer visible in the dashboard, (c) automated lead message informing wait time, (d) escalation if no human picks up within X minutes
- Build the attendant notification system in the same phase as the handoff feature — they are one feature, not two
- Include a "pick up conversation" action in the dashboard that immediately pauses the agent for that lead
- Log handoff reason in the lead timeline so the human has full context when they pick up

**Warning signs:**
- "Handoff" feature built but no attendant notification system in the backlog
- No way to distinguish "agent handling" vs "awaiting human" in the dashboard
- No SLA timer for open handoffs
- Human attendant says "I didn't know there was a lead waiting"

**Phase to address:**
AI agent + CRM dashboard phases — must be built in conjunction, not sequentially.

---

### Pitfall 6: Multi-Tenant Data Isolation Breaks Under Shared Infrastructure

**What goes wrong:**
A bug in clinic A's webhook handler causes it to process events intended for clinic B. Or a caching error causes clinic A's lead data to appear in clinic B's dashboard. In healthcare, this is not just a bug — it's a LGPD breach reportable to ANPD within 72 hours.

**Why it happens:**
Multi-tenancy is declared at the architecture level ("each clinic has clinic_id") but the actual isolation enforcement is inconsistent. Row-level security is applied to the leads table but not to the appointments table. Redis cache keys don't include tenant_id. Webhook routing logic has a fallback that processes events without validating tenant context.

**How to avoid:**
- Enable PostgreSQL Row Level Security (RLS) on every table from day one with a `clinic_id` policy — not just the sensitive ones
- Mandate `clinic_id` in every Redis cache key, every BullMQ job payload, and every webhook event
- Write automated tests that verify tenant A cannot access tenant B's data, even with valid auth tokens
- Use a middleware layer that sets the tenant context on every request and asserts it's always present before any database query
- Never use a "default" tenant fallback — missing tenant context must throw, not silently default

**Warning signs:**
- Any database query without a WHERE clinic_id = $tenantId clause
- Cache keys that don't contain tenant identifier
- Webhook handler that processes events before validating the `instance` or `clinic_id` claim
- Test suite without cross-tenant isolation tests

**Phase to address:**
Foundation/architecture phase — RLS and tenant middleware must be in the initial schema and API layer. Retrofitting multi-tenant isolation after the fact requires auditing every query in the codebase.

---

### Pitfall 7: Evolution API Webhook Reliability — Missed Messages and Duplicates

**What goes wrong:**
The AI agent intermittently misses inbound WhatsApp messages. Or processes the same message twice, sending two identical replies to a lead. Evolution API delivers webhooks with at-least-once semantics — retries on timeout can cause duplicate delivery. If the webhook endpoint is slow or down (even 1–2 seconds), events queue and deliver out of order.

**Why it happens:**
Developers build a simple webhook endpoint that processes messages synchronously — receives event, calls LLM, sends reply. This works in development. In production, LLM latency (2–10 seconds) causes webhook timeouts, triggering Evolution API retries. The same message is processed twice. No deduplication exists.

**How to avoid:**
- Webhook endpoint must return 200 within 500ms — immediately enqueue the event to BullMQ, return 200, process asynchronously
- Store a `message_id` index in Redis/database — check before processing: if already seen, discard silently
- Use BullMQ's `jobId` set to the WhatsApp `messageId` to naturally deduplicate at the queue level
- Implement idempotent message processing: processing the same message twice must produce the same outcome
- Log every webhook event with its messageId before any processing begins

**Warning signs:**
- Webhook handler that calls OpenAI/LangChain synchronously inside the HTTP handler
- No message deduplication logic anywhere in the codebase
- Leads reporting "the bot replied to me twice"
- Webhook response time > 1 second in production logs

**Phase to address:**
WhatsApp integration phase — queue-first architecture for webhook processing must be designed from the start.

---

### Pitfall 8: CFM/CRM Medical Ethics Violations by the AI Agent

**What goes wrong:**
The AI agent makes statements that constitute practicing medicine without a license or violate CFM (Conselho Federal de Medicina) regulations. Examples: agent says "this procedure will definitely fix your problem," speculates about a patient's diagnosis based on symptoms described over WhatsApp, or makes before/after result promises. In Brazil, this can result in the clinic's CRM (Conselho Regional de Medicina) license being suspended.

**Why it happens:**
LLM models are helpful and want to answer questions fully. Without strict guardrails, a question like "Will botox help my forehead wrinkles?" naturally gets answered with medical certainty. The system prompt says "don't diagnose" but the LLM finds creative ways around it when leads push.

**How to avoid:**
- Build a pre-response classifier (a fast, cheap LLM call) that checks every agent response before sending: does this contain diagnosis language, result promises, or medical advice?
- Maintain an explicit blocklist of phrases: "vai curar", "garante resultado", "você tem", "o seu problema é", "esse procedimento resolve"
- System prompt must include specific Brazilian medical ethics rules, not just "don't give medical advice"
- Agent should redirect medical questions to: "Essa pergunta deve ser respondida pelo médico durante sua consulta — posso agendar?"
- Log and review flagged responses weekly during the first month of production

**Warning signs:**
- System prompt has generic "don't give medical advice" without specific Brazilian context
- No automated response review/flagging in the pipeline
- Agent answers "será que eu tenho..." type questions with any specificity
- No human review process for AI responses in the first 90 days

**Phase to address:**
AI agent guardrails phase — ethics constraints must be built and tested before the first real patient conversation.

---

### Pitfall 9: Scheduling Reminder Fatigue Causing Opt-Outs

**What goes wrong:**
The automated notification system sends too many reminders — confirmation, 48h reminder, 24h reminder, 2h reminder, "we're waiting for you" message. Patients opt out of WhatsApp contact with the clinic, and the clinic loses its communication channel entirely. WhatsApp opt-outs are permanent until the user reverses them.

**Why it happens:**
Each reminder individually seems reasonable. The aggregate experience for the patient is overwhelming. Developers test individual notification flows, not the full notification sequence a single patient experiences from booking to appointment.

**How to avoid:**
- Maximum 3 notifications per appointment: confirmation (immediate), reminder 24h before, day-of reminder 2h before
- Make notification preferences configurable per clinic AND per patient (patient can opt down)
- Implement a global cooldown: never send more than 1 WhatsApp message per patient per 4-hour window across ALL notification types
- Track opt-outs in the database and never message opted-out contacts
- A/B test reminder sequences with real clinics before hardcoding defaults

**Warning signs:**
- More than 3 automated messages defined for a single appointment lifecycle
- No opt-out tracking in the database
- No cross-notification cooldown mechanism
- Notification preferences only settable at clinic level, not patient level

**Phase to address:**
Notification system phase — frequency caps and opt-out tracking must be in the initial notification design.

---

### Pitfall 10: AI Agent Context Window Overflow on Long Conversations

**What goes wrong:**
Long conversations (20+ turns) start causing the AI agent to forget earlier context, repeat questions already asked ("What's your name?" to a lead who gave their name 10 turns ago), or act confused about the lead's stated interests. This destroys trust and conversion rate.

**Why it happens:**
The conversation history is naively passed as full message history to the LLM. As conversations grow, the context window fills, and either: (a) older messages get truncated and lost, (b) the full context exceeds the model's limit causing errors, or (c) token costs spike unpredictably.

**How to avoid:**
- Implement structured state in LangGraph, not just raw message history. Lead name, procedure interest, qualification stage, confirmed slots — these live in typed state fields, not in the chat log
- Use a summary node: after every 5 turns, compress the last 5 turns into a structured summary appended to state
- Never pass more than the last 8 turns of raw conversation to the LLM — older context lives in structured state
- Store conversation summaries in PostgreSQL for lead timeline, not in the LLM context

**Warning signs:**
- Entire conversation history passed as messages array to the LLM without summarization
- No structured state fields for lead data (everything inferred from chat history each turn)
- Token usage growing linearly with conversation length
- Agent asking for information the lead already provided

**Phase to address:**
AI agent architecture phase — state schema design must happen before any agent flow is built.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode system prompt in code | Faster to develop | Can't A/B test, no versioning, requires redeploy to tune agent | Never — use database-stored, versioned prompts from day one |
| Use clinic_id only in WHERE clauses, skip RLS | Simpler queries | Data leaks when query is forgotten, no defense in depth | Never — RLS is the safety net |
| Store WhatsApp session state only in Evolution API | Less code to write | Instance crashes lose all session context, reconnect requires QR scan per user | Never — persist session state independently |
| Use single-stage webhook processing (sync) | Simpler code | LLM latency causes webhook timeouts, duplicate processing, message loss | Never in production — queue-first from day one |
| Consent as a UI checkbox, not a database event | Faster to build | No audit trail, no legal evidence, LGPD violation | Never — consent must be a database event with timestamp and version |
| Skip BANT state machine, use LLM to "remember" | Less upfront design | Context window overflow, inconsistent qualification, no structured lead data | Prototype only, never production |
| Single shared WhatsApp number for multiple tenants | Cheaper infrastructure | Impossible to attribute conversations to clinics, no isolation | Never — each clinic needs its own instance |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Evolution API | Treating it like official WhatsApp Business API — assuming SLA, uptime guarantees, and Meta policy protection | Treat it as a best-effort unofficial client: build reconnection logic, handle 503s gracefully, keep backup numbers |
| Evolution API | Blocking webhook endpoint while processing | Return 200 in <500ms, process async via BullMQ |
| Evolution API | Using the same instance name across environments (dev/staging/prod) | Each environment needs its own named instance; instance names are global in Evolution API |
| Google Calendar | Checking freeBusy then booking without lock | Implement TENTATIVE event as a distributed lock |
| Google Calendar | Using a single OAuth token shared across tenants | Each clinic authorizes their own Google Calendar via OAuth — tokens are per-clinic, stored encrypted |
| Google Calendar | Not handling token refresh failures silently | Token expiry must trigger an immediate dashboard alert to clinic admin, not silent failure |
| OpenAI/LLM API | No timeout + no retry | Set 30s timeout, retry with exponential backoff up to 3 times, fall back to human handoff on persistent failure |
| OpenAI/LLM API | Logging full prompt and response to application logs | Logs may contain patient health intent data — LGPD requires same protection as patient records; log only structured metadata |
| LGPD / ANPD | Treating consent as a one-time checkbox | Consent must be versioned; when privacy policy changes, need re-consent workflow |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous LLM calls in webhook handler | Webhook timeouts, duplicate messages | Queue-first: enqueue event, process async | First concurrent conversation in production |
| Loading full conversation history per turn | High token costs, slow responses, eventual context overflow | Store structured state separately; limit raw history to last 8 turns | ~15 turns per conversation |
| Polling Google Calendar instead of caching availability | Slow booking confirmations, Calendar API rate limit errors | Cache available slots with 5-min TTL in Redis, invalidate on booking | 5+ concurrent booking sessions |
| No Redis for WhatsApp session deduplication | Same message processed multiple times under load | Redis SET NX for message_id deduplication with 24h TTL | First production webhook retry storm |
| CRM Kanban loading all leads per stage in single query | Dashboard slow to load for clinics with 500+ leads | Paginate per stage, index on (clinic_id, stage, created_at) | ~300 leads per clinic |
| Real-time conversation updates via polling | Unnecessary load, poor UX latency | Use WebSockets or SSE for conversation dashboard | >10 concurrent conversations per clinic |
| No database indexes on clinic_id + timestamps | Slow reporting queries from the start | Add composite indexes on all frequently filtered columns in initial migration | ~1000 leads per clinic |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing LLM API keys in environment variables without rotation policy | Compromised key = all clinics' conversations accessible by attacker | Use a secrets manager (e.g., Doppler, AWS Secrets Manager); rotate keys quarterly |
| Webhook endpoint with no signature verification | Any attacker can inject fake lead events or conversation data | Verify Evolution API webhook HMAC signature on every request |
| Patient health-intent data in plain text in logs | LGPD breach if logs are accessed; health data is sensitive category | Redact or never log message content; log only message IDs and metadata |
| WhatsApp instance credentials stored unencrypted | Instance takeover allows attacker to message all clinic contacts | Encrypt session tokens at rest using AES-256 |
| No rate limiting on the webhook endpoint itself | DoS attack floods the queue, processing delays for all tenants | Rate limit webhooks per instance ID at the nginx/gateway layer |
| Admin panel with no IP allowlist or 2FA | Clinic's entire patient lead data exposed on credential theft | Enforce 2FA for all dashboard accounts; consider IP allowlisting for admin roles |
| Google OAuth refresh tokens stored in application database unencrypted | Calendar access token theft gives attacker ability to create/delete appointments | Encrypt OAuth tokens at rest, audit token access |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Agent replies instantly (0ms delay) | Feels robotic, unnatural, patients distrust it | Add 1–3s human-mimicking typing delay before sending response |
| Agent sends walls of text | Leads stop reading, disengage | Maximum 3 sentences per WhatsApp message; split long responses into 2–3 sequential short messages |
| Agent uses formal "você" everywhere | Feels cold for aesthetic clinic context; Brazilian informal norm is "você" informal or first name | Use first name + informal register by default; make this configurable per clinic persona |
| Dashboard uses UTC timestamps | Clinic staff confused, schedule errors | All times displayed in clinic's configured timezone (Brazil has 4 time zones) |
| Onboarding requires connecting WhatsApp before anything else | High friction; clinic can't explore features before committing | Show demo/sandbox mode first; WhatsApp connection as step 3+, not step 1 |
| Kanban pipeline stages hardcoded | Clinics have different workflows; they'll want to rename or add stages | Allow custom stage names from day one, even if number of stages is fixed |
| Human handoff with no context passed | Attendant picks up conversation cold, asks questions lead already answered | Pass full conversation summary + structured lead data to attendant view |

---

## "Looks Done But Isn't" Checklist

- [ ] **WhatsApp Integration:** Appears to send/receive messages — verify deduplication, reconnection after 24h session idle, and rate limiting are implemented and tested
- [ ] **LGPD Consent:** Form is present — verify consent is stored as a database event with timestamp, message version, and channel; verify no data is stored before consent
- [ ] **Human Handoff:** Agent stops responding — verify attendant notification fires, SLA timer is visible, and agent resumes correctly when attendant releases the conversation
- [ ] **Google Calendar Booking:** Events appear in calendar — verify TENTATIVE lock prevents double-booking, token refresh failure triggers alert, and cancellation propagates bidirectionally
- [ ] **Multi-tenant Isolation:** Each clinic sees only their data — verify with cross-tenant test (clinic A token cannot read clinic B leads), RLS is active on every table, and Redis keys are tenant-scoped
- [ ] **AI Agent Guardrails:** Agent doesn't give medical advice in happy-path test — verify with adversarial inputs ("tenho dor, o que pode ser?", "esse procedimento vai funcionar pra mim?"), loop detection, and max-turn limits
- [ ] **Follow-up Sequences:** First message sends — verify cooldown rules fire, opt-out tracking works, and sequences halt immediately on lead reply
- [ ] **Dashboard Timezone Display:** Times show correctly in developer's timezone — verify Brazil/São_Paulo, Brazil/Manaus, and Brazil/Acre timezones all display correctly

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| WhatsApp number banned | HIGH | New number warmup takes 2–4 weeks; implement number rotation and multi-number fallback before launch |
| Multi-tenant data leak | CRITICAL | ANPD breach notification within 72h; full audit required; potential LGPD fine up to 2% of revenue; fix RLS, audit all queries |
| LGPD consent violation discovered post-launch | HIGH | Must delete all data collected without valid consent; re-consent or re-acquire all leads; legal exposure |
| Double-booking race condition discovered | MEDIUM | Emergency manual reconciliation of affected appointments; implement TENTATIVE lock retroactively |
| Agent infinite loop in production | LOW-MEDIUM | Add max_turns guard via feature flag (no deploy needed if designed for it); monitor and manually intervene on stuck threads |
| Google OAuth token expiry causing missed appointments | MEDIUM | Re-auth flow for affected clinics; retroactively check for missed appointment creates during outage window |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| WhatsApp number bans | Phase: WhatsApp Integration | Rate limiting tests pass; warmup procedure documented |
| LangGraph infinite loops | Phase: AI Agent Core | Adversarial input test suite passes; max_turns config verified |
| LGPD consent too late | Phase: Foundation / Data Model | Audit confirms zero lead records exist before consent_given = true |
| Calendar race conditions | Phase: Scheduling Integration | Concurrent booking test (10 parallel requests for same slot) produces only 1 confirmed event |
| Human handoff traps lead | Phase: AI Agent + CRM Dashboard (same sprint) | E2E test: agent hands off, attendant receives notification within 60s |
| Multi-tenant data isolation | Phase: Foundation / Architecture | Cross-tenant access test: clinic A token returns 0 records for clinic B queries |
| Webhook duplicate processing | Phase: WhatsApp Integration | Replay same webhook event 3x, verify only 1 agent response sent |
| CFM/CRM medical ethics violations | Phase: AI Agent Guardrails | 20+ adversarial medical question tests; pre-response classifier blocks all |
| Reminder fatigue opt-outs | Phase: Notification System | Full appointment lifecycle test counts ≤3 messages to patient |
| Context window overflow | Phase: AI Agent Architecture | 30-turn conversation test: agent correctly recalls lead name and procedure interest |

---

## Sources

- Evolution API documentation patterns (training knowledge — MEDIUM confidence; WebFetch unavailable at research time)
- LangGraph state machine patterns — official LangChain/LangGraph docs concepts (training knowledge — MEDIUM confidence)
- LGPD Lei 13.709/2018 — Brazilian data protection law, Articles 7, 11, 46, 48 (HIGH confidence — public law text)
- CFM Resolução 2.336/2023 and related medical ethics regulations for digital health (MEDIUM confidence — training knowledge)
- WhatsApp Business Policy and anti-spam guidelines (MEDIUM confidence — official Meta policy, known patterns)
- Google Calendar API freeBusy / Events.insert documentation patterns (MEDIUM confidence — training knowledge)
- Multi-tenant SaaS architecture patterns — PostgreSQL RLS documentation (HIGH confidence — well-documented official feature)
- Brazilian healthcare SaaS post-mortems and community discussions (LOW confidence — training knowledge only, no live sources available)

---
*Pitfalls research for: AI-powered clinic management SaaS — WhatsApp SDR agent, CRM, scheduling, Brazilian medical market*
*Researched: 2026-04-02*
