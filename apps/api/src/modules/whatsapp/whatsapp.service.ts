import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EvolutionApiClient } from "./evolution-api.client";
import { ConfigService } from "@nestjs/config";
import type { SendMessageJobData } from "./dto/send-message.dto";

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolutionApi: EvolutionApiClient,
    private readonly configService: ConfigService,
    @InjectQueue("whatsapp.outbound") private readonly outboundQueue: Queue,
    @InjectQueue("notifications") private readonly notificationsQueue: Queue,
  ) {}

  /**
   * Resolve tenantId (organizationId) from an Evolution API instance name.
   * Returns null if instance is not registered.
   */
  async resolveTenantByInstance(
    instanceName: string,
  ): Promise<string | null> {
    const instance = await this.prisma.whatsappInstance.findUnique({
      where: { instanceName },
      select: { organizationId: true },
    });
    return instance?.organizationId ?? null;
  }

  /**
   * Handle connection state changes from Evolution API webhook.
   * Enqueues reconnection jobs with exponential backoff on disconnect.
   */
  async handleConnectionUpdate(
    instanceName: string,
    state: string,
  ): Promise<void> {
    const instance = await this.prisma.whatsappInstance.findUnique({
      where: { instanceName },
    });
    if (!instance) {
      this.logger.warn(`Connection update for unknown instance: ${instanceName}`);
      return;
    }

    const updateData: any = { status: state };
    if (state === "open") {
      updateData.connectedAt = new Date();
      updateData.qrCodeBase64 = null; // Clear QR code on successful connection
    }

    await this.prisma.whatsappInstance.update({
      where: { instanceName },
      data: updateData,
    });

    this.logger.log(`Instance ${instanceName} connection state: ${state}`);

    if (state === "close") {
      // Check how many reconnection attempts have been made recently
      const reconnectJobId = `reconnect:${instanceName}`;
      const existingJob = await this.outboundQueue.getJob(reconnectJobId);
      const attempt = existingJob ? ((existingJob.data?.attempt as number) || 0) + 1 : 1;

      if (attempt <= 5) {
        // Exponential backoff: 5s, 15s, 45s, 135s, 405s
        const delayMs = 5000 * Math.pow(3, attempt - 1);
        this.logger.warn(
          `Scheduling reconnection for ${instanceName} (attempt ${attempt}/5) in ${delayMs}ms`,
        );

        await this.outboundQueue.add(
          "reconnect",
          {
            instanceName,
            attempt,
            type: "reconnect",
          },
          {
            jobId: `${reconnectJobId}:${attempt}`,
            delay: delayMs,
            removeOnComplete: true,
          },
        );
      } else {
        // After 5 failures, notify admin
        this.logger.error(
          `Instance ${instanceName} failed to reconnect after 5 attempts. Notifying admin.`,
        );
        await this.notificationsQueue.add("whatsapp-disconnect", {
          type: "whatsapp_disconnect",
          instanceName,
          organizationId: instance.organizationId,
          message: `WhatsApp instance ${instanceName} disconnected and failed to reconnect after 5 attempts.`,
        });
      }
    }
  }

  /**
   * Handle QR code updates from Evolution API webhook.
   */
  async handleQrCodeUpdate(
    instanceName: string,
    base64: string,
  ): Promise<void> {
    await this.prisma.whatsappInstance.update({
      where: { instanceName },
      data: { qrCodeBase64: base64 },
    });
    this.logger.log(`QR code updated for instance: ${instanceName}`);
  }

  /**
   * Enqueue a text message to the outbound queue with jitter delay.
   * Does NOT call Evolution API directly -- goes through rate-limited outbound worker.
   */
  async sendText(
    instanceName: string,
    to: string,
    text: string,
  ): Promise<void> {
    const jitterMs = Math.floor(Math.random() * 700) + 100; // 100-800ms
    const jobData: SendMessageJobData = { instanceName, to, text };
    await this.outboundQueue.add("send-text", jobData, {
      delay: jitterMs,
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  /**
   * Enqueue a media message to the outbound queue with jitter delay.
   */
  async sendMedia(
    instanceName: string,
    to: string,
    mediaType: "image" | "document" | "audio",
    url: string,
    caption?: string,
  ): Promise<void> {
    const jitterMs = Math.floor(Math.random() * 700) + 100;
    const jobData: SendMessageJobData = {
      instanceName,
      to,
      mediaType,
      mediaUrl: url,
      caption,
    };
    await this.outboundQueue.add("send-media", jobData, {
      delay: jitterMs,
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  /**
   * Create a new WhatsApp instance for a clinic via Evolution API.
   * Returns the QR code for pairing.
   */
  async createInstance(
    organizationId: string,
  ): Promise<{ instanceName: string; qrcode: string }> {
    const instanceName = `${organizationId}-wa`;
    const webhookBaseUrl = this.configService.get<string>(
      "WEBHOOK_BASE_URL",
      "http://localhost:3001",
    );
    const webhookUrl = `${webhookBaseUrl}/api/whatsapp/webhook`;

    // Check if instance already exists
    const existing = await this.prisma.whatsappInstance.findUnique({
      where: { organizationId },
    });
    if (existing) {
      throw new Error(
        `WhatsApp instance already exists for organization ${organizationId}`,
      );
    }

    const result = await this.evolutionApi.createInstance(
      instanceName,
      webhookUrl,
    );

    await this.prisma.whatsappInstance.create({
      data: {
        organizationId,
        instanceName,
        status: "connecting",
        qrCodeBase64: result.qrcode || null,
      },
    });

    this.logger.log(`Created WhatsApp instance: ${instanceName}`);
    return { instanceName, qrcode: result.qrcode };
  }

  /**
   * Get the current WhatsApp instance status for a clinic.
   */
  async getStatus(organizationId: string) {
    return this.prisma.whatsappInstance.findUnique({
      where: { organizationId },
      select: {
        id: true,
        instanceName: true,
        status: true,
        phoneNumber: true,
        connectedAt: true,
        qrCodeBase64: true,
        createdAt: true,
      },
    });
  }

  /**
   * Delete a WhatsApp instance from both Evolution API and database.
   */
  async deleteInstance(organizationId: string): Promise<void> {
    const instance = await this.prisma.whatsappInstance.findUnique({
      where: { organizationId },
    });
    if (!instance) {
      throw new Error(
        `No WhatsApp instance found for organization ${organizationId}`,
      );
    }

    try {
      await this.evolutionApi.deleteInstance(instance.instanceName);
    } catch (err) {
      this.logger.warn(
        `Failed to delete instance from Evolution API (may already be deleted): ${instance.instanceName}`,
      );
    }

    await this.prisma.whatsappInstance.delete({
      where: { organizationId },
    });

    this.logger.log(`Deleted WhatsApp instance: ${instance.instanceName}`);
  }
}
