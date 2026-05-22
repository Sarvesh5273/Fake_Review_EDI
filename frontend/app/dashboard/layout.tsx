"use client";

import React, { useMemo } from "react";
import {
  BarChart3,
  Bell,
  ChevronDown,
  Crown,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Search,
  Store,
  UserRound,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutGrid },
  { label: "Marketplaces", href: "/dashboard/marketplaces", icon: Store },
  { label: "Alerts", href: "/dashboard/alerts", icon: Bell },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const initials = useMemo(() => {
    const source = user?.name || user?.email || "V";
    return source
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      router.push("/");
    }
  };

  return (
    <ProtectedRoute>
      <div className="relative min-h-screen overflow-hidden bg-black text-white">
        <div className="absolute inset-0 z-0">
          <video autoPlay muted loop playsInline aria-hidden="true" className="h-full w-full object-cover opacity-75">
            <source
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bg-hero-0BnFGdr81Ifnj3WbBZoNt1KE4D5DMT.mp4"
              type="video/mp4"
            />
          </video>
          <div className="absolute inset-0 bg-gradient-to-br from-[#101831]/70 via-black/40 to-[#040406]/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" />
          <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-[140px]" />
          <div className="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-cyan-400/15 blur-[160px]" />
        </div>

        <div className="absolute inset-0 z-[1] pointer-events-none opacity-30">
          {[...Array(8)].map((_, i) => (
            <div key={`h-${i}`} className="absolute h-px bg-white/10" style={{ top: `${12.5 * (i + 1)}%`, left: 0, right: 0 }} />
          ))}
          {[...Array(12)].map((_, i) => (
            <div key={`v-${i}`} className="absolute w-px bg-white/10" style={{ left: `${8.33 * (i + 1)}%`, top: 0, bottom: 0 }} />
          ))}
        </div>

        <div className="relative z-10">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-12">
              <div className="flex items-center gap-6">
                <a href="/" className="inline-flex items-center gap-2">
                  <span className="text-2xl font-display tracking-tight">VERTEXSHIELD</span>
                  <span className="font-mono text-xs text-white/40">TM</span>
                </a>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 md:flex">
                  <Search className="h-4 w-4 text-white/50" />
                  <input
                    placeholder="Search alerts, SKUs..."
                    className="w-44 bg-transparent text-sm text-white/80 placeholder:text-white/40 focus:outline-none"
                  />
                </div>
                <Button className="bg-white text-black hover:bg-white/90">
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10">
                      <Avatar className="h-8 w-8 border border-white/10">
                        <AvatarFallback className="bg-white/10 text-white">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block">{user?.name || user?.email}</span>
                      <ChevronDown className="h-4 w-4 text-white/60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 border-white/10 bg-black/90 text-white">
                    <DropdownMenuLabel className="text-white/70">Account</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => router.push("/dashboard/settings")}>
                      <UserRound className="h-4 w-4" />
                      Profile settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem onSelect={handleLogout} variant="destructive">
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="mx-auto grid min-h-screen max-w-[1600px] gap-6 px-6 pb-16 pt-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-12 xl:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="hidden h-fit flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:flex">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border border-white/10">
                  <AvatarFallback className="bg-white/10 text-lg text-white">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-lg font-medium">{user?.name || user?.email}</div>
                  <div className="text-sm text-white/50">Workspace owner</div>
                </div>
              </div>

              <nav className="space-y-2 text-sm text-white/70">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                        isActive
                          ? "border-white/20 bg-white/15 text-white"
                          : "border-white/5 bg-white/[0.03] text-white/70 hover:bg-white/10"
                      }`}
                    >
                      <Icon className="h-4 w-4 text-white/70" />
                      {item.label}
                    </a>
                  );
                })}
              </nav>

              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-white/[0.01] p-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-mono text-white/60">
                  <Crown className="h-4 w-4" />
                  Pro workspace
                </div>
                <p className="text-sm text-white/55">
                  Unlock advanced dispute automation and marketplace-wide monitoring.
                </p>
                <Button className="mt-4 w-full bg-white text-black hover:bg-white/90">
                  Upgrade plan
                </Button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-white/40">
                  <HelpCircle className="h-4 w-4" />
                  Support
                </div>
                <p className="text-sm text-white/55">
                  Need help? Reach your dedicated success team.
                </p>
              </div>
            </aside>

            <section className="space-y-8">{children}</section>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
