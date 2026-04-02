import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage, SystemMessage } from "@langchain/core/messages";
import type { SDRState, BantScore } from "../sdr.state";
import { buildQualifyPrompt } from "../../prompts/system.prompt";
import type { AgentConfigState } from "../sdr.state";

const DEFAULT_CONFIG: AgentConfigState = {
  personaName: "Sofia",
  tone: "informal e acolhedor",
  specialtyText: null,
  emojiUsage: true,
  operatingHoursStart: 8,
  operatingHoursEnd: 20,
  timezone: "America/Sao_Paulo",
  maxTurns: 20,
  systemPromptExtra: null,
};

/**
 * Extracts BANT update JSON from the AI response text.
 * The JSON block is enclosed in ```json ... ``` markers.
 */
function extractBantUpdate(text: string): {
  cleanText: string;
  bantUpdate: Partial<BantScore> | null;
  leadName: string | null;
  procedureInterest: string | null;
} {
  let cleanText = text;
  let bantUpdate: Partial<BantScore> | null = null;
  let leadName: string | null = null;
  let procedureInterest: string | null = null;

  // Try to extract JSON block from markdown code fence
  const jsonBlockRegex = /```json\s*\n?([\s\S]*?)\n?```/;
  const match = text.match(jsonBlockRegex);

  if (match) {
    cleanText = text.replace(jsonBlockRegex, "").trim();
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.bant_update) {
        bantUpdate = parsed.bant_update;
      }
      if (parsed.lead_name) {
        leadName = parsed.lead_name;
      }
      if (parsed.procedure_interest) {
        procedureInterest = parsed.procedure_interest;
      }
    } catch {
      // JSON parse failed -- ignore, keep full text
    }
  } else {
    // Fallback: try to find raw JSON with bant_update key
    const rawJsonRegex = /\{[^{}]*"bant_update"[^{}]*\{[^{}]*\}[^{}]*\}/;
    const rawMatch = text.match(rawJsonRegex);
    if (rawMatch) {
      cleanText = text.replace(rawMatch[0], "").trim();
      try {
        const parsed = JSON.parse(rawMatch[0]);
        if (parsed.bant_update) {
          bantUpdate = parsed.bant_update;
        }
        if (parsed.lead_name) {
          leadName = parsed.lead_name;
        }
        if (parsed.procedure_interest) {
          procedureInterest = parsed.procedure_interest;
        }
      } catch {
        // Ignore parse failure
      }
    }
  }

  return { cleanText, bantUpdate, leadName, procedureInterest };
}

/**
 * Factory that creates the qualify node.
 * Extracts BANT data from natural conversation using ChatAnthropic.
 */
export function createQualifyNode() {
  return async function qualifyNode(
    state: SDRState,
  ): Promise<Partial<SDRState>> {
    const config = state.agentConfig || DEFAULT_CONFIG;
    const systemPrompt = buildQualifyPrompt(config, state.bantScore);

    const llm = new ChatAnthropic({
      model: "claude-sonnet-4-20250514",
      temperature: 0.7,
      maxTokens: 500,
    });

    // Use last 8 messages for context
    const recentMessages = state.messages.slice(-8);

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      ...recentMessages,
    ]);

    const responseText =
      typeof response.content === "string"
        ? response.content
        : (response.content as Array<{ type: string; text?: string }>)
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("");

    const { cleanText, bantUpdate, leadName, procedureInterest } =
      extractBantUpdate(responseText);

    // Merge BANT updates (only set to true, never revert to false)
    const mergedBant: BantScore = { ...state.bantScore };
    let didExtractNewInfo = false;

    if (bantUpdate) {
      for (const key of ["budget", "authority", "need", "timeline"] as const) {
        if (bantUpdate[key] === true && !mergedBant[key]) {
          mergedBant[key] = true;
          didExtractNewInfo = true;
        }
      }
    }

    if (leadName && !state.leadName) {
      didExtractNewInfo = true;
    }
    if (procedureInterest && !state.procedureInterest) {
      didExtractNewInfo = true;
    }

    // Check if fully qualified
    const allBantTrue =
      mergedBant.budget &&
      mergedBant.authority &&
      mergedBant.need &&
      mergedBant.timeline;

    const cleanedMessage = new AIMessage(cleanText);

    return {
      messages: [cleanedMessage],
      bantScore: mergedBant,
      leadName: leadName || state.leadName,
      procedureInterest: procedureInterest || state.procedureInterest,
      turnCount: state.turnCount + 1,
      consecutiveUnresolved: didExtractNewInfo
        ? 0
        : state.consecutiveUnresolved + 1,
      qualificationStage: allBantTrue ? "schedule" : state.qualificationStage,
    };
  };
}
