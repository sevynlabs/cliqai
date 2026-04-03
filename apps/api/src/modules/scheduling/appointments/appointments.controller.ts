import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  BadRequestException,
} from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { AppointmentsService } from "./appointments.service";
import { CalendarService } from "../calendar/calendar.service";

@Controller("appointments")
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly calendarService: CalendarService,
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
    if (!body.startISO || !body.endISO) {
      throw new BadRequestException("startISO and endISO are required");
    }

    const organizationId = this.cls.get("tenantId");
    const token = await this.calendarService.getTokenForOrg(organizationId);

    // Cancel old appointment
    const cancelled = await this.appointmentsService.cancelAppointment(id, organizationId);

    if (!cancelled.leadId || !token) {
      return { success: true, message: "Cancelled but could not rebook (no calendar token)." };
    }

    // Rebook with same lead
    const newAppt = await this.appointmentsService.bookSlot({
      organizationId,
      leadId: cancelled.leadId,
      calendarId: token.calendarId,
      refreshToken: token.refreshToken,
      startISO: body.startISO,
      endISO: body.endISO,
      procedureName: cancelled.procedureName ?? undefined,
    });

    return { success: true, appointment: newAppt };
  }
}
