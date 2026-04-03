"use client";

import { useQuery } from "@tanstack/react-query";
import { safeFetch } from "@/lib/safe-fetch";
import { format } from "date-fns";
import { Calendar, Clock, User } from "lucide-react";

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  procedureName: string | null;
  lead: { name: string | null; phone: string; procedureInterest: string | null } | null;
}

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  tentative: { label: "Pendente", dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700" },
  confirmed: { label: "Confirmado", dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Cancelado", dot: "bg-red-400", badge: "bg-red-50 text-red-600" },
};

export function TodaysAgenda() {
  const { data, isLoading } = useQuery<Appointment[]>({
    queryKey: ["dashboard", "agenda"],
    queryFn: () => safeFetch("/api/dashboard/agenda", []),
    refetchInterval: 60_000,
  });

  const appointments = Array.isArray(data) ? data : [];

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-5">
        <Calendar className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
        <h3 className="font-heading text-sm font-semibold text-gray-900">
          Agenda de Hoje
        </h3>
        <span className="badge bg-primary/10 text-primary ml-auto">
          {appointments.length} consultas
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="skeleton h-10 w-14" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {appointments.map((appt) => {
            const cfg = statusConfig[appt.status] ?? statusConfig.tentative;
            return (
              <div
                key={appt.id}
                className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-gray-50/80"
              >
                <div className="flex flex-col items-center justify-center w-14 flex-shrink-0 rounded-lg bg-gray-50 py-1.5">
                  <Clock className="h-3 w-3 text-gray-300 mb-0.5" />
                  <span className="text-xs font-bold tabular-nums text-gray-700">
                    {format(new Date(appt.startAt), "HH:mm")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-gray-300 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {appt.lead?.name ?? appt.lead?.phone ?? "Paciente"}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {appt.procedureName ?? appt.lead?.procedureInterest ?? "Consulta"}
                  </p>
                </div>
                <span className={`badge ${cfg.badge} flex-shrink-0`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              </div>
            );
          })}
          {appointments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Calendar className="h-8 w-8 mb-2 text-gray-200" strokeWidth={1} />
              <p className="text-sm">Nenhum agendamento para hoje</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
