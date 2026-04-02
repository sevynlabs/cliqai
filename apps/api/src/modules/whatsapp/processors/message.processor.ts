import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";

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
 * Deduplicates messages, upserts conversations, and delegates to AgentService.
 * AgentService is stubbed in this plan -- Plan 02-02 implements the real agent.
 */
@Processor("whatsapp.inbound")
export class MessageProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
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
    await this.prisma.conversation.upsert({
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

    this.logger.log(
      `Processing message from ${key.remoteJid} for tenant ${tenantId}: "${textContent.substring(0, 50)}..."`,
    );

    // STUB: AgentService.processMessage() -- Plan 02-02 will implement the real agent
    // In production this will call: await this.agentService.processMessage(tenantId, instanceName, payload);
    this.logger.log(
      `[STUB] Agent processing not yet implemented. Message queued for tenant ${tenantId}, instance ${instanceName}.`,
    );
  }
}
