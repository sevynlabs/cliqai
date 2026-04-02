import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Cadastro | CliniqAI",
  description: "Crie sua conta CliniqAI",
};

export default function SignupPage() {
  return (
    <>
      <h2 className="font-heading mb-6 text-center text-xl font-semibold text-gray-900">
        Criar nova conta
      </h2>
      <SignupForm />
    </>
  );
}
