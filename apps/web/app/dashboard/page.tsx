"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KpiCards } from "./components/kpi-cards";
import { ConversionFunnel } from "./components/conversion-funnel";
import { ActivityTimeline } from "./components/activity-timeline";
import { TodaysAgenda } from "./components/todays-agenda";
import { AgentHealthIndicator } from "./components/agent-health";
import { OnboardingBanner } from "./components/onboarding-banner";
import { LeadAnalytics } from "./components/lead-analytics";

const queryClient = new QueryClient();

export default function DashboardPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Visao geral da sua clinica
          </p>
        </div>

        <OnboardingBanner />

        <KpiCards />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ConversionFunnel />
          <TodaysAgenda />
        </div>

        <LeadAnalytics />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <ActivityTimeline />
          </div>
          <AgentHealthIndicator />
        </div>
      </div>
    </QueryClientProvider>
  );
}
