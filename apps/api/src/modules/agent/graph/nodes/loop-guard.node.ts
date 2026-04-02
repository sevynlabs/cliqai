import type { SDRState } from "../sdr.state";

/**
 * Factory that creates the loop guard node.
 * Detects conversation loops via:
 * 1. Max turns exceeded (configurable, default 20)
 * 2. Consecutive unresolved turns >= 3 (qualify extracted no new BANT info)
 * If either triggers, requests human handoff.
 */
export function createLoopGuardNode() {
  return async function loopGuardNode(
    state: SDRState,
  ): Promise<Partial<SDRState>> {
    const maxTurns = state.agentConfig?.maxTurns ?? 20;

    // Check 1: Max turns exceeded
    if (state.turnCount >= maxTurns) {
      return {
        humanHandoffRequested: true,
        qualificationStage: "handoff",
      };
    }

    // Check 2: Consecutive unresolved turns (3+ means conversation is stuck)
    if (state.consecutiveUnresolved >= 3) {
      return {
        humanHandoffRequested: true,
        qualificationStage: "handoff",
      };
    }

    // Neither condition met — pass through
    return {};
  };
}
