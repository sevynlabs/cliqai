"use client";

import { useQuery } from "@tanstack/react-query";
import { safeFetch } from "@/lib/safe-fetch";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  UserPlus,
  ArrowRightLeft,
  Bot,
  Hand,
  RotateCcw,
  CalendarPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ActivityItem {
  id: string;
  eventType: string;
  description: string;
  createdAt: string;
  lead: { name: string | null; phone: string } | null;
}

const eventConfig: Record<string, { icon: LucideIcon; color: string }> = {
  lead_created: { icon: UserPlus, color: "text-blue-500 bg-blue-50" },
  stage_change: { icon: ArrowRightLeft, color: "text-violet-500 bg-violet-50" },
  annotation: { icon: Bot, color: "text-primary bg-teal-50" },
  handoff_takeover: { icon: Hand, color: "text-amber-500 bg-amber-50" },
  handoff_return: { icon: RotateCcw, color: "text-gray-500 bg-gray-50" },
  appointment_booked: { icon: CalendarPlus, color: "text-emerald-500 bg-emerald-50" },
};

const defaultEvent = { icon: Activity, color: "text-gray-400 bg-gray-50" };

export function ActivityTimeline() {
  const { data, isLoading } = useQuery<ActivityItem[]>({
    queryKey: ["dashboard", "activity"],
    queryFn: () => safeFetch("/api/dashboard/activity", []),
    refetchInterval: 15_000,
  });

  const items = Array.isArray(data) ? data.slice(0, 15) : [];

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
        <h3 className="font-heading text-sm font-semibold text-gray-900">
          Atividade Recente
        </h3>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="skeleton h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3.5 w-3/4" />
                <div className="skeleton h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1 max-h-[380px] overflow-y-auto">
          {items.map((item) => {
            const cfg = eventConfig[item.eventType] ?? defaultEvent;
            const Icon = cfg.icon;
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-gray-50/80"
              >
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${cfg.color}`}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm text-gray-700 leading-snug truncate">
                    {item.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.lead?.name ?? item.lead?.phone ?? ""}
                    {item.lead ? " \u00B7 " : ""}
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Activity className="h-8 w-8 mb-2 text-gray-200" strokeWidth={1} />
              <p className="text-sm">Nenhuma atividade ainda</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
