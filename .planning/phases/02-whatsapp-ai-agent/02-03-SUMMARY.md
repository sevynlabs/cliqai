---
phase: 02-whatsapp-ai-agent
plan: 03
subsystem: agent-guardrails
tags: [ethics-classifier, operating-hours, emergency-escalation, objection-handling, loop-guard, human-handoff, cfm-compliance]
dependency-graph:
  requires: [02-02]
  provides: [ethics-guard, operating-hours-gate, emergency-escalation, objection-handling, loop-detection, human-handoff]
  affects: [03-01, 04-01]
tech-stack:
  added: []
  patterns: [dual-ethics-check-blocklist-then-llm, timezone-aware-intl-api, keyword-matching-escalation, llm-objection-classifier, factory-closure-with-queue-injection]
key-files:
  created:
    - apps/api/src/modules/agent/graph/nodes/ethics-guard.node.ts
    - apps/api/src/modules/agent/graph/nodes/operating-hours.node.ts
    - apps/api/src/modules/agent/graph/nodes/emergency-detect.node.ts
    - apps/api/src/modules/agent/graph/nodes/handle-objection.node.ts
    - apps/api/src/modules/agent/graph/nodes/loop-guard.node.ts
    - apps/api/src/modules/agent/graph/nodes/human-handoff.node.ts
  modified:
    - apps/api/src/modules/agent/graph/sdr.graph.ts
    - apps/api/src/modules/agent/graph/sdr.state.ts
    - apps/api/src/modules/agent/agent.service.ts
    - apps/api/src/modules/agent/agent.module.ts
decisions:
  - Dual ethics check (blocklist THEN LLM classifier) for both speed and coverage
  - Native Intl.DateTimeFormat for timezone conversion (no external library)
  - Human handoff node uses factory closure to inject PrismaService and BullMQ Queue
  - Operating hours deferral detected by checking last message content in conditional edge
  - AgentModule imports QueueModule directly for notifications queue injection
metrics:
  duration: 4m
  completed: 2026-04-02T22:25Z
---

# Phase 02 Plan 03: Agent Guardrails Summary

6 guardrail nodes wired into 9-node SDR graph: dual ethics classifier (blocklist + LLM) on every outbound message, timezone-aware operating hours enforcement, PT-BR emergency keyword escalation, empathetic objection handling (price/fear/timing/info_request), loop detection (max turns + consecutive unresolved), and human handoff with DB status update and BullMQ notification.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Guardrail nodes: ethics guard, operating hours, emergency detection, objection handling | b8181c8 | DONE |
| 2 | Loop guard, human handoff, rewire SDR graph with all guardrail nodes | 2d9da69 | DONE |

## What Was Built

### Task 1: Guardrail Nodes (4 nodes)

- **ethics-guard.node.ts**: Dual-layer pre-response classifier. Layer 1: instant blocklist check against 10 PT-BR blocked phrases + 2 regex patterns (percentage claims, cure promises). Layer 2: LLM classifier call to catch subtle violations the blocklist misses. If either layer triggers, the message is automatically rewritten by a separate LLM call with temperature 0.3. Returns `ethicsBlocked: boolean` flag for logging.
- **operating-hours.node.ts**: Timezone-aware enforcement using native `Intl.DateTimeFormat` (no external library). Reads `operatingHoursStart`, `operatingHoursEnd`, and `timezone` from AgentConfig. Outside hours: sends PT-BR deferral message with hours and persona name, stays at current stage.
- **emergency-detect.node.ts**: Checks last human message against 22 PT-BR emergency keywords (emergencia, sangramento, infarto, AVC, SAMU, 192, dor forte, etc.). On match: triggers immediate human handoff with SAMU advisory message (ligue 192).
- **handle-objection.node.ts**: Two-step LLM process. Step 1: classifier (temperature 0, max 20 tokens) categorizes into price/fear/timing/info_request/NONE. Step 2: generates empathetic response using category-specific system prompt with persona name and tone. Routes back to qualify after handling.

### Task 2: Loop Guard, Human Handoff, Graph Rewire

- **loop-guard.node.ts**: Checks two conditions: (1) `turnCount >= maxTurns` (configurable, default 20), (2) `consecutiveUnresolved >= 3` (qualify extracted zero new BANT info 3 turns in a row). Either triggers human handoff.
- **human-handoff.node.ts**: Generates PT-BR handoff message, updates Conversation status to 'human_handling' in DB via PrismaService, enqueues `handoff_required` notification to BullMQ with reason (max_turns/loop_detected/emergency/user_requested). Uses factory closure pattern for DI.
- **sdr.graph.ts**: Rewired from 3 nodes to 9 nodes. Full flow: START -> consent_check -> operating_hours -> emergency_detect -> route_by_stage -> (greet|qualify|handle_objection|human_handoff|END) -> (loop_guard) -> ethics_guard -> END. Every AI message generation path passes through ethics_guard before END. No bypass path exists.
- **sdr.state.ts**: Added `ethicsBlocked: Annotation<boolean>` field.
- **agent.service.ts**: Updated node factory to create all 9 nodes. Handoff-aware reply logic: when `qualificationStage === 'handoff'`, sends the handoff message but does not continue processing. Logs ethicsBlocked status.
- **agent.module.ts**: Added QueueModule import for notifications queue injection.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ethicsBlocked field added in Task 1 instead of Task 2**
- **Found during:** Task 1
- **Issue:** ethics-guard.node.ts returns `ethicsBlocked` field but it didn't exist in SDRState yet (planned for Task 2).
- **Fix:** Added the field to sdr.state.ts in Task 1 to unblock compilation.
- **Files modified:** apps/api/src/modules/agent/graph/sdr.state.ts
- **Commit:** b8181c8

**2. [Rule 3 - Blocking] AgentModule needed QueueModule for @InjectQueue**
- **Found during:** Task 2
- **Issue:** AgentService now uses `@InjectQueue('notifications')` but AgentModule didn't import QueueModule.
- **Fix:** Added QueueModule to AgentModule imports.
- **Files modified:** apps/api/src/modules/agent/agent.module.ts
- **Commit:** 2d9da69

## Verification Results

- `pnpm --filter @cliniq/api build` -- PASS
- Ethics guard has dual check (blocklist + LLM classifier) -- PASS
- Operating hours uses Intl.DateTimeFormat with agentConfig.timezone -- PASS
- Emergency detect covers 22 PT-BR emergency keywords -- PASS
- Loop guard checks both maxTurns and consecutiveUnresolved -- PASS
- Human handoff updates Conversation status and enqueues notification -- PASS
- Graph: ALL paths from AI message generation pass through ethics_guard before END -- PASS
- Objection handler covers price, fear, timing, info_request categories -- PASS
