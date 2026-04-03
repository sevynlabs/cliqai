import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger, forwardRef } from "@nestjs/common";
import { Job } from "bullmq";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { FollowupsService, type FollowupJobData } from "./followups.service";
import { NotificationsService } from "../notifications/notifications.service";
import { RedisService } from "../../common/redis/redis.service";

@Processor("followups")
export class FollowupsProcessor extends WorkerHost {
  private readonly logger = new Logger(FollowupsProcessor.name);

  constructor(
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
    private readonly followupsService: FollowupsService,
    private readonly notificationsService: NotificationsService,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async process(job: Job<FollowupJobData>): Promise<void> {
    const data = job.data;

    // Check if sequence was stopped (lead replied) — FOLLOW-03
    const activeKey = `followup:active:${data.organizationId}:${data.remoteJid}`;
    const isActive = await this.redis.get(activeKey);
    if (!isActive) {
      this.logger.log(`Followup for ${data.remoteJid} no longer active — skipping`);
      return;
    }

    // Check opt-out
    if (await this.notificationsService.isOptedOut(data.organizationId, data.remoteJid)) {
      this.logger.log(`Lead ${data.remoteJid} opted out — stopping followup`);
      return;
    }

    // Check operating hours
    if (!(await this.notificationsService.isWithinOperatingHours(data.organizationId))) {
      this.logger.log(`Outside operating hours — re-queuing followup`);
      throw new Error("Outside operating hours");
    }

    // Send personalized message (FOLLOW-04)
    const message = this.followupsService.getFollowupMessage(
      data.attempt,
      data.leadName,
      data.procedureInterest,
    );

    await this.whatsappService.sendText(data.instanceName, data.remoteJid, message);
    this.logger.log(`Sent followup #${data.attempt} to ${data.remoteJid}`);

    // Schedule next followup
    await this.followupsService.scheduleNext(data);
  }
}
