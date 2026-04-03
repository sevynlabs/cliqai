import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { WebhooksService } from "./webhooks.service";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksOutboundProcessor } from "./webhooks.processor";

@Module({
  imports: [BullModule.registerQueue({ name: "webhooks.outbound" })],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksOutboundProcessor],
  exports: [WebhooksService],
})
export class WebhooksModule {}
