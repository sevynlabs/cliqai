import { Controller, Get } from "@nestjs/common";
import { Public } from "../common/tenant/public.decorator";

@Public()
@Controller("api/health")
export class HealthController {
  @Get()
  check() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
