import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login | CliniqAI",
  description: "Entre na sua conta CliniqAI",
};

export default function LoginPage() {
  return <LoginForm />;
}
