import { Controller, Get } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly cls: ClsService,
  ) {}

  @Get("kpis")
  getKpis() {
    return this.dashboardService.getKpis(this.cls.get("tenantId"));
  }

  @Get("funnel")
  getFunnel() {
    return this.dashboardService.getFunnel(this.cls.get("tenantId"));
  }

  @Get("activity")
  getActivity() {
    return this.dashboardService.getActivity(this.cls.get("tenantId"));
  }

  @Get("agenda")
  getAgenda() {
    return this.dashboardService.getTodaysAgenda(this.cls.get("tenantId"));
  }

  @Get("agent-health")
  getAgentHealth() {
    return this.dashboardService.getAgentHealth(this.cls.get("tenantId"));
  }
}
