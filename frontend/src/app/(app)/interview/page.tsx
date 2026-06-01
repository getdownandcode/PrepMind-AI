"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function StartInterviewPage() {
  const router = useRouter();
  const [role, setRole] = useState("Backend Engineer");
  const [level, setLevel] = useState<"intern" | "junior" | "mid" | "senior">("mid");
  const [topicFocus, setTopicFocus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onStart() {
    setSubmitting(true);
    try {
      const res = await api<{ interview_id: string }>(`/v1/interviews`, {
        method: "POST",
        body: JSON.stringify({ role, level, topic_focus: topicFocus || null, total_questions: 6 }),
      });
      router.push(`/interview/${res.interview_id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Start a mock interview</h1>

      <Card className="space-y-4">
        <Field label="Target role">
          <Input value={role} onChange={(e) => setRole(e.target.value)} />
        </Field>
        <Field label="Level">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as typeof level)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="intern">Intern</option>
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
          </select>
        </Field>
        <Field label="Topic focus (optional)">
          <Input
            placeholder="e.g. distributed systems"
            value={topicFocus}
            onChange={(e) => setTopicFocus(e.target.value)}
          />
        </Field>
        <Button onClick={onStart} disabled={submitting} className="w-full">
          {submitting ? "Starting…" : "Start interview"}
        </Button>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm">{label}</label>
      {children}
    </div>
  );
}
