"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KanbanBoard } from "./components/kanban-board";
import Link from "next/link";

const queryClient = new QueryClient();

export default function CrmPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-2xl font-bold text-gray-900">
            Pipeline de Leads
          </h1>
          <div className="flex gap-2">
            <span className="px-3 py-1.5 text-sm font-medium bg-teal-600 text-white rounded-md">
              Kanban
            </span>
            <Link
              href="/crm/table"
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Tabela
            </Link>
          </div>
        </div>

        <KanbanBoard />
      </div>
    </QueryClientProvider>
  );
}
