# PrepMind AI

> An adaptive AI-powered interview preparation platform that simulates intelligent, agentic interview workflows.

PrepMind AI analyzes a candidate's resume, identifies skill gaps, generates a personalized learning roadmap, and conducts **adaptive mock interviews** that evolve in real time based on the candidate's performance. It remembers weaknesses across sessions and adjusts question difficulty, topic focus, and evaluation depth accordingly.

This repository contains the **complete MVP specification, architecture, and implementation scaffold** for a deployable, portfolio-grade AI product.

---

## Why this project is interesting

Most "AI interview prep" tools are thin wrappers around a chat completion endpoint. PrepMind AI is built around a **workflow-driven adaptive intelligence pipeline**:

1. Resume → structured skill/profile graph
2. Profile + target role → gap analysis
3. Gap analysis + history → roadmap
4. Roadmap + live memory → next-best question
5. Answer → multi-axis evaluation
6. Evaluation → updated weakness memory
7. Memory → adjusted future questions

The interview is not a static Q&A loop. It is a stateful agent that behaves like a real interviewer.

---

## Repository Structure

```
prepmind-ai/
├── README.md                         # this file
├── docs/                             # full MVP specification
│   ├── 01-architecture.md            # system architecture + mermaid diagrams
│   ├── 02-user-stories-use-cases.md  # user stories + use cases
│   ├── 03-database-schema.md         # PostgreSQL schema
│   ├── 04-api-design.md              # REST API reference
│   ├── 05-folder-structure.md        # frontend + backend layout
│   ├── 06-ai-workflows.md            # agentic AI workflows + prompts
│   ├── 07-ui-pages.md                # UI/UX page specifications
│   ├── 08-deployment.md              # deployment guide
│   ├── 09-future-improvements.md     # post-MVP scope
│   └── 10-mvp-roadmap.md             # 30-day build plan
│
├── backend/                          # FastAPI implementation scaffold
│   ├── app/
│   │   ├── api/                      # HTTP routers
│   │   ├── core/                     # config, security, deps
│   │   ├── db/                       # session, base
│   │   ├── models/                   # SQLAlchemy models
│   │   ├── schemas/                  # Pydantic schemas
│   │   ├── services/                 # business logic
│   │   ├── agents/                   # agentic workflow nodes
│   │   ├── memory/                   # vector + session memory
│   │   ├── prompts/                  # prompt templates
│   │   └── utils/                    # helpers
│   ├── alembic/                      # DB migrations
│   ├── tests/
│   ├── pyproject.toml
│   └── .env.example
│
└── frontend/                         # Next.js implementation scaffold
    └── src/
        ├── app/                      # App Router pages
        ├── components/               # UI + feature components
        ├── lib/                      # API client, utils
        ├── hooks/                    # React hooks
        ├── store/                    # state management
        └── types/                    # TS types
```

---

## Tech Stack

| Layer        | Technology                                              |
| ------------ | ------------------------------------------------------- |
| Frontend     | Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui |
| Backend      | FastAPI, Python 3.11, SQLAlchemy 2, Alembic             |
| Database     | PostgreSQL 16                                           |
| Vector store | ChromaDB (persistent local mode)                        |
| LLM          | Google Gemini 2.5 Flash (single model for the whole platform) |
| Orchestration| Custom LangGraph-style state graph                      |
| Auth         | JWT (access + refresh) with bcrypt                      |
| Deployment   | Vercel (frontend) · Render (backend) · Supabase/Neon (db) |

---

## Quickstart

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env   # fill in keys
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

See `docs/08-deployment.md` for production deployment.

---

## Core Differentiators

1. **Adaptive difficulty engine** — real-time question adjustment based on rolling answer quality.
2. **Persistent memory** — semantic retrieval of past mistakes across sessions.
3. **Multi-axis evaluation** — correctness, clarity, depth, and confidence, scored independently.
4. **Honest product UX** — shows what the AI is doing and why (explainability).
5. **Solo-developer realistic** — no fake microservices, no Kubernetes, no overengineering.

---

## License

MIT — build, fork, deploy, learn.
