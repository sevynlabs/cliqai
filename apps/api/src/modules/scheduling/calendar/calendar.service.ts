import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  getOAuth2Client(): InstanceType<typeof google.auth.OAuth2> {
    return new google.auth.OAuth2(
      this.configService.get("GOOGLE_CLIENT_ID"),
      this.configService.get("GOOGLE_CLIENT_SECRET"),
      this.configService.get("GOOGLE_REDIRECT_URI"),
    );
  }

  getAuthUrl(organizationId: string, professionalId?: string): string {
    const oauth2 = this.getOAuth2Client();
    return oauth2.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar"],
      prompt: "consent", // CRITICAL: forces refresh_token every time
      state: `${organizationId}:${professionalId || "default"}`,
    });
  }

  async exchangeCode(code: string): Promise<{ refreshToken: string }> {
    const oauth2 = this.getOAuth2Client();
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error("No refresh token returned. Ensure prompt=consent is set.");
    }
    return { refreshToken: tokens.refresh_token };
  }

  async saveToken(
    organizationId: string,
    professionalId: string | null,
    calendarId: string,
    refreshToken: string,
  ): Promise<void> {
    await this.prisma.calendarToken.upsert({
      where: {
        organizationId_professionalId: {
          organizationId,
          professionalId: professionalId || "default",
        },
      },
      create: {
        organizationId,
        professionalId: professionalId || "default",
        calendarId,
        refreshToken,
      },
      update: { calendarId, refreshToken, updatedAt: new Date() },
    });
    this.logger.log(`Calendar token saved for org ${organizationId}`);
  }

  getCalendarClient(refreshToken: string): calendar_v3.Calendar {
    const oauth2 = this.getOAuth2Client();
    oauth2.setCredentials({ refresh_token: refreshToken });
    return google.calendar({ version: "v3", auth: oauth2 });
  }

  async getTokenForOrg(
    organizationId: string,
    professionalId?: string,
  ) {
    return this.prisma.calendarToken.findUnique({
      where: {
        organizationId_professionalId: {
          organizationId,
          professionalId: professionalId || "default",
        },
      },
    });
  }
}
