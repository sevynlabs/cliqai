import { Controller, Get } from "@nestjs/common";
import { Public } from "./common/tenant/public.decorator";

@Public()
@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      name: "CliniqAI API",
      version: "0.1.0",
    };
  }
}
