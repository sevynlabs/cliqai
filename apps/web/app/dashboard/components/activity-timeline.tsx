"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Activity {
  id: string;
  eventType: string;
  description: string;
  createdAt: string;
  lead: { name: string | null; phone: string } | null;
}

const eventIcons: Record<string, string> = {
  lead_created: "👤",
  stage_change: "📋",
  annotation: "🤖",
  handoff_takeover: "🙋",
  handoff_return: "🔄",
  appointment_booked: "📅",
};

export function ActivityTimeline() {
  const { data, isLoading } = useQuery<Activity[]>({
    queryKey: ["dashboard", "activity"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard/activity", { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    refetchInterval: 15_000,
  });

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-heading font-semibold text-gray-900 mb-4">Atividade Recente</h3>
      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {(data ?? []).slice(0, 15).map((item) => (
            <div key={item.id} className="flex items-start gap-3 text-sm">
              <span className="text-lg flex-shrink-0">{eventIcons[item.eventType] ?? "📌"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-700 truncate">{item.description}</p>
                <p className="text-xs text-gray-400">
                  {item.lead?.name ?? item.lead?.phone ?? ""} •{" "}
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
          ))}
          {(!data || data.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma atividade ainda</p>
          )}
        </div>
      )}
    </div>
  );
}
