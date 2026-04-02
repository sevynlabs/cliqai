import { Module, forwardRef } from "@nestjs/common";
import { LgpdModule } from "../lgpd/lgpd.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { CrmModule } from "../crm/crm.module";
import { QueueModule } from "../../common/queue/queue.module";
import { AgentService } from "./agent.service";

@Module({
  imports: [
    LgpdModule,
    QueueModule,
    CrmModule,
    forwardRef(() => WhatsappModule),
  ],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
