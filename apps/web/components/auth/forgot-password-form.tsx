"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalido"),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/forget-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: data.email,
          redirectTo: "/reset-password",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Erro ao enviar email de recuperacao.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-5 text-center py-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-500" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="font-heading text-lg font-bold text-gray-900">
            Email enviado
          </h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Verifique sua caixa de entrada para o link de recuperacao de senha.
          </p>
        </div>
        <Link
          href="/login"
          className="btn-ghost inline-flex text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="font-heading text-xl font-bold text-gray-900">
          Recuperar senha
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Informe seu email para receber o link de recuperacao
        </p>
      </div>

      <div>
        <label htmlFor="email" className="block text-xs font-medium text-gray-500 mb-1.5">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="input-base pl-10"
            placeholder="seu@email.com"
          />
        </div>
        {errors.email && (
          <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? "Enviando..." : "Enviar link"}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>

      <p className="text-center text-[13px]">
        <Link href="/login" className="text-gray-400 hover:text-gray-700 transition-colors inline-flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para login
        </Link>
      </p>
    </form>
  );
}
