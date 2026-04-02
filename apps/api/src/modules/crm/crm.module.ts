import { Module, forwardRef } from "@nestjs/common";
import { LeadsService } from "./leads/leads.service";
import { LeadsController } from "./leads/leads.controller";
import { PipelineService } from "./pipeline/pipeline.service";
import { AnnotationsService } from "./annotations/annotations.service";
import { HandoffService } from "./handoff/handoff.service";
import { HandoffController } from "./handoff/handoff.controller";
import { AgentModule } from "../agent/agent.module";

@Module({
  imports: [forwardRef(() => AgentModule)],
  controllers: [LeadsController, HandoffController],
  providers: [LeadsService, PipelineService, AnnotationsService, HandoffService],
  exports: [LeadsService, PipelineService, AnnotationsService, HandoffService],
})
export class CrmModule {}
