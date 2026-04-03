"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@cliniq/shared";
import type { LoginInput } from "@cliniq/shared";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setError(null);
    setLoading(true);

    try {
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        setError(result.error.message ?? "Falha no login. Verifique suas credenciais.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="font-heading text-xl font-bold text-gray-900">
          Bem-vindo de volta
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Entre na sua conta para continuar
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

      <div>
        <label htmlFor="password" className="block text-xs font-medium text-gray-500 mb-1.5">
          Senha
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
            className="input-base pl-10"
            placeholder="********"
          />
        </div>
        {errors.password && (
          <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
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
        {loading ? "Entrando..." : "Entrar"}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>

      <div className="flex items-center justify-between text-[13px]">
        <Link href="/forgot-password" className="text-gray-400 hover:text-gray-700 transition-colors">
          Esqueceu a senha?
        </Link>
        <Link href="/signup" className="font-medium text-primary hover:text-primary-dark transition-colors">
          Criar conta
        </Link>
      </div>
    </form>
  );
}
