import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger, forwardRef } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";
import { AgentService } from "../../agent/agent.service";
import { LeadsService } from "../../crm/leads/leads.service";

interface InboundMessageJobData {
  tenantId: string;
  instanceName: string;
  payload: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message: {
      conversation?: string;
      extendedTextMessage?: { text: string };
    };
    textContent: string;
  };
}

/**
 * BullMQ processor for the whatsapp.inbound queue.
 * Deduplicates messages, upserts conversations, upserts leads, and delegates to AgentService.
 */
@Processor("whatsapp.inbound")
export class MessageProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
    private readonly leadsService: LeadsService,
  ) {
    super();
  }

  async process(job: Job<InboundMessageJobData>): Promise<void> {
    const { tenantId, instanceName, payload } = job.data;
    const { key, textContent } = payload;

    // Secondary deduplication via Redis SET NX with 24h TTL
    const dedupKey = `dedup:${key.id}`;
    const isNew = await this.redis.set(dedupKey, "1", "EX", 86400, "NX");
    if (!isNew) {
      this.logger.debug(`Duplicate message skipped (Redis dedup): ${key.id}`);
      return;
    }

    // Upsert conversation record
    const threadId = `${tenantId}:${key.remoteJid}`;
    const conversation = await this.prisma.conversation.upsert({
      where: {
        organizationId_remoteJid: {
          organizationId: tenantId,
          remoteJid: key.remoteJid,
        },
      },
      create: {
        organizationId: tenantId,
        remoteJid: key.remoteJid,
        threadId,
        status: "active",
        turnCount: 1,
        qualificationStage: "consent",
      },
      update: {
        turnCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    // Upsert lead (deduplicated by org + phone)
    const lead = await this.leadsService.upsertFromConversation(
      tenantId,
      key.remoteJid,
      conversation.id,
    );

    this.logger.log(
      `Processing message from ${key.remoteJid} for tenant ${tenantId}: "${textContent.substring(0, 50)}..."`,
    );

    try {
      await this.agentService.processMessage(
        tenantId,
        instanceName,
        payload,
        lead.id,
      );
    } catch (err: any) {
      const isRetryable =
        err?.message?.includes("timeout") ||
        err?.message?.includes("rate limit") ||
        err?.message?.includes("429") ||
        err?.message?.includes("529") ||
        err?.status === 429 ||
        err?.status === 529;

      if (isRetryable) {
        this.logger.warn(
          `Retryable error for ${key.remoteJid} (tenant ${tenantId}): ${err.message}`,
        );
        throw err; // BullMQ will retry with backoff
      }

      // Non-retryable error -- log and swallow
      this.logger.error(
        `Agent error for ${key.remoteJid} (tenant ${tenantId}, thread ${threadId}): ${err.message}`,
        err.stack,
      );
    }
  }
}
