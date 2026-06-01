"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth-store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, hydrate } = useAuth();

  useEffect(() => {
    if (!user) hydrate();
  }, [user, hydrate]);

  useEffect(() => {
    if (useAuth.getState().user === null && !useAuth.getState().loading) {
      // after hydration, if still no user, redirect
      const unsub = useAuth.subscribe((s) => {
        if (!s.loading && !s.user) router.replace("/login");
      });
      return () => unsub();
    }
  }, [router]);

  return <main className="min-h-screen">{children}</main>;
}
