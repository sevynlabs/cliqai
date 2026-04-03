import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { PrismaService } from "../../common/prisma/prisma.service";
import { MinRole } from "../../common/auth/rbac.guard";

@Controller("settings/procedures")
export class ProceduresController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  @Get()
  findAll() {
    const orgId = this.cls.get("tenantId");
    return this.prisma.procedure.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
    });
  }

  @Post()
  @MinRole("admin")
  create(@Body() body: { name: string; durationMinutes?: number; price?: number; description?: string }) {
    const orgId = this.cls.get("tenantId");
    return this.prisma.procedure.create({
      data: {
        organizationId: orgId,
        name: body.name,
        durationMinutes: body.durationMinutes ?? 60,
        price: body.price,
        description: body.description,
      },
    });
  }

  @Patch(":id")
  @MinRole("admin")
  update(
    @Param("id") id: string,
    @Body() body: { name?: string; durationMinutes?: number; price?: number; description?: string; active?: boolean },
  ) {
    const orgId = this.cls.get("tenantId");
    return this.prisma.procedure.updateMany({
      where: { id, organizationId: orgId },
      data: body,
    });
  }

  @Delete(":id")
  @MinRole("admin")
  async remove(@Param("id") id: string) {
    const orgId = this.cls.get("tenantId");
    await this.prisma.procedure.deleteMany({ where: { id, organizationId: orgId } });
    return { success: true };
  }
}
