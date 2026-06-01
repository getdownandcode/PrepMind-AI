"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { StartInterviewResponse, SubmitAnswerResponse, Question } from "@/types/api";

interface Turn {
  question: Question;
  answer?: string;
  evaluation?: SubmitAnswerResponse["evaluation"];
  rationale?: string;
}

export function InterviewSession({ initialInterviewId }: { initialInterviewId: string }) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [aiThinking, setAiThinking] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await api<StartInterviewResponse>(`/v1/interviews/${initialInterviewId}`);
      if (cancelled) return;
      setCurrentQuestion(data.question);
      setAiThinking(data.rationale);
      setTimeout(() => setAiThinking(null), 3000);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialInterviewId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, currentQuestion]);

  async function onSubmit() {
    if (!currentQuestion || !answer.trim()) return;
    setSubmitting(true);
    setAiThinking("Evaluating your answer…");
    try {
      const res = await api<SubmitAnswerResponse>(
        `/v1/interviews/${initialInterviewId}/answers`,
        {
          method: "POST",
          body: JSON.stringify({ question_id: currentQuestion.id, answer }),
        },
      );
      setTurns((prev) => [
        ...prev,
        { question: currentQuestion, answer, evaluation: res.evaluation, rationale: res.rationale },
      ]);
      setAnswer("");
      if (res.is_complete || !res.next_question) {
        setCurrentQuestion(null);
        setTimeout(() => router.push(`/interview/${initialInterviewId}/report`), 600);
      } else {
        setCurrentQuestion(res.next_question);
        setAiThinking(res.rationale);
        setTimeout(() => setAiThinking(null), 3000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Turn {turns.length + (currentQuestion ? 1 : 0)} · Difficulty:{" "}
          <span className="text-foreground">{currentQuestion?.difficulty ?? "—"}</span>
        </span>
        <span>Topic: {currentQuestion?.topic ?? "—"}</span>
      </header>

      {aiThinking && (
        <div className="rounded-lg border border-dashed bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <span className="mr-2">🧠</span>
          {aiThinking}
        </div>
      )}

      <div className="space-y-4">
        {turns.map((t, i) => (
          <div key={i} className="space-y-2">
            <Bubble role="ai" text={t.question.prompt} />
            <Bubble role="user" text={t.answer ?? ""} />
            {t.evaluation && <EvaluationCard ev={t.evaluation} />}
          </div>
        ))}

        {currentQuestion && <Bubble role="ai" text={currentQuestion.prompt} />}
      </div>

      {currentQuestion && (
        <Card className="sticky bottom-4 space-y-3">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSubmit();
            }}
            placeholder="Type your answer…  (⌘/Ctrl + Enter to submit)"
            className="min-h-[120px] w-full resize-y rounded-md border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex justify-end">
            <Button onClick={onSubmit} disabled={submitting || !answer.trim()}>
              {submitting ? "Submitting…" : "Submit answer"}
            </Button>
          </div>
        </Card>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function Bubble({ role, text }: { role: "ai" | "user"; text: string }) {
  const isAi = role === "ai";
  return (
    <div className={`flex ${isAi ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isAi ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function EvaluationCard({ ev }: { ev: SubmitAnswerResponse["evaluation"] }) {
  return (
    <Card className="space-y-3 border-primary/30 bg-primary/5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Score label="Correctness" value={ev.correctness_score} />
        <Score label="Clarity" value={ev.clarity_score} />
        <Score label="Depth" value={ev.depth_score} />
        <Score label="Confidence" value={ev.confidence_score} />
      </div>
      <p className="text-sm">{ev.feedback}</p>
      <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer">Show ideal answer</summary>
        <p className="mt-2 text-foreground/90">{ev.ideal_answer}</p>
      </details>
    </Card>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background/50 p-2 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
