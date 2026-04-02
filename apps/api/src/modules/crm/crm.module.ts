import { Module } from "@nestjs/common";
import { LeadsService } from "./leads/leads.service";
import { LeadsController } from "./leads/leads.controller";
import { PipelineService } from "./pipeline/pipeline.service";

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, PipelineService],
  exports: [LeadsService, PipelineService],
})
export class CrmModule {}
