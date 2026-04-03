"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema } from "@cliniq/shared";
import type { SignupInput } from "@cliniq/shared";
import { authClient } from "@/lib/auth-client";
import { apiClient } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, Building2, ArrowRight, AlertCircle } from "lucide-react";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(data: SignupInput) {
    setError(null);
    setLoading(true);

    try {
      const signupResult = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (signupResult.error) {
        setError(signupResult.error.message ?? "Falha no cadastro. Tente novamente.");
        return;
      }

      try {
        await apiClient.post("/api/tenants", {
          name: data.clinicName,
          slug: data.clinicName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        });
      } catch {
        setError("Conta criada, mas houve erro ao criar a clinica. Faca login e tente novamente.");
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="font-heading text-xl font-bold text-gray-900">
          Criar nova conta
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Configure sua clinica em minutos
        </p>
      </div>

      <div>
        <label htmlFor="name" className="block text-xs font-medium text-gray-500 mb-1.5">
          Seu nome
        </label>
        <div className="relative">
          <User className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            id="name"
            type="text"
            autoComplete="name"
            {...register("name")}
            className="input-base pl-10"
            placeholder="Dr. Joao Silva"
          />
        </div>
        {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>}
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
        {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>}
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
            autoComplete="new-password"
            {...register("password")}
            className="input-base pl-10"
            placeholder="Minimo 8 caracteres"
          />
        </div>
        {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
      </div>

      <div>
        <label htmlFor="clinicName" className="block text-xs font-medium text-gray-500 mb-1.5">
          Nome da clinica
        </label>
        <div className="relative">
          <Building2 className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            id="clinicName"
            type="text"
            {...register("clinicName")}
            className="input-base pl-10"
            placeholder="Clinica Exemplo"
          />
        </div>
        {errors.clinicName && <p className="mt-1.5 text-xs text-red-500">{errors.clinicName.message}</p>}
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
        {loading ? "Criando conta..." : "Criar conta"}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>

      <p className="text-center text-[13px] text-gray-400">
        Ja tem conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary-dark transition-colors">
          Entrar
        </Link>
      </p>
    </form>
  );
}
