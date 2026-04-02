---
phase: 02-whatsapp-ai-agent
plan: 02
subsystem: langgraph-sdr-agent
tags: [langgraph, ai-agent, bant, lgpd, consent, redis-checkpointer, anthropic, sdr]
dependency-graph:
  requires: [02-01]
  provides: [sdr-agent-graph, agent-service, consent-gate, bant-qualification, redis-state-persistence]
  affects: [02-03, 03-01, 04-01]
tech-stack:
  added: ["@langchain/langgraph", "@langchain/langgraph-checkpoint-redis", "@langchain/core", "@langchain/anthropic"]
  patterns: [state-machine-per-message, factory-pattern-for-nodes, closure-injected-dependencies, request-response-not-loop, conditional-edges]
key-files:
  created:
    - apps/api/src/modules/agent/graph/sdr.state.ts
    - apps/api/src/modules/agent/graph/sdr.graph.ts
    - apps/api/src/modules/agent/graph/nodes/consent-check.node.ts
    - apps/api/src/modules/agent/graph/nodes/greet.node.ts
    - apps/api/src/modules/agent/graph/nodes/qualify.node.ts
    - apps/api/src/modules/agent/memory/redis-checkpointer.ts
    - apps/api/src/modules/agent/prompts/system.prompt.ts
    - apps/api/src/modules/agent/agent.service.ts
    - apps/api/src/modules/agent/agent.module.ts
  modified:
    - apps/api/src/modules/whatsapp/processors/message.processor.ts
    - apps/api/src/modules/whatsapp/whatsapp.module.ts
    - apps/api/src/app.module.ts
    - apps/api/package.json
decisions:
  - Factory pattern for LangGraph nodes (closures capture NestJS services) instead of trying to use DI inside graph nodes
  - Request-response per message (not chatbot loop) - each WhatsApp message is one graph invocation that ends at END
  - BANT updates are one-way (only set to true, never revert) to prevent regression across turns
  - RedisSaver.fromUrl for checkpointer initialization (not fromConnInfo which doesn't exist)
  - Consent prompt sent by AgentService (not by consent_check node) to keep node logic pure
metrics:
  duration: 6m
  completed: 2026-04-02T22:17Z
---

# Phase 02 Plan 02: LangGraph SDR Agent Summary

LangGraph state machine with LGPD consent gate, configurable persona greeting, and conversational BANT qualification using ChatAnthropic (claude-sonnet-4-20250514) with Redis-persisted state across NestJS restarts.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | LangGraph state, graph definition, Redis checkpointer, and core nodes | 2e0c4cb | DONE |
| 2 | AgentModule, AgentService, and wire message processor to agent | d5d4834 | DONE |

## What Was Built

### Task 1: LangGraph State Machine and Core Nodes

- **SDRStateAnnotation**: LangGraph state with messagesStateReducer for messages, latest-value-wins for all other fields. BANT fields (budget/authority/need/timeline as booleans), qualificationStage enum, turnCount, consecutiveUnresolved, humanHandoffRequested, agentConfig.
- **Redis Checkpointer**: Factory function using `RedisSaver.fromUrl()` from @langchain/langgraph-checkpoint-redis. Persists full graph state across NestJS restarts.
- **System Prompts**: Three prompt builders in PT-BR: buildConsentPrompt (LGPD message with data usage explanation and SIM consent), buildGreetingPrompt (warm intro using clinic persona), buildQualifyPrompt (natural BANT extraction with missing-fields tracking and JSON output block).
- **consent_check node**: Gates on LGPD consent. Checks for affirmative keywords (sim/aceito/concordo/ok/pode/autorizo). Records consent via LgpdService. First message triggers consent request. No data stored before consent.
- **greet node**: Uses ChatAnthropic with clinic persona (personaName, tone, specialtyText from AgentConfig). Warm greeting, asks how to help, max 300 tokens.
- **qualify node**: Natural BANT extraction via ChatAnthropic. Parses JSON block from AI response for structured updates. Strips JSON from visible message. One-way BANT (only sets true). Tracks consecutiveUnresolved for loop detection. Sets qualificationStage to 'schedule' when all BANT true.
- **SDR Graph**: StateGraph with conditional edges: START -> consent_check -> (greet | END), greet -> qualify, qualify -> END. Request-response pattern (not a loop).

### Task 2: AgentModule and Service Wiring

- **AgentService**: OnModuleInit compiles graph with Redis checkpointer and factory-created node closures. processMessage() loads AgentConfig from DB per invocation (defaults to Sofia persona), invokes graph with thread_id={orgId}:{remoteJid}, extracts AI reply, sends via WhatsApp outbound queue, updates Conversation record.
- **AgentModule**: Imports LgpdModule + forwardRef(WhatsappModule). Exports AgentService.
- **MessageProcessor**: Replaced stub with real AgentService call. Retryable errors (timeout, 429, 529) re-thrown for BullMQ backoff. Non-retryable errors logged and swallowed.
- **WhatsappModule**: Added forwardRef(AgentModule) import to resolve circular dependency.
- **AppModule**: Added AgentModule import and ANTHROPIC_API_KEY to env schema.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] RedisSaver.fromConnInfo does not exist**
- **Found during:** Task 1
- **Issue:** Plan referenced `RedisSaver.fromUrl(redisUrl)` in the redis-checkpointer but the research doc mentioned `fromConnInfo`. The actual API is `RedisSaver.fromUrl()`.
- **Fix:** Used `RedisSaver.fromUrl(redisUrl)` after inspecting the package's exported static methods.
- **Files modified:** apps/api/src/modules/agent/memory/redis-checkpointer.ts
- **Commit:** 2e0c4cb

## Verification Results

- `pnpm --filter @cliniq/api build` -- PASS
- SDRState has all BANT fields (budget, authority, need, timeline) -- PASS
- consent_check node calls LgpdService.recordConsent -- PASS
- Graph edges: START -> consent_check -> (greet | END), greet -> qualify, qualify -> END -- PASS
- AgentService.processMessage sends reply via WhatsappService.sendText -- PASS
- Thread ID format is `{orgId}:{remoteJid}` -- PASS
- AgentConfig loaded from DB per invocation -- PASS
- Message processor calls real AgentService -- PASS
