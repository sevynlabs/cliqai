import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

export interface WebhookOutEvent {
  type: "lead.created" | "appointment.booked" | "lead.converted";
  organizationId: string;
  payload: Record<string, any>;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectQueue("webhooks.outbound")
    private readonly outboundQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * HOOK-03: Verify HMAC-SHA256 signature on inbound webhooks
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  }

  /**
   * HOOK-01: Process inbound webhook (Meta Lead Ads, Google Ads, generic)
   */
  async processInboundLead(
    organizationId: string,
    source: string,
    data: {
      name?: string;
      phone: string;
      email?: string;
      procedureInterest?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
    },
  ) {
    // Deduplicate by phone within org
    const existing = await this.prisma.lead.findFirst({
      where: { organizationId, phone: data.phone },
    });

    if (existing) {
      this.logger.log(`Webhook lead already exists: ${data.phone} (org: ${organizationId})`);
      return existing;
    }

    const lead = await this.prisma.lead.create({
      data: {
        organizationId,
        phone: data.phone,
        name: data.name ?? null,
        email: data.email ?? null,
        procedureInterest: data.procedureInterest ?? null,
        source,
        stage: "novo",
        score: 0,
        tags: [source, data.utmSource, data.utmCampaign].filter(Boolean) as string[],
      },
    });

    // Create timeline entry
    await this.prisma.leadTimeline.create({
      data: {
        leadId: lead.id,
        eventType: "lead_created",
        description: `Lead criado via webhook (${source})`,
        metadata: { source, ...data },
      },
    });

    // Trigger outbound webhook
    await this.emitEvent({
      type: "lead.created",
      organizationId,
      payload: { leadId: lead.id, phone: data.phone, source },
    });

    this.logger.log(`Webhook created lead: ${lead.id} from ${source}`);
    return lead;
  }

  /**
   * HOOK-02: Emit outbound webhook event
   */
  async emitEvent(event: WebhookOutEvent) {
    await this.outboundQueue.add("send-webhook", event, {
      attempts: 3, // HOOK-04: retry
      backoff: { type: "exponential", delay: 5000 }, // HOOK-04: exponential backoff
    });
  }

  /**
   * HOOK-02: Send outbound webhook to configured URL
   */
  async sendOutboundWebhook(event: WebhookOutEvent) {
    // For now, log the event. In production, this would:
    // 1. Look up configured webhook URLs for this org + event type
    // 2. Sign payload with HMAC
    // 3. POST to URL
    // 4. Log result
    this.logger.log(
      `Outbound webhook: ${event.type} for org ${event.organizationId}`,
    );
  }
}
