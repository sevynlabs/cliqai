"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLeads } from "../hooks/use-leads";
import { LeadDrawer } from "../components/lead-drawer";
import type { Lead } from "../lib/api";
import Link from "next/link";
import {
  LayoutGrid,
  Table2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Search,
  Download,
} from "lucide-react";

const queryClient = new QueryClient();

function getScoreBadge(score: number) {
  if (score >= 75) return "bg-emerald-50 text-emerald-700";
  if (score >= 50) return "bg-amber-50 text-amber-700";
  if (score >= 25) return "bg-orange-50 text-orange-700";
  return "bg-gray-50 text-gray-500";
}

const stageBadge: Record<string, string> = {
  novo: "bg-blue-50 text-blue-700",
  qualificado: "bg-violet-50 text-violet-700",
  agendado: "bg-teal-50 text-primary",
  confirmado: "bg-emerald-50 text-emerald-700",
  atendido: "bg-emerald-50 text-emerald-700",
  perdido: "bg-red-50 text-red-600",
};

const columns: ColumnDef<Lead>[] = [
  {
    accessorKey: "name",
    header: "Nome",
    cell: (info) => (
      <span className="font-medium text-gray-900">
        {(info.getValue() as string) || "—"}
      </span>
    ),
  },
  { accessorKey: "phone", header: "Telefone" },
  {
    accessorKey: "procedureInterest",
    header: "Procedimento",
    cell: (info) => (info.getValue() as string) || "—",
  },
  {
    accessorKey: "stage",
    header: "Estagio",
    cell: (info) => {
      const stage = info.getValue() as string;
      return (
        <span className={`badge ${stageBadge[stage] ?? "bg-gray-50 text-gray-600"}`}>
          {stage}
        </span>
      );
    },
  },
  {
    accessorKey: "score",
    header: "Score",
    cell: (info) => {
      const score = info.getValue() as number;
      return (
        <span className={`badge tabular-nums font-bold ${getScoreBadge(score)}`}>
          {score}
        </span>
      );
    },
  },
  {
    accessorKey: "source",
    header: "Fonte",
    cell: (info) => {
      const val = info.getValue() as string;
      return val ? (
        <span className="badge bg-gray-50 text-gray-600">{val}</span>
      ) : (
        "—"
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Criado em",
    cell: (info) => (
      <span className="text-gray-400 tabular-nums">
        {formatDistanceToNow(new Date(info.getValue() as string), {
          addSuffix: true,
          locale: ptBR,
        })}
      </span>
    ),
  },
];

function exportCSV(leads: Lead[]) {
  const headers = ["Nome", "Telefone", "Procedimento", "Estagio", "Score", "Fonte", "Criado em"];
  const rows = leads.map((l) => [
    l.name ?? "",
    l.phone,
    l.procedureInterest ?? "",
    l.stage,
    String(l.score),
    l.source ?? "",
    new Date(l.createdAt).toLocaleDateString("pt-BR"),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function TableView() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const { data: leads = [], isLoading } = useLeads();

  const filteredLeads = leads.filter((l: Lead) => {
    if (search && !(
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.procedureInterest?.toLowerCase().includes(search.toLowerCase())
    )) return false;
    if (stageFilter && l.stage !== stageFilter) return false;
    if (sourceFilter && l.source !== sourceFilter) return false;
    return true;
  });

  const table = useReactTable({
    data: filteredLeads,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  if (isLoading) {
    return (
      <div className="card overflow-hidden">
        <div className="space-y-0">
          <div className="skeleton h-12 w-full" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-10"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="input-base w-auto text-xs"
        >
          <option value="">Todos estagios</option>
          <option value="novo">Novo</option>
          <option value="qualificado">Qualificado</option>
          <option value="agendado">Agendado</option>
          <option value="confirmado">Confirmado</option>
          <option value="atendido">Atendido</option>
          <option value="perdido">Perdido</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="input-base w-auto text-xs"
        >
          <option value="">Todas fontes</option>
          {[...new Set(leads.map((l: Lead) => l.source).filter(Boolean))].map((src) => (
            <option key={src!} value={src!}>{src}</option>
          ))}
        </select>
        <button
          onClick={() => exportCSV(filteredLeads)}
          disabled={filteredLeads.length === 0}
          className="btn-secondary text-xs gap-1.5 ml-auto"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border/60 bg-gray-50/50">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-700 transition-colors select-none"
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() ? (
                        header.column.getIsSorted() === "asc" ? " \u2191" : " \u2193"
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-gray-300" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border/40">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => setSelectedLead(row.original.id)}
                className="transition-colors hover:bg-gray-50/50 cursor-pointer"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3.5 text-gray-600">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 px-1">
        <span className="text-xs text-gray-400">
          Pagina {table.getState().pagination.pageIndex + 1} de{" "}
          {table.getPageCount()} ({filteredLeads.length} leads)
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="btn-ghost px-2 py-1.5 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="btn-ghost px-2 py-1.5 disabled:opacity-30"
          >
            Proximo
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {selectedLead && (
        <LeadDrawer
          leadId={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}

export default function CrmTablePage() {
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
            <Link
              href="/dashboard/crm"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </Link>
            <span className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-900 shadow-sm">
              <Table2 className="h-3.5 w-3.5" />
              Tabela
            </span>
          </div>
        </div>

        <TableView />
      </div>
    </QueryClientProvider>
  );
}
