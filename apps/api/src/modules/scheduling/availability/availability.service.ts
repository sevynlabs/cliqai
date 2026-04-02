import { Injectable, Logger } from "@nestjs/common";
import {
  addMinutes,
  format,
  setHours,
  setMinutes,
  isBefore,
  isAfter,
  addDays,
  isWeekend,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarService } from "../calendar/calendar.service";
import { PrismaService } from "../../../common/prisma/prisma.service";

export interface AvailableSlot {
  start: string;
  end: string;
  formatted: string;
}

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    private readonly calendarService: CalendarService,
    private readonly prisma: PrismaService,
  ) {}

  async checkFreeBusy(
    calendarId: string,
    refreshToken: string,
    startISO: string,
    endISO: string,
  ): Promise<Array<{ start: string; end: string }>> {
    const calendar = this.calendarService.getCalendarClient(refreshToken);

    const result = await calendar.freebusy.query({
      requestBody: {
        timeMin: startISO,
        timeMax: endISO,
        items: [{ id: calendarId }],
      },
    });

    const calData = result.data.calendars?.[calendarId];
    if (calData?.errors?.length) {
      this.logger.warn(`FreeBusy errors for ${calendarId}: ${JSON.stringify(calData.errors)}`);
      return [];
    }

    return (calData?.busy ?? []).map((b) => ({
      start: b.start!,
      end: b.end!,
    }));
  }

  async getAvailableSlots(
    organizationId: string,
    procedureName?: string,
    date?: string,
  ): Promise<AvailableSlot[]> {
    const token = await this.calendarService.getTokenForOrg(organizationId);
    if (!token) return [];

    const config = await this.prisma.agentConfig.findUnique({
      where: { organizationId },
    });

    const hoursStart = config?.operatingHoursStart ?? 8;
    const hoursEnd = config?.operatingHoursEnd ?? 20;
    const slotDuration = 60; // minutes, default
    const bufferTime = 15; // SCHED-05: buffer between appointments

    // Generate date range: specified date or next 3 business days
    const dates: Date[] = [];
    if (date) {
      dates.push(new Date(date));
    } else {
      let d = new Date();
      while (dates.length < 3) {
        d = addDays(d, 1);
        if (!isWeekend(d)) dates.push(new Date(d));
      }
    }

    const rangeStart = setHours(setMinutes(dates[0], 0), hoursStart);
    const rangeEnd = setHours(
      setMinutes(dates[dates.length - 1], 0),
      hoursEnd,
    );

    const busy = await this.checkFreeBusy(
      token.calendarId,
      token.refreshToken,
      rangeStart.toISOString(),
      rangeEnd.toISOString(),
    );

    const slots: AvailableSlot[] = [];

    for (const day of dates) {
      let current = setHours(setMinutes(day, 0), hoursStart);
      const dayEnd = setHours(setMinutes(day, 0), hoursEnd);

      while (isBefore(addMinutes(current, slotDuration), dayEnd) || addMinutes(current, slotDuration).getTime() === dayEnd.getTime()) {
        const slotStart = current;
        const slotEnd = addMinutes(current, slotDuration);

        // Check if overlaps with any busy period
        const overlaps = busy.some((b) => {
          const bStart = new Date(b.start);
          const bEnd = new Date(b.end);
          return isBefore(slotStart, bEnd) && isAfter(slotEnd, bStart);
        });

        if (!overlaps && isAfter(slotStart, new Date())) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            formatted: format(slotStart, "EEEE, d 'de' MMMM 'as' HH:mm", {
              locale: ptBR,
            }),
          });
        }

        current = addMinutes(current, slotDuration + bufferTime);
      }
    }

    return slots.slice(0, 10); // Return max 10 slots
  }
}
