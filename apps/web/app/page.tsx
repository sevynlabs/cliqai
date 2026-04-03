import Link from "next/link";
import {
  Bot,
  MessageCircle,
  Calendar,
  Users,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: MessageCircle,
    title: "Atendimento 24/7",
    description: "Agente IA responde leads no WhatsApp automaticamente, qualifica e agenda consultas.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Calendar,
    title: "Agendamento Inteligente",
    description: "Integracao com Google Calendar. Verifica disponibilidade e marca consultas em tempo real.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Users,
    title: "CRM Completo",
    description: "Pipeline visual com kanban, scores, historico e anotacoes de cada lead.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: TrendingUp,
    title: "Funil de Conversao",
    description: "Dashboard com KPIs, funil, atividades e metricas de desempenho em tempo real.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Shield,
    title: "LGPD Integrada",
    description: "Consentimento, anonimizacao e exclusao de dados conforme a legislacao brasileira.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Zap,
    title: "Handoff Inteligente",
    description: "Transicao suave entre bot e humano. Assuma a conversa com um clique.",
    color: "bg-red-50 text-red-500",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-surface">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-surface-raised/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="font-heading text-lg font-bold tracking-tight text-gray-900">
              CliniqAI
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="btn-primary text-sm px-4 py-2"
            >
              Comecar gratis
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-4 py-1.5 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">
              Powered by AI
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1]">
            Sua clinica com{" "}
            <span className="text-primary">atendimento inteligente</span>
          </h1>
          <p className="mt-5 text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
            Automatize o atendimento via WhatsApp, qualifique leads, agende consultas
            e gerencie seu pipeline — tudo com inteligencia artificial.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="btn-primary text-base px-6 py-3"
            >
              Comecar gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="btn-secondary text-base px-6 py-3"
            >
              Ja tenho conta
            </Link>
          </div>
        </div>

        {/* Gradient blob */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-br from-primary/10 via-violet-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Features */}
      <section className="py-20 px-4 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-gray-900">
              Tudo que sua clinica precisa
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              Uma plataforma completa para converter leads em pacientes de forma automatica.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="card-hover p-6 group">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.color} mb-4`}>
                  <f.icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading text-base font-semibold text-gray-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="card p-10 md:p-14 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 pointer-events-none" />
            <div className="relative">
              <h2 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                Pronto para automatizar sua clinica?
              </h2>
              <p className="mt-3 text-gray-500">
                Configure em minutos. Sem cartao de credito.
              </p>
              <div className="mt-8">
                <Link
                  href="/signup"
                  className="btn-primary text-base px-8 py-3"
                >
                  Criar conta gratis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-4 md:px-8">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <Bot className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-500">CliniqAI</span>
          </div>
          <p className="text-xs text-gray-400">
            2024-{new Date().getFullYear()} CliniqAI. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
}
