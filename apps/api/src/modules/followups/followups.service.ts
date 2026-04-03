import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";

export interface FollowupJobData {
  organizationId: string;
  leadId: string;
  remoteJid: string;
  instanceName: string;
  sequenceIndex: number;
  attempt: number;
  leadName?: string;
  procedureInterest?: string;
}

const FOLLOWUP_DELAYS = [
  2 * 60 * 60 * 1000,   // 2h after last contact
  24 * 60 * 60 * 1000,  // 24h
  72 * 60 * 60 * 1000,  // 72h
];

const MAX_ATTEMPTS = 3; // FOLLOW-02
const COOLDOWN_DAYS = 7; // FOLLOW-02

@Injectable()
export class FollowupsService {
  private readonly logger = new Logger(FollowupsService.name);

  constructor(
    @InjectQueue("followups")
    private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * FOLLOW-01: Start a follow-up sequence for an unresponsive lead
   */
  async startSequence(params: {
    organizationId: string;
    leadId: string;
    remoteJid: string;
    instanceName: string;
    leadName?: string;
    procedureInterest?: string;
  }) {
    // Check cooldown (FOLLOW-02)
    const cooldownKey = `followup:cooldown:${params.organizationId}:${params.remoteJid}`;
    const inCooldown = await this.redis.get(cooldownKey);
    if (inCooldown) {
      this.logger.log(`Lead ${params.remoteJid} in cooldown — skipping sequence`);
      return;
    }

    // Check if already has active sequence
    const activeKey = `followup:active:${params.organizationId}:${params.remoteJid}`;
    const isActive = await this.redis.get(activeKey);
    if (isActive) {
      this.logger.log(`Lead ${params.remoteJid} already has active sequence`);
      return;
    }

    // Mark as active
    await this.redis.set(activeKey, "1", "EX", 7 * 86400);

    // Schedule first follow-up
    await this.scheduleFollowup({
      ...params,
      sequenceIndex: 0,
      attempt: 1,
    });

    this.logger.log(`Started follow-up sequence for lead ${params.leadId}`);
  }

  /**
   * Schedule a single follow-up message
   */
  private async scheduleFollowup(data: FollowupJobData) {
    if (data.attempt > MAX_ATTEMPTS) {
      this.logger.log(`Max attempts reached for ${data.remoteJid} — marking as lost`);
      await this.markAsLost(data.organizationId, data.leadId, data.remoteJid);
      return;
    }

    const delay = FOLLOWUP_DELAYS[data.sequenceIndex] ?? FOLLOWUP_DELAYS[FOLLOWUP_DELAYS.length - 1];

    await this.queue.add("send-followup", data, {
      delay,
      jobId: `followup-${data.organizationId}-${data.remoteJid}-${data.attempt}`,
    });

    this.logger.log(
      `Scheduled followup #${data.attempt} for ${data.remoteJid} in ${delay / 3600000}h`,
    );
  }

  /**
   * Schedule the next follow-up in the sequence
   */
  async scheduleNext(data: FollowupJobData) {
    await this.scheduleFollowup({
      ...data,
      sequenceIndex: data.sequenceIndex + 1,
      attempt: data.attempt + 1,
    });
  }

  /**
   * FOLLOW-03: Stop sequence when lead replies
   */
  async stopOnReply(organizationId: string, remoteJid: string) {
    const activeKey = `followup:active:${organizationId}:${remoteJid}`;
    await this.redis.del(activeKey);

    // Cancel pending followup jobs
    for (let i = 1; i <= MAX_ATTEMPTS; i++) {
      const jobId = `followup-${organizationId}-${remoteJid}-${i}`;
      try {
        const job = await this.queue.getJob(jobId);
        if (job) await job.remove();
      } catch {
        // Job may not exist
      }
    }

    this.logger.log(`Stopped follow-up sequence for ${remoteJid} (lead replied)`);
  }

  /**
   * Mark lead as lost and set cooldown
   */
  private async markAsLost(organizationId: string, leadId: string, remoteJid: string) {
    const activeKey = `followup:active:${organizationId}:${remoteJid}`;
    const cooldownKey = `followup:cooldown:${organizationId}:${remoteJid}`;

    await this.redis.del(activeKey);
    await this.redis.set(cooldownKey, "1", "EX", COOLDOWN_DAYS * 86400);

    try {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { stage: "perdido" },
      });
    } catch {
      // Lead may not exist
    }
  }

  /**
   * FOLLOW-04: Generate personalized follow-up message
   */
  getFollowupMessage(attempt: number, leadName?: string, procedureInterest?: string): string {
    const name = leadName ?? "voce";
    const procedure = procedureInterest ?? "nossos servicos";

    const templates = [
      `Ola ${name}! 😊 Vi que voce demonstrou interesse em ${procedure}. Posso ajudar com alguma duvida ou agendar uma avaliacao?`,
      `Oi ${name}, tudo bem? Estou passando para lembrar que temos horarios disponiveis para ${procedure}. Quer que eu verifique as opcoes para voce?`,
      `${name}, ainda estamos por aqui! 💛 Se quiser conversar sobre ${procedure} ou agendar, e so me chamar. Sera um prazer atende-lo(a)!`,
    ];

    return templates[Math.min(attempt - 1, templates.length - 1)];
  }
}
