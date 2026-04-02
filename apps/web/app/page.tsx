import { UserRole } from "@cliniq/shared";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white">
      <h1 className="font-heading text-5xl font-bold text-primary">CliniqAI</h1>
      <p className="mt-4 text-lg text-gray-600">
        AI-powered clinic management platform
      </p>
      <p className="mt-2 text-sm text-gray-400">
        Roles: {Object.values(UserRole).join(", ")}
      </p>
    </main>
  );
}
