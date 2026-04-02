import { Module } from "@nestjs/common";
import { CalendarService } from "./calendar/calendar.service";
import { CalendarController } from "./calendar/calendar.controller";
import { AvailabilityService } from "./availability/availability.service";
import { AppointmentsService } from "./appointments/appointments.service";
import { AppointmentsController } from "./appointments/appointments.controller";

@Module({
  controllers: [CalendarController, AppointmentsController],
  providers: [CalendarService, AvailabilityService, AppointmentsService],
  exports: [CalendarService, AvailabilityService, AppointmentsService],
})
export class SchedulingModule {}
