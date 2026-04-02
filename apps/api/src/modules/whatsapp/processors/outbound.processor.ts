import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { EvolutionApiClient } from "../evolution-api.client";
import type { SendMessageJobData } from "../dto/send-message.dto";

/**
 * BullMQ processor for the whatsapp.outbound queue.
 * Rate-limited: max 1 job per 1500ms to respect WhatsApp anti-spam.
 * Handles text sends, media sends, and reconnection attempts.
 */
@Processor("whatsapp.outbound", {
  limiter: {
    max: 1,
    duration: 1500,
  },
})
export class OutboundProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboundProcessor.name);

  constructor(private readonly evolutionApi: EvolutionApiClient) {
    super();
  }

  async process(job: Job<SendMessageJobData & { type?: string; attempt?: number }>): Promise<void> {
    const data = job.data;

    // Handle reconnection jobs
    if (data.type === "reconnect") {
      this.logger.log(
        `Attempting reconnection for instance: ${data.instanceName} (attempt ${data.attempt})`,
      );
      try {
        const state = await this.evolutionApi.getConnectionState(
          data.instanceName,
        );
        this.logger.log(
          `Reconnect check for ${data.instanceName}: state=${state}`,
        );
      } catch (err) {
        this.logger.error(
          `Reconnection check failed for ${data.instanceName}: ${err}`,
        );
        throw err; // Let BullMQ retry
      }
      return;
    }

    // Handle text messages
    if (data.text && !data.mediaType) {
      this.logger.log(
        `Sending text to ${data.to} via ${data.instanceName}`,
      );
      await this.evolutionApi.sendText(data.instanceName, data.to, data.text);
      return;
    }

    // Handle media messages
    if (data.mediaType && data.mediaUrl) {
      this.logger.log(
        `Sending ${data.mediaType} to ${data.to} via ${data.instanceName}`,
      );
      await this.evolutionApi.sendMedia(
        data.instanceName,
        data.to,
        data.mediaType,
        data.mediaUrl,
        data.caption,
      );
      return;
    }

    this.logger.warn(`Outbound job has no actionable data: ${job.id}`);
  }
}
