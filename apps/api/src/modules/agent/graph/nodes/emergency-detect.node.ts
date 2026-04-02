import { AIMessage } from "@langchain/core/messages";
import type { SDRState } from "../sdr.state";

/**
 * Emergency keywords in PT-BR (case-insensitive matching).
 */
const EMERGENCY_KEYWORDS = [
  "emergencia",
  "emergência",
  "urgente",
  "sangramento",
  "sangue",
  "desmaio",
  "desmaiou",
  "infarto",
  "avc",
  "acidente",
  "hospital",
  "samu",
  "192",
  "pronto socorro",
  "pronto-socorro",
  "dor forte",
  "dor intensa",
  "não consigo respirar",
  "nao consigo respirar",
  "alergia grave",
  "inchaço",
  "inchaco",
  "reação alérgica",
  "reacao alergica",
];

const EMERGENCY_RESPONSE =
  "Detectei uma situacao de urgencia. Estou transferindo voce imediatamente para nossa equipe. " +
  "Se for uma emergencia medica, por favor ligue 192 (SAMU) ou va ao pronto-socorro mais proximo.";

/**
 * Factory that creates the emergency detection node.
 * Checks the LAST human message for emergency keywords.
 * If detected, triggers immediate human handoff with SAMU advisory.
 */
export function createEmergencyDetectNode() {
  return async function emergencyDetectNode(
    state: SDRState,
  ): Promise<Partial<SDRState>> {
    // Find last human message
    const lastHumanMessage = [...state.messages]
      .reverse()
      .find((m) => m._getType() === "human");

    if (!lastHumanMessage) {
      return {};
    }

    const text =
      typeof lastHumanMessage.content === "string"
        ? lastHumanMessage.content.toLowerCase()
        : (
            lastHumanMessage.content as Array<{ type: string; text?: string }>
          )
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("")
            .toLowerCase();

    // Check for emergency keywords
    const hasEmergency = EMERGENCY_KEYWORDS.some((keyword) =>
      text.includes(keyword),
    );

    if (hasEmergency) {
      return {
        messages: [new AIMessage(EMERGENCY_RESPONSE)],
        humanHandoffRequested: true,
        qualificationStage: "handoff",
      };
    }

    // No emergency — pass through
    return {};
  };
}
