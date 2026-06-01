# 07 — UI / UX Pages

Design language: **modern AI SaaS, dark-mode-first, minimal, premium**. shadcn/ui primitives with a custom palette (indigo → fuchsia gradient accent, neutral zinc base). Motion via Framer Motion. Charts via Recharts. Loading states with skeletons. Streaming responses with type-on animation.

---

## 1. Page Inventory

| # | Route | Purpose | Auth |
| - | ----- | ------- | ---- |
| 1 | `/` | Landing / marketing | public |
| 2 | `/login` | Sign in | public |
| 3 | `/signup` | Create account | public |
| 4 | `/dashboard` | Home with readiness, skills, recent activity | auth |
| 5 | `/resume` | Upload + parsed view | auth |
| 6 | `/interview` | Start a new interview (config) | auth |
| 7 | `/interview/[id]` | Live interview session | auth |
| 8 | `/interview/[id]/report` | Post-session report | auth |
| 9 | `/analytics` | Progress dashboard | auth |
| 10 | `/roadmap` | 30-day plan | auth |
| 11 | `/settings` | Profile, account, delete | auth |

---

## 2. Landing Page (`/`)

Hero, value prop, 3-step "How it works", a sample interview clip, pricing teaser, footer.

```
┌────────────────────────────────────────────────┐
│  PrepMind AI           [Login] [Get Started]   │
├────────────────────────────────────────────────┤
│                                                │
│   Adaptive AI interviews that actually        │
│   get harder when you do.                      │
│   [Start free]  [Watch demo →]                 │
│                                                │
│   ─ animated UI preview ─                      │
│                                                │
├────────────────────────────────────────────────┤
│  1. Upload resume   2. Get a plan   3. Drill   │
├────────────────────────────────────────────────┤
│  Mock interview excerpt (chat UI mock)         │
├────────────────────────────────────────────────┤
│  Pricing teaser · Footer                      │
└────────────────────────────────────────────────┘
```

**Components:** Hero, FeatureGrid, DemoChat, PricingTeaser, Footer.

---

## 3. Auth Pages

Centered card on subtle gradient background. Single primary CTA, switch link to other auth page.

**`/signup`**: name, email, password (with strength meter), submit → creates user → redirect to `/resume`.

**`/login`**: email, password, "forgot" link (out of MVP), submit → redirect to `/dashboard`.

---

## 4. Dashboard (`/dashboard`)

Top-level overview, the "home" of the app.

```
┌──────────┬─────────────────────────────────────┐
│ Sidebar  │  Welcome back, Aarav                │
│          │                                     │
│ Dash     │  ┌─────────┐ ┌─────────┐ ┌───────┐ │
│ Resume   │  │Readiness│ │Streak   │ │Avg    │ │
│ Interv.  │  │  68 /100│ │  5 days │ │ 71.4  │ │
│ Roadmap  │  └─────────┘ └─────────┘ └───────┘ │
│ Analyt.  │                                     │
│ Settings │  ┌─ Top weaknesses ─────────────┐  │
│          │  │ • System Design   (42)       │  │
│          │  │ • Concurrency     (58)       │  │
│          │  └──────────────────────────────┘  │
│          │                                     │
│          │  [Start interview]  [View roadmap] │
│          │                                     │
│          │  Recent sessions                    │
│          │  ─ Backend mid · 71 · 2d ago       │
│          │  ─ Backend mid · 64 · 5d ago       │
└──────────┴─────────────────────────────────────┘
```

**Components:** `ReadinessCard`, `StreakCard`, `AvgScoreCard`, `WeaknessList`, `RecentSessionsList`, `QuickActions`.

---

## 5. Resume Upload (`/resume`)

Two-column layout: left = upload form, right = live parsed view.

```
┌──────────┬─────────────────────────────────────┐
│ Sidebar  │ Target role  [Backend Engineer ▾]   │
│          │ Level        [Mid ▾]                │
│          │ Company      [Stripe]               │
│          │                                     │
│          │  ┌──────────────────────────┐       │
│          │  │  Drop PDF or browse      │       │
│          │  └──────────────────────────┘       │
│          │                                     │
│          │  Extracted skills                   │
│          │  ● Python  ● SQL  ● FastAPI         │
│          │  ● Docker  ● AWS                    │
│          │                                     │
│          │  Projects                           │
│          │  • URL shortener (Node, Redis)      │
│          │                                     │
│          │  [Generate roadmap →]               │
└──────────┴─────────────────────────────────────┘
```

**States:** idle → uploading (progress bar) → parsing (skeleton) → parsed → failed (retry).

---

## 6. Interview Session (`/interview/[id]`)

The most important screen. Conversational, focused, calm.

```
┌──────────────────────────────────────────────────┐
│  Turn 3 / 6    Difficulty: Hard    Topic: Cache  │
│  ─ AI thinking: "You nailed caching basics,     │
│     pushing into stampede prevention."           │
├──────────────────────────────────────────────────┤
│                                                  │
│  [AI]  Explain cache stampede and how you would  │
│       prevent it in a high-traffic system.       │
│                                                  │
│       [streaming in…]                            │
│                                                  │
│  [You] It's when many requests miss the cache…   │
│                                                  │
│  [AI]  ✓ Correctness 78 · Clarity 65 · …        │
│       Feedback: "Good core. Missing: …"          │
│       Ideal answer: "…"                          │
│                                                  │
├──────────────────────────────────────────────────┤
│  [ type your answer…           ]   [Submit ▸]   │
└──────────────────────────────────────────────────┘
```

**Behaviors:**
- Question card uses **type-on streaming** animation (characters appear).
- Evaluation card animates each score with a small count-up.
- "AI thinking" pill above the question exposes the rationale — *explainability*.
- Auto-save drafts every 5 seconds (local state).
- If user is idle > 60s, show a calm prompt: "Take your time. Submit when ready."
- On session end, navigate to `/interview/[id]/report`.

---

## 7. Interview Report (`/interview/[id]/report`)

Single-page summary. Designed to be **shareable** (later: exportable PDF).

```
┌──────────────────────────────────────────────────┐
│  Session summary                       71 / 100  │
│  Backend Engineer · Mid · 2d ago                 │
├──────────────────────────────────────────────────┤
│  Top strengths         Top gaps                  │
│  • Clear structure     • System design depth     │
│  • Good SQL fluency    • Trade-off articulation  │
├──────────────────────────────────────────────────┤
│  Turn-by-turn                                         │
│  ─ Q1 · easy  · caching      · 82  · strong       │
│  ─ Q2 · med   · cache stamp. · 71  · good         │
│  ─ Q3 · hard  · rate limit   · 64  · solid        │
│  …                                                 │
├──────────────────────────────────────────────────┤
│  Recommended next steps                            │
│  1. Read "Designing Data-Intensive Apps" ch. 5   │
│  2. Mock on system design this week               │
│  [Start next session]   [Update roadmap]          │
└──────────────────────────────────────────────────┘
```

---

## 8. Analytics (`/analytics`)

```
┌──────────────────────────────────────────────────┐
│  Score trend (last 30 days)                       │
│  [ line chart ]                                   │
├──────────────────────────────────────────────────┤
│  Topic heatmap                                    │
│  [ grid: topic × score, color = perf ]            │
├──────────────────────────────────────────────────┤
│  Topic averages (sortable table)                  │
│  Topic        | Attempts | Avg | Trend            │
│  SQL          |    12    |  82 |  ↑               │
│  System Dsgn  |     6    |  54 |  →               │
└──────────────────────────────────────────────────┘
```

**Library:** Recharts for trend; custom CSS grid for heatmap.

---

## 9. Roadmap (`/roadmap`)

Timeline-style view of the 4-week plan.

```
┌──────────────────────────────────────────────────┐
│  Your 30-day plan · v3 · updated 2d ago          │
│  [Refresh]                                        │
├──────────────────────────────────────────────────┤
│  Week 1 · Data modeling + SQL                    │
│  ├─ Mon  Review normalization (45m)             │
│  ├─ Tue  5 LeetCode SQL problems (60m)           │
│  ├─ …                                             │
│  Week 2 · System design fundamentals             │
│  Week 3 · Concurrency + async                    │
│  Week 4 · Mock interviews + polish               │
├──────────────────────────────────────────────────┤
│  Suggested projects                              │
│  • URL shortener (caching, hashing)              │
│  • Tiny rate limiter (sliding window)            │
└──────────────────────────────────────────────────┘
```

Each day is checkable. Completed items persist locally and (post-MVP) sync to the server.

---

## 10. Settings (`/settings`)

- Profile (name, target role/level/company)
- Account (change password, delete account)
- Notification preferences (out of MVP)

---

## 11. Shared UX Rules

- **Skeleton loaders** for all async data — never blank screens.
- **Empty states** with friendly illustrations + 1-line CTA.
- **Errors** show *what* happened and *what to do next*. No raw stack traces.
- **Streaming** for any text generation. Use a typing cursor (`▍`) until done.
- **Keyboard:** `Cmd/Ctrl + Enter` submits an answer; `Esc` cancels an upload.
- **Mobile:** sidebar collapses to bottom nav. Interview page is mobile-friendly (chat pattern is native-feeling).
- **Dark mode is default.** Light mode is supported via CSS variables, no separate theme code.

---

## 12. Motion

- Page transitions: 150ms cross-fade.
- Card mount: 200ms ease-out fade + 4px slide.
- Score reveal: 800ms count-up.
- Streaming text: 25ms per char, jittered slightly to feel natural.
- Respect `prefers-reduced-motion`.

---

## 13. Accessibility

- All interactive elements have visible focus rings.
- Color contrast ≥ 4.5:1 on body text.
- Forms have associated labels and inline error messages.
- Charts include an accessible table fallback.
- SSE-based pages announce state changes to screen readers via `aria-live="polite"`.
