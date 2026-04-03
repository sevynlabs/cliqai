"use client";

import { useState } from "react";
import {
  DndContext,
  closestCorners,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { PipelineColumn } from "./pipeline-column";
import { LeadDrawer } from "./lead-drawer";
import { useLeads, useUpdateStage } from "../hooks/use-leads";
import type { Lead } from "../lib/api";
import { Search } from "lucide-react";

const PIPELINE_STAGES = [
  { id: "novo", label: "Novo", color: "bg-blue-500" },
  { id: "qualificado", label: "Qualificado", color: "bg-violet-500" },
  { id: "agendado", label: "Agendado", color: "bg-primary" },
  { id: "confirmado", label: "Confirmado", color: "bg-emerald-500" },
  { id: "atendido", label: "Atendido", color: "bg-emerald-600" },
  { id: "perdido", label: "Perdido", color: "bg-red-400" },
] as const;

export function KanbanBoard() {
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const { data: leads = [], isLoading } = useLeads();
  const updateStage = useUpdateStage();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const newStage = over.id as string;
    const lead = leads.find((l: Lead) => l.id === leadId);

    if (lead && lead.stage !== newStage) {
      updateStage.mutate({ leadId, stage: newStage });
    }
  }

  const filteredLeads = search
    ? leads.filter(
        (l: Lead) =>
          l.name?.toLowerCase().includes(search.toLowerCase()) ||
          l.phone.includes(search) ||
          l.procedureInterest?.toLowerCase().includes(search.toLowerCase()),
      )
    : leads;

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <div key={stage.id} className="flex-shrink-0 w-72 rounded-2xl bg-gray-50/80 p-3 space-y-2">
            <div className="skeleton h-5 w-24" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-24 w-full rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-10"
          />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => (
            <PipelineColumn
              key={stage.id}
              id={stage.id}
              label={stage.label}
              color={stage.color}
              leads={filteredLeads.filter((l: Lead) => l.stage === stage.id)}
              onSelectLead={setSelectedLead}
            />
          ))}
        </div>
      </DndContext>

      {selectedLead && (
        <LeadDrawer
          leadId={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}
