# Architecture Research

**Domain:** AI-powered clinic management SaaS — WhatsApp SDR agent + CRM + scheduling + dashboard
**Researched:** 2026-04-02
**Confidence:** MEDIUM (training data + official docs knowledge; web verification unavailable)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│  ┌──────────────────────┐   ┌──────────────────────────────────┐    │
│  │   Next.js Dashboard  │   │   WhatsApp (Evolution API)        │    │
│  │  (clinic managers)   │   │  (lead conversations)             │    │
│  └──────────┬───────────┘   └──────────────┬───────────────────┘    │
└─────────────┼────────────────────────────── ┼──────────────────────-┘
              │ HTTPS REST/WebSocket           │ Webhook (HTTP POST)
┌─────────────▼────────────────────────────── ▼──────────────────────┐
│                         API GATEWAY LAYER                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │         NestJS API Gateway (auth, routing, rate limiting)    │    │
│  │         Tenant resolution middleware (X-Tenant-ID)           │    │
│  └────────┬──────────────┬─────────────────┬───────────────────┘    │
└───────────┼──────────────┼─────────────────┼──────────────────────-┘
            │              │                 │
┌───────────▼──────────────▼─────────────────▼──────────────────────┐
│                      SERVICE LAYER                                   │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  │
│  │  WhatsApp   │  │  AI Agent   │  │     CRM     │  │  Sched.  │  │
│  │   Service   │  │   Service   │  │   Service   │  │  Service │  │
│  │ (Evo. API   │  │ (LangGraph) │  │ (leads,     │  │ (Google  │  │
│  │  proxy)     │  │             │  │  pipeline)  │  │ Calendar)│  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────┬─────┘  │
│         │                │                │               │         │
│  ┌──────▼──────────────────────────────────────────────────────┐   │
│  │              Message Bus (BullMQ + Redis queues)             │   │
│  │  [whatsapp.inbound]  [agent.tasks]  [notifications]          │   │
│  │  [calendar.jobs]     [followup.seq] [webhooks.out]           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Notification Service                            │    │
│  │  (WhatsApp reminders, email, SMS dispatch)                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────--┘
            │              │                 │
┌───────────▼──────────────▼─────────────────▼──────────────────────┐
│                         DATA LAYER                                   │
│  ┌────────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │    PostgreSQL       │  │     Redis       │  │   Object Store   │  │
│  │  (tenants, leads,  │  │  (sessions,     │  │  (media files,   │  │
│  │   conversations,   │  │   cache, queues,│  │   exports, logs) │  │
│  │   appointments,    │  │   rate limits,  │  │                  │  │
│  │   audit logs)      │  │   agent state)  │  │                  │  │
│  └────────────────────┘  └────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────---┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| API Gateway | Auth (JWT), tenant resolution, rate limiting, request routing | NestJS + Passport.js + class-validator |
| WhatsApp Service | Evolution API proxy, webhook ingestion, message send/receive, QR code management, multi-instance | NestJS module + Evolution API REST client |
| AI Agent Service | LangGraph state machine execution, BANT qualification, tool calling, memory management | LangGraph.js + OpenAI/Anthropic SDK |
| CRM Service | Lead lifecycle management, Kanban pipeline state, timeline events, AI annotations | NestJS module + TypeORM/Prisma |
| Scheduling Service | Google Calendar OAuth, availability checks, appointment CRUD, multi-calendar support | NestJS module + googleapis SDK |
| Notification Service | Timed dispatch of reminders/confirmations, no-show recovery, follow-up sequences | BullMQ delayed jobs + WhatsApp/email dispatchers |
| Message Bus | Async decoupling between services, retry logic, dead-letter queues, rate limiting | BullMQ + Redis |
| Dashboard (Next.js) | Real-time conversation view, CRM Kanban, calendar view, KPIs, agent settings | Next.js 14+ App Router + Socket.io/SSE |

---

## Recommended Project Structure

```
cliniqai/
├── apps/
│   ├── api/                        # NestJS monolith (services as modules)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/             # Guards, interceptors, decorators, pipes
│   │   │   │   ├── auth/           # JWT strategy, RBAC guards
│   │   │   │   ├── tenant/         # TenantContext, TenantMiddleware
│   │   │   │   └── filters/        # Global exception filters
│   │   │   ├── modules/
│   │   │   │   ├── whatsapp/       # Evolution API proxy + webhook handler
│   │   │   │   │   ├── whatsapp.module.ts
│   │   │   │   │   ├── whatsapp.controller.ts  # /webhook endpoint
│   │   │   │   │   ├── whatsapp.service.ts
│   │   │   │   │   └── evolution-api.client.ts
│   │   │   │   ├── agent/          # LangGraph AI SDR agent
│   │   │   │   │   ├── agent.module.ts
│   │   │   │   │   ├── agent.service.ts        # Invoke graph per conversation
│   │   │   │   │   ├── graph/
│   │   │   │   │   │   ├── sdr.graph.ts        # LangGraph state graph definition
│   │   │   │   │   │   ├── nodes/              # qualification, objection, handoff, etc.
│   │   │   │   │   │   └── tools/              # calendar check, crm update, send message
│   │   │   │   │   └── memory/
│   │   │   │   │       ├── checkpointer.ts     # Redis-backed LangGraph checkpointer
│   │   │   │   │       └── thread-store.ts
│   │   │   │   ├── crm/            # Lead pipeline management
│   │   │   │   │   ├── crm.module.ts
│   │   │   │   │   ├── leads/
│   │   │   │   │   ├── pipeline/
│   │   │   │   │   └── timeline/
│   │   │   │   ├── scheduling/     # Google Calendar integration
│   │   │   │   │   ├── scheduling.module.ts
│   │   │   │   │   ├── calendar.service.ts
│   │   │   │   │   └── availability.service.ts
│   │   │   │   ├── notifications/  # Reminders, follow-ups, no-show recovery
│   │   │   │   │   ├── notifications.module.ts
│   │   │   │   │   ├── processors/
│   │   │   │   │   │   ├── reminder.processor.ts     # BullMQ processor
│   │   │   │   │   │   └── followup.processor.ts
│   │   │   │   │   └── templates/
│   │   │   │   ├── tenants/        # Tenant management (multi-clinic)
│   │   │   │   ├── users/          # RBAC user management
│   │   │   │   ├── webhooks/       # Bidirectional external webhooks
│   │   │   │   └── realtime/       # WebSocket gateway for dashboard
│   │   │   └── database/
│   │   │       ├── migrations/
│   │   │       └── entities/
│   │   └── test/
│   └── web/                        # Next.js dashboard
│       ├── app/
│       │   ├── (auth)/             # Login, onboarding
│       │   ├── (dashboard)/
│       │   │   ├── layout.tsx
│       │   │   ├── crm/            # Kanban pipeline
│       │   │   ├── conversations/  # WhatsApp conversation view
│       │   │   ├── calendar/       # Appointment calendar
│       │   │   ├── analytics/      # KPIs and reports
│       │   │   └── settings/       # Clinic config, agent persona
│       │   └── api/                # Next.js route handlers (BFF)
│       ├── components/
│       │   ├── ui/                 # shadcn/ui based components
│       │   ├── crm/
│       │   ├── chat/
│       │   └── charts/
│       └── lib/
│           ├── api-client.ts
│           └── socket-client.ts
├── packages/
│   ├── database/                   # Shared Prisma schema + migrations
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   ├── shared-types/               # DTOs, enums shared across apps
│   └── config/                     # Shared env validation (zod)
└── infrastructure/
    ├── docker-compose.yml          # Local dev: postgres, redis, evolution-api
    └── docker-compose.prod.yml
```

### Structure Rationale

- **apps/api/ as NestJS monolith with modules:** Start as a single deployable unit. Module boundaries (whatsapp/, agent/, crm/) make future microservice extraction trivial without premature complexity. Domain boundary isolation is enforced through module encapsulation, not network calls.
- **apps/web/ Next.js App Router:** Colocates BFF route handlers with UI. App Router supports streaming and server components for data-heavy dashboard views.
- **packages/database/ shared:** Prisma schema owned by one package prevents migration drift between services. Both apps import generated types.
- **agent/graph/ sub-structure:** LangGraph nodes are pure functions — isolating them in `nodes/` makes them unit-testable without the full graph runtime.
- **infrastructure/ docker-compose:** Evolution API, PostgreSQL, and Redis are all self-hostable. Local dev uses docker-compose for parity with production.

---

## Architectural Patterns

### Pattern 1: Event-Driven Message Ingestion

**What:** WhatsApp messages arrive as webhooks from Evolution API. The webhook controller immediately enqueues the message to BullMQ (`whatsapp.inbound` queue) and returns 200 OK. A separate processor dequeues, runs the LangGraph agent, and sends the reply.

**When to use:** Any time latency-sensitive inbound events need guaranteed processing. WhatsApp expects webhook acknowledgment in under 5 seconds; AI agent calls can take 10-30 seconds.

**Trade-offs:** Adds queue infrastructure complexity but prevents webhook timeouts, enables retry on failure, and provides natural rate limiting per tenant.

**Example:**
```typescript
// whatsapp.controller.ts
@Post('webhook/:instanceId')
async handleWebhook(@Param('instanceId') instanceId: string, @Body() payload: EvolutionWebhookDto) {
  // Validate tenant from instanceId
  const tenantId = await this.whatsappService.resolveTenant(instanceId);
  
  // Enqueue immediately, return 200 fast
  await this.messageQueue.add('process-message', {
    tenantId,
    instanceId,
    payload,
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });

  return { status: 'queued' };
}

// message.processor.ts (BullMQ worker)
@Processor('whatsapp.inbound')
export class MessageProcessor {
  @Process('process-message')
  async handle(job: Job<InboundMessageJob>) {
    const { tenantId, payload } = job.data;
    // Run LangGraph agent - can take 10-30s safely
    await this.agentService.processMessage(tenantId, payload);
  }
}
```

### Pattern 2: LangGraph Stateful SDR Graph

**What:** Each WhatsApp conversation thread maps to a LangGraph thread ID. The state machine persists conversation state in Redis via a checkpointer. Nodes represent conversation stages: greeting, qualification (BANT), objection handling, scheduling, and handoff.

**When to use:** Any AI conversational flow where state must survive across multiple asynchronous turns (multi-turn conversations, interrupted sessions, human handoff and return).

**Trade-offs:** Requires a checkpointer backend (Redis or PostgreSQL). Adds ~50-100ms overhead per invocation for state serialization. Essential for production reliability — without it, conversation context is lost on restart.

**Example:**
```typescript
// sdr.graph.ts
import { StateGraph, MessagesAnnotation } from '@langchain/langgraph';

const SDRState = MessagesAnnotation.extend({
  tenantId: { value: (_, b) => b, default: () => '' },
  leadId: { value: (_, b) => b, default: () => null },
  qualificationStage: { value: (_, b) => b, default: () => 'initial' },
  bantScore: { value: (_, b) => b, default: () => ({ budget: false, authority: false, need: false, timeline: false }) },
  appointmentId: { value: (_, b) => b, default: () => null },
  humanHandoffRequested: { value: (_, b) => b, default: () => false },
});

const graph = new StateGraph(SDRState)
  .addNode('greet', greetNode)
  .addNode('qualify', qualifyNode)          // BANT qualification
  .addNode('handle_objection', objectionNode)
  .addNode('schedule', scheduleNode)         // Calls Google Calendar tool
  .addNode('confirm', confirmNode)
  .addNode('human_handoff', handoffNode)
  .addConditionalEdges('qualify', routeAfterQualification)
  .compile({ checkpointer: redisCheckpointer });

// Invocation per message — state is automatically restored/persisted
const result = await graph.invoke(
  { messages: [new HumanMessage(incomingText)] },
  { configurable: { thread_id: `${tenantId}:${leadPhone}` } }
);
```

### Pattern 3: Multi-Tenant Row-Level Isolation

**What:** Every database entity carries a `tenantId` foreign key. A NestJS middleware injects `tenantId` into the request context from the resolved JWT claim. A TypeORM/Prisma global query extension auto-appends `WHERE tenant_id = :tenantId` to every query.

**When to use:** SaaS with strict data isolation requirements. Simpler than separate schemas or separate databases, and good enough for the scale this product will operate at.

**Trade-offs:** Row-level isolation is sufficient for most SaaS products up to tens of thousands of tenants. Schema-per-tenant gives stronger isolation but is operationally complex. Database-per-tenant is rarely justified unless compliance mandates it.

**Example:**
```typescript
// tenant.middleware.ts
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.user?.tenantId ?? req.headers['x-tenant-id'];
    if (!tenantId) throw new UnauthorizedException('Tenant not resolved');
    
    // Store in CLS (continuation local storage) or request scope
    ClsService.set('tenantId', tenantId);
    next();
  }
}

// Prisma extension auto-filters all queries
prisma.$extends({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        args.where = { ...args.where, tenantId: ClsService.get('tenantId') };
        return query(args);
      },
    },
  },
});
```

### Pattern 4: Real-Time Dashboard via WebSocket Gateway

**What:** NestJS WebSocket gateway (Socket.io) broadcasts events to connected dashboard clients when backend state changes (new message received, lead stage changed, appointment created). Clients subscribe to a tenant-namespaced room.

**When to use:** Dashboard that must show live conversation status, agent activity, and CRM updates without manual refresh.

**Trade-offs:** WebSocket connections hold memory on the server (~40KB/connection). At 100 concurrent clinic users this is trivial. At 10K concurrent clients, use Redis adapter to fan out across multiple API instances.

**Example:**
```typescript
// realtime.gateway.ts
@WebSocketGateway({ namespace: '/clinic', cors: { origin: process.env.WEB_URL } })
export class RealtimeGateway {
  @WebSocketServer() server: Server;

  // Called by CRM service after lead stage change
  broadcastLeadUpdate(tenantId: string, lead: LeadDto) {
    this.server.to(`tenant:${tenantId}`).emit('lead:updated', lead);
  }

  // Called by WhatsApp service after message processed
  broadcastNewMessage(tenantId: string, message: MessageDto) {
    this.server.to(`tenant:${tenantId}`).emit('message:new', message);
  }
}
```

---

## Data Flow

### Primary Flow: Inbound WhatsApp Message → AI Response

```
Lead sends WhatsApp message
         │
         ▼
Evolution API → POST /webhook/{instanceId}
         │
         ▼
WhatsApp Controller (validates payload, resolves tenantId)
         │
         ▼
BullMQ queue: whatsapp.inbound
         │  (async, controller returns 200 immediately)
         ▼
MessageProcessor (BullMQ worker)
         │
         ├─── CRM Service: upsert lead record (create if new, update last_seen)
         │
         ├─── Agent Service: invoke LangGraph graph
         │         │
         │         ├─── Checkpointer loads thread state from Redis
         │         ├─── LLM call (OpenAI/Anthropic)
         │         ├─── Tool calls (if needed):
         │         │      ├── check_calendar_availability → Scheduling Service
         │         │      ├── create_appointment → Scheduling Service → Google Calendar
         │         │      ├── update_lead_stage → CRM Service
         │         │      └── request_human_handoff → CRM Service flag
         │         ├─── Generate reply text
         │         └─── Checkpointer saves updated state to Redis
         │
         ├─── WhatsApp Service: send reply via Evolution API
         │
         └─── Realtime Gateway: broadcast to dashboard
                    │
                    ▼
             Connected dashboard clients receive live update
```

### Secondary Flow: Automated Notification / Follow-Up

```
Appointment created / Lead qualifies for follow-up
         │
         ▼
Notification Service: schedule BullMQ delayed job
         │  (e.g., delay: 24h before appointment)
         ▼
BullMQ job fires at scheduled time
         │
         ▼
ReminderProcessor:
         ├─── Check if appointment still active (idempotency guard)
         ├─── Render message template (PT-BR)
         └─── WhatsApp Service: send reminder
```

### Outbound Webhook Flow: External System Integration

```
Internal event (appointment confirmed, lead converted, etc.)
         │
         ▼
Webhook Service: look up tenant's registered webhook endpoints
         │
         ▼
BullMQ queue: webhooks.out
         │
         ▼
WebhookProcessor:
         ├─── POST to external URL with HMAC signature
         ├─── Retry with exponential backoff on failure (max 5 attempts)
         └─── Dead-letter queue after all retries exhausted
```

### Dashboard Real-Time State

```
Next.js client (browser)
    │
    │ Socket.io connection to /clinic namespace
    ▼
NestJS WebSocket Gateway
    │ authenticates JWT on connection, joins tenant:${tenantId} room
    │
    │ ← backend services emit events to gateway
    ▼
Client receives events: lead:updated, message:new, agent:status, appointment:created
    │
    ▼
React state updated → UI rerenders (Zustand or React Query invalidation)
```

---

## Component Boundaries

| Component | Owns | Does NOT Own | Communicates With |
|-----------|------|-------------|-------------------|
| WhatsApp Service | Evolution API connection, webhook ingestion, message send | AI logic, CRM data | Enqueues to BullMQ; calls Evolution API REST |
| AI Agent Service | LangGraph graph, conversation state, tool dispatch | Sending messages, CRM storage | Calls Tools (CRM, Scheduling); reads/writes Redis via checkpointer |
| CRM Service | Lead entities, pipeline stages, timeline, annotations | Conversation management, scheduling | Emits events to Realtime Gateway; PostgreSQL reads/writes |
| Scheduling Service | Google Calendar OAuth tokens, availability, appointments | CRM data, agent logic | Google Calendar API; PostgreSQL for appointment records |
| Notification Service | Scheduled job dispatch, template rendering, cool-down rules | Conversation intelligence | BullMQ delayed jobs; WhatsApp Service for send |
| API Gateway | Auth, routing, rate limiting, tenant resolution | Business logic | All modules via NestJS dependency injection |
| Realtime Gateway | WebSocket connections, room management | Data ownership | Emits only — driven by other services |
| Next.js Dashboard | UI rendering, BFF route handlers | Business logic | API Gateway (REST) + WebSocket Gateway |

---

## Suggested Build Order (Dependency Chain)

Build order is dictated by hard dependencies: later components require earlier ones to function.

```
1. Infrastructure Foundation
   PostgreSQL schema (tenants, users, leads, conversations) +
   Redis setup + BullMQ configuration + Docker Compose

2. Auth + Tenant System
   JWT auth, RBAC roles, tenant middleware
   → Required by ALL subsequent modules

3. WhatsApp Integration (Evolution API)
   Webhook ingestion → BullMQ queue → basic echo/test processor
   → Required before AI agent can receive messages

4. AI Agent Core (LangGraph)
   SDR graph with qualification flow + Redis checkpointer +
   reply tool (calls WhatsApp Service)
   → Requires #3 for message source; produces CRM events

5. CRM Service
   Lead creation/update, Kanban pipeline, timeline
   → Agent tools write here; dashboard reads here

6. Scheduling Service (Google Calendar)
   OAuth flow, availability check, appointment creation
   → Agent calls this as a tool during scheduling node

7. Notification Service
   BullMQ delayed jobs for reminders + follow-ups
   → Requires appointments (#6) and WhatsApp send (#3)

8. Dashboard (Next.js)
   Core views: conversations, CRM Kanban, calendar
   → Requires data from all backend modules + WebSocket gateway

9. Advanced Features
   Analytics, A/B follow-up testing, webhook outbound,
   LGPD consent flows, human handoff UI
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Evolution API | REST client + webhook receiver | Self-hosted Docker instance; one WhatsApp instance per tenant; webhook URL must be publicly accessible |
| OpenAI / Anthropic | SDK via LangGraph tool node | Store API keys per tenant or global; rate limit per tenant to control costs |
| Google Calendar | OAuth 2.0 per clinic | Store refresh tokens encrypted in PostgreSQL; use service account if single calendar owner |
| Email (SMTP/SES) | SMTP client or SDK | Used for notification fallback; Resend.com recommended for PT-BR transactional email |
| SMS (optional) | Twilio or Vonage API | Fallback channel; lower priority than WhatsApp for Brazilian market |
| External ERPs / lead sources | Outbound webhooks + inbound REST | HMAC-signed payloads; idempotency keys required |

### Internal Module Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| WhatsApp Service ↔ AI Agent Service | BullMQ job (async) | Never direct call — decoupled via queue |
| AI Agent Service ↔ CRM Service | Direct NestJS injection (sync tool call) | Acceptable because both are in-process modules; refactor to events if extracting to microservice |
| AI Agent Service ↔ Scheduling Service | Direct NestJS injection (sync tool call) | Same rationale as above |
| Any Service ↔ Realtime Gateway | Direct NestJS injection (fire-and-forget emit) | Gateway is side-effect only; no return value |
| API Gateway ↔ All Modules | NestJS DI (HTTP request lifecycle) | Standard controller → service call pattern |
| Notification Service ↔ WhatsApp Service | BullMQ job (async, delayed) | Allows scheduling hours/days in future |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–50 clinics | Single NestJS process, single Evolution API instance per tenant (Docker Compose), single PostgreSQL, single Redis. Everything in one server. |
| 50–500 clinics | Multiple Evolution API instances managed via Evolution API manager. Add Redis Cluster for BullMQ. Add read replica for PostgreSQL. Horizontal scale NestJS API behind load balancer with sticky sessions for WebSocket. |
| 500+ clinics | Extract WhatsApp ingestion as separate microservice. Separate BullMQ worker fleet for AI agent processing (most expensive operation). Add PostgreSQL connection pooler (PgBouncer). Consider LangGraph Cloud or dedicated LangGraph server. |

### Scaling Priorities

1. **First bottleneck: AI agent processing.** Each LangGraph invocation makes 1-3 LLM API calls (200-2000ms each). At 50 concurrent conversations, queue depth grows fast. Fix: scale BullMQ worker concurrency independently from HTTP API.
2. **Second bottleneck: Evolution API WhatsApp connections.** Each tenant needs a persistent WebSocket connection to WhatsApp. Evolution API handles this but needs memory proportional to active instances. Fix: separate Evolution API cluster from application API.
3. **Third bottleneck: PostgreSQL writes under message storm.** High-volume lead creation and timeline events. Fix: write-ahead buffer via BullMQ, batch inserts, add read replica for dashboard queries.

---

## Anti-Patterns

### Anti-Pattern 1: Synchronous AI Agent Invocation in Webhook Handler

**What people do:** Call LangGraph directly inside the webhook controller and wait for the response before returning 200.

**Why it's wrong:** WhatsApp/Evolution API requires acknowledgment within 5 seconds. LLM calls take 5-30 seconds. Result: timeouts, duplicate webhook deliveries, missed messages.

**Do this instead:** Enqueue immediately via BullMQ, return 200 in under 100ms. Process asynchronously in a worker.

### Anti-Pattern 2: Stateless AI Agent (No Checkpointer)

**What people do:** Build the LangGraph agent without a checkpointer, relying on in-memory state.

**Why it's wrong:** Conversation state is lost on every server restart or deployment. Multi-turn conversations (qualification takes 5-10 messages) are broken. Cannot recover interrupted conversations.

**Do this instead:** Use LangGraph's Redis checkpointer from day one. Thread state is serialized as JSON — cheap to store, essential for reliability.

### Anti-Pattern 3: Missing Tenant Isolation on AI Agent State

**What people do:** Use a global LangGraph thread ID (e.g., lead phone number alone) without namespacing by tenant.

**Why it's wrong:** Two clinics could have the same phone number as a lead (unlikely but possible). More critically, conversation state becomes globally unique rather than tenant-unique, breaking multi-tenancy at the AI layer.

**Do this instead:** Thread ID format: `{tenantId}:{conversationId}` — always namespace by tenant.

### Anti-Pattern 4: Storing Agent Conversation State Only in PostgreSQL

**What people do:** Use PostgreSQL as the LangGraph checkpointer backend instead of Redis.

**Why it's wrong:** LangGraph reads/writes state on every message exchange. At high frequency this creates write contention on PostgreSQL. Redis is purpose-built for this access pattern (fast, atomic, TTL-capable).

**Do this instead:** Redis for live conversation state (LangGraph checkpointer). PostgreSQL for persisted conversation history and audit trail (replicated from Redis on conversation close/archive).

### Anti-Pattern 5: Single Evolution API Instance for All Tenants

**What people do:** Connect all tenant WhatsApp numbers through one Evolution API instance namespace.

**Why it's wrong:** Evolution API isolates instances by name but all run in one process. A ban or crash affects all tenants simultaneously. WhatsApp rate limits can bleed across instances.

**Do this instead:** Use Evolution API's multi-instance model — each tenant has a named instance. For isolation at scale, run separate Evolution API containers per tier (e.g., enterprise tenants get dedicated containers).

### Anti-Pattern 6: Hardcoding Agent Persona in Code

**What people do:** Bake the AI system prompt and persona into the LangGraph node code.

**Why it's wrong:** Every clinic needs a different persona name, specialty, tone. Hardcoding requires code deploys to change persona. Cannot support multi-tenant configuration.

**Do this instead:** Store persona config in a `tenant_agent_config` table (clinic name, persona name, specialty, tone, operating hours, qualification questions). Load at runtime in the LangGraph node before LLM invocation.

---

## Sources

- LangGraph.js official documentation (https://langchain-ai.github.io/langgraphjs/) — MEDIUM confidence (training data knowledge, web verification unavailable)
- NestJS documentation (https://docs.nestjs.com) — HIGH confidence (stable, well-established patterns)
- BullMQ documentation (https://docs.bullmq.io) — HIGH confidence (stable API)
- Evolution API GitHub (https://github.com/EvolutionAPI/evolution-api) — MEDIUM confidence (actively maintained as of training cutoff Aug 2025)
- Multi-tenant SaaS patterns (various architecture blogs, Prisma multi-tenancy guide) — MEDIUM confidence
- Google Calendar API (https://developers.google.com/calendar) — HIGH confidence

---

*Architecture research for: AI-powered clinic management SaaS (CliniqAI)*
*Researched: 2026-04-02*
*Web search tools unavailable during this session — all findings based on training knowledge (cutoff Aug 2025) + official documentation patterns. Flag for validation before implementation.*
