"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Lead } from "../lib/api";

interface LeadCardProps {
  lead: Lead;
}

function getScoreColor(score: number): string {
  if (score >= 75) return "bg-green-100 text-green-800";
  if (score >= 50) return "bg-yellow-100 text-yellow-800";
  if (score >= 25) return "bg-orange-100 text-orange-800";
  return "bg-gray-100 text-gray-600";
}

export function LeadCard({ lead }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { lead } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between mb-2">
        <p className="font-medium text-sm text-gray-900 truncate">
          {lead.name || lead.phone}
        </p>
        <span
          className={`text-xs font-semibold px-1.5 py-0.5 rounded ${getScoreColor(lead.score)}`}
        >
          {lead.score}
        </span>
      </div>

      {lead.procedureInterest && (
        <p className="text-xs text-gray-500 mb-1 truncate">
          {lead.procedureInterest}
        </p>
      )}

      <div className="flex items-center justify-between">
        {lead.source && (
          <span className="text-xs bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded">
            {lead.source}
          </span>
        )}
        <span className="text-xs text-gray-400">
          {formatDistanceToNow(new Date(lead.createdAt), {
            addSuffix: true,
            locale: ptBR,
          })}
        </span>
      </div>
    </div>
  );
}
