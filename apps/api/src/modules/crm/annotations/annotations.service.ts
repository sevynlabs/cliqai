import { Injectable, Logger } from "@nestjs/common";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PrismaService } from "../../../common/prisma/prisma.service";
import type { SDRState } from "../../agent/graph/sdr.state";

@Injectable()
export class AnnotationsService {
  private readonly logger = new Logger(AnnotationsService.name);
  private readonly llm: ChatAnthropic;

  constructor(private readonly prisma: PrismaService) {
    this.llm = new ChatAnthropic({
      model: "claude-sonnet-4-20250514",
      maxTokens: 100,
      temperature: 0.3,
    });
  }

  /**
   * Create AI-generated annotations after a graph invocation.
   * Called by AgentService after each processMessage.
   * Non-blocking: failures are logged but never propagated.
   */
  async createFromAgent(leadId: string, state: SDRState): Promise<void> {
    try {
      // Summary annotation every 3 turns
      if (state.turnCount > 0 && state.turnCount % 3 === 0) {
        const summaryText = await this.generateAnnotation(
          state,
          "Resuma em 1 frase o progresso desta conversa de qualificacao. Responda apenas com o resumo.",
        );
        await this.prisma.leadAnnotation.create({
          data: {
            leadId,
            type: "summary",
            content: summaryText,
            createdBy: "ai",
          },
        });
        this.logger.debug(`Created summary annotation for lead ${leadId}`);
      }

      // Objection annotation when in objection stage
      if (state.qualificationStage === "objection") {
        const objectionText = await this.generateAnnotation(
          state,
          "Identifique a objecao principal do lead em 1 frase. Responda apenas com a objecao.",
        );
        await this.prisma.leadAnnotation.create({
          data: {
            leadId,
            type: "objection",
            content: objectionText,
            createdBy: "ai",
          },
        });
        this.logger.debug(`Created objection annotation for lead ${leadId}`);
      }

      // Next steps annotation when transitioning to schedule
      if (state.qualificationStage === "schedule") {
        const nextStepsText = await this.generateAnnotation(
          state,
          "Indique os proximos passos para agendamento deste lead em 1 frase. Responda apenas com os passos.",
        );
        await this.prisma.leadAnnotation.create({
          data: {
            leadId,
            type: "next_steps",
            content: nextStepsText,
            createdBy: "ai",
          },
        });
        this.logger.debug(
          `Created next_steps annotation for lead ${leadId}`,
        );
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to create annotations for lead ${leadId}: ${err.message}`,
      );
    }
  }

  /**
   * Create a manual (human-authored) annotation.
   */
  async createManual(
    leadId: string,
    userId: string,
    type: string,
    content: string,
  ) {
    return this.prisma.leadAnnotation.create({
      data: {
        leadId,
        type,
        content,
        createdBy: userId,
      },
    });
  }

  /**
   * Generate annotation text using a short LLM call.
   * Falls back to a template string if the LLM fails.
   */
  private async generateAnnotation(
    state: SDRState,
    instruction: string,
  ): Promise<string> {
    try {
      // Take last 3 messages for context
      const recentMessages = state.messages.slice(-3);
      const conversationSnippet = recentMessages
        .map(
          (m) =>
            `${m._getType() === "human" ? "Lead" : "AI"}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`,
        )
        .join("\n");

      const result = await this.llm.invoke([
        new SystemMessage(instruction),
        new HumanMessage(conversationSnippet),
      ]);

      return typeof result.content === "string"
        ? result.content
        : (result.content as Array<{ type: string; text?: string }>)
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("");
    } catch (err: any) {
      this.logger.warn(`LLM annotation failed, using template: ${err.message}`);
      return `Auto-annotation: stage=${state.qualificationStage}, turn=${state.turnCount}`;
    }
  }
}
