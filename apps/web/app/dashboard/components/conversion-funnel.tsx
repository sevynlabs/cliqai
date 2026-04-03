"use client";

import { useQuery } from "@tanstack/react-query";

interface FunnelStage {
  stage: string;
  count: number;
}

const stageLabels: Record<string, string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  agendado: "Agendado",
  confirmado: "Confirmado",
  atendido: "Atendido",
  perdido: "Perdido",
};

const stageColors: Record<string, string> = {
  novo: "bg-blue-500",
  qualificado: "bg-purple-500",
  agendado: "bg-teal-500",
  confirmado: "bg-green-500",
  atendido: "bg-emerald-600",
  perdido: "bg-red-400",
};

export function ConversionFunnel() {
  const { data, isLoading } = useQuery<FunnelStage[]>({
    queryKey: ["dashboard", "funnel"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard/funnel", { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const maxCount = Math.max(...(data?.map((d) => d.count) ?? [1]), 1);

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-heading font-semibold text-gray-900 mb-4">Funil de Conversao (30 dias)</h3>
      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
        </div>
      ) : (
        <div className="space-y-3">
          {data?.filter((d) => d.stage !== "perdido").map((stage) => (
            <div key={stage.stage} className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-500 w-24 text-right">
                {stageLabels[stage.stage] ?? stage.stage}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                <div
                  className={`h-full rounded-full ${stageColors[stage.stage] ?? "bg-gray-400"} transition-all duration-500 flex items-center px-2`}
                  style={{ width: `${Math.max((stage.count / maxCount) * 100, 4)}%` }}
                >
                  <span className="text-xs font-semibold text-white">{stage.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
