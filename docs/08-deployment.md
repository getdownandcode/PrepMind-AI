# 08 — Deployment Guide

Goal: **one-command deploy** for both frontend and backend, with managed Postgres and a persistent disk for ChromaDB. Total cost at MVP scale: < $40/month.

---

## 1. Architecture Summary

```mermaid
graph LR
    V[Vercel<br/>Next.js] --> R[Render<br/>FastAPI]
    R --> N[(Neon Postgres)]
    R --> D[(Render Disk<br/>ChromaDB)]
    R --> O[Gemini 2.5 Flash API]
    U([User]) --> V
```

---

## 2. Frontend (Vercel)

### Steps
1. Push repo to GitHub.
2. Import into Vercel.
3. Set **Root Directory** to `frontend`.
4. Add env vars:
   - `NEXT_PUBLIC_API_URL` = `https://api.prepmind.ai`
5. Framework preset: Next.js (auto-detected).
6. Deploy.

### Custom domain
Add `prepmind.ai` in Vercel → DNS via your registrar. Vercel handles TLS.

### Build settings (auto)
- Build: `pnpm build` (or `next build`)
- Output: `.next`
- Install: `pnpm install`

### Performance
- Use `next/image` and `next/font`.
- Edge caching for static pages.
- Dynamic = force-dynamic for the interview page (no caching).

---

## 3. Backend (Render)

### Service type
**Web Service** (Docker) or **Web Service** (Python) — Docker is recommended because it pins the Python version and lets us include ffmpeg/poppler-utils if needed for PDF fallbacks.

### Dockerfile (included)
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir -e .

COPY . .

ENV PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Render config
- Region: closest to majority of users (e.g. `oregon`).
- Plan: **Starter** ($7/mo) for MVP, scale to Standard when traffic grows.
- Health check path: `/v1/health`.
- Persistent disk:
  - Name: `chroma`
  - Mount path: `/var/data/chroma`
  - Size: 1 GB (plenty for thousands of users)

### Env vars
| Var | Example |
| --- | ------- |
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@host/db` |
| `JWT_SECRET` | 64-char random |
| `JWT_ALG` | `HS256` |
| `GEMINI_API_KEY` | Google AI Studio key |
| `CHROMA_PATH` | `/var/data/chroma` |
| `CORS_ORIGINS` | `https://prepmind.ai,http://localhost:3000` |
| `ENV` | `production` |

### Migrations
Run as a one-off job before first deploy:
```bash
render exec --service prepmind-api -- alembic upgrade head
```

Subsequent deploys: a **pre-deploy command** runs `alembic upgrade head` automatically (configure in Render).

---

## 4. Database (Neon)

- **Neon** free tier is enough for MVP; upgrade when approaching limits.
- Create a project, copy the connection string.
- Set `DATABASE_URL` on Render.
- Enable **connection pooling** in Neon for serverless friendliness.
- Run initial migration via Render shell.

### Backups
Neon auto-backups; restore via dashboard. For manual snapshots, `pg_dump` weekly.

---

## 5. Vector Store (ChromaDB on Render Disk)

ChromaDB persists to a directory. On Render, mount a disk at `/var/data/chroma` and set `CHROMA_PATH=/var/data/chroma`.

**Why this works:** Chroma is a small library; SQLite-backed by default; fast for ≤ 100k vectors.

**Migration path:** if you need scale, swap to `pgvector` (Neon supports it) or `pinecone`. The `app/memory/vector.py` abstraction makes this a 1-file change.

---

## 6. Environment Variables — Master List

### Frontend
```
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_POSTHOG_KEY        # optional analytics
NEXT_PUBLIC_SENTRY_DSN         # optional error tracking
```

### Backend
```
ENV
DATABASE_URL
JWT_SECRET
JWT_ACCESS_TTL_MIN
JWT_REFRESH_TTL_DAYS
GEMINI_API_KEY                 # required: Google AI Studio key
CHROMA_PATH
CORS_ORIGINS
S3_BUCKET                      # for production file storage
S3_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
LOG_LEVEL
SENTRY_DSN
```

---

## 7. CI/CD

Use **GitHub Actions** (or Render's built-in deploy on push).

Minimal workflow (`.github/workflows/ci.yml`):
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -e .[dev]
      - run: pytest -q
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
        working-directory: frontend
      - run: pnpm lint && pnpm type-check
        working-directory: frontend
```

---

## 8. Observability

- **Sentry** for both frontend and backend.
- **Structured JSON logs** to stdout; Render captures them.
- **PostHog** (or Plausible) for product analytics.
- **Uptime monitoring**: UptimeRobot on `/v1/health`.

---

## 9. Security Checklist

- [x] All secrets in env vars, never in code.
- [x] HTTPS only (Vercel + Render both default to TLS).
- [x] CORS allowlist, no wildcards in production.
- [x] Rate limiting on auth + interview endpoints.
- [x] bcrypt for passwords, never MD5/SHA.
- [x] JWT secret rotated quarterly.
- [x] File uploads validated by MIME + size, stored outside web root.
- [x] Helmet-style security headers via FastAPI middleware.
- [x] No PII in LLM prompts beyond what's needed; offer "delete my data" in settings.

---

## 10. Cost Estimate (MVP, 1k users)

| Service | Plan | Cost |
| ------- | ---- | ---- |
| Vercel | Hobby/Pro | $0–$20 |
| Render | Starter | $7 |
| Neon | Free / Launch | $0–$19 |
| Render disk | 1 GB | included |
| Gemini 2.5 Flash | Free tier: 10 RPM / 250 RPD; pay-as-you-go above | $0–$30 |
| **Total** | | **~$60–$80/mo at 1k MAU** |

Gemini 2.5 Flash's free tier is generous for MVP-scale traffic. Mitigation if cost grows: cache question templates, batch evals where possible.
