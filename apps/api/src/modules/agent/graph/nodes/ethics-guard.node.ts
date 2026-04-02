import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage, SystemMessage } from "@langchain/core/messages";
import type { SDRState } from "../sdr.state";

/**
 * Blocked phrases (PT-BR) — instant rejection without LLM call.
 */
const BLOCKED_PHRASES = [
  "diagnóstico",
  "diagnostico",
  "garanto que",
  "resultado garantido",
  "cura",
  "100% de sucesso",
  "certeza de resultado",
  "prometo",
  "sem risco",
  "totalmente seguro",
];

/**
 * Regex patterns that indicate medical claims or result promises.
 */
const BLOCKED_PATTERNS = [
  /\d+%\s*(de\s*)?(sucesso|chance|resultado)/i,
  /vai\s*(curar|resolver|eliminar)/i,
];

const REWRITE_SYSTEM_PROMPT =
  "Voce e um assistente que reescreve mensagens de atendimento. Reescreva a mensagem a seguir removendo qualquer alegacao medica, diagnostico, ou promessa de resultado. Mantenha o tom acolhedor e prestativo. Responda APENAS com a mensagem reescrita, sem explicacoes.";

const CLASSIFIER_SYSTEM_PROMPT =
  "Voce e um classificador de conformidade medica. Analise a mensagem e responda APENAS com SAFE ou BLOCKED seguido do motivo em uma linha. Uma mensagem e BLOCKED se contem diagnostico medico, promessas de tratamento, ou garantias de resultado.";

/**
 * Check if text contains any blocked phrase (case-insensitive).
 */
function containsBlockedPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  for (const phrase of BLOCKED_PHRASES) {
    if (lower.includes(phrase)) {
      return true;
    }
  }
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Rewrite a message that contains medical claims using a fast LLM call.
 */
async function rewriteMessage(draft: string): Promise<string> {
  const llm = new ChatAnthropic({
    model: "claude-sonnet-4-20250514",
    temperature: 0.3,
    maxTokens: 200,
  });

  const response = await llm.invoke([
    new SystemMessage(REWRITE_SYSTEM_PROMPT),
    new AIMessage(draft),
  ]);

  return typeof response.content === "string"
    ? response.content
    : (response.content as Array<{ type: string; text?: string }>)
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("");
}

/**
 * Run LLM classifier to catch subtle violations the blocklist misses.
 */
async function classifyMessage(draft: string): Promise<boolean> {
  const llm = new ChatAnthropic({
    model: "claude-sonnet-4-20250514",
    temperature: 0,
    maxTokens: 50,
  });

  const response = await llm.invoke([
    new SystemMessage(CLASSIFIER_SYSTEM_PROMPT),
    new AIMessage(draft),
  ]);

  const result =
    typeof response.content === "string"
      ? response.content
      : (response.content as Array<{ type: string; text?: string }>)
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("");

  return result.trim().toUpperCase().startsWith("BLOCKED");
}

/**
 * Factory that creates the ethics guard node.
 * Runs BEFORE every outbound AI message. Dual check:
 * 1. Blocklist (instant, no LLM cost)
 * 2. LLM classifier (catches subtle violations)
 * If either fails, the message is rewritten.
 */
export function createEthicsGuardNode() {
  return async function ethicsGuardNode(
    state: SDRState,
  ): Promise<Partial<SDRState>> {
    // Find the last AI message (the draft response to check)
    const lastAiIndex = [...state.messages]
      .map((m, i) => ({ msg: m, idx: i }))
      .reverse()
      .find((entry) => entry.msg._getType() === "ai");

    if (!lastAiIndex) {
      // No AI message to check
      return { ethicsBlocked: false };
    }

    const draft =
      typeof lastAiIndex.msg.content === "string"
        ? lastAiIndex.msg.content
        : (lastAiIndex.msg.content as Array<{ type: string; text?: string }>)
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("");

    if (!draft) {
      return { ethicsBlocked: false };
    }

    // Step 1: Blocklist check (instant)
    if (containsBlockedPhrase(draft)) {
      const rewritten = await rewriteMessage(draft);
      return {
        messages: [new AIMessage(rewritten)],
        ethicsBlocked: true,
      };
    }

    // Step 2: LLM classifier (catches subtle violations)
    const isBlocked = await classifyMessage(draft);
    if (isBlocked) {
      const rewritten = await rewriteMessage(draft);
      return {
        messages: [new AIMessage(rewritten)],
        ethicsBlocked: true,
      };
    }

    // Both checks passed — message is safe
    return { ethicsBlocked: false };
  };
}
