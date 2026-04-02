import { Controller, Get } from "@nestjs/common";

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
