import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";

/**
 * BANT qualification score - tracks which fields have been extracted.
 */
export interface BantScore {
  budget: boolean;
  authority: boolean;
  need: boolean;
  timeline: boolean;
}

export type QualificationStage =
  | "consent"
  | "greet"
  | "qualify"
  | "objection"
  | "schedule"
  | "handoff";

/**
 * Shape of AgentConfig from Prisma, used in state without importing Prisma types.
 */
export interface AgentConfigState {
  personaName: string;
  tone: string;
  specialtyText: string | null;
  emojiUsage: boolean;
  operatingHoursStart: number;
  operatingHoursEnd: number;
  timezone: string;
  maxTurns: number;
  systemPromptExtra: string | null;
}

const defaultBantScore: BantScore = {
  budget: false,
  authority: false,
  need: false,
  timeline: false,
};

/**
 * LangGraph state annotation for the SDR agent.
 * Uses messagesStateReducer for messages (appends), latest-value-wins for all others.
 */
export const SDRStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  organizationId: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
  remoteJid: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
  instanceName: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
  leadName: Annotation<string | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),
  procedureInterest: Annotation<string | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),
  consentGiven: Annotation<boolean>({
    reducer: (_, b) => b,
    default: () => false,
  }),
  qualificationStage: Annotation<QualificationStage>({
    reducer: (_, b) => b,
    default: () => "consent",
  }),
  bantScore: Annotation<BantScore>({
    reducer: (_, b) => b,
    default: () => ({ ...defaultBantScore }),
  }),
  turnCount: Annotation<number>({
    reducer: (_, b) => b,
    default: () => 0,
  }),
  consecutiveUnresolved: Annotation<number>({
    reducer: (_, b) => b,
    default: () => 0,
  }),
  humanHandoffRequested: Annotation<boolean>({
    reducer: (_, b) => b,
    default: () => false,
  }),
  agentConfig: Annotation<AgentConfigState | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),
  ethicsBlocked: Annotation<boolean>({
    reducer: (_, b) => b,
    default: () => false,
  }),
  leadId: Annotation<string | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),
  appointmentId: Annotation<string | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),
});

export type SDRState = typeof SDRStateAnnotation.State;
