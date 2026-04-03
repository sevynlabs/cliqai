"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { LeadCard } from "./lead-card";
import type { Lead } from "../lib/api";

interface PipelineColumnProps {
  id: string;
  label: string;
  color: string;
  leads: Lead[];
  onSelectLead?: (id: string) => void;
}

export function PipelineColumn({ id, label, color, leads, onSelectLead }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 rounded-2xl transition-colors ${
        isOver ? "bg-primary/5 ring-1 ring-primary/20" : "bg-gray-50/80"
      }`}
    >
      <div className="p-3 flex items-center gap-2.5">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <h3 className="font-heading text-[13px] font-semibold text-gray-700">
          {label}
        </h3>
        <span className="badge bg-white text-gray-500 shadow-sm ml-auto">
          {leads.length}
        </span>
      </div>

      <SortableContext
        items={leads.map((l) => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="px-2 pb-2 space-y-2 min-h-[200px]">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onSelect={onSelectLead} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
