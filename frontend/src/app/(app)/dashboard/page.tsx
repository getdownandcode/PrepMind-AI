"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store/auth-store";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back{user?.full_name ? `, ${user.full_name}` : ""}
        </h1>
        <Button asChild={false} onClick={() => (window.location.href = "/interview")}>
          Start interview
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Readiness" value={`${user?.readiness_score ?? 0} / 100`} />
        <Stat label="Streak" value="5 days" />
        <Stat label="Avg score" value="71.4" />
      </div>

      <Card>
        <h2 className="text-lg font-medium">Top weaknesses</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          <li>• System Design (42)</li>
          <li>• Concurrency (58)</li>
        </ul>
      </Card>

      <Card>
        <h2 className="text-lg font-medium">Recent sessions</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          <li>— Backend mid · 71 · 2d ago</li>
          <li>— Backend mid · 64 · 5d ago</li>
        </ul>
      </Card>

      <div className="flex gap-3">
        <Link className="text-sm text-primary hover:underline" href="/analytics">
          View analytics →
        </Link>
        <Link className="text-sm text-primary hover:underline" href="/roadmap">
          View roadmap →
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="text-center">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </Card>
  );
}
