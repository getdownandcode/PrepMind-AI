"use client";

import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { StartInterviewResponse, SubmitAnswerResponse, Question } from "@/types/api";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface Turn {
  question: Question;
  answer?: string;
  evaluation?: SubmitAnswerResponse["evaluation"];
  rationale?: string;
}

const SpeechRecognitionAPI = typeof window !== "undefined"
  ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  : null;

export function InterviewSession({ initialInterviewId }: { initialInterviewId: string }) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [aiThinking, setAiThinking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Voice States
  const [mounted, setMounted] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  const speakQuestion = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const startListening = () => {
    if (!recognitionRef.current && SpeechRecognitionAPI) {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-US";
      rec.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        if (result.isFinal) {
          const transcript = result[0].transcript;
          setAnswer((prev) => prev + (prev ? " " : "") + transcript.trim());
        }
      };
      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);
      recognitionRef.current = rec;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Speech recognition already started", e);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Failed to stop speech recognition", e);
      }
    }
  };

  // Speak new questions automatically in Voice Mode
  useEffect(() => {
    if (voiceMode && currentQuestion) {
      speakQuestion(currentQuestion.prompt);
    }
  }, [currentQuestion, voiceMode]);

  // Cleanups on unmount
  useEffect(() => {
    setMounted(true);
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialQuestion() {
      try {
        const cached =
          typeof window !== "undefined"
            ? sessionStorage.getItem(`pm_interview_${initialInterviewId}`)
            : null;
        const data = cached
          ? (JSON.parse(cached) as StartInterviewResponse)
          : await api<StartInterviewResponse>(`/v1/interviews/${initialInterviewId}`);

        if (cancelled) return;
        setCurrentQuestion(data.question);
        setAiThinking(data.rationale);
        window.setTimeout(() => setAiThinking(null), 3000);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }

    loadInitialQuestion();
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
    setError(null);
    setAiThinking("Evaluating your answer...");
    
    // Stop listening during submission
    if (isListening) {
      stopListening();
    }
    
    try {
      const res = await api<SubmitAnswerResponse>(`/v1/interviews/${initialInterviewId}/answers`, {
        method: "POST",
        body: JSON.stringify({ question_id: currentQuestion.id, answer }),
      });
      setTurns((prev) => [
        ...prev,
        { question: currentQuestion, answer, evaluation: res.evaluation, rationale: res.rationale },
      ]);
      setAnswer("");
      if (res.is_complete || !res.next_question) {
        setCurrentQuestion(null);
        window.setTimeout(
          () => router.push(`/interview/${initialInterviewId}/report` as Route),
          600,
        );
      } else {
        setCurrentQuestion(res.next_question);
        setAiThinking(res.rationale);
        window.setTimeout(() => setAiThinking(null), 3000);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onQuit() {
    if (!window.confirm("Are you sure you want to quit this interview? The session will be marked as aborted.")) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api(`/v1/interviews/${initialInterviewId}/quit`, {
        method: "POST",
      });
      router.push("/dashboard" as Route);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 font-outfit">
      <header className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground gap-4 flex-wrap sm:flex-nowrap">
        <span>
          Turn {turns.length + (currentQuestion ? 1 : 0)} &middot; Difficulty:{" "}
          <span className="text-foreground font-bold">{currentQuestion?.difficulty ?? "-"}</span>
          &middot; Topic: <span className="text-foreground font-bold">{currentQuestion?.topic ?? "-"}</span>
        </span>

        {mounted && SpeechRecognitionAPI && (
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              if (voiceMode) {
                stopListening();
                stopSpeaking();
                setVoiceMode(false);
              } else {
                setVoiceMode(true);
                if (currentQuestion) {
                  speakQuestion(currentQuestion.prompt);
                }
                startListening();
              }
            }}
            className={`text-[9px] uppercase font-extrabold tracking-widest flex items-center gap-1.5 rounded-xl h-8 px-3 border transition-all ${
              voiceMode
                ? "bg-primary text-primary-foreground border-primary shadow-sm hover:opacity-90"
                : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border-border"
            }`}
          >
            {voiceMode ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            Voice Mode: {voiceMode ? "ON" : "OFF"}
          </Button>
        )}
      </header>

      {error && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-700 p-4 rounded-xl font-medium">
          {error}
        </Card>
      )}

      {aiThinking && (
        <div className="rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground animate-pulse shadow-sm flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-primary animate-ping" />
          <span className="font-semibold text-foreground">AI:</span>
          <span>{aiThinking}</span>
        </div>
      )}

      <div className="space-y-6">
        {turns.map((t, i) => (
          <div key={i} className="space-y-4">
            <Bubble role="ai" text={t.question.prompt} />
            <Bubble role="user" text={t.answer ?? ""} />
            {t.evaluation && <EvaluationCard ev={t.evaluation} />}
          </div>
        ))}

        {currentQuestion && <Bubble role="ai" text={currentQuestion.prompt} />}
      </div>

      {currentQuestion && (
        <Card className="sticky bottom-6 space-y-3.5 shadow-md border-border/80 bg-card p-5 rounded-2xl">
          {voiceMode && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 border border-border/60 p-3.5 rounded-xl">
              <div className="flex items-center gap-2">
                <span className={`relative flex h-2 w-2`}>
                  {isListening && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isListening ? "bg-red-500" : "bg-muted-foreground/60"}`}></span>
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {isListening ? "Listening to your response..." : "Microphone is off"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={isListening ? stopListening : startListening}
                  className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isListening
                      ? "text-red-600 bg-red-50 border-red-200 hover:bg-red-100 hover:text-red-700"
                      : "text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  {isListening ? "Stop Microphone" : "Start Microphone"}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={isSpeaking ? stopSpeaking : () => speakQuestion(currentQuestion.prompt)}
                  className={`h-8 w-8 p-0 rounded-lg transition-colors ${
                    isSpeaking ? "text-primary bg-primary/5 hover:bg-primary/10" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={isSpeaking ? "Mute question audio" : "Re-read question"}
                >
                  {isSpeaking ? <Volume2 className="h-4 w-4 animate-pulse" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSubmit();
            }}
            placeholder={voiceMode ? "Your spoken answer will appear here... (Or type here manually)" : "Type your answer... (Cmd/Ctrl + Enter to submit)"}
            className="min-h-[100px] w-full resize-none rounded-xl border border-border bg-background p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
          />
          
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              type="button"
              onClick={onQuit}
              disabled={submitting}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 rounded-xl"
            >
              Quit Interview
            </Button>
            <Button onClick={onSubmit} disabled={submitting || !answer.trim()} className="shadow-sm rounded-xl">
              {submitting ? "Submitting..." : "Submit answer"}
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
        className={`max-w-[85%] rounded-2xl px-4.5 py-3 text-sm leading-relaxed shadow-sm ${
          isAi 
            ? "bg-card border border-border text-foreground rounded-tl-sm" 
            : "bg-primary text-primary-foreground rounded-tr-sm"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function EvaluationCard({ ev }: { ev: SubmitAnswerResponse["evaluation"] }) {
  return (
    <div className="space-y-4 border border-border/60 bg-muted/30 p-5 rounded-xl">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Score label="Correctness" value={ev.correctness_score} />
        <Score label="Clarity" value={ev.clarity_score} />
        <Score label="Depth" value={ev.depth_score} />
        <Score label="Confidence" value={ev.confidence_score} />
      </div>
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Feedback</div>
        <p className="text-sm text-foreground leading-relaxed">{ev.feedback}</p>
      </div>
      <details className="text-sm text-muted-foreground group">
        <summary className="cursor-pointer font-semibold select-none hover:text-foreground transition-colors">
          Show ideal answer
        </summary>
        <p className="mt-2 text-foreground/90 bg-card border border-border/50 rounded-lg p-3 leading-relaxed">
          {ev.ideal_answer}
        </p>
      </details>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 text-center shadow-sm">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="text-xl font-bold text-foreground mt-1 tabular-nums">{value}</div>
    </div>
  );
}

