import {
  Controller,
  Post,
  Body,
  Headers,
  Param,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { Public } from "../../common/tenant/public.decorator";
import { WebhooksService } from "./webhooks.service";

@Controller("webhooks")
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * HOOK-01: Generic webhook receiver for lead sources
   * POST /api/webhooks/:organizationId/leads
   */
  @Public()
  @Post(":organizationId/leads")
  async receiveLead(
    @Param("organizationId") organizationId: string,
    @Headers("x-webhook-signature") signature: string | undefined,
    @Headers("x-webhook-source") source: string | undefined,
    @Body() body: any,
  ) {
    // HOOK-03: Verify HMAC signature if provided
    if (signature) {
      const secret = process.env.WEBHOOK_SECRET ?? "default-webhook-secret";
      const isValid = this.webhooksService.verifySignature(
        JSON.stringify(body),
        signature,
        secret,
      );
      if (!isValid) {
        throw new BadRequestException("Invalid webhook signature");
      }
    }

    if (!body.phone) {
      throw new BadRequestException("Phone number is required");
    }

    const lead = await this.webhooksService.processInboundLead(
      organizationId,
      source ?? "webhook",
      {
        name: body.name ?? body.full_name ?? body.nome,
        phone: body.phone ?? body.telefone,
        email: body.email,
        procedureInterest: body.procedure ?? body.procedimento ?? body.interest,
        utmSource: body.utm_source,
        utmMedium: body.utm_medium,
        utmCampaign: body.utm_campaign,
      },
    );

    return { success: true, leadId: lead.id };
  }

  /**
   * HOOK-01: Meta Lead Ads webhook receiver
   * POST /api/webhooks/:organizationId/meta-leads
   */
  @Public()
  @Post(":organizationId/meta-leads")
  async receiveMetaLead(
    @Param("organizationId") organizationId: string,
    @Body() body: any,
  ) {
    // Meta Lead Ads sends data in a specific format
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const leadData = changes?.value?.leadgen_data?.[0] ?? changes?.value;

    if (!leadData) {
      this.logger.warn("Meta webhook: no lead data found in payload");
      return { success: false, message: "No lead data" };
    }

    // Extract fields from Meta format
    const fields = leadData.field_data ?? [];
    const getField = (name: string) =>
      fields.find((f: any) => f.name === name)?.values?.[0];

    const phone = getField("phone_number") ?? getField("phone") ?? leadData.phone;
    if (!phone) {
      return { success: false, message: "No phone number in lead data" };
    }

    const lead = await this.webhooksService.processInboundLead(
      organizationId,
      "meta_lead_ads",
      {
        name: getField("full_name") ?? getField("first_name"),
        phone,
        email: getField("email"),
        procedureInterest: getField("procedure") ?? getField("interest"),
      },
    );

    return { success: true, leadId: lead.id };
  }
}
