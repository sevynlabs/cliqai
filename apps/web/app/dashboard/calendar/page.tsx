"use client";

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const queryClient = new QueryClient();

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  procedureName: string | null;
  lead: { name: string | null; phone: string } | null;
}

const statusColors: Record<string, string> = {
  tentative: "border-l-yellow-500 bg-yellow-50",
  confirmed: "border-l-green-500 bg-green-50",
  cancelled: "border-l-red-400 bg-red-50",
};

function CalendarContent() {
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["appointments", "upcoming"],
    queryFn: () => fetch("/api/appointments?days=7", { credentials: "include" }).then((r) => r.json()),
  });

  // Group by date
  const grouped = appointments.reduce<Record<string, Appointment[]>>((acc, appt) => {
    const dateKey = format(new Date(appt.startAt), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(appt);
    return acc;
  }, {});

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" /></div>;
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([dateKey, appts]) => (
        <div key={dateKey}>
          <h3 className="font-heading font-semibold text-gray-700 mb-3">
            {format(new Date(dateKey), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h3>
          <div className="space-y-2">
            {appts.map((appt) => (
              <div key={appt.id} className={`border-l-4 rounded-lg p-3 ${statusColors[appt.status] ?? "border-l-gray-300 bg-gray-50"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(appt.startAt), "HH:mm")} - {format(new Date(appt.endAt), "HH:mm")}
                    </p>
                    <p className="text-sm text-gray-700">{appt.lead?.name ?? appt.lead?.phone ?? "Paciente"}</p>
                    <p className="text-xs text-gray-500">{appt.procedureName ?? "Consulta"}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/60">
                    {appt.status === "tentative" ? "Pendente" : appt.status === "confirmed" ? "Confirmado" : appt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {appointments.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">Nenhum agendamento nos proximos 7 dias</p>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-4 md:p-6">
        <h1 className="font-heading text-2xl font-bold text-gray-900 mb-4">Agenda</h1>
        <div className="bg-white rounded-lg border p-4">
          <CalendarContent />
        </div>
      </div>
    </QueryClientProvider>
  );
}
