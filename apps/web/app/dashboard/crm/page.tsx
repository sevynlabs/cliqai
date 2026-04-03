"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KanbanBoard } from "./components/kanban-board";
import Link from "next/link";
import { LayoutGrid, Table2, Users } from "lucide-react";

const queryClient = new QueryClient();

export default function CrmPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900">
              Pipeline de Leads
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie o funil de vendas da sua clinica
            </p>
          </div>
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            <span className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-900 shadow-sm">
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </span>
            <Link
              href="/dashboard/crm/table"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Table2 className="h-3.5 w-3.5" />
              Tabela
            </Link>
          </div>
        </div>

        <KanbanBoard />
      </div>
    </QueryClientProvider>
  );
}
