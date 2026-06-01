# 10 — MVP Build Roadmap (30 Days)

A realistic, week-by-week plan for a **single senior engineer** to ship a portfolio-grade, deployable MVP. Each week has explicit outcomes, not vague goals.

---

## Week 1 — Foundation (Days 1–7)

**Outcome:** Auth + DB + skeleton deployed.

| Day | Task | Done when |
| --- | ---- | --------- |
| 1 | Repo setup, Next.js + FastAPI scaffolds, env files | Both apps boot locally |
| 2 | Postgres + Alembic, base SQLAlchemy models, migrations | `alembic upgrade head` works |
| 3 | Auth: signup, login, refresh, /me, JWT | Postman flow passes |
| 4 | Frontend auth pages + token storage + protected routes | Sign up → land on dashboard |
| 5 | Landing page + shadcn setup + theme | Looks like a product |
| 6 | CI: lint, type-check, test on PR | CI green |
| 7 | Deploy: Vercel + Render + Neon | `/v1/health` returns 200 from prod |

---

## Week 2 — Resume Intelligence (Days 8–14)

**Outcome:** Upload PDF → see extracted skills + gap analysis + roadmap.

| Day | Task | Done when |
| --- | ---- | --------- |
| 8 | Resume upload endpoint + storage (local for now) | PDF saved, record created |
| 9 | PyPDF extraction + structured LLM parse | `ResumeProfile` JSON validated |
| 10 | Frontend upload page with progress + skeleton | User sees parsing state |
| 11 | Skill extraction + storage + display | Skills grid renders |
| 12 | Gap analyzer node + readiness score | Score appears on dashboard |
| 13 | Roadmap generator node | Plan renders in `/roadmap` |
| 14 | Polish dashboard, add sidebar, empty states | Dashboard looks done |

---

## Week 3 — Adaptive Interview Engine (Days 15–21)

**Outcome:** A full mock interview session with adaptation.

| Day | Task | Done when |
| --- | ---- | --------- |
| 15 | Interview state graph skeleton (LangGraph-style) | State flows through nodes |
| 16 | Question generator node + prompt | First question renders |
| 17 | Answer submission + evaluator node | Scores + feedback appear |
| 18 | Weakness tracker + ChromaDB upsert | Memory persists across runs |
| 19 | Decision node + adaptive logic | Next question adapts |
| 20 | SSE streaming + frontend chat UI | Smooth streaming UX |
| 21 | Session completion + summary report | `/interview/[id]/report` renders |

---

## Week 4 — Memory, Analytics, Polish (Days 22–30)

**Outcome:** Memorable, polished, demoable.

| Day | Task | Done when |
| --- | ---- | --------- |
| 22 | Memory retrieval: weakness-aware question selection | System drills weak topics |
| 23 | Analytics: score trend, topic heatmap | `/analytics` page live |
| 24 | Roadmap refresh on session complete | Roadmap updates with rationale |
| 25 | Sentry + PostHog + structured logs | Errors tracked, funnels visible |
| 26 | Mobile responsive pass + a11y audit | Lighthouse a11y ≥ 90 |
| 27 | Performance: streaming + caching + budget checks | Question gen p50 < 2.5s |
| 28 | Seed demo data + write 1-page docs | Demo account works |
| 29 | Record 2-minute Loom demo + write README | Portfolio-ready |
| 30 | Launch: post on Product Hunt, LinkedIn, dev.to | First 50 sign-ups |

---

## What "done" means per week

Each week ends with:

- The week's main user story passing end-to-end.
- A short Loom (≤ 5 min) showing the feature working.
- Notes in `CHANGELOG.md`.
- Updated `docs/` if architecture changed.

---

## Risk register

| Risk | Mitigation |
| ---- | ---------- |
| LLM latency spikes | Cap turn count, stream early, add retry+timeout |
| ChromaDB persistence on Render | Use persistent disk; document migration to pgvector |
| Gemini rate limits | Add per-user token bucket; respect 429s with exponential backoff |
| PDF parsing fails | PyPDF first, fall back to manual skill entry |
| Scope creep | Hard NO list in `docs/09-future-improvements.md` |
| Solo dev burnout | 30-day plan is *intense* but bounded; ship at day 30 even if imperfect |

---

## Post-MVP (Days 31+)

- Voice mode (week 5–6)
- Company question banks (week 7)
- Live coding (week 8)
- Marketing & growth experiments (week 9–10)
- First paying plan via Stripe (week 11)

See `docs/09-future-improvements.md` for the full post-MVP backlog.
