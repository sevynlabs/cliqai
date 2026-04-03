"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 mb-4">
        <AlertTriangle className="h-6 w-6 text-red-500" strokeWidth={1.5} />
      </div>
      <h2 className="font-heading text-lg font-bold text-gray-900 mb-1">
        Algo deu errado
      </h2>
      <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
        Ocorreu um erro inesperado. Tente novamente ou recarregue a pagina.
      </p>
      <button
        onClick={reset}
        className="btn-primary"
      >
        <RotateCcw className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  );
}
