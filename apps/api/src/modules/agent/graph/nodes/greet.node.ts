import { ChatAnthropic } from "@langchain/anthropic";
import { SystemMessage } from "@langchain/core/messages";
import type { SDRState } from "../sdr.state";
import { buildGreetingPrompt } from "../../prompts/system.prompt";
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
 * Factory that creates the greet node.
 * Uses ChatAnthropic to generate a greeting based on the clinic's persona config.
 */
export function createGreetNode() {
  return async function greetNode(
    state: SDRState,
  ): Promise<Partial<SDRState>> {
    const config = state.agentConfig || DEFAULT_CONFIG;
    const systemPrompt = buildGreetingPrompt(config);

    const llm = new ChatAnthropic({
      model: "claude-sonnet-4-20250514",
      temperature: 0.7,
      maxTokens: 300,
    });

    // Use last 4 messages for context
    const recentMessages = state.messages.slice(-4);

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      ...recentMessages,
    ]);

    return {
      messages: [response],
      qualificationStage: "qualify",
      turnCount: state.turnCount + 1,
    };
  };
}
