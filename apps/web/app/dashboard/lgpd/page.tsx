"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { safeFetch } from "@/lib/safe-fetch";
import {
  Shield,
  Search,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Phone,
  Clock,
  XCircle,
} from "lucide-react";

const queryClient = new QueryClient();

interface ConsentRecord {
  hasConsent: boolean;
  consentVersion?: string;
  consentChannel?: string;
  consentGiven?: boolean;
  createdAt?: string;
}

/* ─── Consent Lookup ─── */
function ConsentLookup() {
  const [phone, setPhone] = useState("");
  const [searchPhone, setSearchPhone] = useState("");

  const { data: consent, isLoading, isError } = useQuery<ConsentRecord>({
    queryKey: ["lgpd", "consent", searchPhone],
    queryFn: () => safeFetch(`/api/lgpd/consent/${encodeURIComponent(searchPhone)}`, { hasConsent: false }),
    enabled: searchPhone.length >= 8,
  });

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900">Consultar Consentimento</h3>
      </div>
      <p className="text-xs text-gray-500">
        Verifique se um lead deu consentimento para tratamento de dados.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (phone.trim()) setSearchPhone(phone.trim());
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Phone className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="5511999998888"
            className="input-base pl-10"
          />
        </div>
        <button type="submit" disabled={!phone.trim()} className="btn-primary">
          Consultar
        </button>
      </form>

      {searchPhone && !isLoading && (
        <div className={`flex items-center gap-3 rounded-xl p-4 ${
          consent?.hasConsent ? "bg-emerald-50/50" : "bg-red-50/50"
        }`}>
          {consent?.hasConsent ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-700">Consentimento ativo</p>
                {consent.consentVersion && (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Versao: {consent.consentVersion} | Canal: {consent.consentChannel}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-600">Sem consentimento registrado</p>
                <p className="text-xs text-red-500 mt-0.5">
                  Este numero nao possui consentimento ativo.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {isLoading && searchPhone && (
        <div className="flex items-center gap-2 p-4">
          <div className="skeleton h-5 w-5 rounded-full" />
          <div className="skeleton h-4 w-48" />
        </div>
      )}
    </div>
  );
}

/* ─── Erasure Request ─── */
function ErasureRequest() {
  const [phone, setPhone] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const erasure = useMutation({
    mutationFn: async (leadPhone: string) => {
      const r = await fetch("/api/lgpd/erasure", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadPhone }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      setPhone("");
      setConfirmed(false);
    },
  });

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Trash2 className="h-4 w-4 text-red-400" />
        <h3 className="text-sm font-semibold text-gray-900">Solicitar Exclusao de Dados</h3>
      </div>
      <p className="text-xs text-gray-500">
        Solicite a exclusao dos dados pessoais de um lead conforme a LGPD (Art. 18).
        Esta acao e irreversivel.
      </p>

      <div className="relative">
        <Phone className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setConfirmed(false); }}
          placeholder="5511999998888"
          className="input-base pl-10"
        />
      </div>

      {phone.trim().length >= 8 && !confirmed && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50/50 p-3">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-amber-800 font-medium">Atencao</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Todos os registros de consentimento e dados associados a este numero serao excluidos permanentemente.
            </p>
            <button
              onClick={() => setConfirmed(true)}
              className="mt-2 text-xs font-medium text-amber-800 underline hover:no-underline"
            >
              Entendo e desejo prosseguir
            </button>
          </div>
        </div>
      )}

      {confirmed && (
        <button
          onClick={() => erasure.mutate(phone.trim())}
          disabled={erasure.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {erasure.isPending ? "Processando..." : "Confirmar Exclusao"}
        </button>
      )}

      {erasure.isSuccess && (
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          Solicitacao de exclusao registrada com sucesso.
        </div>
      )}

      {erasure.isError && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          Erro ao processar solicitacao. Tente novamente.
        </div>
      )}
    </div>
  );
}

/* ─── Info Section ─── */
function LgpdInfo() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900">Sobre a LGPD</h3>
      </div>
      <div className="text-xs text-gray-500 space-y-2 leading-relaxed">
        <p>
          A Lei Geral de Protecao de Dados (LGPD - Lei 13.709/2018) regulamenta o
          tratamento de dados pessoais no Brasil.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Art. 7</strong> — O consentimento e uma das bases legais para tratamento</li>
          <li><strong>Art. 8</strong> — Consentimento deve ser livre, informado e inequivoco</li>
          <li><strong>Art. 15</strong> — Dados devem ser eliminados apos o fim do tratamento</li>
          <li><strong>Art. 18</strong> — Titular pode solicitar exclusao a qualquer momento</li>
        </ul>
        <p>
          O CliniqAI coleta consentimento automaticamente durante a primeira interacao
          via WhatsApp e armazena de forma criptografada.
        </p>
      </div>
    </div>
  );
}

function LgpdContent() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[800px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900">
          Privacidade & LGPD
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Gerencie consentimento e solicitacoes de exclusao de dados
        </p>
      </div>

      <ConsentLookup />
      <ErasureRequest />
      <LgpdInfo />
    </div>
  );
}

export default function LgpdPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <LgpdContent />
    </QueryClientProvider>
  );
}
