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
import type { Lead } from "../lib/api";
import Link from "next/link";

const queryClient = new QueryClient();

const columns: ColumnDef<Lead>[] = [
  { accessorKey: "name", header: "Nome", cell: (info) => info.getValue() || "—" },
  { accessorKey: "phone", header: "Telefone" },
  { accessorKey: "procedureInterest", header: "Procedimento", cell: (info) => info.getValue() || "—" },
  {
    accessorKey: "stage",
    header: "Estagio",
    cell: (info) => (
      <span className="px-2 py-0.5 text-xs font-medium bg-teal-50 text-teal-700 rounded">
        {info.getValue() as string}
      </span>
    ),
  },
  {
    accessorKey: "score",
    header: "Score",
    cell: (info) => {
      const score = info.getValue() as number;
      return <span className="font-semibold">{score}</span>;
    },
  },
  { accessorKey: "source", header: "Fonte", cell: (info) => info.getValue() || "—" },
  {
    accessorKey: "createdAt",
    header: "Criado em",
    cell: (info) =>
      formatDistanceToNow(new Date(info.getValue() as string), {
        addSuffix: true,
        locale: ptBR,
      }),
  },
];

function TableView() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const { data: leads = [], isLoading } = useLeads();

  const table = useReactTable({
    data: leads,
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b hover:bg-gray-50 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-gray-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-gray-500">
          Pagina {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Anterior
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Proximo
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CrmTablePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-2xl font-bold text-gray-900">
            Pipeline de Leads
          </h1>
          <div className="flex gap-2">
            <Link
              href="/dashboard/crm"
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Kanban
            </Link>
            <span className="px-3 py-1.5 text-sm font-medium bg-teal-600 text-white rounded-md">
              Tabela
            </span>
          </div>
        </div>

        <TableView />
      </div>
    </QueryClientProvider>
  );
}
