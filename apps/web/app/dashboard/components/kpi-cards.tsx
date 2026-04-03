"use client";

import { useQuery } from "@tanstack/react-query";

interface Kpis {
  leadsToday: number;
  appointmentsToday: number;
  conversionRate: number;
  totalLeads30d: number;
}

const cards = [
  { key: "leadsToday" as const, label: "Leads Hoje", icon: "👤", color: "bg-blue-50 text-blue-700" },
  { key: "appointmentsToday" as const, label: "Agendamentos Hoje", icon: "📅", color: "bg-teal-50 text-teal-700" },
  { key: "conversionRate" as const, label: "Taxa de Conversao", icon: "📈", suffix: "%", color: "bg-green-50 text-green-700" },
  { key: "totalLeads30d" as const, label: "Leads (30 dias)", icon: "📊", color: "bg-purple-50 text-purple-700" },
];

export function KpiCards() {
  const { data, isLoading } = useQuery<Kpis>({
    queryKey: ["dashboard", "kpis"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard/kpis", { credentials: "include" });
      if (!r.ok) return { leadsToday: 0, appointmentsToday: 0, conversionRate: 0, totalLeads30d: 0 };
      return r.json();
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.key} className={`rounded-lg p-4 ${card.color}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-80">{card.label}</span>
            <span className="text-lg">{card.icon}</span>
          </div>
          <p className="text-2xl font-heading font-bold">
            {isLoading ? "—" : `${data?.[card.key] ?? 0}${card.suffix ?? ""}`}
          </p>
        </div>
      ))}
    </div>
  );
}
