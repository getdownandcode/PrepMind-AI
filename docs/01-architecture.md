# 01 — System Architecture

This document defines the complete system architecture, component interactions, and request lifecycles for PrepMind AI.

---

## 1. High-Level System Diagram

```mermaid
graph TB
    User([User])
    subgraph Client [Browser]
        UI[Next.js App<br/>App Router + shadcn/ui]
    end

    subgraph Edge [Vercel Edge]
        CDN[Static + SSR]
    end

    subgraph App [Render / Railway]
        API[FastAPI<br/>REST + SSE]
        Orch[Agent Orchestrator<br/>LangGraph-style StateGraph]
    end

    subgraph Data [Data Layer]
        PG[(PostgreSQL<br/>Relational)]
        CHR[(ChromaDB<br/>Vector Store)]
    end

    subgraph AI [AI Layer]
        LLM[Google Gemini 2.5 Flash<br/>LLM Provider]
        Emb[Embedding Model<br/>text-embedding-3-small]
    end

    User --> UI --> CDN --> API
    API --> Orch
    API --> PG
    API --> CHR
    Orch --> LLM
    Orch --> Emb
    Orch --> PG
    Orch --> CHR
    LLM -.stream.-> API -.SSE.-> UI
```

---

## 2. Component Layers

```mermaid
graph LR
    A[Presentation Layer<br/>Next.js + Tailwind + shadcn] --> B[API Layer<br/>FastAPI Routers]
    B --> C[Service Layer<br/>Business Logic]
    C --> D[Agent Layer<br/>Workflow Nodes]
    D --> E[Memory Layer<br/>Vector + Session]
    D --> F[LLM Provider<br/>Gemini 2.5 Flash]
    C --> G[Persistence<br/>PostgreSQL via SQLAlchemy]
```

| Layer | Responsibility | Key Modules |
| ----- | -------------- | ----------- |
| Presentation | Render UI, manage auth state, stream responses | `app/(app)/**`, `components/**` |
| API | HTTP entrypoints, request validation, auth | `app/api/v1/**` |
| Service | Orchestrate agents, persist data, transaction boundaries | `app/services/**` |
| Agent | Resume analysis, question gen, evaluation, gap analysis | `app/agents/**` |
| Memory | Short-term session state + long-term vector memory | `app/memory/**` |
| LLM | Prompted generation with structured JSON output | `app/core/llm.py` |
| Persistence | Relational data for users, interviews, evaluations | `app/models/**` |

---

## 3. Agentic Workflow Pipeline

```mermaid
stateDiagram-v2
    [*] --> ResumeIntake
    ResumeIntake --> ResumeParser
    ResumeParser --> SkillExtractor
    SkillExtractor --> GapAnalyzer
    GapAnalyzer --> RoadmapGenerator
    RoadmapGenerator --> InterviewReady

    InterviewReady --> QuestionSelector
    QuestionSelector --> QuestionGenerator
    QuestionGenerator --> AskQuestion
    AskQuestion --> CollectAnswer
    CollectAnswer --> ResponseEvaluator
    ResponseEvaluator --> WeaknessTracker
    WeaknessTracker --> MemoryUpdate
    MemoryUpdate --> Decision

    Decision --> RevisitWeakness: weak topic detected
    Decision --> IncreaseDifficulty: strong answer
    Decision --> NewTopic: topic mastered
    Decision --> EndInterview: limit reached

    RevisitWeakness --> QuestionSelector
    IncreaseDifficulty --> QuestionSelector
    NewTopic --> QuestionSelector
    EndInterview --> SessionSummary
    SessionSummary --> [*]
```

The orchestrator is a single **StateGraph** where each node is a pure async function receiving the shared `InterviewState` and returning a partial update. This is intentionally simpler than multi-agent frameworks — we want one coherent loop, not chatty sub-agents.

---

## 4. Request Lifecycle (Mock Interview)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Next.js
    participant API as FastAPI
    participant O as Orchestrator
    participant V as Vector Store
    participant DB as PostgreSQL
    participant L as LLM

    U->>FE: Click "Start Interview"
    FE->>API: POST /interviews (role, level, type)
    API->>DB: Create interview record
    API->>O: initialize_state()
    O->>V: retrieve_weak_topics(user_id)
    V-->>O: top-3 weakness vectors
    O->>L: generate_question(state)
    L-->>O: structured question JSON
    O->>DB: persist question
    O-->>API: stream question
    API-->>FE: SSE event
    FE-->>U: render question

    U->>FE: submits answer
    FE->>API: POST /interviews/{id}/answers
    API->>O: evaluate_answer(answer, state)
    O->>L: eval prompt (multi-axis)
    L-->>O: scores + feedback JSON
    O->>V: upsert weakness memory
    O->>DB: persist evaluation
    O->>L: decide next question
    L-->>O: next question or end
    O-->>API: stream next event
    API-->>FE: SSE
```

---

## 5. Data Flow During Interview

```mermaid
flowchart TD
    A[User Answer] --> B[Normalize + Tokenize]
    B --> C[Embed Answer]
    C --> D[Semantic Search<br/>against topic vectors]
    D --> E[Evaluator Node]
    E --> F[LLM Structured Output]
    F --> G{Scores Parsed?}
    G -- No --> H[Retry with stricter schema]
    G -- Yes --> I[Update Weakness Memory]
    I --> J[Persist Evaluation]
    J --> K[Decision Node]
    K --> L[Next Question]
    L --> M[Stream to Client]
```

---

## 6. Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Auth Router
    participant DB as PostgreSQL

    U->>FE: signup(email, password, name)
    FE->>API: POST /auth/signup
    API->>DB: INSERT user (bcrypt hash)
    API-->>FE: 201 + tokens
    FE->>FE: store in httpOnly cookie

    U->>FE: login
    FE->>API: POST /auth/login
    API->>DB: verify hash
    API-->>FE: access + refresh JWT

    U->>FE: access /dashboard
    FE->>API: GET /me (Bearer)
    API-->>FE: user object
```

JWT is signed with HS256, access token TTL = 60 min, refresh = 14 days. Refresh rotation is enforced.

---

## 7. Deployment Topology (MVP)

```mermaid
graph TB
    subgraph Vercel
        V[Next.js App]
    end
    subgraph Render
        R[FastAPI Container]
    end
    subgraph Supabase
        S[(PostgreSQL)]
    end
    subgraph RenderDisk
        C[(ChromaDB Persist Dir)]
    end
    subgraph GoogleAI [Google AI]
        O[Gemini 2.5 Flash API]
    end

    V -->|HTTPS| R
    R --> S
    R --> C
    R --> O
```

ChromaDB persists to a Render persistent disk (`/var/data/chroma`). For higher scale, swap for managed `pgvector` or `pinecone`, but the abstraction in `app/memory/vector.py` is the same.

---

## 8. Architectural Principles

1. **One orchestrator, many nodes** — avoid multi-agent chaos; use a typed state graph.
2. **Structured outputs everywhere** — every LLM call returns JSON validated by Pydantic.
3. **Explainability by default** — store the *why* alongside the *what* (rationale strings).
4. **Idempotent endpoints** — safe to retry uploads, evaluations, and roadmap regenerations.
5. **No premature scaling** — single FastAPI process + single Postgres + single vector dir.

---

## 9. Where to look in the code

| Concern | Path |
| ------- | ---- |
| LLM client | `backend/app/core/llm.py` |
| Orchestrator | `backend/app/agents/orchestrator.py` |
| Resume parsing | `backend/app/agents/nodes/resume_parser.py` |
| Question gen | `backend/app/agents/nodes/question_generator.py` |
| Evaluation | `backend/app/agents/nodes/evaluator.py` |
| Memory | `backend/app/memory/vector.py` |
| Prompts | `backend/app/prompts/*.py` |
