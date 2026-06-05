"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store/auth-store";
import { LayoutDashboard, MessageSquareCode, BarChart3, Compass, LogOut, Sparkles, FileText } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/interview", label: "Interview", icon: MessageSquareCode },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/roadmap", label: "Roadmap", icon: Compass },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrate, logout } = useAuth();

  useEffect(() => {
    if (!user) hydrate();
  }, [user, hydrate]);

  useEffect(() => {
    if (useAuth.getState().user === null && !useAuth.getState().loading) {
      const unsub = useAuth.subscribe((s) => {
        if (!s.loading && !s.user) router.replace("/login");
      });
      return () => unsub();
    }
  }, [router]);

  return (
    <div className="app-shell flex flex-col min-h-screen">
      <header className="app-header border-b border-border/50 sticky top-0 z-30 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              PrepMind <span className="text-muted-foreground font-medium">AI</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1.5 rounded-xl hover:bg-muted"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile navigation bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-background/90 backdrop-blur-lg flex justify-around py-3 px-4 shadow-lg">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 text-xs font-bold transition-all ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 pb-20 md:pb-6">{children}</main>
    </div>
  );
}
