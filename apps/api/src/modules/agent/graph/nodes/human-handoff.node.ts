import { AIMessage } from "@langchain/core/messages";
import type { Queue } from "bullmq";
import type { SDRState } from "../sdr.state";
import type { PrismaService } from "../../../../common/prisma/prisma.service";

/**
 * Determine the reason for human handoff based on state.
 */
function determineReason(
  state: SDRState,
): "max_turns" | "loop_detected" | "emergency" | "user_requested" {
  const maxTurns = state.agentConfig?.maxTurns ?? 20;

  if (state.turnCount >= maxTurns) {
    return "max_turns";
  }
  if (state.consecutiveUnresolved >= 3) {
    return "loop_detected";
  }
  // If qualificationStage was already set to handoff by emergency detect
  // the emergency detect node sets it before this node runs
  if (state.qualificationStage === "handoff" && state.humanHandoffRequested) {
    return "emergency";
  }
  return "user_requested";
}

/**
 * Factory that creates the human handoff node with injected dependencies.
 * Updates conversation status in DB and enqueues notification.
 */
export function createHandoffNode(
  prisma: PrismaService,
  notificationsQueue: Queue,
) {
  return async function handoffNode(
    state: SDRState,
  ): Promise<Partial<SDRState>> {
    const personaName = state.agentConfig?.personaName ?? "Sofia";
    const reason = determineReason(state);

    const handoffMessage =
      `Vou transferir voce para um de nossos especialistas que podera te ajudar melhor. ` +
      `Aguarde um momento! ${personaName}`;

    // Update conversation status in DB
    try {
      await prisma.conversation.update({
        where: {
          organizationId_remoteJid: {
            organizationId: state.organizationId,
            remoteJid: state.remoteJid,
          },
        },
        data: {
          status: "human_handling",
          updatedAt: new Date(),
        },
      });
    } catch {
      // Conversation may not exist yet in some edge cases — log but don't fail
    }

    // Enqueue notification for human agents
    await notificationsQueue.add("handoff_required", {
      type: "handoff_required",
      organizationId: state.organizationId,
      remoteJid: state.remoteJid,
      instanceName: state.instanceName,
      reason,
    });

    return {
      messages: [new AIMessage(handoffMessage)],
      humanHandoffRequested: true,
      qualificationStage: "handoff",
    };
  };
}
