# 05 — Folder Structure

## 1. Backend (FastAPI)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                       # FastAPI app factory, CORS, router mount
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py                   # common dependencies (db, current_user, llm)
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py             # aggregates v1 routers
│   │       ├── auth.py               # /auth endpoints
│   │       ├── resumes.py            # /resumes endpoints
│   │       ├── interviews.py         # /interviews endpoints (incl. SSE)
│   │       ├── roadmaps.py           # /roadmaps endpoints
│   │       ├── analytics.py          # /analytics endpoints
│   │       └── health.py
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                 # pydantic-settings, env vars
│   │   ├── security.py               # JWT encode/decode, bcrypt
│   │   ├── llm.py                    # Gemini 2.5 Flash client + structured output
│   │   ├── logging.py                # structured JSON logger
│   │   └── errors.py                 # exception types & handlers
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py                   # SQLAlchemy DeclarativeBase
│   │   ├── session.py                # async engine, session factory
│   │   └── init.py                   # create_all (dev) / alembic (prod)
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── resume.py
│   │   ├── interview.py
│   │   ├── evaluation.py
│   │   ├── roadmap.py
│   │   └── memory.py
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── resume.py
│   │   ├── interview.py
│   │   ├── evaluation.py
│   │   ├── roadmap.py
│   │   └── analytics.py
│   │
│   ├── services/                     # business logic, transaction boundaries
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── resume_service.py         # orchestrates parse + extract
│   │   ├── interview_service.py      # start, submit answer, end
│   │   ├── roadmap_service.py
│   │   ├── analytics_service.py
│   │   ├── scoring.py                # readiness score formula
│   │   └── storage.py                # local/S3 file handling
│   │
│   ├── agents/                       # LangGraph-style state graph
│   │   ├── __init__.py
│   │   ├── state.py                  # InterviewState TypedDict
│   │   ├── orchestrator.py           # builds the state graph
│   │   ├── nodes/
│   │   │   ├── __init__.py
│   │   │   ├── resume_parser.py
│   │   │   ├── skill_extractor.py
│   │   │   ├── gap_analyzer.py
│   │   │   ├── question_generator.py
│   │   │   ├── evaluator.py
│   │   │   ├── weakness_tracker.py
│   │   │   ├── decision.py           # pick next action
│   │   │   └── roadmap_generator.py
│   │   └── llm_calls.py              # thin wrappers around LLM with JSON schema
│   │
│   ├── memory/
│   │   ├── __init__.py
│   │   ├── vector.py                 # ChromaDB client + collection helpers
│   │   ├── embeddings.py             # embedding model wrapper
│   │   ├── session.py                # short-term in-process session state
│   │   └── retriever.py              # semantic search, weakness ranking
│   │
│   ├── prompts/                      # versioned prompt templates
│   │   ├── __init__.py
│   │   ├── resume_parse.py
│   │   ├── skill_extract.py
│   │   ├── gap_analysis.py
│   │   ├── question_generate.py
│   │   ├── evaluate.py
│   │   ├── decision.py
│   │   └── roadmap.py
│   │
│   └── utils/
│       ├── __init__.py
│       ├── pdf.py                    # PyPDF wrapper
│       ├── jsonx.py                  # robust JSON parsing for LLM output
│       └── time.py
│
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/                     # generated migrations
│
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_resumes.py
│   ├── test_interviews.py
│   └── test_agents.py
│
├── pyproject.toml
├── alembic.ini
├── .env.example
├── Dockerfile
└── README.md
```

### Why this layout

- **`api/`** is thin — it validates and delegates.
- **`services/`** owns transactions and business rules.
- **`agents/`** is the LLM workflow brain, isolated from HTTP.
- **`memory/`** abstracts vector + session memory so the LLM layer never touches ChromaDB directly.
- **`prompts/`** are version-controlled files (not inline strings) so we can A/B test.
- **`schemas/`** and **`models/`** are separate so the DB schema can evolve independently of the API contract.

---

## 2. Frontend (Next.js App Router)

```
frontend/
├── public/
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                # root layout, theme, providers
│   │   ├── page.tsx                  # landing page
│   │   ├── globals.css
│   │   │
│   │   ├── (auth)/
│   │   │   ├── layout.tsx            # centered card layout
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   │
│   │   ├── (app)/                    # protected layout w/ sidebar
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── resume/
│   │   │   │   ├── page.tsx          # upload
│   │   │   │   └── [id]/page.tsx     # parsed view
│   │   │   ├── interview/
│   │   │   │   ├── page.tsx          # start new
│   │   │   │   └── [id]/page.tsx     # live session
│   │   │   ├── analytics/page.tsx
│   │   │   ├── roadmap/page.tsx
│   │   │   └── settings/page.tsx
│   │   │
│   │   └── api/                      # Next.js API routes (only for auth proxy if needed)
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn primitives (button, card, dialog…)
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── topbar.tsx
│   │   │   └── user-menu.tsx
│   │   ├── dashboard/
│   │   │   ├── readiness-card.tsx
│   │   │   ├── skills-grid.tsx
│   │   │   └── roadmap-preview.tsx
│   │   ├── interview/
│   │   │   ├── chat-thread.tsx
│   │   │   ├── question-card.tsx
│   │   │   ├── answer-composer.tsx
│   │   │   ├── evaluation-card.tsx
│   │   │   ├── adaptive-hint.tsx     # shows the AI's "thinking"
│   │   │   └── session-complete.tsx
│   │   ├── analytics/
│   │   │   ├── score-trend-chart.tsx
│   │   │   └── topic-heatmap.tsx
│   │   ├── roadmap/
│   │   │   └── roadmap-timeline.tsx
│   │   └── shared/
│   │       ├── skeleton.tsx
│   │       ├── empty-state.tsx
│   │       └── error-boundary.tsx
│   │
│   ├── lib/
│   │   ├── api.ts                    # typed fetch wrapper
│   │   ├── auth.ts                   # token storage, refresh
│   │   ├── sse.ts                    # SSE client helper
│   │   ├── utils.ts                  # cn(), formatters
│   │   └── constants.ts
│   │
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-interview.ts          # SSE + state
│   │   ├── use-resume.ts
│   │   └── use-analytics.ts
│   │
│   ├── store/                        # zustand
│   │   ├── auth-store.ts
│   │   └── interview-store.ts
│   │
│   ├── types/
│   │   ├── api.ts                    # mirrors backend schemas
│   │   ├── interview.ts
│   │   └── analytics.ts
│   │
│   └── styles/
│       └── theme.ts
│
├── tailwind.config.ts
├── next.config.mjs
├── tsconfig.json
├── components.json                  # shadcn config
├── .env.example
└── package.json
```

### Conventions

- **Server Components** by default, Client Components only where needed (interview session, charts).
- **Route groups** `(auth)` and `(app)` keep shared layouts without affecting URLs.
- **`lib/api.ts`** is the single source of HTTP truth — typed, retry-aware, refresh-token-aware.
- **`hooks/use-interview.ts`** encapsulates SSE parsing so the UI is dumb.
- **`store/`** uses zustand for tiny, fast, typed state.
