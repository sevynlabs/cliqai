import { END, START, StateGraph } from "@langchain/langgraph";
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import { SDRStateAnnotation, type SDRState } from "./sdr.state";

/**
 * Node functions created by AgentService.onModuleInit() as closures with injected deps.
 */
export interface SDRNodeFactory {
  consentCheckNode: (state: SDRState) => Promise<Partial<SDRState>>;
  greetNode: (state: SDRState) => Promise<Partial<SDRState>>;
  qualifyNode: (state: SDRState) => Promise<Partial<SDRState>>;
}

/**
 * Build and compile the SDR StateGraph.
 *
 * Flow per message (request-response, NOT a loop):
 *   START -> consent_check -> (greet | END)
 *   greet -> qualify
 *   qualify -> END
 *
 * Each invocation processes ONE turn and returns.
 * The next user message triggers a new invoke which restores state from Redis.
 */
export function buildSDRGraph(
  checkpointer: BaseCheckpointSaver,
  nodes: SDRNodeFactory,
) {
  const graph = new StateGraph(SDRStateAnnotation)
    .addNode("consent_check", nodes.consentCheckNode)
    .addNode("greet", nodes.greetNode)
    .addNode("qualify", nodes.qualifyNode)
    // START -> consent_check
    .addEdge(START, "consent_check")
    // consent_check -> conditional routing
    .addConditionalEdges("consent_check", (state: SDRState) => {
      if (state.consentGiven) {
        // If this is the first consent (came from greet stage), go to greet
        if (state.qualificationStage === "greet") {
          return "greet";
        }
        // Already past greeting (returning user), go to qualify
        if (
          state.qualificationStage === "qualify" ||
          state.qualificationStage === "schedule" ||
          state.qualificationStage === "objection"
        ) {
          return "qualify";
        }
        return "greet";
      }
      // No consent yet -- end this turn, wait for consent reply
      return END;
    })
    // greet -> qualify
    .addEdge("greet", "qualify")
    // qualify -> END (wait for next user message)
    .addConditionalEdges("qualify", (state: SDRState) => {
      // All paths end -- this is request-response, not a loop
      // Phase 3 will add routing to schedule node
      return END;
    });

  return graph.compile({ checkpointer });
}
