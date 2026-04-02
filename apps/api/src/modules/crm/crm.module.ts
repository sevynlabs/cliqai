import { Module } from "@nestjs/common";
import { LeadsService } from "./leads/leads.service";
import { LeadsController } from "./leads/leads.controller";
import { PipelineService } from "./pipeline/pipeline.service";
import { AnnotationsService } from "./annotations/annotations.service";

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, PipelineService, AnnotationsService],
  exports: [LeadsService, PipelineService, AnnotationsService],
})
export class CrmModule {}
