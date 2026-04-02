import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";
import { AgentService } from "../../agent/agent.service";

@Injectable()
export class HandoffService {
  private readonly logger = new Logger(HandoffService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
  ) {}

  /**
   * Take over a conversation from AI. Sets Redis mutex and updates status.
   */
  async takeOver(
    organizationId: string,
    remoteJid: string,
    userId: string,
  ): Promise<{ conversationId: string; leadId: string | null }> {
    const mutexKey = `mutex:conversation:${organizationId}:${remoteJid}`;
    await this.redis.set(mutexKey, `human:${userId}`, "EX", 86400);

    const conversation = await this.prisma.conversation.update({
      where: {
        organizationId_remoteJid: { organizationId, remoteJid },
      },
      data: { status: "human_handling", updatedAt: new Date() },
    });

    // Create timeline entry
    try {
      const lead = await this.prisma.lead.findFirst({
        where: { organizationId, conversationId: conversation.id },
      });
      if (lead) {
        await this.prisma.leadTimeline.create({
          data: {
            leadId: lead.id,
            eventType: "handoff_takeover",
            description: "Atendente assumiu a conversa",
          },
        });
      }
    } catch (err) {
      this.logger.warn(`Failed to create timeline entry: ${err}`);
    }

    this.logger.log(
      `Handoff takeover: ${remoteJid} (org: ${organizationId}) by user ${userId}`,
    );

    return {
      conversationId: conversation.id,
      leadId: (
        await this.prisma.lead.findFirst({
          where: { organizationId, conversationId: conversation.id },
        })
      )?.id ?? null,
    };
  }

  /**
   * Return a conversation from human handling back to AI.
   */
  async returnToAI(organizationId: string, remoteJid: string): Promise<void> {
    const mutexKey = `mutex:conversation:${organizationId}:${remoteJid}`;
    await this.redis.del(mutexKey);

    await this.prisma.conversation.update({
      where: {
        organizationId_remoteJid: { organizationId, remoteJid },
      },
      data: { status: "active", updatedAt: new Date() },
    });

    const threadId = `${organizationId}:${remoteJid}`;
    await this.agentService.returnToAgent(threadId);

    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: {
          organizationId_remoteJid: { organizationId, remoteJid },
        },
      });
      if (conversation) {
        const lead = await this.prisma.lead.findFirst({
          where: { organizationId, conversationId: conversation.id },
        });
        if (lead) {
          await this.prisma.leadTimeline.create({
            data: {
              leadId: lead.id,
              eventType: "handoff_return",
              description: "Conversa devolvida para IA",
            },
          });
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to create return timeline entry: ${err}`);
    }

    this.logger.log(
      `Handoff return to AI: ${remoteJid} (org: ${organizationId})`,
    );
  }

  /**
   * Check who holds the mutex for a conversation.
   */
  async getMutexHolder(
    organizationId: string,
    remoteJid: string,
  ): Promise<string | null> {
    const mutexKey = `mutex:conversation:${organizationId}:${remoteJid}`;
    return this.redis.get(mutexKey);
  }
}
