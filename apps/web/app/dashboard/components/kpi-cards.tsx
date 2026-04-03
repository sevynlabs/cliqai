"use client";

import { useQuery } from "@tanstack/react-query";
import { safeFetch } from "@/lib/safe-fetch";
import { Users, CalendarCheck, TrendingUp, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Kpis {
  leadsToday: number;
  appointmentsToday: number;
  conversionRate: number;
  totalLeads30d: number;
}

const FALLBACK: Kpis = { leadsToday: 0, appointmentsToday: 0, conversionRate: 0, totalLeads30d: 0 };

const cards: { key: keyof Kpis; label: string; icon: LucideIcon; suffix?: string; accent: string; iconBg: string }[] = [
  { key: "leadsToday", label: "Leads Hoje", icon: UserPlus, accent: "text-blue-600", iconBg: "bg-blue-50" },
  { key: "appointmentsToday", label: "Agendamentos", icon: CalendarCheck, accent: "text-primary", iconBg: "bg-teal-50" },
  { key: "conversionRate", label: "Conversao", icon: TrendingUp, suffix: "%", accent: "text-emerald-600", iconBg: "bg-emerald-50" },
  { key: "totalLeads30d", label: "Leads 30d", icon: Users, accent: "text-violet-600", iconBg: "bg-violet-50" },
];

export function KpiCards() {
  const { data, isLoading } = useQuery<Kpis>({
    queryKey: ["dashboard", "kpis"],
    queryFn: () => safeFetch("/api/dashboard/kpis", FALLBACK),
    refetchInterval: 30_000,
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.key} className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              {card.label}
            </p>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.iconBg}`}>
              <card.icon className={`h-4.5 w-4.5 ${card.accent}`} strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <div className="skeleton h-8 w-16" />
            ) : (
              <p className={`font-heading text-3xl font-bold tracking-tight ${card.accent}`}>
                {data?.[card.key] ?? 0}
                {card.suffix && <span className="text-lg ml-0.5">{card.suffix}</span>}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
