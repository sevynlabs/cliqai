import { Bot } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="font-heading text-2xl font-bold tracking-tight text-gray-900">
              CliniqAI
            </span>
          </Link>
          <p className="mt-2 text-sm text-gray-400">
            Plataforma inteligente para clinicas
          </p>
        </div>

        {/* Card */}
        <div className="card p-8">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Ao continuar, voce concorda com os termos de uso e politica de privacidade.
        </p>
      </div>
    </div>
  );
}
