"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { safeFetch } from "@/lib/safe-fetch";
import {
  Settings,
  Bot,
  Building2,
  Smartphone,
  Calendar,
  Save,
  CheckCircle2,
  Clock,
  MessageSquare,
  Sparkles,
  Globe,
  Wifi,
  WifiOff,
  QrCode,
  Trash2,
  ExternalLink,
  User,
  Users,
  Mail,
  Shield,
  Stethoscope,
  UserCog,
  FileText,
  Plus,
  DollarSign,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const queryClient = new QueryClient();

interface AgentConfig {
  personaName: string;
  tone: string;
  specialtyText: string | null;
  emojiUsage: boolean;
  operatingHoursStart: number;
  operatingHoursEnd: number;
  timezone: string;
  maxTurns: number;
}

interface WhatsappStatus {
  connected: boolean;
  instanceName: string | null;
  status: string;
  phoneNumber: string | null;
}

/* ─── Agent Config Tab ─── */
function AgentConfigForm() {
  const qc = useQueryClient();
  const { data: config, isLoading } = useQuery<AgentConfig>({
    queryKey: ["settings", "agent"],
    queryFn: () =>
      safeFetch("/api/settings/agent", {
        personaName: "Sofia",
        tone: "informal e acolhedor",
        specialtyText: null,
        emojiUsage: true,
        operatingHoursStart: 8,
        operatingHoursEnd: 20,
        timezone: "America/Sao_Paulo",
        maxTurns: 20,
      }),
  });

  const [form, setForm] = useState<Partial<AgentConfig>>({});
  const merged = { ...config, ...form };

  const save = useMutation({
    mutationFn: (data: Partial<AgentConfig>) =>
      fetch("/api/settings/agent", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "agent"] });
      setForm({});
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FieldGroup icon={Bot} label="Nome da Persona">
          <input
            type="text"
            value={merged.personaName ?? ""}
            onChange={(e) => setForm({ ...form, personaName: e.target.value })}
            className="input-base"
            placeholder="Sofia"
          />
        </FieldGroup>

        <FieldGroup icon={MessageSquare} label="Tom de Voz">
          <select
            value={merged.tone ?? "informal e acolhedor"}
            onChange={(e) => setForm({ ...form, tone: e.target.value })}
            className="input-base"
          >
            <option value="informal e acolhedor">Informal e Acolhedor</option>
            <option value="profissional e formal">Profissional e Formal</option>
            <option value="amigavel e descontraido">Amigavel e Descontraido</option>
          </select>
        </FieldGroup>

        <FieldGroup icon={Clock} label="Horario de Inicio">
          <input
            type="number"
            min={0}
            max={23}
            value={merged.operatingHoursStart ?? 8}
            onChange={(e) => setForm({ ...form, operatingHoursStart: parseInt(e.target.value) })}
            className="input-base"
          />
        </FieldGroup>

        <FieldGroup icon={Clock} label="Horario de Fim">
          <input
            type="number"
            min={0}
            max={23}
            value={merged.operatingHoursEnd ?? 20}
            onChange={(e) => setForm({ ...form, operatingHoursEnd: parseInt(e.target.value) })}
            className="input-base"
          />
        </FieldGroup>

        <FieldGroup icon={Globe} label="Fuso Horario">
          <select
            value={merged.timezone ?? "America/Sao_Paulo"}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            className="input-base"
          >
            <option value="America/Sao_Paulo">Brasilia (UTC-3)</option>
            <option value="America/Manaus">Manaus (UTC-4)</option>
            <option value="America/Belem">Belem (UTC-3)</option>
            <option value="America/Fortaleza">Fortaleza (UTC-3)</option>
          </select>
        </FieldGroup>

        <FieldGroup icon={Sparkles} label="Max Turnos (antes de handoff)">
          <input
            type="number"
            min={5}
            max={50}
            value={merged.maxTurns ?? 20}
            onChange={(e) => setForm({ ...form, maxTurns: parseInt(e.target.value) })}
            className="input-base"
          />
        </FieldGroup>
      </div>

      <div className="flex items-center gap-3 px-1">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={merged.emojiUsage ?? true}
            onChange={(e) => setForm({ ...form, emojiUsage: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 rounded-full peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
        </label>
        <span className="text-sm text-gray-700">Usar emojis nas respostas</span>
      </div>

      <FieldGroup icon={Sparkles} label="Especialidade (texto livre)">
        <textarea
          value={merged.specialtyText ?? ""}
          onChange={(e) => setForm({ ...form, specialtyText: e.target.value })}
          rows={3}
          className="input-base resize-none"
          placeholder="Ex: Dermatologia estetica, Botox, Preenchimento facial..."
        />
      </FieldGroup>

      <div className="flex items-center gap-3">
        <button
          onClick={() => save.mutate(form)}
          disabled={save.isPending || Object.keys(form).length === 0}
          className="btn-primary"
        >
          <Save className="h-4 w-4" />
          {save.isPending ? "Salvando..." : "Salvar"}
        </button>
        {save.isSuccess && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Salvo
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Clinic Tab ─── */
function ClinicSettings() {
  const qc = useQueryClient();
  const { data: tenant, isLoading } = useQuery<{ name?: string; slug?: string } | null>({
    queryKey: ["tenant"],
    queryFn: () => safeFetch<{ name?: string; slug?: string } | null>("/api/tenants/current", null),
  });

  const { data: members = [] } = useQuery<{ id: string; user?: { name?: string; email?: string }; role: string }[]>({
    queryKey: ["members"],
    queryFn: () => safeFetch("/api/users", []),
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("attendant");

  const invite = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      fetch("/api/users/invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      setInviteEmail("");
    },
  });

  if (isLoading) {
    return <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          Dados da Clinica
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Nome</label>
            <p className="text-sm text-gray-900">{tenant?.name ?? "—"}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Slug</label>
            <p className="text-sm text-gray-900">{tenant?.slug ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Invite form */}
      <div className="card p-5 space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-400" />
          Convidar Membro
        </h4>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="input-base pl-10"
            />
          </div>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="input-base w-auto"
          >
            <option value="attendant">Atendente</option>
            <option value="manager">Gerente</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={() => invite.mutate({ email: inviteEmail, role: inviteRole })}
            disabled={invite.isPending || !inviteEmail}
            className="btn-primary flex-shrink-0"
          >
            {invite.isPending ? "Enviando..." : "Convidar"}
          </button>
        </div>
        {invite.isSuccess && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Convite enviado
          </p>
        )}
      </div>

      {/* Team list */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            Equipe
          </h4>
          <span className="badge bg-gray-100 text-gray-500">{Array.isArray(members) ? members.length : 0}</span>
        </div>
        <div className="divide-y divide-border/60">
          {(Array.isArray(members) ? members : []).map((m: { id: string; user?: { name?: string; email?: string }; role: string }) => (
            <div key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                <User className="h-3.5 w-3.5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{m.user?.name ?? "—"}</p>
                <p className="text-xs text-gray-400 truncate">{m.user?.email ?? "—"}</p>
              </div>
              <span className="badge bg-gray-100 text-gray-600">{m.role}</span>
            </div>
          ))}
          {(Array.isArray(members) ? members : []).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum membro</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── WhatsApp Tab ─── */
function WhatsAppSettings() {
  const qc = useQueryClient();
  const { data: status, isLoading } = useQuery<WhatsappStatus>({
    queryKey: ["whatsapp", "status"],
    queryFn: () => safeFetch("/api/whatsapp/instances/status", { connected: false, instanceName: null, status: "none", phoneNumber: null }),
    refetchInterval: 5_000,
  });

  const create = useMutation({
    mutationFn: () =>
      fetch("/api/whatsapp/instances", { method: "POST", credentials: "include" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp"] }),
  });

  const remove = useMutation({
    mutationFn: () =>
      fetch("/api/whatsapp/instances", { method: "DELETE", credentials: "include" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp"] }),
  });

  if (isLoading) {
    return <div className="skeleton h-32 w-full rounded-xl" />;
  }

  const connected = status?.connected ?? false;

  return (
    <div className="space-y-6">
      <div className={`card p-5 ${connected ? "ring-1 ring-emerald-200" : ""}`}>
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${connected ? "bg-emerald-100" : "bg-gray-100"}`}>
            {connected ? (
              <Wifi className="h-5 w-5 text-emerald-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${connected ? "text-emerald-700" : "text-gray-900"}`}>
              {connected ? "Conectado" : "Desconectado"}
            </p>
            {status?.instanceName && (
              <p className="text-xs text-gray-500">{status.instanceName}</p>
            )}
            {status?.phoneNumber && (
              <p className="text-xs text-gray-400">{status.phoneNumber}</p>
            )}
          </div>
          {connected ? (
            <button
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              className="btn-ghost text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
              Desconectar
            </button>
          ) : (
            <button
              onClick={() => create.mutate()}
              disabled={create.isPending}
              className="btn-primary"
            >
              <QrCode className="h-4 w-4" />
              {create.isPending ? "Criando..." : "Conectar"}
            </button>
          )}
        </div>
      </div>

      {!connected && (
        <div className="card p-5 bg-amber-50/50 border-amber-200/50">
          <p className="text-sm text-amber-800">
            Clique em &ldquo;Conectar&rdquo; para gerar um QR code. Escaneie com o WhatsApp para vincular sua instancia.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Calendar Tab ─── */
function CalendarSettings() {
  const { data: calStatus, isLoading } = useQuery<{ connected: boolean; calendarId: string | null }>({
    queryKey: ["calendar", "status"],
    queryFn: () => safeFetch("/api/calendar/status", { connected: false, calendarId: null }),
  });

  const connected = calStatus?.connected ?? false;

  if (isLoading) {
    return <div className="skeleton h-32 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      <div className={`card p-5 ${connected ? "ring-1 ring-blue-200" : ""}`}>
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${connected ? "bg-blue-100" : "bg-gray-100"}`}>
            <Calendar className={`h-5 w-5 ${connected ? "text-blue-600" : "text-gray-400"}`} />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${connected ? "text-blue-700" : "text-gray-900"}`}>
              {connected ? "Google Calendar Conectado" : "Google Calendar"}
            </p>
            <p className="text-xs text-gray-500">
              {connected
                ? `Calendario: ${calStatus?.calendarId ?? "primary"}`
                : "Conecte sua conta Google para sincronizar agendamentos"}
            </p>
          </div>
          {connected ? (
            <span className="badge bg-blue-50 text-blue-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Conectado
            </span>
          ) : (
            <a href="/api/calendar/auth" className="btn-primary">
              <ExternalLink className="h-4 w-4" />
              Conectar
            </a>
          )}
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-400" />
          Permissoes
        </h4>
        <ul className="text-xs text-gray-500 space-y-1.5 list-disc list-inside">
          <li>Ler e criar eventos no calendario</li>
          <li>Verificar disponibilidade de horarios</li>
          <li>Enviar convites automaticos aos pacientes</li>
        </ul>
      </div>
    </div>
  );
}

/* ─── Field Group Helper ─── */
function FieldGroup({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      {children}
    </div>
  );
}

/* ─── Webhooks Tab ─── */
function WebhookSettings() {
  const { data: tenant } = useQuery<{ id?: string } | null>({
    queryKey: ["tenant"],
    queryFn: () => safeFetch<{ id?: string } | null>("/api/tenants/current", null),
  });

  const orgId = tenant?.id ?? "YOUR_ORG_ID";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const genericUrl = `${baseUrl}/api/webhooks/${orgId}/leads`;
  const metaUrl = `${baseUrl}/api/webhooks/${orgId}/meta-leads`;

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Globe className="h-4 w-4 text-gray-400" />
          Webhook Generico (Leads)
        </h4>
        <p className="text-xs text-gray-500">
          Use este endpoint para enviar leads de qualquer fonte (landing pages, formularios, CRMs).
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700 font-mono break-all">
            POST {genericUrl}
          </code>
          <button
            onClick={() => copyToClipboard(genericUrl)}
            className="btn-ghost text-xs flex-shrink-0"
          >
            Copiar
          </button>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-2">Campos aceitos</p>
          <code className="text-xs text-gray-600 font-mono whitespace-pre">{`{
  "phone": "5511999998888",
  "name": "Nome do Lead",
  "email": "lead@email.com",
  "procedure": "Botox",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "campanha"
}`}</code>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-500" />
          Meta Lead Ads
        </h4>
        <p className="text-xs text-gray-500">
          Configure este endpoint no Facebook/Instagram Lead Ads para receber leads automaticamente.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700 font-mono break-all">
            POST {metaUrl}
          </code>
          <button
            onClick={() => copyToClipboard(metaUrl)}
            className="btn-ghost text-xs flex-shrink-0"
          >
            Copiar
          </button>
        </div>
      </div>

      <div className="card p-5 bg-amber-50/30 border-amber-200/40 space-y-2">
        <h4 className="text-xs font-semibold text-amber-800 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5" />
          Seguranca
        </h4>
        <p className="text-xs text-amber-700">
          Para validacao HMAC, inclua o header <code className="bg-amber-100 px-1 rounded">x-webhook-signature</code> com
          a assinatura SHA-256 do body usando seu webhook secret.
        </p>
      </div>
    </div>
  );
}

/* ─── Procedures Tab ─── */
function ProceduresSettings() {
  const qc = useQueryClient();
  const { data: procedures = [], isLoading } = useQuery<{ id: string; name: string; durationMinutes: number; price: number | null; description: string | null; active: boolean }[]>({
    queryKey: ["procedures"],
    queryFn: () => safeFetch("/api/settings/procedures", []),
  });

  const [name, setName] = useState("");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("");

  const create = useMutation({
    mutationFn: (data: { name: string; durationMinutes: number; price?: number }) =>
      fetch("/api/settings/procedures", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["procedures"] }); setName(""); setPrice(""); },
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/settings/procedures/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["procedures"] }),
  });

  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Plus className="h-4 w-4 text-gray-400" />
          Novo Procedimento
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="input-base text-xs col-span-1" />
          <div className="relative">
            <Clock className="absolute left-3 top-2 h-3.5 w-3.5 text-gray-400" />
            <input value={duration} onChange={(e) => setDuration(e.target.value)} type="number" placeholder="Min" className="input-base text-xs pl-9" />
          </div>
          <div className="relative">
            <DollarSign className="absolute left-3 top-2 h-3.5 w-3.5 text-gray-400" />
            <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="Preco" className="input-base text-xs pl-9" />
          </div>
        </div>
        <button
          onClick={() => create.mutate({ name, durationMinutes: parseInt(duration) || 60, price: price ? parseFloat(price) : undefined })}
          disabled={!name.trim() || create.isPending}
          className="btn-primary text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>

      <div className="card p-5 space-y-2">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-gray-400" />
          Procedimentos ({procedures.length})
        </h4>
        {isLoading ? <div className="skeleton h-20 w-full" /> : (
          <div className="divide-y divide-border/40">
            {procedures.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.durationMinutes}min {p.price ? `· R$ ${p.price}` : ""}</p>
                </div>
                <button onClick={() => remove.mutate(p.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {procedures.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nenhum procedimento</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Professionals Tab ─── */
function ProfessionalsSettings() {
  const qc = useQueryClient();
  const { data: professionals = [], isLoading } = useQuery<{ id: string; name: string; specialty: string | null; active: boolean }[]>({
    queryKey: ["professionals"],
    queryFn: () => safeFetch("/api/settings/professionals", []),
  });

  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");

  const create = useMutation({
    mutationFn: (data: { name: string; specialty?: string }) =>
      fetch("/api/settings/professionals", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["professionals"] }); setName(""); setSpecialty(""); },
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/settings/professionals/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["professionals"] }),
  });

  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Plus className="h-4 w-4 text-gray-400" />
          Novo Profissional
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" className="input-base text-xs" />
          <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Especialidade" className="input-base text-xs" />
        </div>
        <button
          onClick={() => create.mutate({ name, specialty: specialty || undefined })}
          disabled={!name.trim() || create.isPending}
          className="btn-primary text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>

      <div className="card p-5 space-y-2">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <UserCog className="h-4 w-4 text-gray-400" />
          Profissionais ({professionals.length})
        </h4>
        {isLoading ? <div className="skeleton h-20 w-full" /> : (
          <div className="divide-y divide-border/40">
            {professionals.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                  <User className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  {p.specialty && <p className="text-xs text-gray-400">{p.specialty}</p>}
                </div>
                <button onClick={() => remove.mutate(p.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {professionals.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nenhum profissional</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Templates Tab ─── */
function TemplatesSettings() {
  const qc = useQueryClient();
  const { data: templates = [], isLoading } = useQuery<{ id: string; type: string; name: string; content: string; variables: string[]; active: boolean }[]>({
    queryKey: ["templates"],
    queryFn: () => safeFetch("/api/settings/templates", []),
  });

  const [type, setType] = useState("confirmation");
  const [tplName, setTplName] = useState("");
  const [content, setContent] = useState("");

  const create = useMutation({
    mutationFn: (data: { type: string; name: string; content: string }) =>
      fetch("/api/settings/templates", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates"] }); setTplName(""); setContent(""); },
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/settings/templates/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });

  const typeLabels: Record<string, string> = {
    confirmation: "Confirmacao",
    reminder_24h: "Lembrete 24h",
    reminder_1h: "Lembrete 1h",
    noshow_recovery: "No-show",
    followup: "Follow-up",
  };

  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Plus className="h-4 w-4 text-gray-400" />
          Novo Template
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <select value={type} onChange={(e) => setType(e.target.value)} className="input-base text-xs">
            <option value="confirmation">Confirmacao</option>
            <option value="reminder_24h">Lembrete 24h</option>
            <option value="reminder_1h">Lembrete 1h</option>
            <option value="noshow_recovery">No-show Recovery</option>
            <option value="followup">Follow-up</option>
          </select>
          <input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Nome do template" className="input-base text-xs" />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Ola {{patientName}}, sua consulta de {{procedureName}} esta confirmada para {{dateTime}}."
          className="input-base text-xs resize-none"
        />
        <p className="text-[10px] text-gray-400">
          Variaveis: {`{{patientName}}, {{procedureName}}, {{dateTime}}, {{clinicName}}`}
        </p>
        <button
          onClick={() => create.mutate({ type, name: tplName, content })}
          disabled={!tplName.trim() || !content.trim() || create.isPending}
          className="btn-primary text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>

      <div className="card p-5 space-y-2">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-400" />
          Templates ({templates.length})
        </h4>
        {isLoading ? <div className="skeleton h-20 w-full" /> : (
          <div className="divide-y divide-border/40">
            {templates.map((t) => (
              <div key={t.id} className="py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge bg-gray-100 text-gray-600 text-[10px]">{typeLabels[t.type] ?? t.type}</span>
                  <span className="text-sm font-medium text-gray-900">{t.name}</span>
                  <button onClick={() => remove.mutate(t.id)} className="ml-auto rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{t.content}</p>
              </div>
            ))}
            {templates.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nenhum template</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Tabs Layout ─── */
const TABS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "agent", label: "Agente IA", icon: Bot },
  { id: "clinic", label: "Clinica", icon: Building2 },
  { id: "procedures", label: "Procedimentos", icon: Stethoscope },
  { id: "professionals", label: "Profissionais", icon: UserCog },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "whatsapp", label: "WhatsApp", icon: Smartphone },
  { id: "calendar", label: "Calendario", icon: Calendar },
  { id: "webhooks", label: "Webhooks", icon: Globe },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(() => {
    const param = searchParams.get("tab");
    return TABS.some((t) => t.id === param) ? param! : "agent";
  });

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-border/60 -mx-1 overflow-x-auto scrollbar-none">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-all rounded-t-lg ${
                active
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <t.icon className="h-4 w-4" strokeWidth={active ? 2 : 1.5} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "agent" && <AgentConfigForm />}
      {tab === "clinic" && <ClinicSettings />}
      {tab === "procedures" && <ProceduresSettings />}
      {tab === "professionals" && <ProfessionalsSettings />}
      {tab === "templates" && <TemplatesSettings />}
      {tab === "whatsapp" && <WhatsAppSettings />}
      {tab === "calendar" && <CalendarSettings />}
      {tab === "webhooks" && <WebhookSettings />}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-4 md:p-6 lg:p-8 max-w-[800px] mx-auto">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900">
            Ajustes
          </h1>
          <p className="mt-1 text-sm text-gray-500">Configure sua clinica e integrações</p>
        </div>
        <div className="card p-6">
          <Suspense fallback={<div className="skeleton h-64 w-full rounded-xl" />}>
            <SettingsContent />
          </Suspense>
        </div>
      </div>
    </QueryClientProvider>
  );
}
