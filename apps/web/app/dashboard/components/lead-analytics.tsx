"use client";

import { useQuery } from "@tanstack/react-query";
import { safeFetch } from "@/lib/safe-fetch";
import { BarChart3, Target, Stethoscope } from "lucide-react";

interface LeadAnalytics {
  totalLeads: number;
  bySource: { source: string; count: number }[];
  scoreDistribution: { alto: number; medio: number; baixo: number };
  topProcedures: { procedure: string; count: number }[];
}

const FALLBACK: LeadAnalytics = {
  totalLeads: 0,
  bySource: [],
  scoreDistribution: { alto: 0, medio: 0, baixo: 0 },
  topProcedures: [],
};

export function LeadAnalytics() {
  const { data, isLoading } = useQuery<LeadAnalytics>({
    queryKey: ["dashboard", "lead-analytics"],
    queryFn: () => safeFetch("/api/dashboard/lead-analytics", FALLBACK),
  });

  const analytics = data ?? FALLBACK;
  const maxSource = Math.max(...analytics.bySource.map((s) => s.count), 1);
  const totalScore = analytics.scoreDistribution.alto + analytics.scoreDistribution.medio + analytics.scoreDistribution.baixo;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* By Source */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
          <h3 className="font-heading text-sm font-semibold text-gray-900">
            Leads por Fonte
          </h3>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-6 w-full" />
            ))}
          </div>
        ) : analytics.bySource.length > 0 ? (
          <div className="space-y-2">
            {analytics.bySource.map((s) => (
              <div key={s.source} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-20 truncate text-right">
                  {s.source}
                </span>
                <div className="flex-1 bg-gray-50 rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70 flex items-center px-2 transition-all duration-500"
                    style={{ width: `${Math.max((s.count / maxSource) * 100, 8)}%` }}
                  >
                    <span className="text-[10px] font-bold text-white">{s.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-6">Sem dados</p>
        )}
      </div>

      {/* Score Distribution */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
          <h3 className="font-heading text-sm font-semibold text-gray-900">
            Qualidade dos Leads
          </h3>
        </div>
        {isLoading ? (
          <div className="skeleton h-32 w-full rounded-xl" />
        ) : totalScore > 0 ? (
          <div className="space-y-4">
            {[
              { label: "Alto (70+)", value: analytics.scoreDistribution.alto, color: "bg-emerald-500" },
              { label: "Medio (40-69)", value: analytics.scoreDistribution.medio, color: "bg-amber-400" },
              { label: "Baixo (<40)", value: analytics.scoreDistribution.baixo, color: "bg-red-400" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className="text-xs font-bold text-gray-700 tabular-nums">
                    {item.value} ({totalScore > 0 ? Math.round((item.value / totalScore) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: `${totalScore > 0 ? (item.value / totalScore) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-6">Sem dados</p>
        )}
      </div>

      {/* Top Procedures */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
          <h3 className="font-heading text-sm font-semibold text-gray-900">
            Procedimentos
          </h3>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-8 w-full" />
            ))}
          </div>
        ) : analytics.topProcedures.length > 0 ? (
          <div className="space-y-1.5">
            {analytics.topProcedures.map((p, idx) => (
              <div
                key={p.procedure}
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50/80 transition-colors"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-[10px] font-bold text-gray-500">
                  {idx + 1}
                </span>
                <span className="text-sm text-gray-700 flex-1 truncate">
                  {p.procedure}
                </span>
                <span className="badge bg-gray-100 text-gray-600 tabular-nums">
                  {p.count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-6">Sem dados</p>
        )}
      </div>
    </div>
  );
}
