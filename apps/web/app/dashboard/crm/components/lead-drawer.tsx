"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fetchLead } from "../lib/api";
import type { LeadDetail } from "../lib/api";
import {
  X,
  User,
  Phone,
  Mail,
  Tag,
  Calendar,
  Clock,
  Bot,
  FileText,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface LeadDrawerProps {
  leadId: string;
  onClose: () => void;
}

const stageConfig: Record<string, { label: string; color: string }> = {
  novo: { label: "Novo", color: "bg-blue-50 text-blue-700" },
  qualificado: { label: "Qualificado", color: "bg-violet-50 text-violet-700" },
  agendado: { label: "Agendado", color: "bg-teal-50 text-primary" },
  confirmado: { label: "Confirmado", color: "bg-emerald-50 text-emerald-700" },
  atendido: { label: "Atendido", color: "bg-emerald-50 text-emerald-700" },
  perdido: { label: "Perdido", color: "bg-red-50 text-red-600" },
};

const annotationIcon: Record<string, typeof Bot> = {
  summary: FileText,
  objection: AlertTriangle,
  next_steps: ArrowRight,
  note: FileText,
};

function ScoreBadge({ score }: { score: number }) {
  let color = "bg-gray-50 text-gray-500";
  if (score >= 75) color = "bg-emerald-50 text-emerald-700";
  else if (score >= 50) color = "bg-amber-50 text-amber-700";
  else if (score >= 25) color = "bg-orange-50 text-orange-700";
  return <span className={`badge text-sm font-bold tabular-nums ${color}`}>{score}</span>;
}

export function LeadDrawer({ leadId, onClose }: LeadDrawerProps) {
  const { data: lead, isLoading } = useQuery<LeadDetail>({
    queryKey: ["lead", leadId],
    queryFn: () => fetchLead(leadId),
    enabled: !!leadId,
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] bg-surface-raised shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-surface-raised/95 backdrop-blur-sm px-6 py-4">
          <h2 className="font-heading text-base font-bold text-gray-900">
            Detalhes do Lead
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4">
            <div className="skeleton h-20 w-full rounded-2xl" />
            <div className="skeleton h-32 w-full rounded-2xl" />
            <div className="skeleton h-48 w-full rounded-2xl" />
          </div>
        ) : lead ? (
          <div className="p-6 space-y-5">
            {/* Contact card */}
            <div className="card p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white text-lg font-bold">
                  {lead.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {lead.name ?? "Sem nome"}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Phone className="h-3 w-3" />
                      {lead.phone}
                    </span>
                    {lead.email && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </span>
                    )}
                  </div>
                </div>
                <ScoreBadge score={lead.score} />
              </div>

              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {lead.stage && (
                  <span className={`badge ${stageConfig[lead.stage]?.color ?? "bg-gray-50 text-gray-600"}`}>
                    {stageConfig[lead.stage]?.label ?? lead.stage}
                  </span>
                )}
                {lead.procedureInterest && (
                  <span className="badge bg-gray-50 text-gray-600">
                    {lead.procedureInterest}
                  </span>
                )}
                {lead.source && (
                  <span className="badge bg-primary/8 text-primary">
                    {lead.source}
                  </span>
                )}
              </div>

              {lead.tags.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  <Tag className="h-3 w-3 text-gray-400" />
                  {lead.tags.map((tag) => (
                    <span key={tag} className="badge bg-gray-100 text-gray-600 text-[10px]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Appointments */}
            {lead.appointments.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Agendamentos ({lead.appointments.length})
                </h4>
                <div className="space-y-2">
                  {lead.appointments.map((appt) => (
                    <div key={appt.id} className="card p-3 flex items-center gap-3">
                      <div className="flex flex-col items-center w-12">
                        <span className="text-xs font-bold tabular-nums text-gray-900">
                          {format(new Date(appt.startAt), "HH:mm")}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {format(new Date(appt.startAt), "dd/MM")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">
                          {appt.procedureName ?? "Consulta"}
                        </p>
                      </div>
                      {appt.status === "confirmed" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      ) : appt.status === "cancelled" ? (
                        <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Annotations */}
            {lead.annotations.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
                  <Bot className="h-3.5 w-3.5" />
                  Anotacoes ({lead.annotations.length})
                </h4>
                <div className="space-y-2">
                  {lead.annotations.map((ann) => {
                    const Icon = annotationIcon[ann.type] ?? FileText;
                    return (
                      <div key={ann.id} className="card p-3">
                        <div className="flex items-start gap-2.5">
                          <Icon className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {ann.content}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {ann.type} {ann.createdBy ? `por ${ann.createdBy}` : ""} ·{" "}
                              {formatDistanceToNow(new Date(ann.createdAt), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Timeline */}
            {lead.timeline.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
                  <Clock className="h-3.5 w-3.5" />
                  Historico ({lead.timeline.length})
                </h4>
                <div className="relative pl-5 border-l-2 border-border/60 space-y-3">
                  {lead.timeline.slice(0, 20).map((event) => (
                    <div key={event.id} className="relative">
                      <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-gray-300 ring-2 ring-surface-raised" />
                      <p className="text-sm text-gray-700">{event.description}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatDistanceToNow(new Date(event.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Created info */}
            <p className="text-xs text-gray-400 text-center pt-2">
              Criado {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <p className="text-sm">Lead nao encontrado</p>
          </div>
        )}
      </div>
    </>
  );
}
