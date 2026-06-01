# 03 — Database Schema (PostgreSQL)

Schema designed for **normalized OLTP** with light denormalization for analytics. UUIDs as primary keys. All tables include `created_at` / `updated_at`. Soft delete is *not* used; interviews cascade to evaluations.

---

## 1. Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ RESUMES : owns
    USERS ||--o{ INTERVIEWS : conducts
    USERS ||--o{ ROADMAPS : receives
    USERS ||--o{ MEMORY_VECTORS : has
    USERS ||--o{ REFRESH_TOKENS : has

    RESUMES ||--|| RESUME_PARSED : produces
    RESUMES ||--o{ SKILLS : extracts

    INTERVIEWS ||--o{ QUESTIONS : contains
    INTERVIEWS ||--o{ EVALUATIONS : produces

    QUESTIONS ||--|| EVALUATIONS : answered_by

    USERS {
        uuid id PK
        text email UK
        text password_hash
        text full_name
        text target_role
        text experience_level
        text target_company
        numeric readiness_score
        timestamp created_at
        timestamp updated_at
    }

    RESUMES {
        uuid id PK
        uuid user_id FK
        text file_url
        text file_name
        int file_size_bytes
        text status
        timestamp created_at
    }

    RESUME_PARSED {
        uuid id PK
        uuid resume_id FK
        text summary
        jsonb experience
        jsonb education
        jsonb projects
        timestamp created_at
    }

    SKILLS {
        uuid id PK
        uuid resume_id FK
        text name
        text category
        int proficiency_estimate
        timestamp created_at
    }

    INTERVIEWS {
        uuid id PK
        uuid user_id FK
        text role
        text level
        text topic_focus
        text status
        int total_questions
        int current_difficulty
        timestamp started_at
        timestamp ended_at
    }

    QUESTIONS {
        uuid id PK
        uuid interview_id FK
        int turn_index
        text topic
        text difficulty
        text prompt
        text expected_answer
        text source "generated|bank"
        timestamp created_at
    }

    EVALUATIONS {
        uuid id PK
        uuid question_id FK UK
        uuid interview_id FK
        text user_answer
        int correctness_score
        int clarity_score
        int depth_score
        int confidence_score
        text feedback
        text ideal_answer
        jsonb rubric
        timestamp created_at
    }

    ROADMAPS {
        uuid id PK
        uuid user_id FK
        int version
        jsonb plan
        text rationale
        timestamp created_at
    }

    MEMORY_VECTORS {
        uuid id PK
        uuid user_id FK
        text topic
        text content
        text vector_id
        float weakness_score
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }

    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        text token_hash
        timestamp expires_at
        timestamp revoked_at
    }
```

---

## 2. Table Definitions (SQL)

```sql
-- USERS
CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email             TEXT NOT NULL UNIQUE,
    password_hash     TEXT NOT NULL,
    full_name         TEXT,
    target_role       TEXT,
    experience_level  TEXT CHECK (experience_level IN ('intern','junior','mid','senior')),
    target_company    TEXT,
    readiness_score   NUMERIC(5,2) DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_email ON users(email);

-- REFRESH TOKENS
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ
);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);

-- RESUMES
CREATE TABLE resumes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_url        TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    file_size_bytes INT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'uploaded'
                    CHECK (status IN ('uploaded','parsing','parsed','failed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_resumes_user ON resumes(user_id, created_at DESC);

-- PARSED RESUME
CREATE TABLE resume_parsed (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id    UUID NOT NULL UNIQUE REFERENCES resumes(id) ON DELETE CASCADE,
    summary      TEXT,
    experience   JSONB,
    education    JSONB,
    projects     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SKILLS
CREATE TABLE skills (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id              UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    name                   TEXT NOT NULL,
    category               TEXT,
    proficiency_estimate   INT CHECK (proficiency_estimate BETWEEN 0 AND 100),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_skills_resume ON skills(resume_id);
CREATE INDEX idx_skills_name ON skills(name);

-- INTERVIEWS
CREATE TABLE interviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role                TEXT NOT NULL,
    level               TEXT NOT NULL,
    topic_focus         TEXT,
    status              TEXT NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress','completed','abandoned')),
    total_questions     INT NOT NULL DEFAULT 6,
    current_difficulty  INT NOT NULL DEFAULT 3,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at            TIMESTAMPTZ
);
CREATE INDEX idx_interviews_user ON interviews(user_id, started_at DESC);

-- QUESTIONS
CREATE TABLE questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id    UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    turn_index      INT NOT NULL,
    topic           TEXT NOT NULL,
    difficulty      TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard','expert')),
    prompt          TEXT NOT NULL,
    expected_answer TEXT,
    source          TEXT NOT NULL DEFAULT 'generated' CHECK (source IN ('generated','bank')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (interview_id, turn_index)
);
CREATE INDEX idx_questions_interview ON questions(interview_id);

-- EVALUATIONS
CREATE TABLE evaluations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id         UUID NOT NULL UNIQUE REFERENCES questions(id) ON DELETE CASCADE,
    interview_id        UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    user_answer         TEXT NOT NULL,
    correctness_score   INT NOT NULL CHECK (correctness_score BETWEEN 0 AND 100),
    clarity_score       INT NOT NULL CHECK (clarity_score BETWEEN 0 AND 100),
    depth_score         INT NOT NULL CHECK (depth_score BETWEEN 0 AND 100),
    confidence_score    INT NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    feedback            TEXT NOT NULL,
    ideal_answer        TEXT,
    rubric              JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_evaluations_interview ON evaluations(interview_id);

-- ROADMAPS
CREATE TABLE roadmaps (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version     INT NOT NULL,
    plan        JSONB NOT NULL,
    rationale   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, version)
);
CREATE INDEX idx_roadmaps_user ON roadmaps(user_id, version DESC);

-- MEMORY VECTORS (metadata only; vectors live in ChromaDB)
CREATE TABLE memory_vectors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic           TEXT NOT NULL,
    content         TEXT NOT NULL,
    vector_id       TEXT NOT NULL,
    weakness_score  REAL NOT NULL DEFAULT 0.0,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_memory_user_topic ON memory_vectors(user_id, topic);
```

---

## 3. Indexes — Quick Reference

| Table | Index | Reason |
| ----- | ----- | ------ |
| users | `email` UNIQUE | login lookup |
| resumes | `(user_id, created_at DESC)` | latest resume fetch |
| skills | `name` | gap analysis joins |
| interviews | `(user_id, started_at DESC)` | analytics queries |
| questions | `(interview_id, turn_index)` UNIQUE | replay ordering |
| evaluations | `question_id` UNIQUE | 1:1 answer→eval |
| roadmaps | `(user_id, version DESC)` | latest version fetch |
| memory_vectors | `(user_id, topic)` | per-topic retrieval |

---

## 4. Sample Analytical Queries

```sql
-- Average scores per topic for a user
SELECT q.topic,
       AVG(e.correctness_score) AS avg_correct,
       AVG(e.clarity_score)     AS avg_clarity,
       AVG(e.depth_score)       AS avg_depth
FROM evaluations e
JOIN questions  q ON q.id = e.question_id
JOIN interviews i ON i.id = e.interview_id
WHERE i.user_id = :user_id
GROUP BY q.topic
ORDER BY avg_correct ASC;

-- Readiness score trend (last 8 sessions)
SELECT date_trunc('day', i.started_at) AS day,
       AVG((e.correctness_score + e.clarity_score + e.depth_score) / 3.0) AS score
FROM interviews i
JOIN evaluations e ON e.interview_id = i.id
WHERE i.user_id = :user_id
GROUP BY day
ORDER BY day DESC
LIMIT 8;
```

---

## 5. Migrations

Use **Alembic**. Initial migration creates all tables above. Subsequent migrations are additive. The `users.readiness_score` is updated by a background job that runs after each interview completion (see `app/services/scoring.py`).
