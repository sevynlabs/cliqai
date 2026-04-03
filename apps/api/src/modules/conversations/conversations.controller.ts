import { Controller, Get, Param } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AgentService } from "../agent/agent.service";

@Controller("conversations")
export class ConversationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
    private readonly agentService: AgentService,
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

  @Get(":id/messages")
  async getMessages(@Param("id") id: string) {
    const organizationId = this.cls.get("tenantId");

    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId },
    });

    if (!conversation) return [];

    return this.agentService.getMessages(conversation.threadId);
  }
}
