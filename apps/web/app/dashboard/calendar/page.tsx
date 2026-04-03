"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { safeFetch } from "@/lib/safe-fetch";
import {
  Calendar,
  Clock,
  User,
  Check,
  X,
  ChevronRight,
  MapPin,
  RotateCcw,
} from "lucide-react";

const queryClient = new QueryClient();

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  procedureName: string | null;
  lead: { name: string | null; phone: string } | null;
}

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  tentative: { label: "Pendente", dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700" },
  confirmed: { label: "Confirmado", dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Cancelado", dot: "bg-red-400", badge: "bg-red-50 text-red-600" },
};

function AppointmentCard({ appt }: { appt: Appointment }) {
  const qc = useQueryClient();
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const cfg = statusConfig[appt.status] ?? statusConfig.tentative;

  const confirm = useMutation({
    mutationFn: () =>
      fetch(`/api/appointments/${appt.id}/confirm`, {
        method: "POST",
        credentials: "include",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const cancel = useMutation({
    mutationFn: () =>
      fetch(`/api/appointments/${appt.id}/cancel`, {
        method: "POST",
        credentials: "include",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const reschedule = useMutation({
    mutationFn: async () => {
      const startISO = new Date(`${newDate}T${newTime}:00`).toISOString();
      const endISO = new Date(new Date(`${newDate}T${newTime}:00`).getTime() + 60 * 60 * 1000).toISOString();
      await fetch(`/api/appointments/${appt.id}/reschedule`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startISO, endISO }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      setShowReschedule(false);
    },
  });

  return (
    <div className="card-hover group p-4">
      <div className="flex items-center gap-4">
        {/* Time column */}
        <div className="flex flex-col items-center w-16 flex-shrink-0">
          <span className="text-sm font-bold tabular-nums text-gray-900">
            {format(new Date(appt.startAt), "HH:mm")}
          </span>
          <span className="text-[11px] text-gray-400 tabular-nums">
            {format(new Date(appt.endAt), "HH:mm")}
          </span>
        </div>

        {/* Divider */}
        <div className={`w-0.5 self-stretch rounded-full ${cfg.dot}`} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
            <p className="text-sm font-medium text-gray-900 truncate">
              {appt.lead?.name ?? appt.lead?.phone ?? "Paciente"}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="h-3 w-3 text-gray-300 flex-shrink-0" />
            <p className="text-xs text-gray-500 truncate">
              {appt.procedureName ?? "Consulta"}
            </p>
          </div>
        </div>

        {/* Status + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`badge ${cfg.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          {(appt.status === "tentative" || appt.status === "confirmed") && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {appt.status === "tentative" && (
                <button
                  onClick={() => confirm.mutate()}
                  disabled={confirm.isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                  title="Confirmar"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setShowReschedule(!showReschedule)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                title="Reagendar"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                title="Cancelar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reschedule form */}
      {showReschedule && (
        <div className="mt-3 pt-3 border-t border-border/40 flex items-end gap-2">
          <div className="flex-1">
            <label className="text-[10px] font-medium text-gray-400 mb-1 block">Nova data</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="input-base text-xs py-1.5"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-medium text-gray-400 mb-1 block">Horario</label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="input-base text-xs py-1.5"
            />
          </div>
          <button
            onClick={() => reschedule.mutate()}
            disabled={reschedule.isPending || !newDate || !newTime}
            className="btn-primary text-xs px-3 py-1.5"
          >
            {reschedule.isPending ? "..." : "Reagendar"}
          </button>
          <button
            onClick={() => setShowReschedule(false)}
            className="btn-ghost text-xs px-2 py-1.5"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

function CalendarContent() {
  const [days, setDays] = useState(7);
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["appointments", "upcoming", days],
    queryFn: () => safeFetch(`/api/appointments?days=${days}`, []),
  });

  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  // Group by date
  const grouped = safeAppointments.reduce<Record<string, Appointment[]>>((acc, appt) => {
    const dateKey = format(new Date(appt.startAt), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(appt);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-3">
            <div className="skeleton h-5 w-48" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="skeleton h-20 w-full rounded-2xl" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { value: 7, label: "7 dias" },
          { value: 14, label: "14 dias" },
          { value: 30, label: "30 dias" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setDays(opt.value)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              days === opt.value
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Grouped appointments */}
      {Object.entries(grouped).map(([dateKey, appts]) => (
        <div key={dateKey}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
            <h3 className="font-heading text-sm font-semibold text-gray-700 capitalize">
              {format(new Date(dateKey), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h3>
            <span className="badge bg-gray-100 text-gray-500">{appts.length}</span>
            <ChevronRight className="h-3.5 w-3.5 text-gray-300 ml-auto" />
          </div>
          <div className="space-y-2">
            {appts.map((appt) => (
              <AppointmentCard key={appt.id} appt={appt} />
            ))}
          </div>
        </div>
      ))}

      {safeAppointments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Calendar className="h-10 w-10 text-gray-200 mb-3" strokeWidth={1} />
          <p className="text-sm font-medium text-gray-500">Nenhum agendamento</p>
          <p className="text-xs mt-1">Nos proximos {days} dias</p>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-4 md:p-6 lg:p-8 max-w-[900px] mx-auto">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900">
            Agenda
          </h1>
          <p className="mt-1 text-sm text-gray-500">Gerencie seus agendamentos</p>
        </div>
        <CalendarContent />
      </div>
    </QueryClientProvider>
  );
}
