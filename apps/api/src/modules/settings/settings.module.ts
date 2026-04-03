import { Module } from "@nestjs/common";
import { SettingsController } from "./settings.controller";
import { ProceduresController } from "./procedures.controller";
import { ProfessionalsController } from "./professionals.controller";
import { TemplatesController } from "./templates.controller";

@Module({
  controllers: [
    SettingsController,
    ProceduresController,
    ProfessionalsController,
    TemplatesController,
  ],
})
export class SettingsModule {}
