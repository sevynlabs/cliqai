"use client";

import { useQuery } from "@tanstack/react-query";

interface AgentHealth {
  connected: boolean;
  instanceName: string | null;
  status: string;
}

export function AgentHealthIndicator() {
  const { data, isLoading } = useQuery<AgentHealth>({
    queryKey: ["dashboard", "agent-health"],
    queryFn: () => fetch("/api/dashboard/agent-health", { credentials: "include" }).then((r) => r.json()),
    refetchInterval: 10_000,
  });

  const connected = data?.connected ?? false;

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-heading font-semibold text-gray-900 mb-3">Status do Agente</h3>
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
        <div>
          <p className="text-sm font-medium text-gray-900">
            {isLoading ? "Verificando..." : connected ? "Conectado" : "Desconectado"}
          </p>
          {data?.instanceName && (
            <p className="text-xs text-gray-500">{data.instanceName}</p>
          )}
        </div>
      </div>
    </div>
  );
}
