import { HumanMessage } from "@langchain/core/messages";
import type { SDRState } from "../sdr.state";
import type { LgpdService } from "../../../lgpd/lgpd.service";
import type { RecordConsentDto } from "../../../lgpd/dto/record-consent.dto";

const CONSENT_KEYWORDS = ["sim", "aceito", "concordo", "ok", "pode", "autorizo"];

/**
 * Factory that creates the consent_check node with LgpdService injected via closure.
 * This node is the FIRST node after START - no data is stored before consent.
 */
export function createConsentCheckNode(lgpdService: LgpdService) {
  return async function consentCheckNode(
    state: SDRState,
  ): Promise<Partial<SDRState>> {
    // Already has consent -- pass through
    if (state.consentGiven) {
      return {};
    }

    // Get the latest user message
    const lastMessage = state.messages[state.messages.length - 1];
    const messageText =
      lastMessage && lastMessage._getType() === "human"
        ? (lastMessage.content as string).toLowerCase().trim()
        : "";

    // Check if user sent affirmative consent
    const isAffirmative = CONSENT_KEYWORDS.some((kw) =>
      messageText.includes(kw),
    );

    if (isAffirmative) {
      // Record consent via LGPD service
      const consentData: RecordConsentDto = {
        leadPhone: state.remoteJid,
        consentGiven: true,
        consentVersion: "1.0",
        consentChannel: "whatsapp",
        consentMessage:
          "Consentimento dado via WhatsApp - resposta afirmativa ao pedido de autorizacao LGPD.",
      };

      await lgpdService.recordConsent(state.organizationId, consentData);

      return {
        consentGiven: true,
        qualificationStage: "greet",
      };
    }

    // First message (no prior messages or just the one) -- first contact, need to ask consent
    if (state.messages.length <= 1) {
      return {
        qualificationStage: "consent",
      };
    }

    // User sent something that isn't consent -- re-ask
    return {
      qualificationStage: "consent",
    };
  };
}
