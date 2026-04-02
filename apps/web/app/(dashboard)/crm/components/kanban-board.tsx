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
import { useLeads, useUpdateStage } from "../hooks/use-leads";
import type { Lead } from "../lib/api";

const PIPELINE_STAGES = [
  { id: "novo", label: "Novo", color: "bg-blue-500" },
  { id: "qualificado", label: "Qualificado", color: "bg-purple-500" },
  { id: "agendado", label: "Agendado", color: "bg-teal-500" },
  { id: "confirmado", label: "Confirmado", color: "bg-green-500" },
  { id: "atendido", label: "Atendido", color: "bg-emerald-600" },
  { id: "perdido", label: "Perdido", color: "bg-red-500" },
] as const;

export function KanbanBoard() {
  const [search, setSearch] = useState("");
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
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
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
