import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Recuperar Senha | CliniqAI",
  description: "Recupere sua senha CliniqAI",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
