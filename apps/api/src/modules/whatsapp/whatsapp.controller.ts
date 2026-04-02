import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Public } from "../../common/tenant/public.decorator";
import { MinRole } from "../../common/auth/rbac.guard";
import { CurrentUser, AuthUser } from "../../common/auth/current-user.decorator";
import { WhatsappService } from "./whatsapp.service";
import { EvolutionWebhookDto } from "./dto/evolution-webhook.dto";

@Controller("whatsapp")
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    @InjectQueue("whatsapp.inbound") private readonly inboundQueue: Queue,
  ) {}

  /**
   * POST /api/whatsapp/webhook
   * Receives Evolution API v2 webhooks. Public endpoint (no auth).
   * Validated by instance lookup -- unknown instances are rejected.
   * Must return in <100ms. All processing is async via BullMQ.
   */
  @Post("webhook")
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: EvolutionWebhookDto,
  ): Promise<{ status: string }> {
    const { event, instance, data } = payload;

    switch (event) {
      case "messages.upsert": {
        // Filter out messages sent by us (prevent self-response loops)
        if (!data.key || data.key.fromMe === true) {
          return { status: "ignored_from_me" };
        }

        // Filter non-text messages
        const textContent =
          data.message?.conversation ||
          data.message?.extendedTextMessage?.text;
        if (!textContent) {
          return { status: "ignored_non_text" };
        }

        // Resolve tenant by instance name
        const tenantId =
          await this.whatsappService.resolveTenantByInstance(instance);
        if (!tenantId) {
          this.logger.warn(`Webhook from unknown instance: ${instance}`);
          return { status: "unknown_instance" };
        }

        // Enqueue with jobId for deduplication (BullMQ ignores duplicate jobIds)
        const jobId = data.key.id;
        try {
          await this.inboundQueue.add(
            "message",
            {
              tenantId,
              instanceName: instance,
              payload: {
                key: data.key,
                message: data.message,
                textContent,
              },
            },
            {
              jobId,
              removeOnComplete: 100,
              removeOnFail: 50,
            },
          );
        } catch (err: any) {
          // BullMQ throws when jobId already exists -- this IS the dedup mechanism
          if (err.message?.includes("Job already exists")) {
            this.logger.debug(`Duplicate webhook ignored: ${jobId}`);
            return { status: "duplicate" };
          }
          throw err;
        }

        return { status: "queued" };
      }

      case "connection.update": {
        if (data.state) {
          await this.whatsappService.handleConnectionUpdate(
            instance,
            data.state,
          );
        }
        return { status: "processed" };
      }

      case "qrcode.updated": {
        if (data.qrcode?.base64) {
          await this.whatsappService.handleQrCodeUpdate(
            instance,
            data.qrcode.base64,
          );
        }
        return { status: "processed" };
      }

      default:
        this.logger.debug(`Unhandled webhook event: ${event}`);
        return { status: "ignored" };
    }
  }

  /**
   * POST /api/whatsapp/instances
   * Create a new WhatsApp instance for the current tenant.
   * Returns a QR code for pairing.
   */
  @Post("instances")
  @MinRole("owner")
  async createInstance(@CurrentUser() user: AuthUser) {
    const organizationId = user.activeOrganizationId;
    if (!organizationId) {
      throw new BadRequestException("No active organization");
    }
    return this.whatsappService.createInstance(organizationId);
  }

  /**
   * GET /api/whatsapp/instances/status
   * Get the current WhatsApp connection status for the tenant.
   */
  @Get("instances/status")
  @MinRole("attendant")
  async getStatus(@CurrentUser() user: AuthUser) {
    const organizationId = user.activeOrganizationId;
    if (!organizationId) {
      throw new BadRequestException("No active organization");
    }
    return this.whatsappService.getStatus(organizationId);
  }

  /**
   * DELETE /api/whatsapp/instances
   * Delete the WhatsApp instance for the current tenant.
   */
  @Delete("instances")
  @MinRole("owner")
  async deleteInstance(@CurrentUser() user: AuthUser) {
    const organizationId = user.activeOrganizationId;
    if (!organizationId) {
      throw new BadRequestException("No active organization");
    }
    await this.whatsappService.deleteInstance(organizationId);
    return { status: "deleted" };
  }
}
