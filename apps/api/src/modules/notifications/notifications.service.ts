import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";

export interface NotificationJobData {
  type: "confirmation" | "reminder_24h" | "reminder_1h" | "noshow_recovery";
  organizationId: string;
  appointmentId: string;
  leadId: string;
  remoteJid: string;
  instanceName: string;
  patientName?: string;
  procedureName?: string;
  appointmentTime?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue("notifications")
    private readonly notificationsQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Schedule all notifications for a new appointment (NOTIF-01, NOTIF-02)
   */
  async scheduleAppointmentNotifications(params: {
    organizationId: string;
    appointmentId: string;
    leadId: string;
    remoteJid: string;
    instanceName: string;
    patientName?: string;
    procedureName?: string;
    startAt: Date;
  }) {
    const { startAt, ...baseData } = params;
    const appointmentTime = startAt.toISOString();

    // Check opt-out before scheduling
    if (await this.isOptedOut(params.organizationId, params.remoteJid)) {
      this.logger.log(`Lead ${params.remoteJid} opted out — skipping notifications`);
      return;
    }

    // NOTIF-01: Immediate confirmation
    await this.notificationsQueue.add(
      "send-notification",
      { ...baseData, type: "confirmation", appointmentTime } as NotificationJobData,
      { delay: 2000 }, // 2s delay for UX
    );

    // NOTIF-02: 24h reminder
    const reminder24h = startAt.getTime() - 24 * 60 * 60 * 1000 - Date.now();
    if (reminder24h > 0) {
      await this.notificationsQueue.add(
        "send-notification",
        { ...baseData, type: "reminder_24h", appointmentTime } as NotificationJobData,
        { delay: reminder24h, jobId: `reminder-24h-${params.appointmentId}` },
      );
    }

    // NOTIF-02: 1h reminder
    const reminder1h = startAt.getTime() - 60 * 60 * 1000 - Date.now();
    if (reminder1h > 0) {
      await this.notificationsQueue.add(
        "send-notification",
        { ...baseData, type: "reminder_1h", appointmentTime } as NotificationJobData,
        { delay: reminder1h, jobId: `reminder-1h-${params.appointmentId}` },
      );
    }

    // NOTIF-03: No-show recovery (2h after appointment)
    const noshowDelay = startAt.getTime() + 2 * 60 * 60 * 1000 - Date.now();
    if (noshowDelay > 0) {
      await this.notificationsQueue.add(
        "send-notification",
        { ...baseData, type: "noshow_recovery", appointmentTime } as NotificationJobData,
        { delay: noshowDelay, jobId: `noshow-${params.appointmentId}` },
      );
    }

    this.logger.log(`Scheduled notifications for appointment ${params.appointmentId}`);
  }

  /**
   * Cancel pending notifications for an appointment (on cancel/reschedule)
   */
  async cancelNotifications(appointmentId: string) {
    const jobIds = [
      `reminder-24h-${appointmentId}`,
      `reminder-1h-${appointmentId}`,
      `noshow-${appointmentId}`,
    ];
    for (const jobId of jobIds) {
      try {
        const job = await this.notificationsQueue.getJob(jobId);
        if (job) await job.remove();
      } catch {
        // Job may not exist
      }
    }
    this.logger.log(`Cancelled notifications for appointment ${appointmentId}`);
  }

  /**
   * NOTIF-04: Track opt-out per lead
   */
  async optOut(organizationId: string, remoteJid: string) {
    await this.redis.set(`optout:${organizationId}:${remoteJid}`, "1");
    this.logger.log(`Lead ${remoteJid} opted out of notifications`);
  }

  async optIn(organizationId: string, remoteJid: string) {
    await this.redis.del(`optout:${organizationId}:${remoteJid}`);
  }

  async isOptedOut(organizationId: string, remoteJid: string): Promise<boolean> {
    const val = await this.redis.get(`optout:${organizationId}:${remoteJid}`);
    return val === "1";
  }

  /**
   * NOTIF-05: Check operating hours before sending
   */
  async isWithinOperatingHours(organizationId: string): Promise<boolean> {
    const config = await this.prisma.agentConfig.findUnique({
      where: { organizationId },
    });
    const start = config?.operatingHoursStart ?? 8;
    const end = config?.operatingHoursEnd ?? 20;

    const now = new Date();
    const hour = now.getHours(); // TODO: use clinic timezone
    return hour >= start && hour < end;
  }
}
