# 04 — REST API Design

Base URL: `https://api.prepmind.ai/v1`  
All endpoints return JSON. Authenticated endpoints require `Authorization: Bearer <access_token>`. Streaming endpoints use **Server-Sent Events (SSE)**.

---

## 1. Conventions

| Item | Convention |
| ---- | ---------- |
| Versioning | URL prefix `/v1` |
| Auth | JWT (Bearer) in `Authorization` header |
| IDs | UUIDv4 strings |
| Timestamps | ISO-8601 UTC |
| Errors | `{ "error": { "code": "string", "message": "string", "details": {...} } }` |
| Pagination | `?limit=20&cursor=<opaque>` for lists |
| Rate limit | 60 req/min per user (token bucket) |

Standard HTTP status codes are used. `409` for state conflicts, `422` for validation, `429` for rate limit, `401` for missing/invalid token, `403` for forbidden, `404` for missing.

---

## 2. Endpoint Map

```
/v1
├── /auth
│   ├── POST   /signup
│   ├── POST   /login
│   ├── POST   /refresh
│   ├── POST   /logout
│   └── GET    /me
│
├── /resumes
│   ├── POST   /upload
│   ├── GET    /latest
│   ├── GET    /{resume_id}
│   ├── GET    /{resume_id}/skills
│   └── GET    /{resume_id}/gap-analysis
│
├── /interviews
│   ├── POST   /                              # start interview
│   ├── GET    /                              # list user's interviews
│   ├── GET    /{interview_id}
│   ├── POST   /{interview_id}/answers        # submit answer
│   ├── POST   /{interview_id}/stream         # SSE stream of next events
│   ├── POST   /{interview_id}/end
│   └── GET    /{interview_id}/report
│
├── /roadmaps
│   ├── GET    /latest
│   ├── POST   /regenerate
│   └── GET    /{roadmap_id}
│
├── /analytics
│   ├── GET    /overview
│   ├── GET    /topic-heatmap
│   ├── GET    /score-trend
│   └── GET    /weak-topics
│
└── /health
    └── GET    /
```

---

## 3. Auth Endpoints

### `POST /auth/signup`

```jsonc
// Request
{
  "email": "aarav@example.com",
  "password": "S3cure!pass",
  "full_name": "Aarav Sharma"
}

// 201 Response
{
  "user": { "id": "...", "email": "...", "full_name": "..." },
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### `POST /auth/login`

```jsonc
{ "email": "aarav@example.com", "password": "S3cure!pass" }
```

Returns same shape as signup.

### `POST /auth/refresh`

```jsonc
{ "refresh_token": "eyJ..." }
```

Rotates refresh token; old one is revoked.

### `GET /auth/me`

Returns current user profile (no password hash).

---

## 4. Resume Endpoints

### `POST /resumes/upload` (multipart)

`file: <pdf>`, `target_role: string`, `experience_level: string`, `target_company?: string`

Response (202 — async parsing):

```jsonc
{
  "resume_id": "...",
  "status": "parsing",
  "estimated_seconds": 8
}
```

The client polls `GET /resumes/{id}` until `status == "parsed"` or opens an SSE on `/resumes/{id}/stream` for live progress.

### `GET /resumes/{id}/gap-analysis`

```jsonc
{
  "target_role": "Backend Engineer",
  "matched_skills": [{"name": "Python", "proficiency": 80}],
  "missing_skills": [
    {"name": "System Design", "priority": "high"},
    {"name": "Kubernetes", "priority": "medium"}
  ],
  "readiness_score": 62.5,
  "rationale": "Strong fundamentals in Python and SQL; missing depth in distributed systems."
}
```

---

## 5. Interview Endpoints

### `POST /interviews`

```jsonc
{
  "role": "Backend Engineer",
  "level": "mid",
  "topic_focus": "distributed systems",
  "total_questions": 6
}
```

Returns interview id and the first question synchronously:

```jsonc
{
  "interview_id": "...",
  "question": {
    "id": "...",
    "turn_index": 1,
    "topic": "caching",
    "difficulty": "medium",
    "prompt": "Explain cache stampede and how you would prevent it."
  }
}
```

### `POST /interviews/{id}/answers`

```jsonc
{
  "question_id": "...",
  "answer": "Cache stampede happens when..."
}
```

Response:

```jsonc
{
  "evaluation": {
    "correctness_score": 78,
    "clarity_score": 65,
    "depth_score": 60,
    "confidence_score": 70,
    "feedback": "Good core idea. Missing: ...",
    "ideal_answer": "A cache stampede occurs when...",
    "rubric": { "strengths": [...], "gaps": [...] }
  },
  "next_question": {
    "id": "...",
    "turn_index": 2,
    "topic": "rate limiting",
    "difficulty": "hard",
    "prompt": "Design a rate limiter for a public API..."
  },
  "rationale": "You handled caching well. Pushing into rate limiting, a related but harder topic."
}
```

`next_question` is `null` when the session is over.

### `POST /interviews/{id}/stream`

SSE stream. Each event is a JSON object:

```
event: question
data: { "turn_index": 3, "prompt": "..." }

event: evaluation
data: { "scores": {...}, "feedback": "..." }

event: complete
data: { "summary": "..." }
```

### `GET /interviews/{id}/report`

Full session report including all questions, answers, evaluations, and a top-level summary.

---

## 6. Roadmap Endpoints

### `GET /roadmaps/latest`

Returns latest roadmap version with plan JSON.

### `POST /roadmaps/regenerate`

Triggers regeneration based on most recent evaluations. Returns the new roadmap.

Plan shape:

```jsonc
{
  "version": 3,
  "duration_days": 30,
  "weeks": [
    {
      "week": 1,
      "focus": "Data modeling + SQL",
      "tasks": [
        { "day": 1, "title": "Review normalization", "type": "study", "minutes": 45 },
        { "day": 2, "title": "Solve 5 LeetCode SQL problems", "type": "practice" }
      ]
    }
  ],
  "projects": [
    { "name": "URL Shortener", "why": "Demonstrates caching + hashing" }
  ],
  "rationale": "Pushing SQL and system design to weeks 1–2..."
}
```

---

## 7. Analytics Endpoints

### `GET /analytics/overview`

```jsonc
{
  "total_interviews": 12,
  "average_score": 71.4,
  "streak_days": 5,
  "readiness_score": 68.2,
  "top_strength": "Python",
  "top_weakness": "System Design"
}
```

### `GET /analytics/topic-heatmap`

```jsonc
{
  "topics": [
    { "topic": "SQL", "score": 82, "attempts": 6 },
    { "topic": "System Design", "score": 41, "attempts": 4 }
  ]
}
```

### `GET /analytics/score-trend?days=30`

```jsonc
{ "points": [{ "date": "2026-05-01", "score": 55 }, ...] }
```

### `GET /analytics/weak-topics?limit=5`

Returns top weak topics from vector memory.

---

## 8. Error Format

```jsonc
{
  "error": {
    "code": "RESUME_PARSE_FAILED",
    "message": "We could not extract text from this PDF.",
    "details": { "reason": "encrypted_pdf" }
  }
}
```

Common codes:

| Code | HTTP | Meaning |
| ---- | ---- | ------- |
| `VALIDATION_ERROR` | 422 | Bad request body |
| `UNAUTHORIZED` | 401 | Missing/invalid token |
| `FORBIDDEN` | 403 | Auth ok, not allowed |
| `NOT_FOUND` | 404 | Resource missing |
| `RESUME_PARSE_FAILED` | 422 | PDF unreadable |
| `LLM_TIMEOUT` | 504 | Model slow — retry |
| `RATE_LIMITED` | 429 | Slow down |
| `INTERNAL` | 500 | Server error |

---

## 9. Rate Limiting

Per-user token bucket. Burst = 60, refill = 60/min. `429` responses include `Retry-After` header.

---

## 10. OpenAPI

FastAPI auto-generates OpenAPI at `/v1/docs` (Swagger) and `/v1/redoc`. Schemas are Pydantic v2 models shared between routers and services.
