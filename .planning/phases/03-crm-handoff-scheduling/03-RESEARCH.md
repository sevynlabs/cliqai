# Phase 3: CRM + Handoff + Scheduling - Research

**Researched:** 2026-04-02
**Domain:** CRM pipeline management, AI/human handoff mutex, Google Calendar OAuth scheduling
**Confidence:** MEDIUM-HIGH (core patterns HIGH; Google OAuth token storage MEDIUM; double-booking lock pattern MEDIUM)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CRM-01 | New WhatsApp conversation auto-creates lead card (deduplicated by phone number) | Lead upsert pattern using `remoteJid` as dedup key; Conversation model already exists |
| CRM-02 | Kanban pipeline view with drag-and-drop (Novo → Qualificado → Agendado → Confirmado → Atendido → Perdido) | @dnd-kit/core + @dnd-kit/sortable with shadcn/ui + TanStack Query optimistic updates |
| CRM-03 | Lead card with auto-populated data (name, phone, email, procedure, score, tags, timeline) | New Lead model needed; data comes from SDRState fields (leadName, procedureInterest, bantScore) |
| CRM-04 | AI generates annotations after each significant interaction (summary, objections, next steps) | LangGraph node adds annotation via CRM tool call; stored in LeadAnnotation model with JSONB |
| CRM-05 | Table view and list view alternatives to Kanban | TanStack Table ^8.x with column sorting, filtering, pagination |
| CRM-06 | Filters by source, procedure, professional, date, score, tags | Prisma query builder with dynamic WHERE clauses; TanStack Table column filters |
| CRM-07 | Global search by name, phone, email, or any field | PostgreSQL ILIKE query across Lead fields; RediSearch index optional for speed |
| HAND-01 | Attendant can take over conversation from AI with one click | REST endpoint flips Conversation.status to 'human_handling'; Redis key blocks AI processing |
| HAND-02 | AI context (summary, annotations) visible to human during takeover | Lead card + LeadAnnotation records served to frontend via CRM API |
| HAND-03 | Attendant can return conversation to AI agent | REST endpoint calls AgentService.returnToAgent(); resets LangGraph state fields |
| HAND-04 | AI/human mutex prevents both from responding simultaneously | Redis SET NX key `mutex:conversation:{threadId}` checked by MessageProcessor before agent call |
| SCHED-01 | Google Calendar OAuth integration per clinic (multi-calendar per professional) | googleapis ^140.x OAuth2 flow; CalendarToken model stores refresh tokens per professional |
| SCHED-02 | Agent checks real-time availability before suggesting appointment slots | `calendar.freebusy.query()` with freeBusy API; returns busy ranges → infer free slots |
| SCHED-03 | Agent creates calendar event with patient details upon confirmation | `calendar.events.insert()` with status: 'tentative' first, then 'confirmed' |
| SCHED-04 | Agent can cancel and reschedule appointments via conversation | `calendar.events.delete()` and `calendar.events.update()` in scheduling tools |
| SCHED-05 | Buffer time between appointments (configurable per procedure/professional) | Add `bufferMinutes` to Professional model; add to slot calculation in AvailabilityService |
| SCHED-06 | TENTATIVE event lock pattern to prevent double-booking race conditions | Create event with `status: 'tentative'` + Redis lock `booking:lock:{calendarId}:{slotISO}` |
| SCHED-07 | Operating hours and holiday blocking on calendar | Read from AgentConfig.operatingHoursStart/End; filter freeBusy results by working hours |
</phase_requirements>

---

## Summary

Phase 3 builds three interconnected subsystems on top of the Phase 2 foundation. The CRM service requires a new Lead model (the Conversation model exists but carries no CRM data), plus frontend Kanban and table views. The human handoff subsystem extends the existing `handoff_required` notification path by adding a Redis mutex that blocks the AI from responding when a human has taken over. The Google Calendar integration requires OAuth token storage per professional and a TENTATIVE-lock pattern to prevent double-booking race conditions.

The hardest problem in this phase is the double-booking race condition. When the AI suggests a slot, a window exists between checking availability and creating the event during which another booking can land. The correct pattern is: (1) create a Redis lock for the `{calendarId}:{slotISO}` key, (2) re-check freeBusy, (3) insert the event as TENTATIVE, (4) only release the lock after confirmation and status update to CONFIRMED. This prevents two concurrent agent threads from booking the same slot.

The AI/human mutex is simpler: a Redis key `mutex:conversation:{threadId}` set to `human` prevents the BullMQ MessageProcessor from calling AgentService when a human has taken over. The key is cleared when the attendant returns the conversation to AI, which also calls `AgentService.returnToAgent()` to reset LangGraph state.

**Primary recommendation:** Build in order 03-01 (CRM service + Lead model), then 03-02 (handoff mutex + UI takeover), then 03-03 (Google Calendar + schedule node in graph). Each plan depends on the previous one.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| googleapis | ^140.x | Google Calendar OAuth + CRUD | Official Google Node.js client; already planned in STACK.md |
| @dnd-kit/core | ^6.x | Drag-and-drop primitives | Accessibility-first, pointer/touch events, framework-agnostic core |
| @dnd-kit/sortable | ^8.x | Sortable Kanban cards across columns | Pairs with @dnd-kit/core; simpler API than react-beautiful-dnd (deprecated) |
| TanStack Table | ^8.x | Table/list view with sort/filter/pagination | Already in STACK.md; type-safe, headless (works with shadcn/ui rows) |
| TanStack Query | ^5.x | Client-side cache + optimistic updates | Already in STACK.md; essential for Kanban drag-and-drop optimistic state |
| ioredis | ^5.x | Redis mutex and lock operations | Already installed; use for `SET NX PX` atomic lock operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit/utilities | ^3.x | DnD helper utilities (CSS transforms, etc.) | Needed alongside @dnd-kit/sortable for transform animations |
| date-fns | ^3.x | Date arithmetic for slot calculation | Buffer time addition, operating hours boundary checks, slot generation |
| google-auth-library | ^9.x | OAuth2 client (bundled with googleapis) | Not installed separately; `googleapis` bundles it as `google-auth-library` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit | react-beautiful-dnd | react-beautiful-dnd is deprecated (unmaintained since 2023); @dnd-kit is the ecosystem standard |
| @dnd-kit | @hello-pangea/dnd | @hello-pangea/dnd is maintained fork of rbd; simpler API but less flexible; @dnd-kit wins on accessibility and performance |
| Google Calendar direct REST | Nylas Calendar API | Nylas abstracts multi-calendar but adds cost and vendor lock-in; googleapis gives full control |
| Redis SET NX lock | Redlock (multi-node) | Redlock is for Redis Cluster; single Redis instance uses SET NX EX with Lua release script |

**Installation (new packages only):**
```bash
# Backend (apps/api)
pnpm --filter @cliniq/api add googleapis

# Frontend (apps/web)
pnpm --filter @cliniq/web add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities date-fns
pnpm --filter @cliniq/web add @tanstack/react-table @tanstack/react-query
```

Note: TanStack Query and Table are in STACK.md but may not yet be installed in apps/web. Verify before planning.

---

## Architecture Patterns

### Recommended Project Structure (Phase 3 additions)
```
apps/api/src/modules/
├── crm/                          # NEW - Phase 3
│   ├── crm.module.ts
│   ├── leads/
│   │   ├── leads.service.ts      # upsert, update stage, search, filter
│   │   ├── leads.controller.ts   # REST: GET /leads, PATCH /leads/:id/stage
│   │   └── dto/
│   │       ├── create-lead.dto.ts
│   │       └── update-stage.dto.ts
│   ├── annotations/
│   │   └── annotations.service.ts   # AI annotation creation
│   └── pipeline/
│       └── pipeline.service.ts      # stage transition logic
├── scheduling/                   # NEW - Phase 3
│   ├── scheduling.module.ts
│   ├── calendar/
│   │   ├── calendar.service.ts   # OAuth flow, token CRUD
│   │   └── calendar.controller.ts  # GET /calendar/auth, GET /calendar/callback
│   ├── availability/
│   │   └── availability.service.ts  # freeBusy check + slot generation
│   └── appointments/
│       └── appointments.service.ts  # event CRUD + TENTATIVE lock pattern
└── agent/graph/nodes/
    └── schedule.node.ts          # NEW node for 'schedule' qualificationStage

packages/database/prisma/
└── schema.prisma                 # Lead, LeadAnnotation, CalendarToken, Appointment models

apps/web/app/(dashboard)/
├── crm/
│   ├── page.tsx                  # Kanban view (default)
│   ├── table/page.tsx            # Table view
│   └── [id]/page.tsx             # Lead detail page
└── conversations/
    └── [id]/
        └── takeover-bar.tsx      # Human takeover UI component
```

### Pattern 1: Lead Upsert on Conversation Creation

**What:** Every inbound WhatsApp message that creates a Conversation record also upserts a Lead record. Lead is deduplicated by `organizationId + phone` (derived from `remoteJid` by stripping `@s.whatsapp.net`).

**When to use:** MessageProcessor in whatsapp.inbound — called before AgentService.

**Example:**
```typescript
// leads.service.ts
async upsertFromConversation(organizationId: string, remoteJid: string): Promise<Lead> {
  // remoteJid format: "5511999999999@s.whatsapp.net"
  const phone = remoteJid.split('@')[0];

  return this.prisma.lead.upsert({
    where: { organizationId_phone: { organizationId, phone } },
    create: {
      organizationId,
      phone,
      conversationId: null, // linked after Conversation upsert
      stage: 'novo',
      source: 'whatsapp',
    },
    update: {
      updatedAt: new Date(),
    },
  });
}
```

### Pattern 2: AI/Human Mutex via Redis

**What:** A Redis key `mutex:conversation:{orgId}:{remoteJid}` controls whether the AI can respond. When an attendant takes over, this key is set to `"human"`. MessageProcessor checks this key before invoking AgentService. When the attendant releases, the key is deleted and `AgentService.returnToAgent()` resets LangGraph state.

**When to use:** HAND-01, HAND-03, HAND-04. This is the core safety mechanism.

**Example:**
```typescript
// message.processor.ts — check before agent call
const mutexKey = `mutex:conversation:${tenantId}:${remoteJid}`;
const holder = await this.redis.get(mutexKey);
if (holder === 'human') {
  this.logger.log(`Conversation ${remoteJid} is human-handled, skipping AI`);
  return; // do NOT invoke agent
}

// handoff.controller.ts — take over
async takeOver(orgId: string, remoteJid: string, userId: string): Promise<void> {
  const key = `mutex:conversation:${orgId}:${remoteJid}`;
  await this.redis.set(key, `human:${userId}`, 'EX', 86400); // 24h TTL safety
  await this.prisma.conversation.update({
    where: { organizationId_remoteJid: { organizationId: orgId, remoteJid } },
    data: { status: 'human_handling' },
  });
}

// handoff.controller.ts — return to AI
async returnToAI(orgId: string, remoteJid: string): Promise<void> {
  const key = `mutex:conversation:${orgId}:${remoteJid}`;
  await this.redis.del(key);
  const threadId = `${orgId}:${remoteJid}`;
  await this.agentService.returnToAgent(threadId); // already implemented
  await this.prisma.conversation.update({
    where: { organizationId_remoteJid: { organizationId: orgId, remoteJid } },
    data: { status: 'active' },
  });
}
```

### Pattern 3: Google Calendar OAuth per Clinic

**What:** Each clinic (organization) connects one or more Google Calendars via OAuth 2.0. Refresh tokens are stored encrypted in the `calendar_tokens` table per professional. The `googleapis` OAuth2 client uses `setCredentials({ refresh_token })` to auto-refresh access tokens.

**When to use:** SCHED-01. Required before any availability check or event creation.

**Example:**
```typescript
// calendar.service.ts
import { google } from 'googleapis';

getOAuth2Client(redirectUri: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  );
}

getAuthUrl(oauth2Client: any, state: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state, // encode orgId:professionalId for callback resolution
    prompt: 'consent', // CRITICAL: forces refresh_token on every grant
  });
}

// CRITICAL: 'prompt: consent' must be set — without it Google only returns
// refresh_token on FIRST authorization. If omitted and tokens are lost,
// the clinic must re-authorize from scratch.

async exchangeCode(code: string, oauth2Client: any): Promise<{ refreshToken: string }> {
  const { tokens } = await oauth2Client.getToken(code);
  return { refreshToken: tokens.refresh_token! };
}

getCalendarClient(refreshToken: string) {
  const oauth2Client = this.getOAuth2Client(/* redirect */);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: 'v3', auth: oauth2Client });
}
```

### Pattern 4: TENTATIVE Lock for Double-Booking Prevention

**What:** When the agent confirms a slot with the lead, the flow is:
1. Acquire Redis lock `booking:lock:{calendarId}:{slotISO}` (SET NX PX 30000)
2. Re-check freeBusy to confirm slot is still free (race-condition check)
3. Insert event as `status: 'tentative'`
4. Store appointment record in DB
5. Release Redis lock
6. When lead sends final confirmation: update event to `status: 'confirmed'`

If Redis lock acquisition fails, the slot is taken — offer alternatives.

**When to use:** SCHED-06. Every appointment creation MUST follow this flow.

**Example:**
```typescript
// appointments.service.ts
async bookSlot(params: BookSlotParams): Promise<Appointment> {
  const lockKey = `booking:lock:${params.calendarId}:${params.startISO}`;
  const lockToken = randomUUID();

  // Acquire lock with 30s TTL
  const acquired = await this.redis.set(lockKey, lockToken, 'NX', 'PX', 30_000);
  if (!acquired) {
    throw new ConflictException('Slot is being booked by another session');
  }

  try {
    // Re-check availability under lock
    const busy = await this.checkFreeBusy(params.calendarId, params.startISO, params.endISO);
    if (busy) throw new ConflictException('Slot no longer available');

    // Insert TENTATIVE event
    const calendar = this.calendarService.getCalendarClient(params.refreshToken);
    const event = await calendar.events.insert({
      calendarId: params.calendarId,
      requestBody: {
        summary: `[Cliniq] ${params.procedureName} - ${params.patientName}`,
        description: `Paciente: ${params.patientPhone}\nProcedimento: ${params.procedureName}`,
        start: { dateTime: params.startISO, timeZone: params.timezone },
        end: { dateTime: params.endISO, timeZone: params.timezone },
        status: 'tentative',
      },
    });

    // Persist appointment to DB
    return this.prisma.appointment.create({
      data: {
        organizationId: params.orgId,
        leadId: params.leadId,
        calendarEventId: event.data.id!,
        calendarId: params.calendarId,
        startAt: new Date(params.startISO),
        endAt: new Date(params.endISO),
        status: 'tentative',
      },
    });
  } finally {
    // Release lock using Lua script (atomic check-then-delete)
    await this.redis.eval(
      `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
      1, lockKey, lockToken
    );
  }
}
```

### Pattern 5: Schedule Node in LangGraph Graph

**What:** Add a `schedule` node to the SDR graph that handles the `schedule` qualificationStage. The node calls SchedulingService as a tool to check availability and create appointments. The existing graph already has a stub for `schedule` → `END`; this phase replaces it with a real node.

**When to use:** When `state.qualificationStage === 'schedule'` (all BANT fields true).

**Example:**
```typescript
// schedule.node.ts
export function createScheduleNode(schedulingService: SchedulingService, crmService: CrmService) {
  return async function scheduleNode(state: SDRState): Promise<Partial<SDRState>> {
    // Check availability for the clinic's calendar
    const slots = await schedulingService.getAvailableSlots(state.organizationId, state.procedureInterest);
    // LLM call to present slots naturally in PT-BR
    // ... returns message offering slots, or confirms booking
    return {
      messages: [new AIMessage(reply)],
      appointmentId: bookedAppointmentId ?? state.appointmentId,
    };
  };
}
```

**NOTE:** The schedule node must be added to SDRNodeFactory interface and wired in `sdr.graph.ts` to replace the `return END` stub at `qualificationStage === 'schedule'`.

### Pattern 6: Kanban with Optimistic Updates

**What:** Drag-and-drop Kanban using @dnd-kit/sortable. On card drop, call `updateStage` mutation via TanStack Query with `optimisticUpdate: true`. This lets the UI update immediately while the API call is in flight, reverting on error.

**When to use:** CRM-02 Kanban view.

**Example:**
```typescript
// useMutation with optimistic update
const updateStageMutation = useMutation({
  mutationFn: ({ leadId, stage }: { leadId: string; stage: string }) =>
    apiClient.patch(`/leads/${leadId}/stage`, { stage }),
  onMutate: async ({ leadId, stage }) => {
    await queryClient.cancelQueries({ queryKey: ['leads'] });
    const previous = queryClient.getQueryData(['leads']);
    queryClient.setQueryData(['leads'], (old: Lead[]) =>
      old.map(l => l.id === leadId ? { ...l, stage } : l)
    );
    return { previous };
  },
  onError: (_, __, context) => {
    queryClient.setQueryData(['leads'], context?.previous);
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
});
```

### Anti-Patterns to Avoid

- **Calling AgentService directly from the handoff takeover HTTP handler:** The takeover API endpoint ONLY sets the Redis mutex and updates DB status. It does NOT invoke the agent. Message processing is blocked by the mutex check in MessageProcessor.
- **Creating Google Calendar event as CONFIRMED immediately:** Always use TENTATIVE first. CONFIRMED status means the booking is final; TENTATIVE reserves the slot while the patient can still cancel. Update to CONFIRMED only when the patient sends explicit confirmation via WhatsApp.
- **Storing Google OAuth tokens in plain text:** Refresh tokens in `calendar_tokens` table MUST be encrypted at rest using pgcrypto (existing LGPD-04 pattern). Treat them like passwords.
- **Skipping `prompt: 'consent'` in OAuth URL generation:** Without this, Google only returns a refresh_token on the FIRST authorization. If the token is lost, the clinic needs to re-authorize. Always include `prompt: 'consent'` to guarantee a new refresh_token every time.
- **Releasing Redis booking lock before DB insert:** The lock MUST be held until the Prisma appointment record is created. If the DB write fails and the lock was already released, another thread could create a duplicate event.
- **Checking conversation mutex in the webhook controller:** The mutex check happens in MessageProcessor (the BullMQ worker), not in the webhook controller. The controller always enqueues immediately and returns 200. The worker checks the mutex before invoking AgentService.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop Kanban | Custom mouse/touch event handlers | @dnd-kit/core + @dnd-kit/sortable | Accessibility (keyboard nav, screen readers), cross-browser pointer events, collision detection algorithms are non-trivial |
| Calendar availability gaps | Custom interval subtraction from busy ranges | freeBusy API + date-fns interval tools | freeBusy handles timezone normalization, recurring events, multi-calendar overlap — hand-rolled gaps miss edge cases |
| Google OAuth token refresh | Manual access_token expiry tracking | googleapis OAuth2 client with `setCredentials` | googleapis auto-refreshes when access_token expires; manual tracking causes silent failures |
| Distributed lock release | Direct `redis.del(lockKey)` | Lua script atomic check-then-delete | Direct DEL can delete another thread's lock if your lock expired. Lua script is the official Redis pattern. |
| Lead deduplication | Application-level uniqueness check + insert | Prisma `upsert` with `@@unique([organizationId, phone])` | Prisma upsert is atomic at DB level; application-level check has TOCTOU race condition |
| Stage-change history | Custom audit table | LeadTimeline model with `event_type` + `created_at` | Simple append-only log is sufficient; no need for complex event sourcing |

**Key insight:** The double-booking problem is the most dangerous hand-roll trap. "Check then insert" is inherently racy without an atomic lock. The TENTATIVE + Redis lock pattern is the correct solution.

---

## Common Pitfalls

### Pitfall 1: Google OAuth Refresh Token Lost After First Auth
**What goes wrong:** Google only returns `refresh_token` on the first authorization OR when `prompt: 'consent'` is set. If you omit `prompt: 'consent'` and the stored token is lost (DB restore, new environment), the clinic's calendar connection silently breaks.
**Why it happens:** Google's OAuth protocol optimizes by not re-issuing refresh tokens on subsequent authorizations.
**How to avoid:** Always include `prompt: 'consent'` in `generateAuthUrl()`. Store the refresh token encrypted immediately on callback.
**Warning signs:** Calendar API calls start returning 401 with "Token has been expired or revoked".

### Pitfall 2: LangGraph State Missing `appointmentId` and `leadId`
**What goes wrong:** The schedule node needs to call CRM and scheduling services, but the current SDRState has no `leadId` or `appointmentId` fields. Phase 3 must add these to SDRStateAnnotation.
**Why it happens:** Phase 2 built the agent without CRM integration — those fields were deferred.
**How to avoid:** In Plan 03-01, after creating the Lead model, add `leadId: Annotation<string|null>` and `appointmentId: Annotation<string|null>` to SDRStateAnnotation. Also update AgentService to populate `leadId` from the Conversation's linked Lead on each invocation.
**Warning signs:** Schedule node can't link appointments to leads; orphaned appointment records.

### Pitfall 3: Human Takeover Does Not Block Already-Queued Jobs
**What goes wrong:** Attendant clicks "Take Over" on the dashboard. At that moment, there are 2 messages already in the BullMQ `whatsapp.inbound` queue waiting to be processed. Those jobs run, the AI responds, attendant sees unexpected AI messages.
**Why it happens:** The mutex check happens at job execution time, not at enqueue time. Queue depth can have pending jobs.
**How to avoid:** The mutex check in MessageProcessor IS the correct solution — jobs already in queue will hit the check and exit gracefully. No additional action needed. Document this as "last in-flight job may complete before mutex takes effect".
**Warning signs:** One final AI message after takeover — this is expected behavior, not a bug.

### Pitfall 4: freeBusy Returns No Errors for Invalid Calendar IDs
**What goes wrong:** If the `calendarId` stored in DB is wrong or the calendar was deleted, `freeBusy.query()` returns an empty response (no errors array populated) rather than throwing. Code interprets empty busy array as "all free" and books into a non-existent calendar.
**Why it happens:** Google Calendar API's freeBusy is designed for batch queries; errors per-calendar are in `calendars[id].errors` array, not top-level.
**How to avoid:** After every `freeBusy.query()`, check `result.data.calendars[calendarId]?.errors` array before trusting the busy data.
**Warning signs:** Appointments created successfully (in DB) but not visible in Google Calendar.

### Pitfall 5: Kanban Drag-and-Drop Column Order Not Persisted
**What goes wrong:** Pipeline columns (Novo → Qualificado → ...) have a fixed order defined in requirements. If column order is derived from DB query (e.g., `SELECT DISTINCT stage FROM leads`), new stages may appear in wrong order or not appear when empty.
**Why it happens:** Dynamic column generation from data misses empty columns.
**How to avoid:** Define the Kanban columns as a STATIC ordered constant in the frontend:
```typescript
const PIPELINE_STAGES = ['novo', 'qualificado', 'agendado', 'confirmado', 'atendido', 'perdido'] as const;
```
Always render all columns regardless of whether they have leads. Group leads client-side by stage.

### Pitfall 6: Google Calendar Event Color vs Status
**What goes wrong:** Developers confuse `colorId` (visual display color) with `status` (tentative/confirmed/cancelled). Setting colorId to yellow does not make the event tentative for conflict detection purposes. FreeBusy still treats TENTATIVE events as busy.
**Why it happens:** Calendly-style systems often use color to indicate status; Google Calendar has a distinct `status` field.
**How to avoid:** Always set `status: 'tentative'` for unconfirmed appointments. Use `colorId` only for cosmetic clinic-level color coding if needed.

---

## Code Examples

Verified patterns from official sources:

### Google Calendar freeBusy Check
```typescript
// Source: https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
// Source: https://googleapis.dev/nodejs/googleapis/latest/calendar/classes/Resource$Freebusy.html
async checkFreeBusy(
  calendarId: string,
  startISO: string,
  endISO: string,
  refreshToken: string,
): Promise<Array<{ start: string; end: string }>> {
  const calendar = this.getCalendarClient(refreshToken);
  const result = await calendar.freebusy.query({
    requestBody: {
      timeMin: startISO,
      timeMax: endISO,
      items: [{ id: calendarId }],
    },
  });

  // Check for per-calendar errors
  const calendarData = result.data.calendars?.[calendarId];
  if (calendarData?.errors?.length) {
    throw new Error(`Calendar error: ${calendarData.errors[0].reason}`);
  }

  return calendarData?.busy ?? [];
}
```

### Google Calendar Event Insert (TENTATIVE)
```typescript
// Source: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
const event = await calendar.events.insert({
  calendarId: 'primary',  // or specific calendar ID
  requestBody: {
    summary: `[Cliniq] ${procedureName} - ${patientName}`,
    description: `Telefone: ${patientPhone}\nProcedimento: ${procedureName}`,
    start: {
      dateTime: startISO,  // RFC3339: "2026-04-03T10:00:00-03:00"
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: endISO,
      timeZone: 'America/Sao_Paulo',
    },
    status: 'tentative',  // Lock slot; update to 'confirmed' after patient confirms
    attendees: [
      { email: patientEmail, displayName: patientName },
    ],
  },
});
// event.data.id is the calendarEventId to store in DB
```

### Kanban Column Definition (Static)
```typescript
// Source: Requirements CRM-02 + pitfall prevention
export const PIPELINE_STAGES = [
  { id: 'novo',        label: 'Novo',        color: 'slate' },
  { id: 'qualificado', label: 'Qualificado', color: 'blue' },
  { id: 'agendado',    label: 'Agendado',    color: 'yellow' },
  { id: 'confirmado',  label: 'Confirmado',  color: 'green' },
  { id: 'atendido',    label: 'Atendido',    color: 'teal' },
  { id: 'perdido',     label: 'Perdido',     color: 'red' },
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number]['id'];
```

### Redis Mutex Check in MessageProcessor
```typescript
// src/modules/whatsapp/processors/message.processor.ts
const mutexKey = `mutex:conversation:${tenantId}:${remoteJid}`;
const mutexHolder = await this.redis.get(mutexKey);
if (mutexHolder) {
  // Human (or system) is handling this conversation
  this.logger.log(
    `Skipping AI for ${remoteJid} — mutex held by: ${mutexHolder}`,
  );
  return; // Acknowledge job (do NOT re-throw — this is intentional skip)
}
// Safe to invoke agent
await this.agentService.processMessage(tenantId, instanceName, payload);
```

---

## Data Model (New Prisma Models)

Phase 3 requires 4 new Prisma models. These belong in a single migration.

### Lead
```prisma
model Lead {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @map("organization_id")
  phone          String
  name           String?
  email          String?
  stage          String   @default("novo")  // PipelineStage enum values
  source         String   @default("whatsapp")
  procedureInterest String? @map("procedure_interest")
  score          Int      @default(0)       // 0-100 BANT score
  tags           String[] @default([])
  conversationId String?  @unique @map("conversation_id") @db.Uuid
  createdAt      DateTime @default(now())   @map("created_at")
  updatedAt      DateTime @updatedAt        @map("updated_at")

  organization  Organization   @relation(...)
  conversation  Conversation?  @relation(...)
  annotations   LeadAnnotation[]
  appointments  Appointment[]
  timeline      LeadTimeline[]

  @@unique([organizationId, phone])
  @@index([organizationId, stage])
  @@index([organizationId, createdAt])
  @@map("leads")
}
```

### LeadAnnotation
```prisma
model LeadAnnotation {
  id        String   @id @default(uuid()) @db.Uuid
  leadId    String   @map("lead_id") @db.Uuid
  type      String   // "summary" | "objection" | "next_steps" | "note"
  content   String   // Plain text AI-generated annotation
  createdBy String   @default("ai") @map("created_by") // "ai" or userId
  createdAt DateTime @default(now()) @map("created_at")

  lead Lead @relation(...)

  @@index([leadId, createdAt])
  @@map("lead_annotations")
}
```

### CalendarToken
```prisma
model CalendarToken {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @map("organization_id")
  professionalId String?  @map("professional_id")  // null = clinic-level default
  calendarId     String   @map("calendar_id")       // Google Calendar ID
  refreshToken   String   @map("refresh_token")     // Encrypted with pgcrypto
  createdAt      DateTime @default(now())            @map("created_at")
  updatedAt      DateTime @updatedAt                 @map("updated_at")

  organization Organization @relation(...)

  @@unique([organizationId, professionalId])
  @@map("calendar_tokens")
}
```

### Appointment
```prisma
model Appointment {
  id              String    @id @default(uuid()) @db.Uuid
  organizationId  String    @map("organization_id")
  leadId          String    @map("lead_id") @db.Uuid
  calendarEventId String    @map("calendar_event_id")  // Google event ID
  calendarId      String    @map("calendar_id")
  startAt         DateTime  @map("start_at")
  endAt           DateTime  @map("end_at")
  status          String    @default("tentative")  // tentative | confirmed | cancelled
  procedureName   String?   @map("procedure_name")
  notes           String?
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  organization Organization @relation(...)
  lead         Lead         @relation(...)

  @@index([organizationId, startAt])
  @@index([leadId])
  @@map("appointments")
}
```

**RLS Policies required:** All 4 new tables need `ENABLE ROW LEVEL SECURITY` + policy on `organization_id`. Follow same pattern as existing tables.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd for Kanban | @dnd-kit/core + @dnd-kit/sortable | 2023 (rbd deprecated) | Must use @dnd-kit; rbd is abandoned, no React 18/19 support |
| Manual OAuth token refresh tracking | googleapis OAuth2 client auto-refresh with `setCredentials` | Stable API since googleapis ^40 | Simpler implementation; access token refreshes transparently |
| LangGraph v0.1 Python-only | LangGraph JS ^1.x (actual installed: ^1.2.6) | 2024-2025 | Note: installed version is ^1.2.6, NOT ^0.2 as stated in STACK.md — verify API compatibility |
| `interrupt()` for human-in-the-loop | Redis mutex outside graph | n/a for this project | LangGraph interrupt() requires SSE/streaming which complicates the request-response architecture; Redis mutex outside graph is simpler and decoupled |

**Critical finding on installed LangGraph version:** The actual installed version in apps/api/package.json is `@langchain/langgraph: ^1.2.6`, not `^0.2.x` as documented in STACK.md. The LangGraph API changed significantly between 0.2 and 1.x. The existing code works (build passes), but Phase 3's schedule node must use the v1.x API. This aligns with the working patterns already in sdr.graph.ts.

**Deprecated/outdated:**
- `react-beautiful-dnd`: Deprecated 2023 — use @dnd-kit
- LangGraph `addEdge(node, END)` → same in v1.x; verify if `END` import changed
- Google Calendar `events.patch()` → use `events.update()` for full resource updates; patch for partial

---

## Open Questions

1. **Google Calendar credential encryption**
   - What we know: LGPD-04 requires PII encrypted at rest using pgcrypto. Refresh tokens are equivalent to passwords.
   - What's unclear: The existing pgcrypto extension usage pattern is not shown in the codebase. Is there a helper service for encrypt/decrypt?
   - Recommendation: In Plan 03-03, create a `CryptoService` in `common/crypto/` that wraps `pgp_sym_encrypt` / `pgp_sym_decrypt` with the `DATABASE_ENCRYPTION_KEY` env variable. Store encrypted token as text in `calendar_tokens.refresh_token`.

2. **Professional model existence**
   - What we know: SCHED-05 requires buffer time per professional. SET-04 (Phase 4) requires Professionals CRUD.
   - What's unclear: There is no Professional model in the current Prisma schema. SCHED-05 needs it.
   - Recommendation: For Phase 3, use a simplified model. `CalendarToken` can carry `professionalId` as a string reference (no FK to Professional table yet). Phase 4 will add the full Professional model and backfill the FK. Do NOT block scheduling on Professional CRUD.

3. **SDRState `leadId` population timing**
   - What we know: The schedule node needs `leadId` to create an Appointment linked to the lead.
   - What's unclear: Currently, `MessageProcessor` upserts a Conversation but the Lead upsert will be added in Plan 03-01. After Lead upsert, AgentService needs to pass `leadId` into the initial graph state.
   - Recommendation: In Plan 03-01, after upsertFromConversation, return the leadId and pass it to `agentService.processMessage()`. Add `leadId` to the processMessage signature and initial state injection.

4. **TanStack Query installation in apps/web**
   - What we know: TanStack Query is in STACK.md but apps/web/package.json shows empty deps — no TanStack libs found.
   - What's unclear: Were these installed but not captured in the partial package.json check, or are they missing?
   - Recommendation: Plan 03-01 should include a verification step: `pnpm --filter @cliniq/web list @tanstack/react-query`. Install if missing.

---

## Sources

### Primary (HIGH confidence)
- [Google Calendar Events insert](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert) — event fields, status values (tentative/confirmed/cancelled), response structure
- [Google Calendar freeBusy query](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query) — request/response structure, busy ranges
- [googleapis Node.js client](https://googleapis.dev/nodejs/googleapis/latest/calendar/classes/Resource$Freebusy.html) — freeBusy class API
- [Redis distributed locks documentation](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/) — SET NX PX + Lua release script pattern
- Project Prisma schema (packages/database/prisma/schema.prisma) — existing models to extend
- Project agent service (apps/api/src/modules/agent/agent.service.ts) — existing `returnToAgent()` method
- Project sdr.graph.ts — existing `schedule` stub at `qualificationStage === 'schedule'` → END

### Secondary (MEDIUM confidence)
- [dnd-kit Kanban + shadcn/ui reference](https://github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui) — verified @dnd-kit is the current standard
- [Marmelab Kanban blog 2026](https://marmelab.com/blog/2026/01/15/building-a-kanban-board-with-shadcn.html) — confirms @dnd-kit + shadcn pattern in 2026
- Google OAuth2 `prompt: 'consent'` behavior — verified across multiple Google developer sources
- [Building a booking system with Google Calendar (Andrii Furmanets)](https://andriifurmanets.com/blogs/build-your-own-booking-system-comprehensive-guide) — TENTATIVE + confirm pattern

### Tertiary (LOW confidence)
- LangGraph JS v1.x schedule node API — based on project's existing working code patterns; no new doc fetch. Flag for validation if schedule node compilation fails.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — googleapis already in STACK.md; @dnd-kit confirmed current standard
- Architecture: HIGH — patterns derived from existing working code + official API docs
- Pitfalls: MEDIUM-HIGH — Google OAuth pitfalls from official docs; booking race condition from Redis docs; some pitfalls from reasoning about existing codebase
- Data model: HIGH — extends existing Prisma patterns; all 4 models follow established conventions

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (googleapis API is stable; @dnd-kit API is stable; LangGraph v1.x is fast-moving — verify schedule node API against installed version)
