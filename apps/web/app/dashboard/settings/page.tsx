"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient();

interface AgentConfig {
  personaName: string;
  tone: string;
  specialtyText: string | null;
  emojiUsage: boolean;
  operatingHoursStart: number;
  operatingHoursEnd: number;
  timezone: string;
  maxTurns: number;
}

function AgentConfigForm() {
  const qc = useQueryClient();
  const { data: config, isLoading } = useQuery<AgentConfig>({
    queryKey: ["settings", "agent"],
    queryFn: () => fetch("/api/settings/agent", { credentials: "include" }).then((r) => r.json()),
  });

  const [form, setForm] = useState<Partial<AgentConfig>>({});
  const merged = { ...config, ...form };

  const save = useMutation({
    mutationFn: (data: Partial<AgentConfig>) =>
      fetch("/api/settings/agent", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", "agent"] }),
  });

  if (isLoading) {
    return <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600 mx-auto" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Persona</label>
          <input
            type="text"
            value={merged.personaName ?? ""}
            onChange={(e) => setForm({ ...form, personaName: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tom de Voz</label>
          <select
            value={merged.tone ?? "informal e acolhedor"}
            onChange={(e) => setForm({ ...form, tone: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="informal e acolhedor">Informal e Acolhedor</option>
            <option value="profissional e formal">Profissional e Formal</option>
            <option value="amigavel e descontraido">Amigavel e Descontraido</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Horario Inicio</label>
          <input
            type="number"
            min={0}
            max={23}
            value={merged.operatingHoursStart ?? 8}
            onChange={(e) => setForm({ ...form, operatingHoursStart: parseInt(e.target.value) })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Horario Fim</label>
          <input
            type="number"
            min={0}
            max={23}
            value={merged.operatingHoursEnd ?? 20}
            onChange={(e) => setForm({ ...form, operatingHoursEnd: parseInt(e.target.value) })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Turnos (antes de handoff)</label>
          <input
            type="number"
            min={5}
            max={50}
            value={merged.maxTurns ?? 20}
            onChange={(e) => setForm({ ...form, maxTurns: parseInt(e.target.value) })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            checked={merged.emojiUsage ?? true}
            onChange={(e) => setForm({ ...form, emojiUsage: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <label className="text-sm font-medium text-gray-700">Usar emojis</label>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade (texto livre)</label>
        <textarea
          value={merged.specialtyText ?? ""}
          onChange={(e) => setForm({ ...form, specialtyText: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          placeholder="Ex: Dermatologia estetica, Botox, Preenchimento facial..."
        />
      </div>
      <button
        onClick={() => save.mutate(form)}
        disabled={save.isPending}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
      >
        {save.isPending ? "Salvando..." : "Salvar Configuracoes"}
      </button>
      {save.isSuccess && <p className="text-sm text-green-600">Configuracoes salvas!</p>}
    </div>
  );
}

function SettingsContent() {
  const [tab, setTab] = useState("agent");

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b">
        {[
          { id: "agent", label: "Agente IA" },
          { id: "clinic", label: "Clinica" },
          { id: "whatsapp", label: "WhatsApp" },
          { id: "calendar", label: "Calendario" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "agent" && <AgentConfigForm />}
      {tab === "clinic" && <p className="text-sm text-gray-400 py-8 text-center">Configuracoes da clinica — em desenvolvimento</p>}
      {tab === "whatsapp" && <p className="text-sm text-gray-400 py-8 text-center">Configuracoes do WhatsApp — em desenvolvimento</p>}
      {tab === "calendar" && <p className="text-sm text-gray-400 py-8 text-center">Configuracoes do calendario — em desenvolvimento</p>}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-4 md:p-6">
        <h1 className="font-heading text-2xl font-bold text-gray-900 mb-4">Configuracoes</h1>
        <div className="bg-white rounded-lg border p-6">
          <SettingsContent />
        </div>
      </div>
    </QueryClientProvider>
  );
}
