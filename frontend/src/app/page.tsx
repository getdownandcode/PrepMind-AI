"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, CheckCircle2, Trophy, Compass, ShieldAlert } from "lucide-react";

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden font-sans">
      {/* Premium ambient light spots */}
      <div className="absolute top-[-10%] left-[-10%] -z-10 h-[50vw] w-[50vw] rounded-full bg-primary/5 blur-3xl animate-float" />
      <div className="absolute bottom-[-10%] right-[-10%] -z-10 h-[50vw] w-[50vw] rounded-full bg-primary/5 blur-3xl animate-float" style={{ animationDelay: "3s" }} />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            PrepMind <span className="text-muted-foreground font-medium">AI</span>
          </span>
        </Link>
        <nav className="flex items-center gap-5">
          <Link className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors" href="/login">
            Log in
          </Link>
          <Link
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            href="/signup"
          >
            Get started
          </Link>
        </nav>
      </header>

      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-4xl px-6 pb-24 pt-16 text-center sm:pt-24"
      >
        <motion.div
          variants={itemVariants}
          className="mx-auto mb-6 w-fit rounded-full border border-primary/10 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary flex items-center gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Adaptive mock interviews for engineers
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl md:text-7xl leading-[1.1]"
        >
          Adaptive AI interviews
          <br />
          that actually get <span className="text-primary underline decoration-primary/20 decoration-wavy decoration-2 underline-offset-8">harder</span>.
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="mx-auto mt-8 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed"
        >
          Upload your resume, get a personalized 30-day prep plan, and practice with an AI that remembers your weaknesses, drills them, and scales with your mastery.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            className="w-full sm:w-auto rounded-xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground hover:bg-primary/95 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
            href="/signup"
          >
            Start free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link className="text-base font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 hover:gap-1.5" href="#how">
            How it works &rarr;
          </Link>
        </motion.div>
      </motion.section>

      <section id="how" className="mx-auto max-w-5xl px-6 py-20 border-t border-border/50">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Systematic preparation</h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">Three simple steps to bridge the gap between your resume and a senior engineering offer.</p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            { n: 1, t: "Upload resume", d: "We automatically parse your experience and identify potential technical gaps.", icon: CheckCircle2 },
            { n: 2, t: "Personalized Roadmap", d: "Get a structured, week-by-week dynamic timeline custom-tailored to your role.", icon: Compass },
            { n: 3, t: "Adaptive mock interviews", d: "Practice in-depth with an AI interviewer that dynamically increases difficulty as you excel.", icon: Trophy },
          ].map((s, idx) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="page-panel rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground mb-6 shadow-sm">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Step {s.n}
                </div>
                <h3 className="mt-3 text-xl font-bold text-foreground">{s.t}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-border/50 py-10 text-center text-xs font-semibold text-muted-foreground bg-muted/30">
        &copy; {new Date().getFullYear()} PrepMind AI &middot; Designed and built for engineering success.
      </footer>
    </div>
  );
}
