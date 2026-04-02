# Phase 2: WhatsApp + AI Agent — Research

**Researched:** 2026-04-02
**Domain:** Evolution API v2 webhook ingestion, LangGraph JS stateful SDR agent, BullMQ queue processing, medical ethics guardrails, LGPD consent flow
**Confidence:** MEDIUM (Evolution API webhook payload verified MEDIUM via WebSearch cross-reference; LangGraph Redis checkpointer API verified MEDIUM via official reference docs; BullMQ rate limiter verified HIGH via official docs)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WHATS-01 | Clinic connects WhatsApp number via QR code in dashboard | Evolution API v2 `POST /instance/create` + `QRCODE_UPDATED` webhook event; CONNECTION_UPDATE event for status |
| WHATS-02 | Receive messages via Evolution API webhooks, enqueue to BullMQ in <100ms | Webhook endpoint returns 200 immediately; BullMQ `whatsapp.inbound` queue already registered in Phase 1 |
| WHATS-03 | Send text, image, document, audio, location messages via WhatsApp | Evolution API `/message/sendText/{instance}`, `/message/sendMedia/{instance}` REST endpoints |
| WHATS-04 | Auto-reconnection with retry and admin notification on disconnection | CONNECTION_UPDATE webhook + exponential backoff reconnect + BullMQ notifications queue already exists |
| WHATS-05 | Connection status visible in real-time on dashboard | CONNECTION_UPDATE → Redis pub/sub → Socket.IO gateway (planned for Phase 4 dashboard; Phase 2 stores status in DB/Redis) |
| WHATS-06 | Rate limiting per WhatsApp number with queue backpressure and jitter | BullMQ Worker `limiter: { max, duration }` + per-instance Worker with custom jitter delay |
| WHATS-07 | Message deduplication to prevent duplicate processing | BullMQ `jobId` set to Evolution API `data.key.id`; Redis SET NX as secondary guard |
| AGENT-01 | LangGraph-based agent with state machine, Redis checkpointer, tool-calling | `@langchain/langgraph` + `@langchain/langgraph-checkpoint-redis` (RedisSaver.fromUrl); thread_id = `{orgId}:{remoteJid}` |
| AGENT-02 | Configurable persona per clinic (name, tone, specialty, emoji usage) | `AgentConfig` DB table loaded at runtime before LLM call; stored in `clinic_agent_config` Prisma model |
| AGENT-03 | BANT qualification via natural conversation | LangGraph state machine with structured BANT state fields; NOT just raw message history |
| AGENT-04 | Objection handling for price, fear, timing, "send me info" | Dedicated `handle_objection` node with routing logic from `qualify` node |
| AGENT-05 | Agent NEVER provides medical diagnosis or promises results | Pre-response classifier node (fast LLM call) + phrase blocklist before every send |
| AGENT-06 | Respects operating hours (configurable per clinic, default 8h-20h) | Operating hours check in `greet` node; outside hours → enqueue deferred reply via BullMQ delayed job |
| AGENT-07 | Max conversation turns before human handoff (configurable, default 20) | `turnCount` state field; conditional edge to `human_handoff` node when exceeded |
| AGENT-08 | Emergency escalation detection | Dedicated classifier node triggered on phrases (sangramento, emergência, AVC, etc.) |
| AGENT-09 | Loop guard with max-turn limits and fallback to human handoff | `consecutiveUnresolved` counter in state; triggers handoff after 3 consecutive unresolved turns |
| AGENT-10 | LGPD consent as first interaction before any data storage | `consent_check` as FIRST node in graph; LgpdService.checkConsent() gates all qualification logic |
</phase_requirements>

---

## Summary

Phase 2 builds the core intelligence of CliniqAI: a WhatsApp channel powered by Evolution API v2 feeding messages into a LangGraph JS state machine SDR agent. The foundation from Phase 1 is directly usable — BullMQ `whatsapp.inbound` and `notifications` queues are already registered, Redis is connected via ioredis, PrismaService.forTenant() provides RLS-scoped DB access, and the LGPD consent service exists. No infrastructure needs to be added — only new NestJS modules on top of what exists.

The most critical architectural decision is confirmed: **webhook handler returns 200 in under 100ms, all AI processing is async via BullMQ**. Evolution API v2 delivers webhooks with at-least-once semantics, so deduplication via BullMQ `jobId = data.key.id` is essential. The LangGraph Redis checkpointer (`@langchain/langgraph-checkpoint-redis` v1.x, `RedisSaver.fromUrl()`) is the correct persistence backend — it serializes conversation state per thread, surviving NestJS restarts. Using PostgreSQL as checkpointer backend would cause write contention under load.

The SDR agent must be designed with LGPD consent as the absolute first gate (before any lead data is stored), medical ethics guardrails baked in (pre-response classifier + phrase blocklist), and structured state fields for BANT data rather than passing raw message history to the LLM. Loop detection (max consecutive unresolved turns + absolute max turn count) and operating hours enforcement must be graph-level constraints, not prompt-level suggestions.

**Primary recommendation:** Build `WhatsappModule` and `AgentModule` as separate NestJS modules sharing the existing `QueueModule`. The BullMQ processor in `WhatsappModule` consumes `whatsapp.inbound` and delegates to `AgentService`. The graph is compiled once at module init with the Redis checkpointer and reused per invocation with unique `thread_id` per conversation.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@langchain/langgraph` | ^0.2.x | SDR state machine with nodes, edges, conditional routing | Official LangGraph JS; StateGraph + MessagesAnnotation + Annotation.Root() for custom state |
| `@langchain/langgraph-checkpoint-redis` | ^1.0.x | Redis-backed conversation state persistence | Official package from redis-developer; RedisSaver.fromUrl() — survives NestJS restarts |
| `@langchain/core` | ^0.3.x | LangChain message types, tool definitions, base classes | Must be compatible minor with langgraph; pin both together |
| `@anthropic-ai/sdk` | ^0.20.x | Claude API for LLM calls inside agent nodes | Already in STACK.md decision; can swap to openai if needed |
| `axios` | ^1.x | HTTP client for Evolution API REST calls | Already in stack; retry interceptors better than fetch |
| `@nestjs/bullmq` | ^10.x | NestJS BullMQ integration (already installed Phase 1) | QueueModule already registered; add `@Processor` decorator on new workers |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ioredis` | ^5.x | Redis client for RedisSaver + deduplication (already installed) | Pass existing RedisService connection to RedisSaver; no new Redis client needed |
| `@langchain/anthropic` | ^0.3.x | Anthropic Claude LangChain adapter | Use `ChatAnthropic` in agent nodes for LangChain-native tool calling |
| `class-validator` / `class-transformer` | ^0.14.x / ^0.5.x | DTO validation for webhook payloads (already installed) | Validate Evolution API webhook payload shape before enqueue |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `RedisSaver` (langgraph-checkpoint-redis) | `MemorySaver` (in-process) | MemorySaver is dev-only; state lost on restart; unacceptable for production multi-turn SDR |
| `RedisSaver` | PostgresSaver | PostgresSaver causes write contention at scale; Redis is purpose-built for this access pattern |
| `ChatAnthropic` | `ChatOpenAI` | Either works; Anthropic Claude 3.5 Sonnet better for PT-BR nuanced conversation; swap is 1-line |
| Evolution API v2 (self-hosted) | Twilio WhatsApp API | Twilio requires WA Business API approval + per-message cost; Evolution works with personal numbers critical for Brazilian SMB clinics |

**Installation (new packages only — Phase 1 already has BullMQ, ioredis, axios):**
```bash
pnpm --filter @cliniq/api add @langchain/langgraph @langchain/langgraph-checkpoint-redis @langchain/core @langchain/anthropic @anthropic-ai/sdk
```

---

## Architecture Patterns

### Recommended Module Structure

```
apps/api/src/modules/
├── whatsapp/
│   ├── whatsapp.module.ts
│   ├── whatsapp.controller.ts       # POST /api/whatsapp/webhook (returns 200 in <100ms)
│   ├── whatsapp.service.ts          # Evolution API REST client (connect, send, status)
│   ├── evolution-api.client.ts      # Typed Evolution API HTTP client via axios
│   ├── processors/
│   │   └── message.processor.ts    # @Processor('whatsapp.inbound') - dequeues, calls AgentService
│   └── dto/
│       ├── evolution-webhook.dto.ts # Typed webhook payload shape
│       └── send-message.dto.ts
├── agent/
│   ├── agent.module.ts
│   ├── agent.service.ts             # processMessage() entry point; manages graph lifecycle
│   ├── graph/
│   │   ├── sdr.graph.ts             # StateGraph definition; compiled once at module init
│   │   ├── sdr.state.ts             # Annotation.Root() with BANT state fields
│   │   └── nodes/
│   │       ├── consent-check.node.ts    # FIRST node — gates entire flow
│   │       ├── greet.node.ts
│   │       ├── qualify.node.ts          # BANT qualification
│   │       ├── handle-objection.node.ts
│   │       ├── ethics-guard.node.ts     # Pre-response classifier
│   │       ├── operating-hours.node.ts
│   │       ├── loop-guard.node.ts
│   │       └── human-handoff.node.ts
│   ├── tools/
│   │   └── send-whatsapp.tool.ts    # LangChain tool — calls WhatsappService
│   └── memory/
│       └── redis-checkpointer.ts    # RedisSaver factory (fromUrl with existing REDIS_URL)
packages/database/prisma/
└── schema.prisma                    # Add: WhatsappInstance, AgentConfig models
```

### Pattern 1: Webhook → BullMQ in Under 100ms

**What:** Evolution API POSTs to `/api/whatsapp/webhook`. The controller validates the payload, deduplicates via BullMQ `jobId`, enqueues with tenant context, returns `{ status: 'queued' }`. No AI processing in the HTTP handler.

**When to use:** Every inbound WhatsApp message. Evolution API has at-least-once delivery — it retries on timeout. Synchronous LLM calls in the handler cause timeouts and duplicate processing.

```typescript
// whatsapp.controller.ts
@Post('webhook')
@Public()  // No auth on webhook — validated by instance lookup instead
async handleWebhook(@Body() payload: EvolutionWebhookDto) {
  // Filter: only process inbound messages (fromMe === false)
  if (payload.data?.key?.fromMe) return { status: 'ignored' };
  // Filter: only text messages in Phase 2 scope
  if (!payload.data?.message?.conversation && !payload.data?.message?.extendedTextMessage) {
    return { status: 'unsupported_type' };
  }

  const instanceName = payload.instance; // Evolution API v2 webhook top-level field
  const tenantId = await this.whatsappService.resolveTenantByInstance(instanceName);
  if (!tenantId) return { status: 'unknown_instance' };

  await this.messageQueue.add(
    'process-inbound',
    { tenantId, instanceName, payload },
    {
      jobId: payload.data.key.id,  // Deduplication: same messageId = same jobId = BullMQ deduplicates
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  );
  return { status: 'queued' };
}
```

### Pattern 2: LangGraph SDR State Machine

**What:** The agent graph is compiled ONCE at `AgentModule` initialization with the Redis checkpointer. Each inbound message invokes the compiled graph with a `thread_id` scoped to `{organizationId}:{remoteJid}`. LangGraph restores state from Redis, runs nodes, persists updated state back.

**When to use:** Every inbound message after consent verification passes.

```typescript
// sdr.state.ts — Structured state (NOT just raw message history)
// Source: https://langchain-ai.github.io/langgraphjs/reference/variables/langgraph.MessagesAnnotation.html
import { Annotation, MessagesAnnotation, messagesStateReducer } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

export const SDRState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  // Structured BANT fields — NOT inferred from chat history each turn
  organizationId: Annotation<string>({ value: (_, b) => b, default: () => '' }),
  remoteJid: Annotation<string>({ value: (_, b) => b, default: () => '' }),
  leadName: Annotation<string | null>({ value: (_, b) => b, default: () => null }),
  procedureInterest: Annotation<string | null>({ value: (_, b) => b, default: () => null }),
  consentGiven: Annotation<boolean>({ value: (_, b) => b, default: () => false }),
  qualificationStage: Annotation<'consent' | 'greet' | 'qualify' | 'objection' | 'schedule' | 'handoff'>({
    value: (_, b) => b,
    default: () => 'consent',
  }),
  bantScore: Annotation<{ budget: boolean; authority: boolean; need: boolean; timeline: boolean }>({
    value: (_, b) => b,
    default: () => ({ budget: false, authority: false, need: false, timeline: false }),
  }),
  turnCount: Annotation<number>({ value: (_, b) => b, default: () => 0 }),
  consecutiveUnresolved: Annotation<number>({ value: (_, b) => b, default: () => 0 }),
  humanHandoffRequested: Annotation<boolean>({ value: (_, b) => b, default: () => false }),
  agentConfig: Annotation<AgentConfigDto | null>({ value: (_, b) => b, default: () => null }),
});
```

```typescript
// sdr.graph.ts
// Source: https://langchain-ai.github.io/langgraphjs/reference/classes/langgraph.StateGraph.html
import { StateGraph, START, END } from '@langchain/langgraph';
import { SDRState } from './sdr.state';

export function buildSDRGraph(checkpointer: RedisSaver) {
  const graph = new StateGraph(SDRState)
    .addNode('consent_check', consentCheckNode)     // LGPD gate — MUST be first
    .addNode('greet', greetNode)
    .addNode('qualify', qualifyNode)
    .addNode('handle_objection', objectionNode)
    .addNode('ethics_guard', ethicsGuardNode)        // Runs BEFORE every send
    .addNode('loop_guard', loopGuardNode)
    .addNode('human_handoff', handoffNode)
    .addEdge(START, 'consent_check')
    .addConditionalEdges('consent_check', routeFromConsent, ['greet', 'human_handoff', END])
    .addConditionalEdges('greet', routeFromGreet, ['qualify', 'human_handoff'])
    .addConditionalEdges('qualify', routeFromQualify, ['qualify', 'handle_objection', 'human_handoff', END])
    .addEdge('handle_objection', 'qualify')
    .addEdge('loop_guard', 'human_handoff');

  return graph.compile({ checkpointer });
}
```

```typescript
// redis-checkpointer.ts
// Source: https://www.npmjs.com/package/@langchain/langgraph-checkpoint-redis
import { RedisSaver } from '@langchain/langgraph-checkpoint-redis';

export async function createRedisCheckpointer(redisUrl: string): Promise<RedisSaver> {
  // RedisSaver.fromUrl() creates indices automatically
  return await RedisSaver.fromUrl(redisUrl);
}
```

```typescript
// agent.service.ts — Invocation per message
async processMessage(tenantId: string, instanceName: string, payload: EvolutionWebhookDto) {
  const remoteJid = payload.data.key.remoteJid;
  const threadId = `${tenantId}:${remoteJid}`;  // Multi-tenant scoped thread ID
  const agentConfig = await this.loadAgentConfig(tenantId);

  const result = await this.compiledGraph.invoke(
    {
      messages: [new HumanMessage(this.extractText(payload))],
      organizationId: tenantId,
      remoteJid,
      agentConfig,
    },
    {
      configurable: { thread_id: threadId },
    },
  );

  // Send reply via WhatsApp (last AI message in state)
  const reply = this.extractLastAiMessage(result.messages);
  if (reply && !result.humanHandoffRequested) {
    await this.whatsappService.sendText(instanceName, remoteJid, reply);
  }
}
```

### Pattern 3: BullMQ Rate Limiting for WhatsApp Sends

**What:** A separate `whatsapp.outbound` queue processes sends through a Worker with rate limiting. BullMQ v3+ uses global limiter per Worker (group-key per-instance rate limiting was removed in v3.0). Jitter is added manually with a random delay on each job.

**When to use:** All outbound WhatsApp message sends — prevents Meta ban from sending too fast.

```typescript
// Source: https://docs.bullmq.io/guide/rate-limiting
const outboundWorker = new Worker('whatsapp.outbound', sendProcessor, {
  limiter: {
    max: 1,           // 1 message per window
    duration: 1500,   // 1.5 second window (with jitter = ~1-3s between messages)
  },
  connection: redisConnection,
});

// When enqueuing, add random delay for jitter (100-800ms)
await outboundQueue.add('send', messageData, {
  delay: Math.floor(Math.random() * 700) + 100,
});
```

### Pattern 4: LGPD Consent as Graph-Level Gate

**What:** The `consent_check` node is the FIRST node in the graph (connected from `START`). It calls `LgpdService.checkConsent(organizationId, remoteJid)`. If no consent exists, it sends the consent message and routes to `END` without storing any lead data. The full BANT qualification only begins after `consentGiven = true` is persisted.

**When to use:** Every single conversation turn — LangGraph state restores `consentGiven: true` on subsequent turns so the check is lightweight after first approval.

```typescript
// consent-check.node.ts
export async function consentCheckNode(
  state: typeof SDRState.State,
  config: RunnableConfig,
): Promise<Partial<typeof SDRState.State>> {
  if (state.consentGiven) {
    return {};  // Already consented — pass through
  }

  const hasConsent = await lgpdService.checkConsent(state.organizationId, state.remoteJid);
  if (hasConsent) {
    return { consentGiven: true, qualificationStage: 'greet' };
  }

  // First interaction: send LGPD consent message (no lead data stored yet)
  await whatsappService.sendText(state.instanceName, state.remoteJid, LGPD_CONSENT_MESSAGE_PT_BR);
  return { qualificationStage: 'consent' };  // Stays at consent stage
}

function routeFromConsent(state: typeof SDRState.State) {
  if (state.consentGiven) return 'greet';
  if (state.humanHandoffRequested) return 'human_handoff';
  return END;  // Waiting for consent reply
}
```

### Pattern 5: WhatsApp Instance Lifecycle (QR Connect + Reconnection)

**What:** Each clinic has one named Evolution API instance (`{organizationId}-wa`). The `WhatsappService` provides: create instance, get QR code, check status, delete instance. `CONNECTION_UPDATE` webhooks trigger reconnection logic and admin notifications.

```typescript
// evolution-api.client.ts — typed REST client
export class EvolutionApiClient {
  // POST /instance/create
  async createInstance(instanceName: string, webhookUrl: string): Promise<{ qrcode: string }> { ... }

  // GET /instance/connectionState/{instance}
  async getConnectionState(instanceName: string): Promise<'open' | 'close' | 'connecting'> { ... }

  // DELETE /instance/delete/{instance}
  async deleteInstance(instanceName: string): Promise<void> { ... }

  // POST /message/sendText/{instance}
  async sendText(instanceName: string, to: string, text: string): Promise<void> { ... }
}
```

```typescript
// Reconnection in message.processor.ts — handles CONNECTION_UPDATE webhook
// When state === 'close': exponential backoff reconnect attempts (max 5)
// After 5 failures: enqueue admin notification to 'notifications' queue
```

### Anti-Patterns to Avoid

- **Synchronous LLM in webhook handler:** LangGraph invoke takes 5-30s; Evolution API expects 200 in <5s. Always enqueue.
- **Thread ID without tenant namespace:** Use `{orgId}:{remoteJid}` — not just phone number alone.
- **MemorySaver in production:** State lost on NestJS restart; every conversation starts over. Use `RedisSaver`.
- **Full message history to LLM each turn:** Pass only last 8 messages raw; structured BANT data lives in typed state fields. Prevents context window overflow at turn 20+.
- **Persona hardcoded in node:** Load `AgentConfig` from DB at start of each invocation; pass in state. Enables per-clinic persona without redeploy.
- **Ethics guardrail in system prompt only:** LLMs find ways around prompt-only restrictions. Add a pre-send classifier node that checks the AI's draft response before sending.
- **Group-key rate limiting (BullMQ v3+):** `groupKey` was removed in BullMQ v3. Use one Worker per outbound queue with `limiter: { max, duration }` and add manual jitter delay on enqueue.

---

## Database Models Needed (New Prisma Models for Phase 2)

Phase 1 schema has: Organization, Member, ClinicSettings, ConsentRecord, ErasureRequest.

Phase 2 requires these NEW models:

```typescript
// Add to packages/database/prisma/schema.prisma

model WhatsappInstance {
  id              String   @id @default(uuid()) @db.Uuid
  organizationId  String   @unique @map("organization_id")  // One instance per clinic
  instanceName    String   @unique @map("instance_name")    // "{orgId}-wa" format
  status          String   @default("disconnected")         // open | close | connecting | disconnected
  phoneNumber     String?  @map("phone_number")
  qrCodeBase64    String?  @map("qr_code_base64")
  connectedAt     DateTime? @map("connected_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  organization Organization @relation(...)

  @@map("whatsapp_instances")
  // RLS policy needed: tenant_id = organization_id
}

model AgentConfig {
  id              String   @id @default(uuid()) @db.Uuid
  organizationId  String   @unique @map("organization_id")
  personaName     String   @default("Sofia") @map("persona_name")
  tone            String   @default("informal")              // informal | formal
  specialtyText   String?  @map("specialty_text")           // "clínica estética especializada em..."
  emojiUsage      Boolean  @default(true) @map("emoji_usage")
  operatingHoursStart Int  @default(8) @map("operating_hours_start")   // hour 0-23
  operatingHoursEnd   Int  @default(20) @map("operating_hours_end")
  timezone        String   @default("America/Sao_Paulo")
  maxTurns        Int      @default(20) @map("max_turns")
  systemPromptExtra String? @map("system_prompt_extra")     // Additional clinic-specific context
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  organization Organization @relation(...)

  @@map("agent_configs")
}

model Conversation {
  id              String   @id @default(uuid()) @db.Uuid
  organizationId  String   @map("organization_id")
  remoteJid       String   @map("remote_jid")               // Lead's WhatsApp number
  threadId        String   @unique @map("thread_id")        // "{orgId}:{remoteJid}" — matches LangGraph thread
  status          String   @default("active")               // active | human_handling | closed
  turnCount       Int      @default(0) @map("turn_count")
  qualificationStage String @default("consent") @map("qualification_stage")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  organization Organization @relation(...)

  @@unique([organizationId, remoteJid])
  @@index([organizationId, status])
  @@map("conversations")
  // RLS policy needed
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Conversation state persistence | Custom Redis serialization | `@langchain/langgraph-checkpoint-redis` RedisSaver | Handles serialization, TTL, versioning, concurrent access atomically |
| Message deduplication | Custom duplicate detection logic | BullMQ `jobId` set to Evolution API `data.key.id` | BullMQ natively rejects duplicate jobIds; free deduplication at enqueue time |
| LLM tool calling | Custom function dispatch | LangChain tool definitions (`tool()` helper) + LangGraph `ToolNode` | Handles retries, schema validation, error routing automatically |
| Agent state machine | Custom conversation state tracker | LangGraph `StateGraph` with conditional edges | Production-grade: handles concurrent invocations, human interrupt, state branching |
| Per-instance rate limiting | Custom token bucket | BullMQ Worker `limiter` + manual jitter | BullMQ rate limiter is Redis-backed; survives restarts; enforced globally across workers |

**Key insight:** The conversation state problem (multi-turn, interruptible, distributed, persistent) is precisely what LangGraph was built to solve. Custom solutions inevitably miss edge cases like concurrent message arrival, NestJS restart mid-conversation, and human takeover/return.

---

## Common Pitfalls

### Pitfall 1: Evolution API Webhook Payload — `instance` Field Is Instance Name, Not ID

**What goes wrong:** Developer expects the webhook to contain a UUID or numeric `instanceId`. Evolution API v2 sends a top-level `"instance"` field with the STRING instance name (e.g., `"clinic-abc123-wa"`). The tenant lookup must be by instance NAME, not an ID.

**Why it happens:** Documentation uses "instanceId" loosely. The actual v2 payload is:
```json
{ "event": "messages.upsert", "instance": "clinic-abc123-wa", "data": { "key": { "remoteJid": "5511999@s.whatsapp.net", "fromMe": false, "id": "MSG_ID_HERE" }, "message": { "conversation": "Olá" } } }
```
**How to avoid:** Store `instanceName` (not an ID) in `WhatsappInstance` table. Lookup: `WHERE instance_name = $1`. The `instanceName` convention should be deterministic: `{organizationId}-wa`.

**Warning signs:** Tenant resolution failing for all webhooks despite valid instances.

### Pitfall 2: RedisSaver Requires Redis Stack or Redis 8+ for Full Features

**What goes wrong:** `RedisSaver.fromUrl()` fails or degrades silently when connected to a plain Redis 7.x instance without RedisJSON/RediSearch modules.

**Why it happens:** `@langchain/langgraph-checkpoint-redis` v1.x uses Redis JSON and Search features. For Redis < 8.0, Redis Stack (which includes these modules) is required.

**How to avoid:** Phase 1 uses Redis 7.x from Docker Compose. Options: (a) upgrade Docker Compose to Redis Stack (`redis/redis-stack:latest`), or (b) use plain JSON serialization fallback. Verify on install by running `redis-cli MODULE LIST` — look for `ReJSON` and `search` modules.

**Warning signs:** `RedisSaver.fromUrl()` throws `ERR unknown command` on first `put()` call.

### Pitfall 3: BullMQ v3+ Has No Per-Instance Group Rate Limiting

**What goes wrong:** Developer tries to use `groupKey` to rate-limit sends per WhatsApp instance separately. It doesn't exist in BullMQ v3+.

**Why it happens:** BullMQ v3 removed group-key support (breaking change). Rate limiting is now global per Worker queue.

**How to avoid:** Use a separate `whatsapp.outbound.{instanceName}` queue per clinic, each with its own Worker and `limiter` config. For MVP with few clinics, a single outbound Worker with global limiter is acceptable. Add manual jitter delay (100-800ms random) on enqueue.

**Warning signs:** `groupKey` property silently ignored in BullMQ v5.

### Pitfall 4: LangGraph Thread State Not Flushed on Human Handoff

**What goes wrong:** Human attendant takes over conversation. Agent is paused. Later, when attendant "returns" the conversation to the agent, the LangGraph thread still has `humanHandoffRequested: true` in state, so the agent immediately hands off again on the first message — infinite handoff loop.

**Why it happens:** `humanHandoffRequested` state field is set to `true` during handoff but no mechanism resets it when the conversation is returned to the agent.

**How to avoid:** Add a `returnToAgent()` method in `AgentService` that calls `graph.updateState(threadConfig, { humanHandoffRequested: false, qualificationStage: 'qualify' })` before the next message is processed. This is a LangGraph built-in: `compiledGraph.updateState()` can patch state without invoking the full graph.

**Warning signs:** Agent immediately sends "transferring to specialist" on first message after human returns it.

### Pitfall 5: Consent Message Triggers `MESSAGES_UPSERT` from Agent Itself

**What goes wrong:** Agent sends LGPD consent message. Evolution API fires a `messages.upsert` webhook for that outbound message (with `fromMe: true`). The webhook handler processes it as an inbound message, triggering another agent response to itself.

**Why it happens:** Evolution API v2 sends `messages.upsert` for BOTH sent and received messages. `fromMe: true` in the payload indicates the message was sent by the connected account.

**How to avoid:** Webhook handler MUST filter out `fromMe: true` events immediately (before enqueue). Already shown in Pattern 1 above — this filter is critical.

**Warning signs:** Agent sends rapid-fire double messages; conversation log shows the agent responding to its own messages.

### Pitfall 6: AgentConfig Not Loaded for First Message (Before State Is Populated)

**What goes wrong:** First message arrives; `state.agentConfig` is `null` (default). The `greet` node tries to use persona name from `agentConfig` but gets null — sends a generic greeting without the clinic's configured persona name.

**Why it happens:** LangGraph state is initialized with defaults on first invocation. `agentConfig` defaults to `null`. The developer assumes it's loaded from DB somewhere but never wires it up.

**How to avoid:** In `AgentService.processMessage()`, ALWAYS pass `agentConfig` in the initial invoke call. LangGraph merges it into state:
```typescript
const agentConfig = await this.agentConfigService.findByOrg(tenantId);
await this.compiledGraph.invoke({ messages: [...], agentConfig }, { configurable: { thread_id } });
```

### Pitfall 7: Operating Hours Check Using Server Timezone (UTC)

**What goes wrong:** Agent respects operating hours but uses UTC. A clinic in São Paulo (UTC-3) has hours set to 8h-20h. At 22:00 UTC (19:00 São Paulo time), the agent rejects messages as outside hours, losing leads 1 hour early.

**How to avoid:** Always use clinic's configured `timezone` from `AgentConfig`. Use `date-fns-tz` or `luxon` for timezone-aware hour comparison. `AgentConfig.timezone` defaults to `"America/Sao_Paulo"`.

---

## Code Examples

### Evolution API Instance Creation (QR Code Connect Flow)

```typescript
// Source: https://doc.evolution-api.com/v2/en/api-reference/instance-controller/create-instance-basic
// Verified via WebSearch cross-reference (MEDIUM confidence)
// POST https://{evolution-host}/instance/create
const response = await evolutionClient.post('/instance/create', {
  instanceName: `${organizationId}-wa`,
  webhookUrl: `${process.env.API_URL}/api/whatsapp/webhook`,
  webhookByEvents: false,    // Single webhook URL for all events
  events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
  qrcode: true,
});
// Response includes: { instance: { instanceName, status }, qrcode: { base64 } }
```

### BullMQ Outbound Rate Limiter

```typescript
// Source: https://docs.bullmq.io/guide/rate-limiting (HIGH confidence — official docs)
import { Worker } from 'bullmq';

const outboundWorker = new Worker(
  'whatsapp.outbound',
  async (job) => {
    const { instanceName, to, text } = job.data;
    await evolutionClient.post(`/message/sendText/${instanceName}`, {
      number: to,
      text,
    });
  },
  {
    limiter: { max: 1, duration: 1500 },  // 1 msg per 1.5s per Worker
    connection: redisConnection,
  },
);
```

### LangGraph SDR State Graph (Compiled at Module Init)

```typescript
// Source: https://langchain-ai.github.io/langgraphjs/reference/classes/langgraph.StateGraph.html (HIGH confidence)
// Source: https://www.npmjs.com/package/@langchain/langgraph-checkpoint-redis (MEDIUM confidence)
@Injectable()
export class AgentService implements OnModuleInit {
  private compiledGraph: CompiledStateGraph<typeof SDRState.State, any>;

  async onModuleInit() {
    const checkpointer = await RedisSaver.fromUrl(process.env.REDIS_URL);
    this.compiledGraph = buildSDRGraph(checkpointer);
  }

  async processMessage(tenantId: string, instanceName: string, payload: EvolutionWebhookDto) {
    const remoteJid = payload.data.key.remoteJid;
    const threadId = `${tenantId}:${remoteJid}`;
    const agentConfig = await this.agentConfigService.findByOrg(tenantId);

    await this.compiledGraph.invoke(
      {
        messages: [new HumanMessage(extractText(payload))],
        organizationId: tenantId,
        remoteJid,
        instanceName,
        agentConfig,
      },
      { configurable: { thread_id: threadId } },
    );
  }
}
```

### Medical Ethics Classifier Node

```typescript
// ethics-guard.node.ts — Runs before every agent reply is sent
const BLOCKED_PHRASES_PT_BR = [
  'vai curar', 'garante resultado', 'você tem', 'o seu problema é',
  'esse procedimento resolve', 'diagnóstico', 'tenho certeza que',
  'com certeza vai funcionar', 'pode ter', 'parece ser',
];

export async function ethicsGuardNode(
  state: typeof SDRState.State,
): Promise<Partial<typeof SDRState.State>> {
  const lastAiMessage = getLastAiMessage(state.messages);
  if (!lastAiMessage) return {};

  const text = lastAiMessage.content as string;

  // Check blocklist first (fast, free)
  const hasBlockedPhrase = BLOCKED_PHRASES_PT_BR.some(phrase =>
    text.toLowerCase().includes(phrase)
  );

  if (hasBlockedPhrase) {
    // Replace with safe deflection
    return {
      messages: [new AIMessage(
        'Essa é uma ótima pergunta para discutir com nosso especialista durante a consulta! Posso agendar um horário para você? 😊'
      )],
    };
  }

  return {};  // Message is clean, pass through
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| BullMQ group-key rate limiting | Global Worker limiter + per-queue Workers | BullMQ v3.0 | Must use separate queues per tenant for per-instance rate limiting at scale |
| LangGraph MemorySaver | `@langchain/langgraph-checkpoint-redis` RedisSaver.fromUrl() | Package stable as of late 2024 | Official Redis-backed checkpointer replaces community packages |
| Raw message history passed to LLM | Structured state via `Annotation.Root()` + summary nodes | LangGraph v0.2+ | Critical for long conversations; prevents context overflow |
| Baileys direct integration | Evolution API v2 (wraps Baileys) | 2023-present | Multi-instance, REST+webhooks, reconnection management included |
| Evolution API v2.3.x latest | v2.3.7 (December 2024) | — | Current stable; Baileys v7.0.0-rc.9 underneath |

**Deprecated/outdated:**
- `groupKey` in BullMQ Worker limiter: Removed in v3.0. Do not use.
- `MemorySaver` for production: Dev-only. Never production.
- Community checkpoint packages (`@alan-seymour/checkpoint-redis`, etc.): Use official `@langchain/langgraph-checkpoint-redis` instead.

---

## Open Questions

1. **Redis Stack vs Redis 7.x for LangGraph checkpointer**
   - What we know: `@langchain/langgraph-checkpoint-redis` v1.x likely requires RedisJSON module for full functionality
   - What's unclear: Whether it gracefully falls back on plain Redis 7.x or hard-fails
   - Recommendation: On first `pnpm install`, run `redis-cli MODULE LIST` against the dev Redis container. If no `ReJSON` module, update `docker-compose.yml` to use `redis/redis-stack:7.4.0-v3` instead of `redis:7-alpine`. This is a Wave 0 task.

2. **Evolution API v2 `instance` field in webhook — exact payload structure**
   - What we know: Top-level `"instance"` string field confirmed via multiple WebSearch sources. `data.key.fromMe`, `data.key.remoteJid`, `data.key.id`, `data.message.conversation` confirmed.
   - What's unclear: Whether `messageType` is a top-level field or nested under `data`. Whether audio/media payloads add `data.message.audioMessage` / `data.message.imageMessage` fields.
   - Recommendation: In Wave 0, deploy Evolution API locally, send 1 real test message, and log the full raw payload to confirm DTO shape before building the typed DTO class.

3. **`@langchain/langgraph-checkpoint-redis` exact factory method**
   - What we know: `RedisSaver.fromUrl(redisUrl)` confirmed via npm reference docs (MEDIUM confidence). `fromCluster()` also available. No `fromConnOpts` found.
   - What's unclear: Whether `fromUrl` accepts the full `redis://host:port` URL format used by ioredis, or requires a different format.
   - Recommendation: On install, test `RedisSaver.fromUrl(process.env.REDIS_URL)` in isolation before wiring to the graph.

4. **Per-clinic outbound rate limiting without BullMQ group keys**
   - What we know: BullMQ v3+ removed group-key rate limiting. Global Worker limiter exists.
   - What's unclear: At scale (50+ clinics), whether one shared `whatsapp.outbound` Worker with global limiter is acceptable, or if we need per-clinic Worker instances.
   - Recommendation: For Phase 2 MVP (few clinics), one shared outbound Worker is fine. Design the queue name as `whatsapp.outbound` now; add clinic-specific queue sharding in a future phase if ban rate increases.

---

## Sources

### Primary (HIGH confidence)
- https://docs.bullmq.io/guide/rate-limiting — BullMQ Worker limiter options; groupKey removal in v3.0 confirmed
- https://langchain-ai.github.io/langgraphjs/reference/variables/langgraph.MessagesAnnotation.html — MessagesAnnotation API, Annotation.Root() pattern
- https://langchain-ai.github.io/langgraphjs/reference/classes/langgraph.StateGraph.html — StateGraph API
- https://reference.langchain.com/javascript/langchain-langgraph-checkpoint-redis/index/RedisSaver — RedisSaver class: fromUrl(), fromCluster(), put(), get(), deleteThread()
- https://docs.langchain.com/oss/javascript/langgraph/persistence — MemorySaver → Redis migration pattern; thread_id config pattern

### Secondary (MEDIUM confidence)
- https://doc.evolution-api.com/v2/en/configuration/webhooks — Webhook events list (MESSAGES_UPSERT, CONNECTION_UPDATE, QRCODE_UPDATED); payload structure partially verified
- https://github.com/EvolutionAPI/evolution-api/releases — Latest release v2.3.7 (December 2024); Baileys v7.0.0-rc.9
- Evolution API v2 webhook payload `instance` field and `data.key` structure — confirmed via WebSearch cross-reference from multiple community sources
- https://redis.io/blog/langgraph-redis-build-smarter-ai-agents-with-memory-persistence/ — RedisSaver + ShallowRedisSaver classes confirmed

### Tertiary (LOW confidence — flag for validation before implementation)
- Evolution API `messageType` field location in webhook payload (top-level vs nested) — not definitively confirmed; verify with live test
- `RedisSaver.fromUrl()` exact URL format compatibility with ioredis connection strings — not tested; verify on install

---

## Metadata

**Confidence breakdown:**
- Standard stack (BullMQ, LangGraph, RedisSaver): MEDIUM-HIGH — Core APIs verified via official reference docs; versions from npm and GitHub releases
- Architecture patterns (webhook flow, state machine design): HIGH — Based on confirmed Phase 1 infrastructure + official LangGraph patterns
- Evolution API webhook payload format: MEDIUM — Payload structure confirmed via WebSearch cross-reference; exact field names for media messages remain LOW
- Pitfalls: HIGH — Drawn from Phase 1 PITFALLS.md (pre-existing research) + verified BullMQ v3 breaking change + confirmed LangGraph state machine patterns

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (30 days — LangGraph and Evolution API are actively developed; re-verify on install)
