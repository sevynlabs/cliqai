import { CLINIQ_ROLES } from "@cliniq/shared";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white">
      <h1 className="font-heading text-5xl font-bold text-primary">CliniqAI</h1>
      <p className="mt-4 text-lg text-gray-600">
        AI-powered clinic management platform
      </p>
      <p className="mt-2 text-sm text-gray-400">
        Roles: {CLINIQ_ROLES.join(", ")}
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark"
        >
          Entrar
        </Link>
        <Link
          href="/signup"
          className="rounded-lg border border-primary px-6 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5"
        >
          Criar conta
        </Link>
      </div>
    </main>
  );
}
