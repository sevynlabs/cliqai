"use client";

import { useQuery } from "@tanstack/react-query";
import { safeFetch } from "@/lib/safe-fetch";
import Link from "next/link";
import {
  Smartphone,
  Bot,
  Calendar,
  Globe,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AgentHealth {
  connected: boolean;
}

interface Step {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  check: (data: { agent: any; whatsapp: AgentHealth }) => boolean;
}

const STEPS: Step[] = [
  {
    id: "whatsapp",
    label: "Conectar WhatsApp",
    description: "Vincule sua instancia do WhatsApp para receber mensagens",
    icon: Smartphone,
    href: "/dashboard/settings?tab=whatsapp",
    check: ({ whatsapp }) => whatsapp.connected,
  },
  {
    id: "agent",
    label: "Configurar Agente IA",
    description: "Personalize o nome, tom e especialidade do seu assistente",
    icon: Bot,
    href: "/dashboard/settings?tab=agent",
    check: ({ agent }) => !!agent?.personaName,
  },
  {
    id: "calendar",
    label: "Conectar Google Calendar",
    description: "Sincronize agendamentos automaticamente",
    icon: Calendar,
    href: "/dashboard/settings?tab=calendar",
    check: () => false, // Can't easily check without calendar token query
  },
  {
    id: "webhook",
    label: "Configurar Webhooks",
    description: "Receba leads de landing pages e Meta Ads",
    icon: Globe,
    href: "/dashboard/settings?tab=webhooks",
    check: () => false,
  },
];

export function OnboardingBanner() {
  const { data: whatsapp } = useQuery<AgentHealth>({
    queryKey: ["dashboard", "agent-health"],
    queryFn: () => safeFetch("/api/dashboard/agent-health", { connected: false }),
    refetchInterval: 30_000,
  });

  const { data: agent } = useQuery({
    queryKey: ["settings", "agent"],
    queryFn: () => safeFetch("/api/settings/agent", null),
  });

  const context = { agent, whatsapp: whatsapp ?? { connected: false } };
  const completedCount = STEPS.filter((s) => s.check(context)).length;

  // Hide if all steps completed or if we can't determine (still loading)
  if (completedCount >= 3) return null;

  return (
    <div className="card p-5 bg-gradient-to-r from-primary/5 via-violet-500/3 to-transparent">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-heading text-sm font-semibold text-gray-900">
          Configure sua clinica
        </h3>
        <span className="badge bg-primary/10 text-primary ml-auto">
          {completedCount}/{STEPS.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {STEPS.map((step) => {
          const done = step.check(context);
          return (
            <Link
              key={step.id}
              href={step.href}
              className={`group flex flex-col rounded-xl p-3.5 transition-all ${
                done
                  ? "bg-emerald-50/50 border border-emerald-200/40"
                  : "bg-white border border-border/60 hover:border-primary/30 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <step.icon className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" strokeWidth={1.5} />
                )}
                <span className={`text-xs font-semibold ${done ? "text-emerald-700" : "text-gray-900"}`}>
                  {step.label}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed flex-1">
                {step.description}
              </p>
              {!done && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Configurar <ArrowRight className="h-3 w-3" />
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
