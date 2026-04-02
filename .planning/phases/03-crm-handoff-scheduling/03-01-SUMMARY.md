---
phase: 03-crm-handoff-scheduling
plan: 01
subsystem: crm-data-layer
tags: [crm, leads, annotations, pipeline, prisma, rls, bant-score]
dependency-graph:
  requires: [02-02, 02-03]
  provides: [crm-module, leads-service, annotations-service, pipeline-service, lead-auto-creation, lead-scoring]
  affects: [03-02, 03-03, 04-01]
tech-stack:
  added: []
  patterns: [upsert-dedup-by-phone, bant-score-calculation, llm-annotation-with-fallback, pipeline-stage-transitions]
key-files:
  created:
    - packages/database/prisma/migrations/0003_crm_scheduling/migration.sql
    - apps/api/src/modules/crm/crm.module.ts
    - apps/api/src/modules/crm/leads/leads.service.ts
    - apps/api/src/modules/crm/leads/leads.controller.ts
    - apps/api/src/modules/crm/leads/dto/update-stage.dto.ts
    - apps/api/src/modules/crm/pipeline/pipeline.service.ts
    - apps/api/src/modules/crm/annotations/annotations.service.ts
  modified:
    - packages/database/prisma/schema.prisma
    - apps/api/src/modules/agent/graph/sdr.state.ts
    - apps/api/src/modules/agent/agent.service.ts
    - apps/api/src/modules/agent/agent.module.ts
    - apps/api/src/modules/whatsapp/processors/message.processor.ts
    - apps/api/src/modules/whatsapp/whatsapp.module.ts
    - apps/api/src/app.module.ts
decisions:
  - BANT score calculated as count of true fields * 25 (0-100 scale) for simple lead scoring
  - AI annotations use ChatAnthropic with 100 max tokens and template fallback for resilience
  - Lead auto-qualifies to 'qualificado' stage when all 4 BANT fields are true
  - RLS on lead_annotations and lead_timeline uses subquery through leads table for tenant isolation
metrics:
  duration: 17m
  completed: 2026-04-02T23:18Z
---

# Phase 03 Plan 01: CRM Data Layer and Lead Auto-Creation Summary

5 Prisma CRM models (Lead, LeadAnnotation, LeadTimeline, CalendarToken, Appointment) with RLS tenant isolation, lead auto-creation from WhatsApp conversations deduplicated by org+phone, BANT-based scoring, and LLM-powered AI annotations every 3 turns.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Prisma models, migration, and CRM module with LeadsService | c4904d0 | DONE |
| 2 | Wire lead upsert into MessageProcessor, annotations into AgentService, add leadId to SDRState | 346e630 | DONE |

## What Was Built

### Task 1: Prisma CRM Models and CRM Module

- **5 Prisma models** added to schema.prisma: Lead (with org+phone unique constraint), LeadAnnotation (summary/objection/next_steps/note types), LeadTimeline (stage changes and events), CalendarToken (Google Calendar OAuth), Appointment (scheduled visits).
- **Migration SQL** with CREATE TABLE for all 5 models, all required indexes, foreign keys, and RLS policies with tenant isolation on every table.
- **PipelineService**: Defines 6 pipeline stages (novo -> qualificado -> agendado -> confirmado -> atendido, plus perdido as escape hatch). Validates stage transitions (forward-only, any stage can go to perdido).
- **LeadsService**: Full CRUD with upsertFromConversation (strips @s.whatsapp.net from remoteJid), updateFromAgentState (name, procedure, score, stage with timeline), updateStage (manual with validation), findAll (dynamic filters: stage, source, procedure, date range, score range, tags, pagination), search (ILIKE across name/phone/email), findById (includes annotations, timeline, appointments).
- **LeadsController**: REST API at /api/leads with GET (list with filters), GET /search (global search), GET /:id (detail), PATCH /:id/stage (pipeline transition). All routes protected with RBAC guard (owner/admin/manager/attendant).
- **UpdateStageDto**: class-validator DTO with @IsIn validation against pipeline stages.
- **CrmModule**: Registered in AppModule, exports LeadsService and PipelineService.

### Task 2: Agent Integration and AI Annotations

- **SDRState extended** with leadId and appointmentId fields (Annotation<string | null>) for downstream scheduling and annotation creation.
- **AnnotationsService**: Creates AI-generated annotations using ChatAnthropic (claude-sonnet-4-20250514, 100 tokens, temp 0.3). Summary annotation every 3 turns. Objection annotation when qualificationStage is 'objection'. Next_steps annotation when transitioning to 'schedule'. Falls back to template string on LLM failure.
- **MessageProcessor wiring**: Stores conversation upsert result, calls leadsService.upsertFromConversation after conversation upsert and before agent call, passes lead.id to agentService.processMessage.
- **AgentService wiring**: Accepts leadId as 4th parameter, passes it to graph initial state, calls leadsService.updateFromAgentState after graph invocation (name, procedureInterest, BANT score), calls annotationsService.createFromAgent (wrapped in try/catch, non-blocking).
- **BANT score calculation**: calculateBantScore counts true BANT fields * 25 (0-100). Lead auto-transitions to 'qualificado' when all BANT fields are true.
- **Module imports**: AgentModule imports CrmModule. WhatsappModule imports CrmModule for MessageProcessor access.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `pnpm --filter @cliniq/database prisma generate` -- PASS
- `pnpm --filter @cliniq/api build` -- PASS
- Prisma schema has Lead model with @@unique([organizationId, phone]) -- PASS
- LeadsService.upsertFromConversation strips @s.whatsapp.net from remoteJid -- PASS
- MessageProcessor calls leadsService.upsertFromConversation before agentService.processMessage -- PASS
- AgentService passes leadId to graph initial state -- PASS
- AnnotationsService.createFromAgent generates annotations after graph invocation -- PASS
- SDRState has leadId and appointmentId fields -- PASS
- Migration SQL includes ENABLE ROW LEVEL SECURITY on all 5 new tables -- PASS
