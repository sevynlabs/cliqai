import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 mb-4">
        <FileQuestion className="h-6 w-6 text-gray-400" strokeWidth={1.5} />
      </div>
      <h2 className="font-heading text-lg font-bold text-gray-900 mb-1">
        Pagina nao encontrada
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        A pagina que voce esta procurando nao existe.
      </p>
      <Link href="/dashboard" className="btn-ghost">
        <ArrowLeft className="h-4 w-4" />
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
