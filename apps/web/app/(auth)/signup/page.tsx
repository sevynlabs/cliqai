import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Cadastro | CliniqAI",
  description: "Crie sua conta CliniqAI",
};

export default function SignupPage() {
  return <SignupForm />;
}
