"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { StartInterviewResponse } from "@/types/api";

export default function StartInterviewPage() {
  const router = useRouter();
  const [role, setRole] = useState("Backend Engineer");
  const [level, setLevel] = useState<"intern" | "junior" | "mid" | "senior">("mid");
  const [topicFocus, setTopicFocus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onStart() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api<StartInterviewResponse>("/v1/interviews", {
        method: "POST",
        body: JSON.stringify({ role, level, topic_focus: topicFocus || null, total_questions: 6 }),
      });
      sessionStorage.setItem(`pm_interview_${res.interview_id}`, JSON.stringify(res));
      router.push(`/interview/${res.interview_id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Start a mock interview</h1>

      <Card className="space-y-5">
        <Field label="Target role">
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Backend Engineer" />
        </Field>
        <Field label="Level">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as typeof level)}
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            <option value="intern">Intern</option>
            <option value="junior">Junior</option>
            <option value="mid">Mid-level</option>
            <option value="senior">Senior</option>
          </select>
        </Field>
        <Field label="Topic focus (optional)">
          <Input
            placeholder="e.g. distributed systems, databases"
            value={topicFocus}
            onChange={(e) => setTopicFocus(e.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
        <Button onClick={onStart} disabled={submitting} className="w-full shadow-sm">
          {submitting ? "Starting..." : "Start interview"}
        </Button>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground/80">{label}</label>
      {children}
    </div>
  );
}
