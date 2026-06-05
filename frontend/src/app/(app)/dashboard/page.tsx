"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store/auth-store";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  Zap,
  Activity,
  AlertCircle,
  Clock,
  ChevronRight,
  PlusCircle,
} from "lucide-react";

interface InterviewSummary {
  id: string;
  role: string;
  level: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  total_questions: number;
  turns_completed: number;
  average_score: number;
}

interface AnalyticsSummary {
  average_score: number;
  best_topic: string;
  weakest_topic: string;
  readiness_score: number;
  total_interviews: number;
  topic_scores: { topic: string; score: number }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [intData, anData] = await Promise.all([
          api<InterviewSummary[]>("/v1/interviews"),
          api<AnalyticsSummary>("/v1/interviews/analytics/summary"),
        ]);
        setInterviews(intData);
        setAnalytics(anData);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-6 space-y-8 animate-pulse">
        <div className="h-10 w-1/3 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-32 bg-muted rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="h-64 bg-muted rounded-2xl" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  // Format date helper
  const formatDateAgo = (isoString: string | null) => {
    if (!isoString) return "";
    const diffTime = Math.abs(new Date().getTime() - new Date(isoString).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    return `${diffDays}d ago`;
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-5xl space-y-8 p-6"
    >
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Here is your technical mock prep status.</p>
        </div>
        <Button onClick={() => router.push("/interview")} className="shadow-md rounded-xl py-5 px-6 font-semibold flex items-center gap-1.5 self-start sm:self-auto hover:-translate-y-0.5 transition-transform">
          <PlusCircle className="h-4.5 w-4.5" />
          Start interview
        </Button>
      </header>

      {error && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-700 p-4 rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle className="h-5 w-5" />
          {error}
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat
          label="Readiness"
          value={`${analytics?.readiness_score ?? user?.readiness_score ?? 0} / 100`}
          icon={TrendingUp}
          description="Calculated skill coverage"
          variants={cardVariants}
        />
        <Stat
          label="Interviews Run"
          value={String(analytics?.total_interviews ?? interviews.length)}
          icon={Activity}
          description="Total sessions generated"
          variants={cardVariants}
        />
        <Stat
          label="Avg Score"
          value={analytics ? `${analytics.average_score}%` : "0%"}
          icon={Award}
          description="Aggregated evaluation accuracy"
          variants={cardVariants}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Top Weaknesses */}
        <motion.div variants={cardVariants}>
          <Card className="p-6 rounded-2xl h-full flex flex-col">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Active weaknesses
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Focus topics dynamically flagged during mock evaluations.</p>
            
            <div className="mt-6 divide-y divide-border flex-1">
              {analytics && analytics.topic_scores.filter(t => t.score < 75).length > 0 ? (
                analytics.topic_scores
                  .filter(t => t.score < 75)
                  .slice(0, 4)
                  .map((t) => (
                    <div key={t.topic} className="flex items-center justify-between py-3.5">
                      <span className="text-sm font-semibold text-foreground">{t.topic}</span>
                      <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-100 px-3 py-1 rounded-lg">
                        {t.score}% accuracy
                      </span>
                    </div>
                  ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                  <Zap className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-semibold text-muted-foreground">No weak spots flagged yet!</p>
                  <p className="text-xs text-muted-foreground/80 mt-1 max-w-[240px]">Complete mock interviews to build your profile.</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Recent Sessions */}
        <motion.div variants={cardVariants}>
          <Card className="p-6 rounded-2xl h-full flex flex-col">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Recent sessions
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Review evaluations and ideal answers for past mock turns.</p>
            
            <div className="mt-6 divide-y divide-border flex-1">
              {interviews.length > 0 ? (
                interviews.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3.5 hover:bg-muted/10 px-2 -mx-2 rounded-xl transition-colors">
                    <div>
                      <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        {item.role}
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-1.5 py-0.5 bg-muted rounded">
                          {item.level}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDateAgo(item.started_at)} &middot; {item.turns_completed} answers
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold text-foreground bg-muted/70 px-2.5 py-1.5 rounded-lg font-mono">
                        {item.average_score}%
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                  <Activity className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-semibold text-muted-foreground">No sessions run yet.</p>
                  <p className="text-xs text-muted-foreground/80 mt-1 max-w-[240px]">Start an adaptive mock to receive structural feedback.</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={cardVariants} className="flex items-center gap-6 pt-4 border-t border-border/50">
        <Link className="text-sm font-bold text-primary hover:underline flex items-center gap-1 group" href={"/analytics" as Route}>
          View detailed analytics 
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link className="text-sm font-bold text-primary hover:underline flex items-center gap-1 group" href={"/roadmap" as Route}>
          View custom study roadmap 
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </motion.div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  description,
  variants,
}: {
  label: string;
  value: string;
  icon: any;
  description: string;
  variants: any;
}) {
  return (
    <motion.div variants={variants}>
      <Card className="p-6 rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute right-4 top-4 text-muted-foreground/15 group-hover:scale-110 transition-transform">
          <Icon className="h-12 w-12" />
        </div>
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-3 text-3xl font-extrabold text-foreground tracking-tight">{value}</div>
        <div className="mt-2 text-xs text-muted-foreground/95 font-semibold">{description}</div>
      </Card>
    </motion.div>
  );
}
