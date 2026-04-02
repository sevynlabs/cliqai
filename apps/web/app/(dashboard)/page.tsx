"use client";

import { useSession } from "@/lib/auth-client";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">
          Bem-vindo ao CliniqAI
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Painel de controle da sua clinica
        </p>
      </div>

      {/* Placeholder KPI cards - Phase 4 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Leads Hoje", value: "--", description: "Novos leads recebidos" },
          { label: "Agendamentos", value: "--", description: "Consultas agendadas" },
          { label: "Taxa de Conversao", value: "--", description: "Lead para agendamento" },
          { label: "Tempo de Resposta", value: "--", description: "Media de resposta" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"
          >
            <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
            <p className="mt-2 font-heading text-3xl font-bold text-gray-900">
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-gray-400">{kpi.description}</p>
          </div>
        ))}
      </div>

      {/* User info card */}
      {session && (
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="font-heading text-lg font-semibold text-gray-900">
            Sua conta
          </h2>
          <dl className="mt-4 space-y-3">
            <div className="flex gap-2">
              <dt className="text-sm font-medium text-gray-500">Nome:</dt>
              <dd className="text-sm text-gray-900">{session.user.name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-sm font-medium text-gray-500">Email:</dt>
              <dd className="text-sm text-gray-900">{session.user.email}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
