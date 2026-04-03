"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Lead } from "../lib/api";

interface LeadCardProps {
  lead: Lead;
  onSelect?: (id: string) => void;
}

function getScoreColor(score: number): string {
  if (score >= 75) return "bg-emerald-50 text-emerald-700";
  if (score >= 50) return "bg-amber-50 text-amber-700";
  if (score >= 25) return "bg-orange-50 text-orange-700";
  return "bg-gray-50 text-gray-500";
}

export function LeadCard({ lead, onSelect }: LeadCardProps) {
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
      onClick={() => onSelect?.(lead.id)}
      className="card-hover p-3 cursor-grab active:cursor-grabbing group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[13px] font-medium text-gray-900 truncate leading-snug">
          {lead.name || lead.phone}
        </p>
        <span className={`badge text-[11px] flex-shrink-0 ${getScoreColor(lead.score)}`}>
          {lead.score}
        </span>
      </div>

      {lead.procedureInterest && (
        <p className="text-xs text-gray-500 mb-2 truncate">
          {lead.procedureInterest}
        </p>
      )}

      <div className="flex items-center justify-between">
        {lead.source ? (
          <span className="badge bg-primary/8 text-primary text-[10px]">
            {lead.source}
          </span>
        ) : (
          <span />
        )}
        <span className="text-[11px] text-gray-400 tabular-nums">
          {formatDistanceToNow(new Date(lead.createdAt), {
            addSuffix: true,
            locale: ptBR,
          })}
        </span>
      </div>
    </div>
  );
}
