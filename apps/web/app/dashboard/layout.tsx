"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  Calendar,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  Bot,
  ChevronRight,
} from "lucide-react";

interface BadgeCounts {
  conversations: number;
  appointments: number;
}

function useBadgeCounts(): BadgeCounts {
  const [counts, setCounts] = useState<BadgeCounts>({ conversations: 0, appointments: 0 });

  const fetchCounts = useCallback(async () => {
    try {
      const [convRes, apptRes] = await Promise.allSettled([
        fetch("/api/conversations", { credentials: "include" }),
        fetch("/api/dashboard/agenda", { credentials: "include" }),
      ]);

      const conversations =
        convRes.status === "fulfilled" && convRes.value.ok
          ? (await convRes.value.json()).length ?? 0
          : 0;

      const appointments =
        apptRes.status === "fulfilled" && apptRes.value.ok
          ? (await apptRes.value.json()).length ?? 0
          : 0;

      setCounts({ conversations, appointments });
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30_000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  return counts;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badgeKey: null },
  { href: "/dashboard/crm", label: "Leads", icon: Users, badgeKey: null },
  { href: "/dashboard/conversations", label: "Conversas", icon: MessageCircle, badgeKey: "conversations" as const },
  { href: "/dashboard/calendar", label: "Agenda", icon: Calendar, badgeKey: "appointments" as const },
  { href: "/dashboard/lgpd", label: "Privacidade", icon: Shield, badgeKey: null },
  { href: "/dashboard/settings", label: "Ajustes", icon: Settings, badgeKey: null },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const badges = useBadgeCounts();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] transform border-r border-border/60 bg-surface-raised transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-5">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Bot className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="font-heading text-lg font-bold tracking-tight text-gray-900">
                CliniqAI
              </span>
            </Link>
            <button
              type="button"
              className="lg:hidden rounded-lg p-1 text-gray-400 hover:text-gray-600"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-0.5 px-3 pt-2">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const count = item.badgeKey ? badges[item.badgeKey] : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
                    active
                      ? "bg-primary/8 text-primary"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon
                    className={`h-[18px] w-[18px] flex-shrink-0 ${
                      active ? "text-primary" : "text-gray-400 group-hover:text-gray-600"
                    }`}
                    strokeWidth={active ? 2 : 1.5}
                  />
                  {item.label}
                  {count > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold tabular-nums text-primary">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                  {active && !count && (
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-primary/50" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-border/60 p-3">
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-xs font-bold text-white">
                {session.user.name?.charAt(0)?.toUpperCase() ?? "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {session.user.name}
                </p>
                <p className="truncate text-xs text-gray-400">
                  {session.user.email}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await authClient.signOut();
                  router.push("/login");
                }}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-surface-raised/80 backdrop-blur-xl px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-heading text-sm font-bold text-gray-900">CliniqAI</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
