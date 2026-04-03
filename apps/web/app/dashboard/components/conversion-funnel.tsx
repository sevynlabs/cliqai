"use client";

import { useQuery } from "@tanstack/react-query";
import { safeFetch } from "@/lib/safe-fetch";
import { TrendingUp } from "lucide-react";

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
  qualificado: "bg-violet-500",
  agendado: "bg-primary",
  confirmado: "bg-emerald-500",
  atendido: "bg-emerald-600",
  perdido: "bg-red-400",
};

export function ConversionFunnel() {
  const { data, isLoading } = useQuery<FunnelStage[]>({
    queryKey: ["dashboard", "funnel"],
    queryFn: () => safeFetch("/api/dashboard/funnel", []),
  });

  const stages = data?.filter((d) => d.stage !== "perdido") ?? [];
  const maxCount = Math.max(...stages.map((d) => d.count), 1);

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
        <h3 className="font-heading text-sm font-semibold text-gray-900">
          Funil de Conversao
        </h3>
        <span className="badge bg-gray-100 text-gray-500 ml-auto">30 dias</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-7 flex-1" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {stages.map((stage) => (
            <div key={stage.stage} className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-400 w-[90px] text-right tabular-nums">
                {stageLabels[stage.stage] ?? stage.stage}
              </span>
              <div className="flex-1 bg-gray-50 rounded-full h-7 overflow-hidden">
                <div
                  className={`h-full rounded-full ${stageColors[stage.stage] ?? "bg-gray-300"} transition-all duration-700 ease-out flex items-center px-2.5`}
                  style={{ width: `${Math.max((stage.count / maxCount) * 100, 6)}%` }}
                >
                  <span className="text-[11px] font-bold text-white tabular-nums">
                    {stage.count}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {stages.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>
          )}
        </div>
      )}
    </div>
  );
}
