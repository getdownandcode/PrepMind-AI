"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  CheckCircle,
  Circle,
  AlertTriangle,
  PlayCircle,
  Map,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  Loader2,
  Sparkles,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface RoadmapStep {
  title: string;
  completed: boolean;
}

interface Roadmap {
  id?: string;
  title: string;
  role: string;
  level: string;
  steps: RoadmapStep[];
  is_active: boolean;
  created_at?: string;
}

const roles = [
  { id: "backend", label: "Backend" },
  { id: "frontend", label: "Frontend" },
  { id: "fullstack", label: "Fullstack" },
  { id: "mobile", label: "Mobile" },
];

const levels = [
  { id: "intern", label: "Intern" },
  { id: "junior", label: "Junior" },
  { id: "mid", label: "Mid Level" },
  { id: "senior", label: "Senior" },
];

export default function RoadmapPage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [activeRoadmap, setActiveRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form selections
  const [selectedRole, setSelectedRole] = useState("backend");
  const [selectedLevel, setSelectedLevel] = useState("mid");

  const loadData = async () => {
    try {
      setLoading(true);
      const [allRoadmaps, activeRes] = await Promise.all([
        api<Roadmap[]>("/v1/interviews/roadmaps"),
        api<Roadmap>("/v1/interviews/roadmap/custom"),
      ]);
      setRoadmaps(allRoadmaps);
      setActiveRoadmap(activeRes);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStep = async (stepIdx: number) => {
    if (!activeRoadmap) return;
    
    // Toggle locally if it's the default/fallback template without ID
    if (!activeRoadmap.id) {
      const updatedSteps = activeRoadmap.steps.map((step, idx) =>
        idx === stepIdx ? { ...step, completed: !step.completed } : step
      );
      setActiveRoadmap({ ...activeRoadmap, steps: updatedSteps });
      return;
    }

    try {
      const updated = await api<Roadmap>(`/v1/interviews/roadmaps/${activeRoadmap.id}/toggle-step`, {
        method: "PUT",
        body: JSON.stringify({ step_index: stepIdx }),
      });
      setActiveRoadmap(updated);
      setRoadmaps((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleCreateRoadmap = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGenerating(true);
    setError(null);
    try {
      const newRoadmap = await api<Roadmap>("/v1/interviews/roadmaps", {
        method: "POST",
        body: JSON.stringify({
          role: selectedRole,
          level: selectedLevel,
        }),
      });
      setActiveRoadmap(newRoadmap);
      const allRoadmaps = await api<Roadmap[]>("/v1/interviews/roadmaps");
      setRoadmaps(allRoadmaps);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleActivate = async (id: string) => {
    setActionLoading(`activate-${id}`);
    setError(null);
    try {
      const updated = await api<Roadmap>(`/v1/interviews/roadmaps/${id}/activate`, {
        method: "PUT",
      });
      setActiveRoadmap(updated);
      const allRoadmaps = await api<Roadmap[]>("/v1/interviews/roadmaps");
      setRoadmaps(allRoadmaps);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegenerate = async (roadmap: Roadmap) => {
    if (!roadmap.id) return;
    setActionLoading(`regenerate-${roadmap.id}`);
    setError(null);
    try {
      const newRoadmap = await api<Roadmap>("/v1/interviews/roadmaps", {
        method: "POST",
        body: JSON.stringify({
          role: roadmap.role,
          level: roadmap.level,
          redo_id: roadmap.id,
        }),
      });
      setActiveRoadmap(newRoadmap);
      const allRoadmaps = await api<Roadmap[]>("/v1/interviews/roadmaps");
      setRoadmaps(allRoadmaps);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this roadmap?")) return;
    setActionLoading(`delete-${id}`);
    setError(null);
    try {
      await api(`/v1/interviews/roadmaps/${id}`, {
        method: "DELETE",
      });
      const allRoadmaps = await api<Roadmap[]>("/v1/interviews/roadmaps");
      setRoadmaps(allRoadmaps);
      
      // If deleted was active, fetch current active
      if (activeRoadmap?.id === id) {
        const activeRes = await api<Roadmap>("/v1/interviews/roadmap/custom");
        setActiveRoadmap(activeRes);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-6 space-y-8 animate-pulse">
        <div className="h-12 w-1/3 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 h-96 bg-muted rounded-2xl" />
          <div className="md:col-span-1 h-96 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  const activeCompletedCount = activeRoadmap?.steps.filter((s) => s.completed).length ?? 0;
  const activeTotalCount = activeRoadmap?.steps.length ?? 0;
  const activeProgressPercent = activeTotalCount > 0 ? (activeCompletedCount / activeTotalCount) * 100 : 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-6xl space-y-10 p-6"
    >
      {/* Title Section */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl flex items-center gap-2 font-outfit">
          <Map className="h-8 w-8 text-primary" />
          Study Roadmaps
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tailor customized step-by-step preparation guides using Gemini or follow templates to target specific roles.
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-700 p-4 rounded-xl flex items-center gap-2 font-medium">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Active Roadmap display */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Active Roadmap
          </h2>

          {activeRoadmap ? (
            <Card className="p-6 sm:p-8 rounded-2xl shadow-sm border border-border bg-card space-y-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <h3 className="text-xl font-bold text-foreground">{activeRoadmap.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {activeRoadmap.role}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-secondary/10 text-secondary-foreground border border-border">
                      {activeRoadmap.level}
                    </span>
                  </div>
                </div>

                {!activeRoadmap.id && (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200/50 rounded-lg p-2.5 mb-4 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    This is a default template. Generate a customized roadmap below to track and save progress!
                  </div>
                )}

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground font-semibold">
                    <span>Progress</span>
                    <span>
                      {activeCompletedCount} of {activeTotalCount} steps ({Math.round(activeProgressPercent)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${activeProgressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Step Timeline list */}
              <div className="relative border-l-2 border-border pl-6 ml-3 space-y-8 py-2">
                {activeRoadmap.steps.map((step, index) => {
                  const isCompleted = step.completed;
                  return (
                    <motion.div
                      key={index}
                      variants={itemVariants}
                      className="relative group cursor-pointer"
                      onClick={() => handleToggleStep(index)}
                    >
                      {/* Timeline Badge */}
                      <span
                        className={`absolute -left-[35px] top-0.5 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-all duration-300 ${
                          isCompleted
                            ? "bg-primary border-primary text-primary-foreground scale-105"
                            : "bg-card border-border text-foreground hover:border-foreground"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <span className="text-[10px] font-extrabold font-mono">{index + 1}</span>
                        )}
                      </span>

                      {/* Step Card Content */}
                      <div
                        className={`p-4 rounded-xl border transition-all duration-200 ${
                          isCompleted
                            ? "bg-muted/30 border-border/50 opacity-60"
                            : "bg-card border-border/80 hover:shadow-md hover:border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
                              Phase {index + 1}
                            </div>
                            <p
                              className={`text-sm font-semibold mt-1 leading-relaxed ${
                                isCompleted ? "line-through text-muted-foreground font-normal" : "text-foreground"
                              }`}
                            >
                              {step.title}
                            </p>
                          </div>
                          <div className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors self-center">
                            {isCompleted ? (
                              <CheckCircle className="h-4.5 w-4.5 text-primary" />
                            ) : (
                              <Circle className="h-4.5 w-4.5" />
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center rounded-2xl border-dashed border-border flex flex-col items-center justify-center">
              <Compass className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-lg font-bold text-foreground">No active roadmap</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Create a customized prep roadmap using the options on the right.
              </p>
            </Card>
          )}
        </div>

        {/* Right Column: Creation form */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Custom Roadmap
          </h2>

          <Card className="p-6 rounded-2xl border border-border bg-card space-y-6 shadow-sm">
            <form onSubmit={handleCreateRoadmap} className="space-y-5">
              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Target Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRole(r.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 text-center ${
                        selectedRole === r.id
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background border-border text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Level Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Experience Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {levels.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setSelectedLevel(l.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 text-center ${
                        selectedLevel === l.id
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background border-border text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={generating}
                className="w-full shadow-sm rounded-xl font-bold flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating with AI...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Generate AI Roadmap
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Bottom Section: Roadmap Deck of Cards */}
      <div className="space-y-4 pt-6 border-t border-border">
        <h2 className="text-lg font-bold text-foreground">My Roadmap Deck</h2>
        
        {roadmaps.length === 0 ? (
          <div className="text-center p-8 rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground text-sm">
            No custom roadmaps generated yet. Generate your first one above!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {roadmaps.map((r) => {
                if (!r.id) return null;
                const completed = r.steps.filter((s) => s.completed).length;
                const total = r.steps.length;
                const progress = total > 0 ? (completed / total) * 100 : 0;
                const isCurrentActive = activeRoadmap?.id === r.id;

                return (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card
                      className={`p-5 rounded-xl border transition-all duration-200 flex flex-col justify-between h-full bg-card ${
                        isCurrentActive
                          ? "border-primary/50 shadow-md ring-1 ring-primary/20"
                          : "border-border/80 hover:shadow-md hover:border-border"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-foreground line-clamp-2">{r.title}</h4>
                          {isCurrentActive && (
                            <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <Check className="h-2.5 w-2.5" />
                              Active
                            </span>
                          )}
                        </div>

                        <div className="flex gap-1.5">
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {r.role}
                          </span>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {r.level}
                          </span>
                        </div>

                        {/* Tiny progress stats */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                            <span>Progress</span>
                            <span>{completed}/{total} steps</span>
                          </div>
                          <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/60">
                        {isCurrentActive ? (
                          <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Check className="h-3 w-3 text-emerald-500" /> Active Card
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleActivate(r.id!)}
                            disabled={actionLoading !== null}
                            className="text-xs px-2.5 h-7 rounded-lg text-primary hover:text-primary hover:bg-primary/5 font-semibold"
                          >
                            {actionLoading === `activate-${r.id}` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Activate"
                            )}
                          </Button>
                        )}

                        <div className="ml-auto flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRegenerate(r)}
                            disabled={actionLoading !== null}
                            title="Regenerate Steps"
                            className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                          >
                            {actionLoading === `regenerate-${r.id}` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(r.id!)}
                            disabled={actionLoading !== null}
                            title="Delete"
                            className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                          >
                            {actionLoading === `delete-${r.id}` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

