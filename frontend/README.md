# PrepMind AI — Frontend

Next.js 14 (App Router) + TypeScript + Tailwind + shadcn-style components.

## Local setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The app is at `http://localhost:3000`.

## Layout

```
src/
  app/                 # App Router pages
    (auth)/            # /login, /signup
    (app)/             # protected: /dashboard, /interview, /analytics, /roadmap
  components/
    ui/                # primitives (button, card, input)
    interview/         # interview session UI
    dashboard/         # dashboard widgets
  lib/                 # api client, utils
  store/               # zustand stores
  types/               # TS types matching backend schemas
  hooks/               # React hooks
```

## State

- **Auth** is stored in zustand and persisted via `localStorage` access/refresh tokens.
- **Server data** uses `@tanstack/react-query` (recommended for analytics + roadmap).
- **Interview session** uses local component state — the orchestrator already manages server-side state.

## Conventions

- Server Components by default; `"use client"` only where needed.
- Use `@/lib/api` for HTTP — never call `fetch` directly.
- Tailwind + `cn()` for class composition.
