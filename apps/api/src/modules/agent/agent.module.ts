import { Module, forwardRef } from "@nestjs/common";
import { LgpdModule } from "../lgpd/lgpd.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { AgentService } from "./agent.service";

@Module({
  imports: [
    LgpdModule,
    forwardRef(() => WhatsappModule),
  ],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
