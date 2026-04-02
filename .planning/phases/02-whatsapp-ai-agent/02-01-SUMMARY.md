---
phase: 02-whatsapp-ai-agent
plan: 01
subsystem: whatsapp-evolution-api
tags: [whatsapp, evolution-api, bullmq, webhook, rate-limiting, deduplication, prisma]
dependency-graph:
  requires: [01-02]
  provides: [whatsapp-webhook-ingestion, outbound-message-queue, whatsapp-instance-crud, conversation-model, agent-config-model]
  affects: [02-02, 02-03, 04-01]
tech-stack:
  added: [axios]
  patterns: [webhook-to-queue, jobId-deduplication, redis-set-nx-dedup, rate-limited-outbound, exponential-backoff-reconnection, jitter-delay]
key-files:
  created:
    - apps/api/src/modules/whatsapp/whatsapp.module.ts
    - apps/api/src/modules/whatsapp/whatsapp.controller.ts
    - apps/api/src/modules/whatsapp/whatsapp.service.ts
    - apps/api/src/modules/whatsapp/evolution-api.client.ts
    - apps/api/src/modules/whatsapp/dto/evolution-webhook.dto.ts
    - apps/api/src/modules/whatsapp/dto/send-message.dto.ts
    - apps/api/src/modules/whatsapp/processors/message.processor.ts
    - apps/api/src/modules/whatsapp/processors/outbound.processor.ts
    - packages/database/prisma/migrations/20260402214228_add_whatsapp_agent_models/migration.sql
  modified:
    - packages/database/prisma/schema.prisma
    - infrastructure/docker-compose.yml
    - apps/api/src/common/queue/queue.module.ts
    - apps/api/src/app.module.ts
    - apps/api/package.json
decisions:
  - Separate outbound.processor.ts file for clarity (not merged with message.processor.ts)
  - Reconnection jobs routed through outbound queue (reuses rate limiter infrastructure)
  - Evolution API client retry interceptor handles 5xx only (not 4xx client errors)
metrics:
  duration: 8m
  completed: 2026-04-02T16:18Z
---

# Phase 02 Plan 01: Evolution API WhatsApp Integration Summary

WhatsApp webhook ingestion pipeline with BullMQ deduplication, rate-limited outbound queue with jitter, Evolution API v2 typed client with retry, QR code instance lifecycle, and 3 new Prisma models with RLS.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Prisma models, migration, Redis Stack upgrade, and queue registration | 39c6968 | DONE |
| 2 | WhatsApp module -- Evolution API client, webhook controller, service, and BullMQ processors | 36c55b5 | DONE |

## What Was Built

### Task 1: Prisma Models + Redis Stack + Queue Registration

- **WhatsappInstance model**: UUID PK, organizationId (unique), instanceName (unique), status (open/close/connecting/disconnected), phoneNumber, qrCodeBase64, connectedAt. RLS policy on organization_id.
- **AgentConfig model**: UUID PK, organizationId (unique), personaName (default "Sofia"), tone, specialtyText, emojiUsage, operatingHoursStart/End, timezone, maxTurns, systemPromptExtra. RLS policy on organization_id.
- **Conversation model**: UUID PK, organizationId + remoteJid (unique compound), threadId (unique, format "{orgId}:{remoteJid}"), status (active/human_handling/closed), turnCount, qualificationStage. RLS policy on organization_id. Index on [organizationId, status].
- **Redis Stack**: Upgraded from redis:7-alpine to redis/redis-stack:7.4.0-v3 (includes RedisJSON + RediSearch for LangGraph checkpointer).
- **Queue**: Added whatsapp.outbound to BullModule.registerQueue alongside existing whatsapp.inbound and notifications.

### Task 2: WhatsApp Module

- **EvolutionApiClient**: Typed axios HTTP client for Evolution API v2 (createInstance, getConnectionState, deleteInstance, sendText, sendMedia). Retry interceptor: 3 retries with 1s/2s/4s exponential backoff for 5xx errors only.
- **WhatsappController**: POST /api/whatsapp/webhook (@Public, returns 200 in <100ms), POST /api/whatsapp/instances (@MinRole owner), GET /api/whatsapp/instances/status (@MinRole attendant), DELETE /api/whatsapp/instances (@MinRole owner).
- **Webhook processing**: Filters fromMe messages (prevents self-loops). Filters non-text messages. Resolves tenant by instance name lookup. Deduplicates via BullMQ jobId = data.key.id. Returns immediately after enqueue.
- **WhatsappService**: Instance CRUD (create with QR code, get status, delete). sendText/sendMedia via outbound queue with 100-800ms random jitter. Connection state handling with exponential backoff reconnection (5s/15s/45s/135s/405s). Admin notification after 5 reconnect failures via notifications queue.
- **MessageProcessor** (whatsapp.inbound): Secondary deduplication via Redis SET NX with 24h TTL. Upserts Conversation record (organizationId + remoteJid). Agent call stubbed for Plan 02-02.
- **OutboundProcessor** (whatsapp.outbound): Rate limited to 1 job per 1500ms. Handles text sends, media sends, and reconnection attempts via Evolution API client.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `pnpm --filter @cliniq/database build` -- PASS
- `pnpm --filter @cliniq/api build` -- PASS
- WhatsappInstance, AgentConfig, Conversation models exist in schema.prisma -- PASS (3 models)
- RLS policies in migration for all 3 new tables -- PASS (6 RLS statements)
- docker-compose.yml uses redis-stack image -- PASS
- Webhook controller has @Public() decorator -- PASS
- fromMe filter prevents self-response loops -- PASS
- BullMQ jobId deduplication uses data.key.id -- PASS
- Outbound worker has rate limiter configured -- PASS
