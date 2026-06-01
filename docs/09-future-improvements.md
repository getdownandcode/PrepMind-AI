# 09 — Future Improvements

The MVP is intentionally narrow. These are the highest-leverage next steps, in priority order, once traction is validated.

---

## 1. Voice Interviews (Q3)

Add **real-time voice interviews** using a streaming speech-to-text pipeline (Deepgram or Whisper) + text-to-speech for the AI (ElevenLabs). The orchestrator stays identical — only the I/O changes.

- Streaming transcripts to the UI (already done for text).
- Prosody-based confidence scoring (pace, filler words, pauses).
- Per-region accent support.

**Why later:** Voice adds latency, error modes, and significant cost. The text interview is the right MVP scope.

---

## 2. Company-Specific Question Banks

The MVP uses generic role-based generation. The post-MVP step is to add curated question banks per company / role combination:

- `bank.faang.backend.mid.json`
- `bank.startup.ml.junior.json`

Combine **retrieval** (RAG over the bank) with **generation** (LLM adapts the question to the user's profile). Track which questions get reused → measure helpfulness.

---

## 3. Live Coding Mode

Add a Monaco-based code editor embedded in the interview:

- User writes code in-browser; runs against hidden tests.
- LLM evaluates **time complexity, edge cases, naming**.
- Adds a third axis: `code_score` (correctness + complexity + style).

This single feature dramatically increases the "real interview" feeling.

---

## 4. Behavioral / System Design Modules

Two missing pillars of any real interview:

- **Behavioral:** STAR-format prompts, story bank for the user, evaluation rubric.
- **System design:** whiteboard-style component diagrams (Excalidraw embed), incremental probing ("now add auth", "now 100× traffic").

---

## 5. Mock Interviewer Personality Modes

Offer interviewer personas:
- Friendly mentor
- Strict bar-raiser
- Startup generalist

Different prompting style, different evaluation strictness, different feedback tone. The orchestrator is unchanged; only the system prompt and the evaluation rubric vary.

---

## 6. Calendar & Spaced Repetition

A real prep tool is one that **revisits the right thing at the right time**. Add:

- Spaced repetition for weak topics (Anki-style).
- Calendar view of the roadmap with auto-scheduled sessions.
- Email reminders ("Your SQL drill is due today").

This is the difference between a tool users *try* and one users *retain*.

---

## 7. Team & Mentor Plans

Multi-seat accounts for:

- University career services.
- Coding bootcamps.
- Engineering managers prepping their reports.

Adds: org accounts, seat management, mentor review mode (mentor can leave comments on student sessions).

---

## 8. Outcome Tracking

The most credible product metric is **interview → offer rate**. Add:

- Optional "did you get the job?" prompt after each real interview.
- Anonymous aggregate reporting: "Users who did 20+ PrepMind sessions had a 2.1× higher callback rate." (with consent)
- This is also the strongest marketing claim.

---

## 9. Pluggable LLM Providers

The MVP uses a single provider (Google Gemini 2.5 Flash). Post-MVP, add:

- **Anthropic Claude** as first-class (better long-context for resume).
- **Local models** (Ollama) for privacy-sensitive users.
- **Bring-your-own-key** for power users.

The orchestrator speaks only to `app/core/llm.py`. Adding a provider is one new file plus a config switch.

---

## 10. Stronger Evaluation: Rubric Library

Replace free-form evaluation prompts with **versioned rubric libraries**:

- `rubrics/backend.mid.sql.v2.json`
- `rubrics/frontend.junior.react.v1.json`

Each rubric is a tree of criteria with weights. The LLM fills in scores + quotes; the rubric is deterministic. This makes evaluation:

- More consistent across runs.
- Easier to A/B test.
- Auditable (important if sold to enterprises).

---

## 11. Resume Rewriter & Project Suggester

Adjacent products that share 80% of the existing data:

- **Resume rewriter:** for each missing skill, suggest one bullet point to add.
- **Project suggester:** based on weak skills, propose 3 portfolio projects with scope and acceptance criteria.

Easy upsells, very low marginal cost (mostly prompt engineering).

---

## 12. Native Mobile (PWA First)

A PWA version of the interview page is the right next step. Native iOS/Android is overkill until usage data justifies it.

---

## 13. Open Source / Community

Long-term: open-source the **agent graph + prompt library** (not the user data or the brand). Benefits:

- Recruiters see the engineering.
- Community contributes rubrics and prompts.
- The product becomes "the open standard for AI interview prep."

---

## 14. Things we will NOT do

To stay focused and ship-quality, we will resist:

- Building a generic "AI tutor" (loses focus).
- Replacing the orchestrator with multi-agent hype.
- Adding a mobile app before PWA.
- Custom ML training. Prompt + retrieval is enough for years.
