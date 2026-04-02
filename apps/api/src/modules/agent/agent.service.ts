import {
  Injectable,
  Logger,
  OnModuleInit,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { HumanMessage } from "@langchain/core/messages";
import type { CompiledStateGraph } from "@langchain/langgraph";
import { PrismaService } from "../../common/prisma/prisma.service";
import { LgpdService } from "../lgpd/lgpd.service";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { LeadsService } from "../crm/leads/leads.service";
import { AnnotationsService } from "../crm/annotations/annotations.service";
import { createRedisCheckpointer } from "./memory/redis-checkpointer";
import { buildSDRGraph, type SDRNodeFactory } from "./graph/sdr.graph";
import { createConsentCheckNode } from "./graph/nodes/consent-check.node";
import { createGreetNode } from "./graph/nodes/greet.node";
import { createQualifyNode } from "./graph/nodes/qualify.node";
import { createEthicsGuardNode } from "./graph/nodes/ethics-guard.node";
import { createOperatingHoursNode } from "./graph/nodes/operating-hours.node";
import { createEmergencyDetectNode } from "./graph/nodes/emergency-detect.node";
import { createObjectionNode } from "./graph/nodes/handle-objection.node";
import { createLoopGuardNode } from "./graph/nodes/loop-guard.node";
import { createHandoffNode } from "./graph/nodes/human-handoff.node";
import { buildConsentPrompt } from "./prompts/system.prompt";
import type { SDRState, AgentConfigState, BantScore } from "./graph/sdr.state";

const DEFAULT_AGENT_CONFIG: AgentConfigState = {
  personaName: "Sofia",
  tone: "informal e acolhedor",
  specialtyText: null,
  emojiUsage: true,
  operatingHoursStart: 8,
  operatingHoursEnd: 20,
  timezone: "America/Sao_Paulo",
  maxTurns: 20,
  systemPromptExtra: null,
};

/**
 * Calculate BANT score as a percentage (0-100).
 * Each true BANT field = 25 points.
 */
function calculateBantScore(bant: BantScore): number {
  let score = 0;
  if (bant.budget) score += 25;
  if (bant.authority) score += 25;
  if (bant.need) score += 25;
  if (bant.timeline) score += 25;
  return score;
}

@Injectable()
export class AgentService implements OnModuleInit {
  private readonly logger = new Logger(AgentService.name);
  private compiledGraph!: CompiledStateGraph<any, any, any>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly lgpdService: LgpdService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
    @InjectQueue("notifications")
    private readonly notificationsQueue: Queue,
    private readonly leadsService: LeadsService,
    private readonly annotationsService: AnnotationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const redisUrl = this.configService.get<string>(
        "REDIS_URL",
        "redis://localhost:6380",
      );

      const checkpointer = await createRedisCheckpointer(redisUrl);

      // Create node functions as closures with injected dependencies
      const nodes: SDRNodeFactory = {
        consentCheckNode: createConsentCheckNode(this.lgpdService),
        greetNode: createGreetNode(),
        qualifyNode: createQualifyNode(),
        ethicsGuardNode: createEthicsGuardNode(),
        operatingHoursNode: createOperatingHoursNode(),
        emergencyDetectNode: createEmergencyDetectNode(),
        objectionNode: createObjectionNode(),
        loopGuardNode: createLoopGuardNode(),
        handoffNode: createHandoffNode(this.prisma, this.notificationsQueue),
      };

      this.compiledGraph = buildSDRGraph(checkpointer, nodes);
      this.logger.log(
        "SDR graph compiled with 9 nodes (3 core + 6 guardrails) and Redis checkpointer",
      );
    } catch (err: any) {
      this.logger.warn(
        `SDR graph initialization deferred: ${err.message}. Agent will not process messages until configured.`,
      );
    }
  }

  /**
   * Process an inbound WhatsApp message through the LangGraph SDR agent.
   * Called by BullMQ MessageProcessor after deduplication.
   */
  async processMessage(
    tenantId: string,
    instanceName: string,
    payload: {
      key: { remoteJid: string; fromMe: boolean; id: string };
      message: {
        conversation?: string;
        extendedTextMessage?: { text: string };
      };
      textContent: string;
    },
    leadId: string,
  ): Promise<void> {
    const text =
      payload.message.conversation ||
      payload.message.extendedTextMessage?.text ||
      payload.textContent ||
      "";

    if (!text) {
      this.logger.warn(`Empty message from ${payload.key.remoteJid}, skipping`);
      return;
    }

    const threadId = `${tenantId}:${payload.key.remoteJid}`;
    const remoteJid = payload.key.remoteJid;

    // Load agent config from DB (per-clinic, not hardcoded)
    let agentConfig: AgentConfigState = DEFAULT_AGENT_CONFIG;
    try {
      const dbConfig = await this.prisma.agentConfig.findUnique({
        where: { organizationId: tenantId },
      });
      if (dbConfig) {
        agentConfig = {
          personaName: dbConfig.personaName,
          tone: dbConfig.tone,
          specialtyText: dbConfig.specialtyText,
          emojiUsage: dbConfig.emojiUsage,
          operatingHoursStart: dbConfig.operatingHoursStart,
          operatingHoursEnd: dbConfig.operatingHoursEnd,
          timezone: dbConfig.timezone,
          maxTurns: dbConfig.maxTurns,
          systemPromptExtra: dbConfig.systemPromptExtra,
        };
      }
    } catch (err) {
      this.logger.warn(
        `Failed to load AgentConfig for tenant ${tenantId}, using defaults`,
      );
    }

    this.logger.log(
      `Invoking SDR graph for thread ${threadId} with persona "${agentConfig.personaName}"`,
    );

    // Invoke graph - state is restored from Redis checkpointer via thread_id
    const result = (await this.compiledGraph.invoke(
      {
        messages: [new HumanMessage(text)],
        organizationId: tenantId,
        remoteJid,
        instanceName,
        agentConfig,
        leadId,
      },
      {
        configurable: { thread_id: threadId },
      },
    )) as SDRState;

    // Extract last AI message for reply
    const lastAiMessage = [...result.messages]
      .reverse()
      .find((m) => m._getType() === "ai");
    const replyText = lastAiMessage
      ? typeof lastAiMessage.content === "string"
        ? lastAiMessage.content
        : (lastAiMessage.content as Array<{ type: string; text?: string }>)
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("")
      : null;

    // Handle consent flow: send LGPD message on first contact
    if (result.qualificationStage === "consent" && !result.consentGiven) {
      const consentMsg = buildConsentPrompt(agentConfig.personaName);
      await this.whatsappService.sendText(instanceName, remoteJid, consentMsg);
      this.logger.log(`Sent LGPD consent request to ${remoteJid}`);
    } else if (result.qualificationStage === "handoff") {
      // Human handoff — the handoff node already generated the message and updated DB
      // Just send the handoff message via WhatsApp, do NOT continue processing
      if (replyText) {
        await this.whatsappService.sendText(
          instanceName,
          remoteJid,
          replyText,
        );
      }
      this.logger.log(
        `Human handoff triggered for ${remoteJid} (thread: ${threadId})`,
      );
    } else if (replyText && !result.humanHandoffRequested) {
      // Send AI reply via WhatsApp outbound queue
      await this.whatsappService.sendText(instanceName, remoteJid, replyText);
      this.logger.log(
        `Sent AI reply to ${remoteJid} (stage: ${result.qualificationStage}, ethicsBlocked: ${result.ethicsBlocked})`,
      );
    }

    // Update conversation record in DB
    try {
      await this.prisma.conversation.update({
        where: {
          organizationId_remoteJid: {
            organizationId: tenantId,
            remoteJid,
          },
        },
        data: {
          turnCount: result.turnCount,
          qualificationStage: result.qualificationStage,
          status: result.humanHandoffRequested ? "human_handling" : "active",
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to update conversation for ${threadId}: ${err}`,
      );
    }

    // CRM: Update lead fields from agent state and create AI annotations
    try {
      const stage =
        result.qualificationStage === "qualify" &&
        result.bantScore.budget &&
        result.bantScore.authority &&
        result.bantScore.need &&
        result.bantScore.timeline
          ? "qualificado"
          : undefined;

      await this.leadsService.updateFromAgentState(leadId, {
        name: result.leadName,
        procedureInterest: result.procedureInterest,
        score: calculateBantScore(result.bantScore),
        stage,
      });
    } catch (err: any) {
      this.logger.warn(
        `Failed to update lead ${leadId} from agent state: ${err.message}`,
      );
    }

    try {
      await this.annotationsService.createFromAgent(leadId, result);
    } catch (err: any) {
      this.logger.warn(
        `Failed to create annotations for lead ${leadId}: ${err.message}`,
      );
    }
  }

  /**
   * Return a conversation from human handling back to the AI agent.
   * For future human handoff return flow.
   */
  async returnToAgent(threadId: string): Promise<void> {
    await this.compiledGraph.updateState(
      { configurable: { thread_id: threadId } },
      { humanHandoffRequested: false, qualificationStage: "qualify" },
    );
    this.logger.log(`Returned thread ${threadId} to AI agent`);
  }
}
