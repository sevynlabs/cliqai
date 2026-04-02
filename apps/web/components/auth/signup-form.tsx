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
      // Step 1: Create user account via Better Auth
      const signupResult = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (signupResult.error) {
        setError(signupResult.error.message ?? "Falha no cadastro. Tente novamente.");
        return;
      }

      // Step 2: Create clinic (organization) via API
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Seu nome
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          {...register("name")}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
          placeholder="Dr. Joao Silva"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
          placeholder="seu@email.com"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Senha
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
          placeholder="Minimo 8 caracteres"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="clinicName" className="block text-sm font-medium text-gray-700">
          Nome da clinica
        </label>
        <input
          id="clinicName"
          type="text"
          {...register("clinicName")}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
          placeholder="Clinica Exemplo"
        />
        {errors.clinicName && (
          <p className="mt-1 text-xs text-red-600">{errors.clinicName.message}</p>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
      >
        {loading ? "Criando conta..." : "Criar conta"}
      </button>

      <p className="text-center text-sm text-gray-500">
        Ja tem conta?{" "}
        <Link href="/login" className="text-primary hover:text-primary-dark font-medium">
          Entrar
        </Link>
      </p>
    </form>
  );
}
