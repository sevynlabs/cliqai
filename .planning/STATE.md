# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-02)

**Core value:** AI agent qualifies leads via WhatsApp and converts them into confirmed appointments
**Current focus:** Phase 2 — WhatsApp + AI Agent

## Current Position

Phase: 2 of 5 (WhatsApp + AI Agent)
Plan: 1 of 3 in current phase
Status: Executing Phase 2
Last activity: 2026-04-02 — Completed 02-01 Evolution API WhatsApp integration

Progress: [████████████] 25%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: ~9m
- Total execution time: ~0.77 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 4/4 | ~38m | ~10m |
| 02-whatsapp-ai-agent | 1/3 | ~8m | ~8m |

**Recent Trend:**
- Last 5 plans: 01-02 (8m), 01-03 (7m), 01-04 (10m), 02-01 (8m)
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Foundation: Better Auth (not next-auth v4) — App Router native, RBAC, multi-tenant sessions
- Foundation: PostgreSQL RLS on every table from migration 0001 — cannot be retrofitted
- Foundation: LGPD consent schema in initial migration — no data persisted without consent_given = true
- Foundation: Better Auth organization.id used directly as tenantId — no separate Clinic table, ClinicSettings extends Organization
- Foundation: @thallesp/nestjs-better-auth for NestJS integration — provides global AuthGuard, @Session, @OrgRoles, AuthService
- WhatsApp: BullMQ queue-first ingestion — synchronous AI in webhook handler causes timeouts
- WhatsApp: Separate outbound processor file with rate limiter (1 job/1500ms) for WhatsApp anti-spam
- WhatsApp: Reconnection jobs routed through outbound queue, reusing rate limiter infrastructure
- WhatsApp: Redis Stack (7.4.0-v3) replaces plain Redis for RedisJSON + RediSearch (LangGraph checkpointer)
- Agent: LangGraph Redis checkpointer required — without it multi-turn conversations break on restart

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2: Evolution API v2 live webhook payload format unverified (LOW confidence) — verify against live docs before implementation starts
- Phase 2: LangGraph JS ^0.2 Redis checkpointer exact API may have changed since training cutoff — verify before implementation
- Compliance: LGPD "procedure interest" as Article 11 sensitive data is legal gray area — recommend legal review before agent qualification flow ships to real clinics

## Session Continuity

Last session: 2026-04-02
Stopped at: Completed 02-01-PLAN.md (Evolution API WhatsApp integration)
Resume file: .planning/phases/02-whatsapp-ai-agent/02-01-SUMMARY.md
