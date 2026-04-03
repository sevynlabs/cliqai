import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { PrismaService } from "../../common/prisma/prisma.service";
import { MinRole } from "../../common/auth/rbac.guard";

@Controller("settings/templates")
export class TemplatesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  @Get()
  findAll() {
    const orgId = this.cls.get("tenantId");
    return this.prisma.messageTemplate.findMany({
      where: { organizationId: orgId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  }

  @Post()
  @MinRole("admin")
  create(@Body() body: { type: string; name: string; content: string; variables?: string[] }) {
    const orgId = this.cls.get("tenantId");
    return this.prisma.messageTemplate.create({
      data: {
        organizationId: orgId,
        type: body.type,
        name: body.name,
        content: body.content,
        variables: body.variables ?? [],
      },
    });
  }

  @Patch(":id")
  @MinRole("admin")
  update(
    @Param("id") id: string,
    @Body() body: { name?: string; content?: string; variables?: string[]; active?: boolean },
  ) {
    const orgId = this.cls.get("tenantId");
    return this.prisma.messageTemplate.updateMany({
      where: { id, organizationId: orgId },
      data: body,
    });
  }

  @Delete(":id")
  @MinRole("admin")
  async remove(@Param("id") id: string) {
    const orgId = this.cls.get("tenantId");
    await this.prisma.messageTemplate.deleteMany({ where: { id, organizationId: orgId } });
    return { success: true };
  }
}
