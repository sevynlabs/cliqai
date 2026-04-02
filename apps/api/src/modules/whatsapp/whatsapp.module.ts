import { Module } from "@nestjs/common";
import { QueueModule } from "../../common/queue/queue.module";
import { EvolutionApiClient } from "./evolution-api.client";
import { WhatsappService } from "./whatsapp.service";
import { WhatsappController } from "./whatsapp.controller";
import { MessageProcessor } from "./processors/message.processor";
import { OutboundProcessor } from "./processors/outbound.processor";

@Module({
  imports: [QueueModule],
  controllers: [WhatsappController],
  providers: [
    EvolutionApiClient,
    WhatsappService,
    MessageProcessor,
    OutboundProcessor,
  ],
  exports: [WhatsappService, EvolutionApiClient],
})
export class WhatsappModule {}
