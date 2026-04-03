import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { PrismaService } from "../../common/prisma/prisma.service";
import { MinRole } from "../../common/auth/rbac.guard";

@Controller("settings/professionals")
export class ProfessionalsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  @Get()
  findAll() {
    const orgId = this.cls.get("tenantId");
    return this.prisma.professional.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
    });
  }

  @Post()
  @MinRole("admin")
  create(@Body() body: { name: string; specialty?: string; calendarId?: string }) {
    const orgId = this.cls.get("tenantId");
    return this.prisma.professional.create({
      data: {
        organizationId: orgId,
        name: body.name,
        specialty: body.specialty,
        calendarId: body.calendarId,
      },
    });
  }

  @Patch(":id")
  @MinRole("admin")
  update(
    @Param("id") id: string,
    @Body() body: { name?: string; specialty?: string; calendarId?: string; active?: boolean },
  ) {
    const orgId = this.cls.get("tenantId");
    return this.prisma.professional.updateMany({
      where: { id, organizationId: orgId },
      data: body,
    });
  }

  @Delete(":id")
  @MinRole("admin")
  async remove(@Param("id") id: string) {
    const orgId = this.cls.get("tenantId");
    await this.prisma.professional.deleteMany({ where: { id, organizationId: orgId } });
    return { success: true };
  }
}
