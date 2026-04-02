import { Controller, Get, Query, Res, Logger } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import type { Response } from "express";
import { CalendarService } from "./calendar.service";

@Controller("calendar")
export class CalendarController {
  private readonly logger = new Logger(CalendarController.name);

  constructor(
    private readonly calendarService: CalendarService,
    private readonly cls: ClsService,
  ) {}

  @Get("auth")
  getAuthUrl(@Query("professionalId") professionalId?: string) {
    const organizationId = this.cls.get("tenantId");
    const authUrl = this.calendarService.getAuthUrl(organizationId, professionalId);
    return { authUrl };
  }

  @Get("callback")
  async handleCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
  ) {
    const [organizationId, professionalId] = state.split(":");
    const { refreshToken } = await this.calendarService.exchangeCode(code);

    // Get primary calendar
    const calendar = this.calendarService.getCalendarClient(refreshToken);
    const list = await calendar.calendarList.list();
    const primary = list.data.items?.find((c) => c.primary)?.id || "primary";

    await this.calendarService.saveToken(
      organizationId,
      professionalId === "default" ? null : professionalId,
      primary,
      refreshToken,
    );

    this.logger.log(`Calendar connected for org ${organizationId}`);
    res.redirect("/settings?tab=calendar&status=connected");
  }
}
