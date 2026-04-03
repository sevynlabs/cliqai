import { Controller, Get } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("conversations")
export class ConversationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  @Get()
  async findAll() {
    const organizationId = this.cls.get("tenantId");
    return this.prisma.conversation.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        lead: { select: { name: true, phone: true, procedureInterest: true } },
      },
    });
  }
}
