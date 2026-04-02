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
}

export function PipelineColumn({ id, label, color, leads }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 rounded-lg ${isOver ? "bg-teal-50" : "bg-gray-50"} transition-colors`}
    >
      <div className="p-3 flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <h3 className="font-heading font-semibold text-sm text-gray-700">
          {label}
        </h3>
        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full ml-auto">
          {leads.length}
        </span>
      </div>

      <SortableContext
        items={leads.map((l) => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="px-2 pb-2 space-y-2 min-h-[200px]">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
