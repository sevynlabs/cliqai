import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login | CliniqAI",
  description: "Entre na sua conta CliniqAI",
};

export default function LoginPage() {
  return (
    <>
      <h2 className="font-heading mb-6 text-center text-xl font-semibold text-gray-900">
        Entrar na sua conta
      </h2>
      <LoginForm />
    </>
  );
}
