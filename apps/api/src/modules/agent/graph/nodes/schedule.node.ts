import { AIMessage } from "@langchain/core/messages";
import { ChatAnthropic } from "@langchain/anthropic";
import type { AvailabilityService } from "../../../scheduling/availability/availability.service";
import type { AppointmentsService } from "../../../scheduling/appointments/appointments.service";
import type { CalendarService } from "../../../scheduling/calendar/calendar.service";
import type { PrismaService } from "../../../../common/prisma/prisma.service";
import type { SDRState } from "../sdr.state";

const intentClassifier = new ChatAnthropic({
  model: "claude-haiku-4-5-20251001",
  maxTokens: 30,
  temperature: 0,
});

export function createScheduleNode(
  availabilityService: AvailabilityService,
  appointmentsService: AppointmentsService,
  calendarService: CalendarService,
  prisma: PrismaService,
) {
  return async (state: SDRState): Promise<Partial<SDRState>> => {
    const lastMessage = state.messages[state.messages.length - 1];
    const text =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : "";

    // Classify intent
    const classification = await intentClassifier.invoke([
      {
        role: "system",
        content:
          "Classifique a intencao do usuario em UMA palavra: check_availability, confirm_slot, cancel, reschedule, other. Responda APENAS a classificacao.",
      },
      { role: "user", content: text },
    ]);

    const intent = (
      typeof classification.content === "string"
        ? classification.content
        : ""
    )
      .trim()
      .toLowerCase();

    const { organizationId, procedureInterest, leadId } = state;
    const agentConfig = state.agentConfig ?? { emojiUsage: true, timezone: "America/Sao_Paulo" };

    if (intent.includes("check_availability") || intent.includes("other")) {
      const slots = await availabilityService.getAvailableSlots(
        organizationId,
        procedureInterest ?? undefined,
      );

      if (slots.length === 0) {
        return {
          messages: [
            new AIMessage(
              `${agentConfig.emojiUsage ? "😔 " : ""}Infelizmente nao temos horarios disponiveis nos proximos dias. Posso verificar outra data para voce?`,
            ),
          ],
        };
      }

      const slotList = slots
        .slice(0, 5)
        .map((s, i) => `${i + 1}. ${s.formatted}`)
        .join("\n");

      return {
        messages: [
          new AIMessage(
            `${agentConfig.emojiUsage ? "📅 " : ""}Temos os seguintes horarios disponiveis:\n\n${slotList}\n\nQual horario funciona melhor para voce? Basta responder o numero!`,
          ),
        ],
      };
    }

    if (intent.includes("confirm_slot")) {
      const token = await calendarService.getTokenForOrg(organizationId);
      if (!token) {
        return {
          messages: [
            new AIMessage(
              "Desculpe, o calendario da clinica ainda nao foi configurado. Um atendente vai entrar em contato para agendar.",
            ),
          ],
          qualificationStage: "handoff" as any,
          humanHandoffRequested: true,
        };
      }

      const slots = await availabilityService.getAvailableSlots(
        organizationId,
        procedureInterest ?? undefined,
      );

      // Try to match slot from message
      const numberMatch = text.match(/(\d+)/);
      const slotIndex = numberMatch
        ? parseInt(numberMatch[1], 10) - 1
        : 0;
      const selectedSlot = slots[slotIndex] || slots[0];

      if (!selectedSlot) {
        return {
          messages: [
            new AIMessage(
              "Nao consegui identificar o horario. Poderia repetir qual opcao deseja?",
            ),
          ],
        };
      }

      try {
        const appointment = await appointmentsService.bookSlot({
          organizationId,
          leadId: leadId || "",
          calendarId: token.calendarId,
          refreshToken: token.refreshToken,
          startISO: selectedSlot.start,
          endISO: selectedSlot.end,
          procedureName: procedureInterest ?? undefined,
          patientName: state.leadName ?? undefined,
          patientPhone: state.remoteJid,
          timezone: agentConfig.timezone,
        });

        return {
          messages: [
            new AIMessage(
              `${agentConfig.emojiUsage ? "✅ " : ""}Perfeito! Sua consulta foi agendada para ${selectedSlot.formatted}. Voce recebera uma confirmacao em breve. Ate la!`,
            ),
          ],
          appointmentId: appointment.id,
        };
      } catch (err: any) {
        if (err.message?.includes("sendo reservado")) {
          return {
            messages: [
              new AIMessage(
                "Ops, parece que esse horario acabou de ser reservado. Deixa eu verificar os proximos disponiveis...",
              ),
            ],
          };
        }
        throw err;
      }
    }

    if (intent.includes("cancel")) {
      if (state.appointmentId) {
        await appointmentsService.cancelAppointment(
          state.appointmentId,
          organizationId,
        );
        return {
          messages: [
            new AIMessage(
              `${agentConfig.emojiUsage ? "📋 " : ""}Sua consulta foi cancelada. Se quiser reagendar, e so me avisar!`,
            ),
          ],
          appointmentId: null,
        };
      }
      return {
        messages: [
          new AIMessage(
            "Nao encontrei uma consulta agendada para cancelar. Posso ajudar com outra coisa?",
          ),
        ],
      };
    }

    if (intent.includes("reschedule")) {
      if (state.appointmentId) {
        await appointmentsService.cancelAppointment(
          state.appointmentId,
          organizationId,
        );
      }
      const slots = await availabilityService.getAvailableSlots(
        organizationId,
        procedureInterest ?? undefined,
      );
      const slotList = slots
        .slice(0, 5)
        .map((s, i) => `${i + 1}. ${s.formatted}`)
        .join("\n");

      return {
        messages: [
          new AIMessage(
            `${agentConfig.emojiUsage ? "🔄 " : ""}Sem problema! Aqui estao os novos horarios disponiveis:\n\n${slotList}\n\nQual prefere?`,
          ),
        ],
        appointmentId: null,
      };
    }

    return {
      messages: [
        new AIMessage(
          "Gostaria de agendar uma consulta? Posso verificar os horarios disponiveis para voce!",
        ),
      ],
    };
  };
}
