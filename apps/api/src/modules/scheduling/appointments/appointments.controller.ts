import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { AppointmentsService } from "./appointments.service";

@Controller("appointments")
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly cls: ClsService,
  ) {}

  @Get()
  findUpcoming(@Query("days") days?: string) {
    const organizationId = this.cls.get("tenantId");
    return this.appointmentsService.findUpcoming(
      organizationId,
      days ? parseInt(days, 10) : 7,
    );
  }

  @Get("lead/:leadId")
  findByLead(@Param("leadId") leadId: string) {
    return this.appointmentsService.findByLead(leadId);
  }

  @Post(":id/confirm")
  confirm(@Param("id") id: string) {
    const organizationId = this.cls.get("tenantId");
    return this.appointmentsService.confirmAppointment(id, organizationId);
  }

  @Post(":id/cancel")
  cancel(@Param("id") id: string) {
    const organizationId = this.cls.get("tenantId");
    return this.appointmentsService.cancelAppointment(id, organizationId);
  }

  @Post(":id/reschedule")
  async reschedule(
    @Param("id") id: string,
    @Body() body: { startISO: string; endISO: string },
  ) {
    const organizationId = this.cls.get("tenantId");
    await this.appointmentsService.cancelAppointment(id, organizationId);
    // Re-booking would need full params — simplified for now
    return { success: true, message: "Appointment cancelled. New booking needed." };
  }
}
