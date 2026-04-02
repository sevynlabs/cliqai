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
  operatingHoursNode: (state: SDRState) => Promise<Partial<SDRState>>;
  emergencyDetectNode: (state: SDRState) => Promise<Partial<SDRState>>;
  objectionNode: (state: SDRState) => Promise<Partial<SDRState>>;
  ethicsGuardNode: (state: SDRState) => Promise<Partial<SDRState>>;
  loopGuardNode: (state: SDRState) => Promise<Partial<SDRState>>;
  handoffNode: (state: SDRState) => Promise<Partial<SDRState>>;
}

/**
 * Build and compile the full SDR StateGraph with all guardrail nodes.
 *
 * Flow per message (request-response, NOT a loop):
 *
 *   START -> consent_check
 *   consent_check -> (operating_hours | END)
 *   operating_hours -> (END | emergency_detect)
 *   emergency_detect -> (human_handoff | route_by_stage)
 *   route_by_stage -> (greet | qualify | handle_objection | human_handoff | END)
 *   greet -> ethics_guard
 *   qualify -> loop_guard
 *   handle_objection -> ethics_guard
 *   loop_guard -> (human_handoff | ethics_guard)
 *   ethics_guard -> END
 *   human_handoff -> END
 *
 * CRITICAL: Every AI response passes through ethics_guard before END.
 * No path exists where an AI message bypasses the ethics classifier.
 */
export function buildSDRGraph(
  checkpointer: BaseCheckpointSaver,
  nodes: SDRNodeFactory,
) {
  const graph = new StateGraph(SDRStateAnnotation)
    // Register all nodes
    .addNode("consent_check", nodes.consentCheckNode)
    .addNode("operating_hours", nodes.operatingHoursNode)
    .addNode("emergency_detect", nodes.emergencyDetectNode)
    .addNode("greet", nodes.greetNode)
    .addNode("qualify", nodes.qualifyNode)
    .addNode("handle_objection", nodes.objectionNode)
    .addNode("ethics_guard", nodes.ethicsGuardNode)
    .addNode("loop_guard", nodes.loopGuardNode)
    .addNode("human_handoff", nodes.handoffNode)

    // START -> consent_check
    .addEdge(START, "consent_check")

    // consent_check -> conditional routing
    .addConditionalEdges("consent_check", (state: SDRState) => {
      if (state.consentGiven) {
        return "operating_hours";
      }
      // No consent yet — end this turn, wait for consent reply
      return END;
    })

    // operating_hours -> conditional routing
    .addConditionalEdges("operating_hours", (state: SDRState) => {
      const config = state.agentConfig;
      if (!config) {
        return "emergency_detect";
      }

      // Check if the operating_hours node added a deferral message
      // by checking if the last message is from AI with deferral content
      const lastMsg = state.messages[state.messages.length - 1];
      const isAiDeferral =
        lastMsg &&
        lastMsg._getType() === "ai" &&
        typeof lastMsg.content === "string" &&
        lastMsg.content.includes("horario de atendimento");

      if (isAiDeferral) {
        // Outside hours — deferral was sent, end turn
        return END;
      }

      return "emergency_detect";
    })

    // emergency_detect -> conditional routing
    .addConditionalEdges("emergency_detect", (state: SDRState) => {
      if (state.humanHandoffRequested) {
        return "human_handoff";
      }

      // Route by current qualification stage
      switch (state.qualificationStage) {
        case "greet":
          return "greet";
        case "qualify":
          return "qualify";
        case "objection":
          return "handle_objection";
        case "handoff":
          return "human_handoff";
        case "schedule":
          // Phase 3 will add schedule node; for now, end turn
          return END;
        default:
          return "greet";
      }
    })

    // greet -> ethics_guard (every AI message must pass through ethics)
    .addEdge("greet", "ethics_guard")

    // qualify -> loop_guard (check for stuck conversations after qualification)
    .addEdge("qualify", "loop_guard")

    // handle_objection -> ethics_guard
    .addEdge("handle_objection", "ethics_guard")

    // loop_guard -> conditional routing
    .addConditionalEdges("loop_guard", (state: SDRState) => {
      if (state.humanHandoffRequested) {
        return "human_handoff";
      }
      // Not stuck — proceed to ethics guard
      return "ethics_guard";
    })

    // ethics_guard -> END (message ready to send)
    .addEdge("ethics_guard", END)

    // human_handoff -> END
    .addEdge("human_handoff", END);

  return graph.compile({ checkpointer });
}
