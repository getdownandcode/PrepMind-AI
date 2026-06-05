"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileText,
  Trash2,
  Play,
  Briefcase,
  GraduationCap,
  FolderGit,
  AlertTriangle,
  Loader2,
  Sparkles,
  Compass,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";

interface SkillItem {
  id: string;
  name: string;
  category: string | null;
  proficiency_estimate: number | null;
}

interface ParsedResume {
  summary: string | null;
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
    field_of_study: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
  }>;
}

interface Resume {
  id: string;
  file_name: string;
  file_size_bytes: number;
  file_url: string;
  status: string;
  created_at: string;
  parsed?: ParsedResume | null;
  skills: SkillItem[];
}

export default function ResumePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const loadResumes = async () => {
    try {
      setLoading(true);
      const data = await api<Resume[]>("/v1/resumes");
      setResumes(data);
      if (data.length > 0) {
        setSelectedResume(data[0]);
      } else {
        setSelectedResume(null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported currently.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB upload limit.");
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgressText("Uploading resume file...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Transition progress text to simulate parser stages
      const progressTimer1 = setTimeout(() => {
        setUploadProgressText("AI is reading resume text...");
      }, 2000);
      const progressTimer2 = setTimeout(() => {
        setUploadProgressText("Extracting skills and career history...");
      }, 5500);

      const newResume = await api<Resume>("/v1/resumes/upload", {
        method: "POST",
        body: formData,
      });

      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      setResumes((prev) => [newResume, ...prev]);
      setSelectedResume(newResume);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      setUploadProgressText("");
    }
  };

  const handleDeleteResume = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this resume?")) return;
    try {
      await api(`/v1/resumes/${id}`, { method: "DELETE" });
      const updated = resumes.filter((r) => r.id !== id);
      setResumes(updated);
      if (selectedResume?.id === id) {
        setSelectedResume(updated.length > 0 ? updated[0] : null);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleStartInterview = async (resumeId: string) => {
    if (!selectedResume) return;
    try {
      setLoading(true);
      const res = await api<{ interview_id: string }>("/v1/interviews", {
        method: "POST",
        body: JSON.stringify({
          role: selectedResume.parsed?.experience[0]?.role || "Software Engineer",
          level: "mid", // Default fallback level
          resume_id: resumeId,
        }),
      });
      router.push(`/interview/${res.interview_id}` as Route);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  };

  if (loading && resumes.length === 0) {
    return (
      <div className="mx-auto max-w-6xl p-6 space-y-8 animate-pulse">
        <div className="h-12 w-1/3 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 h-96 bg-muted rounded-2xl" />
          <div className="md:col-span-2 h-96 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-6xl space-y-8 p-6 font-outfit"
    >
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          Resume Parser
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your resume PDF to extract skills and automatically calibrate mock interview topics.
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-700 p-4 rounded-xl flex items-center gap-2 font-medium">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Upload box and Resumes List */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-primary" />
            Upload PDF Resume
          </h2>

          <AnimatePresence mode="wait">
            {uploading ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="p-8 border border-border/80 bg-card flex flex-col items-center justify-center text-center space-y-4 rounded-2xl h-48 shadow-sm">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">{uploadProgressText}</p>
                    <p className="text-xs text-muted-foreground animate-pulse">This can take up to 10 seconds...</p>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center h-48 ${
                    isDragOver
                      ? "border-primary bg-primary/5 scale-[1.02]"
                      : "border-border/80 hover:border-primary hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf"
                    className="hidden"
                  />
                  <UploadCloud className="h-10 w-10 text-muted-foreground/60 mb-3 group-hover:text-primary transition-colors" />
                  <p className="text-sm font-bold text-foreground">Drag & drop your resume PDF here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse from files (Max 5MB)</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History list */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">My Uploaded Resumes</h3>
            {resumes.length === 0 ? (
              <div className="text-center p-6 border rounded-xl border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
                No resumes uploaded yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {resumes.map((r) => {
                  const isSelected = selectedResume?.id === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedResume(r)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/10 shadow-sm"
                          : "border-border bg-card hover:bg-muted/30 hover:border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className={`h-5 w-5 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{r.file_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {(r.file_size_bytes / 1024).toFixed(0)} KB &bull; {new Date(r.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleDeleteResume(r.id, e)}
                        className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Display Selected parsed Profile details */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Parsed Profile Details
            </span>
            {selectedResume && (
              <Button
                onClick={() => handleStartInterview(selectedResume.id)}
                size="sm"
                className="shadow-sm rounded-xl font-bold flex items-center gap-1.5"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Tailor Mock Interview
              </Button>
            )}
          </h2>

          {selectedResume ? (
            <div className="space-y-6">
              {/* Summary Card */}
              <Card className="p-6 rounded-2xl border border-border bg-card space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  Professional Summary
                </h3>
                <p className="text-sm text-foreground leading-relaxed">
                  {selectedResume.parsed?.summary || "No parsed summary available."}
                </p>
              </Card>

              {/* Skills Tag Cloud */}
              <Card className="p-6 rounded-2xl border border-border bg-card space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Extracted Technical Skills
                </h3>
                {selectedResume.skills.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No technical skills detected.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedResume.skills.map((skill) => (
                      <div
                        key={skill.id}
                        className="flex items-center gap-1.5 bg-muted/50 border border-border/80 px-3 py-1.5 rounded-full text-xs font-semibold hover:border-primary/40 transition-colors"
                      >
                        <span className="text-foreground">{skill.name}</span>
                        {skill.proficiency_estimate && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                            {skill.proficiency_estimate}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Career Timeline */}
              {selectedResume.parsed?.experience && selectedResume.parsed.experience.length > 0 && (
                <Card className="p-6 sm:p-8 rounded-2xl border border-border bg-card space-y-5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Briefcase className="h-4.5 w-4.5" />
                    Work Experience
                  </h3>

                  <div className="relative border-l border-border pl-6 ml-3 space-y-8 py-2">
                    {selectedResume.parsed.experience.map((exp, index) => (
                      <motion.div key={index} variants={itemVariants} className="relative">
                        {/* Bullet circle */}
                        <span className="absolute -left-[30px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-background" />

                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <h4 className="text-sm font-bold text-foreground">
                              {exp.role} &bull; <span className="text-muted-foreground font-semibold">{exp.company}</span>
                            </h4>
                            <span className="text-[10px] font-bold text-primary font-mono">{exp.duration}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                            {exp.description}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Projects Grid */}
              {selectedResume.parsed?.projects && selectedResume.parsed.projects.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 pl-1">
                    <FolderGit className="h-4 w-4" /> Projects
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedResume.parsed.projects.map((proj, index) => (
                      <Card key={index} className="p-5 rounded-xl border border-border bg-card flex flex-col justify-between space-y-3">
                        <div className="space-y-2">
                          <h4 className="font-bold text-sm text-foreground">{proj.name}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">{proj.description}</p>
                        </div>
                        {proj.technologies && proj.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {proj.technologies.map((t, i) => (
                              <span key={i} className="text-[9px] font-bold tracking-wider uppercase bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Education List */}
              {selectedResume.parsed?.education && selectedResume.parsed.education.length > 0 && (
                <Card className="p-6 rounded-2xl border border-border bg-card space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <GraduationCap className="h-4.5 w-4.5" /> Education
                  </h3>
                  <div className="space-y-4">
                    {selectedResume.parsed.education.map((edu, index) => (
                      <div key={index} className="flex justify-between items-start text-xs border-b border-border/50 last:border-0 pb-3 last:pb-0">
                        <div>
                          <h4 className="font-bold text-foreground">{edu.school}</h4>
                          <p className="text-muted-foreground mt-0.5">{edu.degree} in {edu.field_of_study}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <Card className="p-12 text-center rounded-2xl border-dashed border-border flex flex-col items-center justify-center max-w-xl mx-auto mt-6">
              <Compass className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-lg font-bold text-foreground">Profile is empty</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Upload your engineering resume PDF in the upload section on the left to parse and preview your parsed credentials here.
              </p>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
