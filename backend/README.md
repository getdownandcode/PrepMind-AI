# PrepMind AI — Backend

FastAPI + SQLAlchemy 2 (async) + ChromaDB + Google Gemini 2.5 Flash.

## Local setup

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env
# fill in keys
alembic upgrade head
uvicorn app.main:app --reload
```

The API is at `http://localhost:8000`. OpenAPI at `/v1/docs`.

## Layout

```
app/
  api/v1/        # HTTP routers
  core/          # config, security, LLM client
  db/            # session, base
  models/        # SQLAlchemy models
  schemas/       # Pydantic API schemas
  services/      # business logic
  agents/        # state graph + nodes
  memory/        # ChromaDB wrapper
  prompts/       # versioned prompt templates
  utils/         # helpers
alembic/         # migrations
```

## Key concepts

- **LLM client (`app/core/llm.py`)** is the only place that talks to Gemini 2.5 Flash.
  Every structured call returns a Pydantic model with one retry on failure.
- **Orchestrator (`app/agents/orchestrator.py`)** runs the interview loop
  as a sequence of async node calls merging into a shared `InterviewState`.
- **Vector memory (`app/memory/vector.py`)** is wrapped in a tiny abstraction
  so the storage backend is swappable.
- **Prompts (`app/prompts/`)** are version-controlled strings, not inline.

## Tests

```bash
pytest -q
```
