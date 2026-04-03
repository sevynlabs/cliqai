import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { WebhooksService, type WebhookOutEvent } from "./webhooks.service";

@Processor("webhooks.outbound")
export class WebhooksOutboundProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksOutboundProcessor.name);

  constructor(private readonly webhooksService: WebhooksService) {
    super();
  }

  async process(job: Job<WebhookOutEvent>): Promise<void> {
    await this.webhooksService.sendOutboundWebhook(job.data);
  }
}
