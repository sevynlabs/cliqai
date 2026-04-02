import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { SDRState, AgentConfigState } from "../sdr.state";

type ObjectionCategory = "price" | "fear" | "timing" | "info_request";

const CLASSIFIER_PROMPT =
  "Voce e um classificador de objecoes de leads em clinicas medicas/esteticas. " +
  "Analise a mensagem do lead e responda APENAS com uma palavra: " +
  "NONE (nao e objecao), PRICE (caro, nao tenho, desconto, parcela), " +
  "FEAR (medo, dor, anestesia, risco, receio), " +
  "TIMING (depois, agora nao, vou pensar, nao sei quando), " +
  "INFO_REQUEST (manda informacao, envia foto, portfolio, antes e depois, fotos).";

const OBJECTION_PROMPTS: Record<ObjectionCategory, string> = {
  price:
    "O lead expressou preocupacao com preco. Reconheca a preocupacao com empatia, " +
    "mencione opcoes flexiveis de pagamento e parcelamento, e redirecione para o valor " +
    "e beneficios do procedimento. NAO mencione valores especificos. " +
    "Termine com uma pergunta para manter a conversa fluindo.",
  fear:
    "O lead expressou medo ou receio sobre o procedimento. Demonstre empatia genuina, " +
    "explique que as tecnicas modernas sao confortaveis e seguras, e ofereca-se para " +
    "responder duvidas especificas. NAO faca promessas de resultado. " +
    "Termine com uma pergunta para manter a conversa fluindo.",
  timing:
    "O lead quer pensar ou adiar. Respeite o timing dele, mencione que as agendas costumam " +
    "ter disponibilidade limitada, e sugira uma consulta sem compromisso para conhecer melhor. " +
    "NAO pressione. Termine com uma pergunta para manter a conversa fluindo.",
  info_request:
    "O lead pediu informacoes adicionais (fotos, portfolio, detalhes). Reconheca o pedido " +
    "e prometa enviar as informacoes, mas antes faca UMA pergunta qualificatoria para " +
    "entender melhor o que o lead precisa e manter a conversa fluindo.",
};

function parseCategory(response: string): ObjectionCategory | null {
  const upper = response.trim().toUpperCase();
  if (upper.startsWith("PRICE")) return "price";
  if (upper.startsWith("FEAR")) return "fear";
  if (upper.startsWith("TIMING")) return "timing";
  if (upper.startsWith("INFO_REQUEST")) return "info_request";
  return null;
}

/**
 * Factory that creates the objection handling node.
 * Classifies the lead's message and responds empathetically per category.
 */
export function createObjectionNode() {
  return async function objectionNode(
    state: SDRState,
  ): Promise<Partial<SDRState>> {
    // Find last human message
    const lastHumanMessage = [...state.messages]
      .reverse()
      .find((m) => m._getType() === "human");

    if (!lastHumanMessage) {
      return {};
    }

    const humanText =
      typeof lastHumanMessage.content === "string"
        ? lastHumanMessage.content
        : (
            lastHumanMessage.content as Array<{ type: string; text?: string }>
          )
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("");

    // Step 1: Classify the objection
    const classifierLlm = new ChatAnthropic({
      model: "claude-sonnet-4-20250514",
      temperature: 0,
      maxTokens: 20,
    });

    const classResult = await classifierLlm.invoke([
      new SystemMessage(CLASSIFIER_PROMPT),
      new HumanMessage(humanText),
    ]);

    const classText =
      typeof classResult.content === "string"
        ? classResult.content
        : (classResult.content as Array<{ type: string; text?: string }>)
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("");

    const category = parseCategory(classText);

    if (!category) {
      // Not an objection — pass through, graph routing will skip
      return {};
    }

    // Step 2: Generate empathetic response for the objection category
    const config = state.agentConfig;
    const personaName = config?.personaName || "Sofia";
    const tone = config?.tone || "informal e acolhedor";

    const responsePrompt =
      `Voce e ${personaName}, assistente de uma clinica medica/estetica. ` +
      `Seu tom e ${tone}. ` +
      OBJECTION_PROMPTS[category] +
      " Responda em portugues brasileiro. Seja breve (max 3 frases).";

    const responseLlm = new ChatAnthropic({
      model: "claude-sonnet-4-20250514",
      temperature: 0.7,
      maxTokens: 250,
    });

    const recentMessages = state.messages.slice(-6);

    const response = await responseLlm.invoke([
      new SystemMessage(responsePrompt),
      ...recentMessages,
    ]);

    return {
      messages: [response as AIMessage],
      qualificationStage: "qualify",
      consecutiveUnresolved: 0,
    };
  };
}
