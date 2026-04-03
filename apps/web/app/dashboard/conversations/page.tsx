"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const queryClient = new QueryClient();

interface Conversation {
  id: string;
  remoteJid: string;
  status: string;
  turnCount: number;
  qualificationStage: string;
  updatedAt: string;
  lead?: { name: string | null; phone: string; procedureInterest: string | null };
}

function ConversationList({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => fetch("/api/conversations", { credentials: "include" }).then((r) => r.json()),
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" /></div>;
  }

  return (
    <div className="space-y-1">
      {conversations.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`w-full text-left p-3 rounded-lg transition-colors ${selected === c.id ? "bg-teal-50 border-teal-200 border" : "hover:bg-gray-50"}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 truncate">{c.lead?.name ?? c.remoteJid}</p>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.status === "active" ? "bg-green-500" : c.status === "human_handling" ? "bg-yellow-500" : "bg-gray-300"}`} />
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">{c.qualificationStage} • {c.turnCount} msgs</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true, locale: ptBR })}</p>
        </button>
      ))}
      {conversations.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nenhuma conversa ainda</p>}
    </div>
  );
}

function ConversationsContent() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversation list */}
      <div className="w-80 flex-shrink-0 bg-white rounded-lg border p-3 overflow-y-auto">
        <h3 className="font-heading font-semibold text-gray-900 mb-3">Conversas</h3>
        <ConversationList selected={selected} onSelect={setSelected} />
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-white rounded-lg border flex items-center justify-center">
        {selected ? (
          <p className="text-sm text-gray-500">Chat thread - em desenvolvimento</p>
        ) : (
          <p className="text-sm text-gray-400">Selecione uma conversa</p>
        )}
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-4 md:p-6">
        <h1 className="font-heading text-2xl font-bold text-gray-900 mb-4">Conversas</h1>
        <ConversationsContent />
      </div>
    </QueryClientProvider>
  );
}
