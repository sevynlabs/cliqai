import { Injectable } from "@nestjs/common";

export const PIPELINE_STAGES = [
  { id: "novo", label: "Novo", color: "slate" },
  { id: "qualificado", label: "Qualificado", color: "blue" },
  { id: "agendado", label: "Agendado", color: "yellow" },
  { id: "confirmado", label: "Confirmado", color: "green" },
  { id: "atendido", label: "Atendido", color: "teal" },
  { id: "perdido", label: "Perdido", color: "red" },
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number]["id"];

const STAGE_ORDER: Record<string, number> = {};
PIPELINE_STAGES.forEach((s, i) => {
  STAGE_ORDER[s.id] = i;
});

@Injectable()
export class PipelineService {
  /**
   * Validates whether a stage transition is allowed.
   * Any stage can transition to 'perdido'. Otherwise must follow order.
   */
  isValidTransition(from: string, to: string): boolean {
    if (from === to) return false;
    if (to === "perdido") return true;
    const fromIdx = STAGE_ORDER[from];
    const toIdx = STAGE_ORDER[to];
    if (fromIdx === undefined || toIdx === undefined) return false;
    return toIdx > fromIdx;
  }

  getStages() {
    return PIPELINE_STAGES;
  }
}
