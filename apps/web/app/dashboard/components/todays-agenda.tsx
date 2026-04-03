"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  procedureName: string | null;
  lead: { name: string | null; phone: string; procedureInterest: string | null } | null;
}

const statusBadge: Record<string, string> = {
  tentative: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export function TodaysAgenda() {
  const { data, isLoading } = useQuery<Appointment[]>({
    queryKey: ["dashboard", "agenda"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard/agenda", { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-heading font-semibold text-gray-900 mb-4">Agenda de Hoje</h3>
      {isLoading ? (
        <div className="h-32 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((appt) => (
            <div key={appt.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
              <div className="text-sm font-mono text-teal-700 font-semibold w-14 flex-shrink-0">
                {format(new Date(appt.startAt), "HH:mm")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {appt.lead?.name ?? appt.lead?.phone ?? "Paciente"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {appt.procedureName ?? appt.lead?.procedureInterest ?? "Consulta"}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[appt.status] ?? "bg-gray-100 text-gray-600"}`}>
                {appt.status === "tentative" ? "Pendente" : appt.status === "confirmed" ? "Confirmado" : appt.status}
              </span>
            </div>
          ))}
          {(!data || data.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum agendamento para hoje</p>
          )}
        </div>
      )}
    </div>
  );
}
