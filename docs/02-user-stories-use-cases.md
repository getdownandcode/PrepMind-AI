# 02 — User Stories & Use Cases

## 1. User Personas

| Persona | Description | Primary Goal |
| ------- | ----------- | ------------ |
| **Aarav** — CS student, junior | Final-year undergrad targeting SWE internships | Land first internship |
| **Priya** — mid-level backend engineer | 3 YoE, targeting senior roles at FAANG | Level up to senior |
| **Daniel** — career switcher | Moving from QA to ML engineering | Build credible ML interview readiness |
| **Maya** — bootcamp grad | Wants to close bootcamp gaps before applying | Identify & fill weak areas |

The MVP targets Aarav and Priya primarily — the most common interview-prep users.

---

## 2. User Stories (≥ 15, grouped by feature)

### Authentication
1. As a new user, I want to sign up with email and password so I can save my progress across devices.
2. As a returning user, I want to log in quickly and stay logged in for 14 days so I do not have to authenticate repeatedly.
3. As a user, I want to log out from any device so my account stays secure.

### Resume & Profile
4. As a candidate, I want to upload my PDF resume so the system can analyze my current skills.
5. As a candidate, I want to specify a target role, experience level, and company so questions match my goals.
6. As a candidate, I want to see what the AI extracted from my resume so I can correct mistakes.
7. As a candidate, I want an "Internship Readiness Score" so I have a single motivating metric.

### Skill Gap & Roadmap
8. As a candidate, I want to see which skills I am missing for my target role so I know what to learn.
9. As a candidate, I want a 30-day personalized roadmap so I have a clear plan.
10. As a candidate, I want the roadmap to adapt after each interview session so priorities shift as I improve.

### Adaptive Interview
11. As a candidate, I want the AI to ask the *next right question* based on my previous answer, not a fixed list.
12. As a candidate, I want questions to increase in difficulty when I am doing well so I am challenged.
13. As a candidate, I want the AI to revisit topics I am weak at so I can drill them.
14. As a candidate, I want to see the question and stream the AI's evaluation so the session feels real-time.

### Evaluation & Feedback
15. As a candidate, I want a multi-axis score (correctness, clarity, depth, confidence) so I know exactly what to fix.
16. As a candidate, I want an "ideal answer" comparison so I can learn the right framing.
17. As a candidate, I want detailed, kind, specific feedback so I improve faster.

### Memory & Continuity
18. As a candidate, I want the system to remember my weaknesses across sessions so I do not repeat the same drills.
19. As a candidate, I want a chronological history of past interviews so I can track progress over weeks.

### Analytics
20. As a candidate, I want a dashboard with score trends and topic heatmaps so progress is visible.
21. As a candidate, I want to see my strongest and weakest topics so I can focus my time.

### UX & Trust
22. As a candidate, I want to see what the AI is "thinking" between turns (e.g. "Detected weak answer in SQL joins — drilling deeper") so I trust the adaptation.
23. As a candidate, I want a clean dark UI with smooth animations so the experience feels premium.

---

## 3. Use Cases

### UC-1: First-time Onboarding & Resume Analysis

**Primary Actor:** New user  
**Preconditions:** None  
**Trigger:** User signs up and lands on Dashboard

| Step | Actor | System |
| ---- | ----- | ------ |
| 1 | User signs up | Creates user record, returns JWT |
| 2 | User is redirected to Resume Upload | Renders upload page |
| 3 | User selects target role, level, company | Saves target profile |
| 4 | User uploads PDF | Stores file, extracts text via PyPDF |
| 5 | — | Parses with LLM, returns structured profile |
| 6 | — | Computes gap analysis vs target role |
| 7 | — | Generates 30-day roadmap |
| 8 | User redirected to Dashboard | Shows readiness score, skills, roadmap preview |

**Postconditions:** User has a complete profile, gap analysis, and roadmap.

**Edge cases:**
- Empty / corrupt PDF → friendly error, allow retry
- Resume has no detectable skills → ask user to enter skills manually
- LLM parsing fails → retry once, then show manual entry form

---

### UC-2: Adaptive Mock Interview

**Primary Actor:** Authenticated user  
**Trigger:** User clicks "Start Interview" on Dashboard

| Step | Actor | System |
| ---- | ----- | ------ |
| 1 | User chooses role/level | Confirms target profile |
| 2 | User selects topic focus | Optional override |
| 3 | — | Initializes `InterviewState` (history, weakness map) |
| 4 | — | Retrieves top 3 weakness topics from vector memory |
| 5 | — | Generates Question #1 (medium difficulty, weakness-biased) |
| 6 | User reads question | Streams question to UI |
| 7 | User submits answer | Sends to evaluator |
| 8 | — | Evaluator produces multi-axis scores + feedback |
| 9 | — | Updates weakness memory (upsert embedding) |
| 10 | — | Decision node picks next question (new / deeper / harder / easier) |
| 11 | Loop 6–10 for N turns | Default N=6 |
| 12 | — | Generates session summary (top wins, top gaps, next steps) |
| 13 | User views Feedback Report | Renders scores, ideal answer, improvement plan |

**Edge cases:**
- User submits empty answer → request clarification
- LLM returns invalid JSON → retry once with strict schema; fall back to safe default
- User aborts mid-session → persist partial state, allow resume later
- Same weakness triggered ≥ 3 times → escalate to a "concept explainer" turn before drilling

---

### UC-3: Roadmap Regeneration

**Primary Actor:** Authenticated user  
**Trigger:** User clicks "Refresh Roadmap" or completes a session

| Step | Actor | System |
| ---- | ----- | ------ |
| 1 | User triggers refresh | Optional |
| 2 | — | Aggregates recent evaluations (last 14 days) |
| 3 | — | Pulls current skill graph + gap analysis |
| 4 | — | Calls LLM to produce a new 30-day plan with priorities |
| 5 | — | Persists new `roadmap_versions` row |
| 6 | User views updated roadmap | Highlights deltas vs previous version |

**Edge cases:**
- No recent activity → use static role-based default roadmap
- Plan is too generic → tighten prompt with concrete skill names

---

## 4. Non-Goals (MVP)

- Real-time voice interviews
- Multi-user / collaborative interviews
- Native mobile apps
- Payments / subscription tiers
- Custom question banks per company (use generic role-based instead)

These are explicit **post-MVP** items — see `docs/09-future-improvements.md`.
