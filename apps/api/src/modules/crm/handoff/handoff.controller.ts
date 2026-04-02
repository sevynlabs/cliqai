import {
  Controller,
  Post,
  Get,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import { HandoffService } from "./handoff.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { ClsService } from "nestjs-cls";

@Controller("handoff")
export class HandoffController {
  constructor(
    private readonly handoffService: HandoffService,
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  @Post(":conversationId/takeover")
  @HttpCode(HttpStatus.OK)
  async takeOver(
    @Param("conversationId") conversationId: string,
    @Req() req: any,
  ) {
    const organizationId = this.cls.get("tenantId");
    const userId = req.user?.id ?? "unknown";

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation || conversation.organizationId !== organizationId) {
      throw new NotFoundException("Conversa nao encontrada");
    }

    const result = await this.handoffService.takeOver(
      organizationId,
      conversation.remoteJid,
      userId,
    );

    return { success: true, ...result };
  }

  @Post(":conversationId/return")
  @HttpCode(HttpStatus.OK)
  async returnToAI(@Param("conversationId") conversationId: string) {
    const organizationId = this.cls.get("tenantId");

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation || conversation.organizationId !== organizationId) {
      throw new NotFoundException("Conversa nao encontrada");
    }

    await this.handoffService.returnToAI(organizationId, conversation.remoteJid);
    return { success: true };
  }

  @Get(":conversationId/status")
  async getStatus(@Param("conversationId") conversationId: string) {
    const organizationId = this.cls.get("tenantId");

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation || conversation.organizationId !== organizationId) {
      throw new NotFoundException("Conversa nao encontrada");
    }

    const holder = await this.handoffService.getMutexHolder(
      organizationId,
      conversation.remoteJid,
    );

    return {
      conversationId,
      status: conversation.status,
      mutexHolder: holder,
      isHumanHandling: !!holder,
    };
  }
}
