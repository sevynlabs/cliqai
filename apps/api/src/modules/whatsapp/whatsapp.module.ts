import { Module, forwardRef } from "@nestjs/common";
import { QueueModule } from "../../common/queue/queue.module";
import { AgentModule } from "../agent/agent.module";
import { EvolutionApiClient } from "./evolution-api.client";
import { WhatsappService } from "./whatsapp.service";
import { WhatsappController } from "./whatsapp.controller";
import { MessageProcessor } from "./processors/message.processor";
import { OutboundProcessor } from "./processors/outbound.processor";

@Module({
  imports: [QueueModule, forwardRef(() => AgentModule)],
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
