import { AIMessage } from "@langchain/core/messages";
import type { SDRState } from "../sdr.state";

/**
 * Get the current hour in a given timezone using native Intl.DateTimeFormat.
 * No external libraries needed — Node.js 18+ supports this natively.
 */
function getCurrentHourInTimezone(timezone: string): number {
  const hourStr = new Date().toLocaleString("en-US", {
    timeZone: timezone,
    hour12: false,
    hour: "numeric",
  });
  return parseInt(hourStr, 10);
}

/**
 * Factory that creates the operating hours node.
 * Checks if current time is within clinic operating hours (timezone-aware).
 * If outside hours, sends a polite deferral and stops processing.
 */
export function createOperatingHoursNode() {
  return async function operatingHoursNode(
    state: SDRState,
  ): Promise<Partial<SDRState>> {
    const config = state.agentConfig;
    if (!config) {
      // No config — assume inside hours (pass through)
      return {};
    }

    const currentHour = getCurrentHourInTimezone(config.timezone);
    const { operatingHoursStart, operatingHoursEnd } = config;

    // Check if outside operating hours
    if (currentHour < operatingHoursStart || currentHour >= operatingHoursEnd) {
      const deferralMessage =
        `Ola! Nosso horario de atendimento e das ${operatingHoursStart}h as ${operatingHoursEnd}h. ` +
        `Retornaremos assim que possivel! ${config.personaName}`;

      return {
        messages: [new AIMessage(deferralMessage)],
        // Stay at current stage, don't advance
        qualificationStage: state.qualificationStage,
      };
    }

    // Inside operating hours — pass through
    return {};
  };
}
