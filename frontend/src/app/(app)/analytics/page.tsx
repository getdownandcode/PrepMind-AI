"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  Award,
  AlertTriangle,
  Sparkles,
  PlayCircle,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface TopicScore {
  topic: string;
  score: number;
}

interface HistoryItem {
  date: string;
  score: number;
  topic: string;
}

interface AnalyticsSummary {
  average_score: number;
  best_topic: string;
  weakest_topic: string;
  readiness_score: number;
  total_interviews: number;
  topic_scores: TopicScore[];
  history: HistoryItem[];
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function loadAnalytics() {
      try {
        const data = await api<AnalyticsSummary>("/v1/interviews/analytics/summary");
        setAnalytics(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
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
        <div className="h-10 w-1/4 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="h-28 bg-muted rounded-2xl" />
          <div className="h-28 bg-muted rounded-2xl" />
          <div className="h-28 bg-muted rounded-2xl" />
        </div>
        <div className="h-80 bg-muted rounded-2xl" />
      </div>
    );
  }

  const hasHistory = analytics && analytics.history.length > 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-5xl space-y-8 p-6"
    >
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Detailed metric aggregations derived from your mock evaluation performance.</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-700 p-4 rounded-xl flex items-center gap-2 font-medium">
          <AlertTriangle className="h-5 w-5" />
          {error}
        </Card>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Best Topic"
          value={analytics?.best_topic || "None yet"}
          icon={Award}
          description="Highest average correctness"
          variants={cardVariants}
        />
        <MetricCard
          label="Average Score"
          value={analytics ? `${analytics.average_score}%` : "0%"}
          icon={TrendingUp}
          description="Overall response correctness"
          variants={cardVariants}
        />
        <MetricCard
          label="Weakest Topic"
          value={analytics?.weakest_topic || "None yet"}
          icon={AlertTriangle}
          description="Topic with lowest score"
          variants={cardVariants}
        />
      </div>

      {/* Recharts Graphs */}
      {hasHistory && analytics ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Progression Area Chart */}
          <motion.div variants={cardVariants} className="lg:col-span-2">
            <Card className="p-6 rounded-2xl">
              <h2 className="text-lg font-bold text-foreground mb-1">Score progression</h2>
              <p className="text-xs text-muted-foreground mb-6">Correctness scores of your last 10 evaluation answers.</p>
              
              <div className="h-72 w-full">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.history} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          borderColor: "hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: "12px"
                        }} 
                      />
                      <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" name="Score" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Topic Bar Chart */}
          <motion.div variants={cardVariants}>
            <Card className="p-6 rounded-2xl h-full flex flex-col">
              <h2 className="text-lg font-bold text-foreground mb-1">Topic proficiency</h2>
              <p className="text-xs text-muted-foreground mb-6">Relative accuracy scores across topics.</p>
              
              <div className="h-72 w-full flex-1">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.topic_scores} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                      <YAxis dataKey="topic" type="category" stroke="hsl(var(--foreground))" fontSize={11} tickLine={false} width={80} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          borderColor: "hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: "12px"
                        }}
                      />
                      <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} name="Accuracy" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      ) : (
        <motion.div variants={cardVariants}>
          <Card className="p-12 text-center rounded-2xl border-dashed border-border flex flex-col items-center justify-center max-w-2xl mx-auto">
            <div className="h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground/60 flex mb-6 shadow-sm">
              <HelpCircle className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">No evaluation history</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
              Once you start and complete turns of mock interviews, Recharts charts showing your topic proficiency and score trends will render here dynamically.
            </p>
            <Link href="/interview" className="mt-8">
              <Button className="rounded-xl shadow-md flex items-center gap-1.5 font-bold">
                <PlayCircle className="h-4.5 w-4.5" />
                Start your first interview
              </Button>
            </Link>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

function MetricCard({
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
          <Icon className="h-10 w-10" />
        </div>
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-extrabold text-foreground tracking-tight">{value}</div>
        <div className="mt-2 text-xs text-muted-foreground/95 font-semibold">{description}</div>
      </Card>
    </motion.div>
  );
}
