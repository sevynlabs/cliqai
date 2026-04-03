"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { safeFetch } from "@/lib/safe-fetch";
import {
  MessageCircle,
  Search,
  Send,
  Bot,
  User,
  Hand,
  RotateCcw,
  Phone,
  ArrowRightLeft,
} from "lucide-react";

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

interface Message {
  id: string;
  role: "lead" | "assistant" | "system";
  content: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "bg-emerald-400" },
  human_handling: { label: "Humano", color: "bg-amber-400" },
  closed: { label: "Fechado", color: "bg-gray-300" },
};

function ConversationList({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => safeFetch("/api/conversations", []),
    refetchInterval: 10_000,
  });

  const filtered = search
    ? conversations.filter(
        (c) =>
          c.lead?.name?.toLowerCase().includes(search.toLowerCase()) ||
          c.remoteJid.includes(search) ||
          c.lead?.phone?.includes(search),
      )
    : conversations;

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="relative px-3 pb-3">
        <Search className="absolute left-6 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar conversas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base pl-9 py-2 text-[13px]"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {isLoading ? (
          <div className="space-y-2 px-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-xl p-3 space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {filtered.map((c) => {
              const cfg = statusConfig[c.status] ?? statusConfig.closed;
              const isSelected = selected === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={`w-full text-left rounded-xl p-3 transition-all ${
                    isSelected
                      ? "bg-primary/8 ring-1 ring-primary/20"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 flex-shrink-0">
                      <User className="h-3.5 w-3.5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-medium text-gray-900 truncate">
                          {c.lead?.name ?? c.remoteJid}
                        </p>
                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.color}`} />
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-gray-400 truncate">
                          {c.qualificationStage}
                        </span>
                        <span className="text-[11px] text-gray-300">|</span>
                        <span className="text-[11px] text-gray-400">
                          {c.turnCount} msgs
                        </span>
                        <span className="text-[11px] text-gray-300 ml-auto flex-shrink-0">
                          {formatDistanceToNow(new Date(c.updatedAt), {
                            addSuffix: false,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center py-12 text-gray-400">
                <MessageCircle className="h-8 w-8 text-gray-200 mb-2" strokeWidth={1} />
                <p className="text-xs">Nenhuma conversa</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ChatThread({ conversationId, conversation }: { conversationId: string; conversation?: Conversation }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["messages", conversationId],
    queryFn: () => safeFetch(`/api/conversations/${conversationId}/messages`, []),
    refetchInterval: 5_000,
    enabled: !!conversationId,
  });

  const handoff = useMutation({
    mutationFn: async (action: "takeover" | "return") => {
      await fetch(`/api/handoff/${conversationId}/${action}`, {
        method: "POST",
        credentials: "include",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (text: string) => {
      const r = await fetch(`/api/handoff/${conversationId}/send`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw new Error("Failed to send");
    },
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  const isHuman = conversation?.status === "human_handling";

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
            <User className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {conversation?.lead?.name ?? conversation?.remoteJid ?? "..."}
            </p>
            <div className="flex items-center gap-1.5">
              {conversation?.lead?.phone && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {conversation.lead.phone}
                </span>
              )}
              {conversation?.lead?.procedureInterest && (
                <>
                  <span className="text-xs text-gray-300">|</span>
                  <span className="text-xs text-gray-400">{conversation.lead.procedureInterest}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isHuman ? (
            <button
              onClick={() => handoff.mutate("return")}
              disabled={handoff.isPending}
              className="btn-ghost text-xs gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Devolver ao Bot
            </button>
          ) : (
            <button
              onClick={() => handoff.mutate("takeover")}
              disabled={handoff.isPending}
              className="btn-ghost text-xs gap-1.5"
            >
              <Hand className="h-3.5 w-3.5" />
              Assumir
            </button>
          )}
          <span className={`badge ${isHuman ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
            <ArrowRightLeft className="h-3 w-3" />
            {isHuman ? "Voce" : "Bot"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Bot className="h-10 w-10 text-gray-200 mb-3" strokeWidth={1} />
            <p className="text-sm">Sem mensagens ainda</p>
            <p className="text-xs mt-1">As mensagens aparecerao aqui em tempo real</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}
            >
              <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                msg.role === "assistant"
                  ? "bg-primary/10"
                  : msg.role === "system"
                    ? "bg-gray-100"
                    : "bg-blue-50"
              }`}>
                {msg.role === "assistant" ? (
                  <Bot className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <User className="h-3.5 w-3.5 text-gray-500" />
                )}
              </div>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-gray-50 text-gray-800"
                    : msg.role === "system"
                      ? "bg-amber-50 text-amber-800 italic"
                      : "bg-primary text-white"
                }`}
              >
                {msg.content}
                <p className={`text-[10px] mt-1.5 ${
                  msg.role === "assistant"
                    ? "text-gray-400"
                    : msg.role === "system"
                      ? "text-amber-400"
                      : "text-white/60"
                }`}>
                  {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input (visible only when human is handling) */}
      {isHuman && (
        <div className="border-t border-border/60 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) sendMessage.mutate(draft.trim());
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escreva uma mensagem..."
              className="input-base flex-1"
              disabled={sendMessage.isPending}
            />
            <button
              type="submit"
              disabled={sendMessage.isPending || !draft.trim()}
              className="btn-primary px-3 py-2.5"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function ConversationsContent() {
  const [selected, setSelected] = useState<string | null>(null);
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => safeFetch("/api/conversations", []),
    refetchInterval: 10_000,
  });
  const selectedConvo = conversations.find((c) => c.id === selected);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Sidebar */}
      <div className="w-[320px] flex-shrink-0 border-r border-border/60 bg-surface-raised flex flex-col pt-4">
        <div className="flex items-center gap-2 px-5 pb-3">
          <MessageCircle className="h-4.5 w-4.5 text-gray-400" strokeWidth={1.5} />
          <h2 className="font-heading text-base font-semibold text-gray-900">
            Conversas
          </h2>
          <span className="badge bg-gray-100 text-gray-500 ml-auto">
            {conversations.length}
          </span>
        </div>
        <ConversationList selected={selected} onSelect={setSelected} />
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-surface-raised">
        {selected ? (
          <ChatThread conversationId={selected} conversation={selectedConvo} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 mb-4">
              <MessageCircle className="h-7 w-7 text-gray-300" strokeWidth={1} />
            </div>
            <p className="text-sm font-medium text-gray-500">Selecione uma conversa</p>
            <p className="text-xs mt-1">As mensagens com seus leads aparecem aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConversationsContent />
    </QueryClientProvider>
  );
}
