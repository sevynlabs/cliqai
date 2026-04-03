import { Controller, Get, Patch, Body } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("settings")
export class SettingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  @Get("agent")
  async getAgentConfig() {
    const organizationId = this.cls.get("tenantId");
    const config = await this.prisma.agentConfig.findUnique({
      where: { organizationId },
    });
    return config ?? {
      personaName: "Sofia",
      tone: "informal e acolhedor",
      specialtyText: null,
      emojiUsage: true,
      operatingHoursStart: 8,
      operatingHoursEnd: 20,
      timezone: "America/Sao_Paulo",
      maxTurns: 20,
    };
  }

  @Patch("agent")
  async updateAgentConfig(@Body() body: Record<string, any>) {
    const organizationId = this.cls.get("tenantId");
    return this.prisma.agentConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        personaName: body.personaName ?? "Sofia",
        tone: body.tone ?? "informal e acolhedor",
        specialtyText: body.specialtyText ?? null,
        emojiUsage: body.emojiUsage ?? true,
        operatingHoursStart: body.operatingHoursStart ?? 8,
        operatingHoursEnd: body.operatingHoursEnd ?? 20,
        timezone: body.timezone ?? "America/Sao_Paulo",
        maxTurns: body.maxTurns ?? 20,
      },
      update: body,
    });
  }
}
