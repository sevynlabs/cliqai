"use client";

import { useQuery } from "@tanstack/react-query";
import { safeFetch } from "@/lib/safe-fetch";
import { Bot, Wifi, WifiOff, Signal } from "lucide-react";

interface AgentHealth {
  connected: boolean;
  instanceName: string | null;
  status: string;
}

const FALLBACK: AgentHealth = { connected: false, instanceName: null, status: "disconnected" };

export function AgentHealthIndicator() {
  const { data, isLoading } = useQuery<AgentHealth>({
    queryKey: ["dashboard", "agent-health"],
    queryFn: () => safeFetch("/api/dashboard/agent-health", FALLBACK),
    refetchInterval: 10_000,
  });

  const connected = data?.connected ?? false;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-5">
        <Bot className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
        <h3 className="font-heading text-sm font-semibold text-gray-900">
          Agente IA
        </h3>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-4">
          <div className="skeleton h-14 w-14 rounded-2xl" />
          <div className="space-y-2">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-3 w-16" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status card */}
          <div className={`flex items-center gap-4 rounded-xl p-4 ${
            connected ? "bg-emerald-50/50" : "bg-red-50/50"
          }`}>
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
              connected ? "bg-emerald-100" : "bg-red-100"
            }`}>
              {connected ? (
                <Wifi className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" strokeWidth={1.5} />
              )}
            </div>
            <div>
              <p className={`text-sm font-semibold ${connected ? "text-emerald-700" : "text-red-600"}`}>
                {connected ? "Conectado" : "Desconectado"}
              </p>
              {data?.instanceName && (
                <p className="text-xs text-gray-500 mt-0.5">{data.instanceName}</p>
              )}
            </div>
          </div>

          {/* Signal indicator */}
          <div className="flex items-center gap-2.5 px-1">
            <Signal className={`h-4 w-4 ${connected ? "text-emerald-400" : "text-gray-300"}`} strokeWidth={1.5} />
            <div className="flex gap-0.5">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={`w-1.5 rounded-full transition-all ${
                    connected
                      ? "bg-emerald-400"
                      : "bg-gray-200"
                  }`}
                  style={{ height: `${bar * 4 + 4}px` }}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400 ml-auto">
              {connected ? "Respondendo" : "Offline"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
