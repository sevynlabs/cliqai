import {
  Injectable,
  Logger,
  ConflictException,
} from "@nestjs/common";
import { CalendarService } from "../calendar/calendar.service";
import { AvailabilityService } from "../availability/availability.service";
import { RedisService } from "../../../common/redis/redis.service";
import { PrismaService } from "../../../common/prisma/prisma.service";

interface BookSlotParams {
  organizationId: string;
  leadId: string;
  calendarId: string;
  refreshToken: string;
  startISO: string;
  endISO: string;
  procedureName?: string;
  patientName?: string;
  patientPhone?: string;
  timezone?: string;
}

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly calendarService: CalendarService,
    private readonly availabilityService: AvailabilityService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Book a slot with TENTATIVE + Redis lock to prevent double-booking (SCHED-06)
   */
  async bookSlot(params: BookSlotParams) {
    const lockKey = `booking:lock:${params.calendarId}:${params.startISO}`;

    // Acquire lock (30s TTL)
    const locked = await this.redis.set(lockKey, "1", "PX", 30000, "NX");
    if (!locked) {
      throw new ConflictException("Horario sendo reservado por outra sessao");
    }

    try {
      // Re-check freeBusy under lock
      const busy = await this.availabilityService.checkFreeBusy(
        params.calendarId,
        params.refreshToken,
        params.startISO,
        params.endISO,
      );
      if (busy.length > 0) {
        throw new ConflictException("Horario ja ocupado no calendario");
      }

      // Create TENTATIVE event
      const calendar = this.calendarService.getCalendarClient(params.refreshToken);
      const event = await calendar.events.insert({
        calendarId: params.calendarId,
        requestBody: {
          summary: `[Cliniq] ${params.procedureName || "Consulta"} - ${params.patientName || "Paciente"}`,
          description: `Telefone: ${params.patientPhone || "N/A"}\nProcedimento: ${params.procedureName || "N/A"}\nAgendado via CliniqAI`,
          start: {
            dateTime: params.startISO,
            timeZone: params.timezone || "America/Sao_Paulo",
          },
          end: {
            dateTime: params.endISO,
            timeZone: params.timezone || "America/Sao_Paulo",
          },
          status: "tentative",
        },
      });

      // Create DB record
      const appointment = await this.prisma.appointment.create({
        data: {
          organizationId: params.organizationId,
          leadId: params.leadId,
          calendarEventId: event.data.id!,
          calendarId: params.calendarId,
          startAt: new Date(params.startISO),
          endAt: new Date(params.endISO),
          status: "tentative",
          procedureName: params.procedureName,
        },
      });

      // Update lead stage to agendado
      await this.prisma.lead.update({
        where: { id: params.leadId },
        data: { stage: "agendado" },
      });

      this.logger.log(
        `Appointment booked: ${appointment.id} for lead ${params.leadId}`,
      );
      return appointment;
    } finally {
      // Atomic release: only delete if we own the lock
      await this.redis.eval(
        `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
        1,
        lockKey,
        "1",
      );
    }
  }

  async confirmAppointment(appointmentId: string, organizationId: string) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId },
    });
    if (!appt) throw new Error("Appointment not found");

    const token = await this.calendarService.getTokenForOrg(organizationId);
    if (token) {
      const calendar = this.calendarService.getCalendarClient(token.refreshToken);
      await calendar.events.patch({
        calendarId: appt.calendarId,
        eventId: appt.calendarEventId,
        requestBody: { status: "confirmed" },
      });
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "confirmed" },
    });
  }

  async cancelAppointment(appointmentId: string, organizationId: string) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId },
    });
    if (!appt) throw new Error("Appointment not found");

    const token = await this.calendarService.getTokenForOrg(organizationId);
    if (token) {
      const calendar = this.calendarService.getCalendarClient(token.refreshToken);
      await calendar.events.delete({
        calendarId: appt.calendarId,
        eventId: appt.calendarEventId,
      });
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "cancelled" },
    });
  }

  async findByLead(leadId: string) {
    return this.prisma.appointment.findMany({
      where: { leadId },
      orderBy: { startAt: "desc" },
    });
  }

  async findUpcoming(organizationId: string, days = 7) {
    const now = new Date();
    const end = new Date(now.getTime() + days * 86400000);
    return this.prisma.appointment.findMany({
      where: {
        organizationId,
        startAt: { gte: now, lte: end },
        status: { not: "cancelled" },
      },
      orderBy: { startAt: "asc" },
      include: { lead: true },
    });
  }
}
