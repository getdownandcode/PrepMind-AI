"""Interview router: start, submit answer, stream, report."""
from __future__ import annotations

import json
import uuid
from collections.abc import AsyncGenerator
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select

from app.agents.orchestrator import InterviewOrchestrator
from app.agents.state import InterviewState
from app.api.deps import CurrentUser, DbDep
from app.memory import vector as vmem
from app.models.interview import Evaluation, Interview, Question

router = APIRouter(prefix="/interviews", tags=["interviews"])


class StartInterviewRequest(BaseModel):
    role: str
    level: Literal["intern", "junior", "mid", "senior"]
    topic_focus: str | None = None
    total_questions: int = 6


class AnswerRequest(BaseModel):
    question_id: uuid.UUID
    answer: str


@router.post("")
async def start_interview(payload: StartInterviewRequest, user: CurrentUser, db: DbDep):
    interview = Interview(
        user_id=user.id,
        role=payload.role,
        level=payload.level,
        topic_focus=payload.topic_focus,
        total_questions=payload.total_questions,
    )
    db.add(interview)
    await db.commit()
    await db.refresh(interview)

    weak = vmem.get_top_weak_topics(str(user.id), k=3)
    state: InterviewState = {
        "user_id": str(user.id),
        "interview_id": str(interview.id),
        "role": payload.role,
        "level": payload.level,
        "topic_focus": payload.topic_focus,
        "questions": [],
        "evaluations": [],
        "current_question": None,
        "current_difficulty": "medium",
        "current_topic": "",
        "weak_topics": [w["topic"] for w in weak],
        "mastered_topics": [],
        "turn": 0,
        "max_turns": payload.total_questions,
        "is_complete": False,
        "last_rationale": "start",
        "profile_summary": user.full_name or "",
        "matched_skills": [],
        "weak_skills": [w["topic"] for w in weak],
        "user_answer": None,
    }

    orchestrator = InterviewOrchestrator(state)
    await orchestrator.generate_next_question()
    q = orchestrator.state["current_question"]

    db.add(
        Question(
            id=uuid.uuid4(),
            interview_id=interview.id,
            turn_index=q["turn_index"],
            topic=q["topic"],
            difficulty=q["difficulty"],
            prompt=q["prompt"],
            expected_answer=q.get("expected_answer"),
            source="generated",
        )
    )
    await db.commit()

    return {
        "interview_id": str(interview.id),
        "question": {
            "id": str(orchestrator.state.get("current_question_id", "")) or _qid_for_turn(db, interview.id, q["turn_index"]),
            "turn_index": q["turn_index"],
            "topic": q["topic"],
            "difficulty": q["difficulty"],
            "prompt": q["prompt"],
        },
        "rationale": q.get("rationale", ""),
    }


def _qid_for_turn(db, interview_id, turn_index) -> str:
    # helper to fetch the persisted question id by turn
    # implemented inline as an async helper
    raise NotImplementedError  # callers should use the explicit return below


@router.post("/{interview_id}/answers")
async def submit_answer(interview_id: uuid.UUID, payload: AnswerRequest, user: CurrentUser, db: DbDep):
    interview = await _get_owned_interview(db, interview_id, user.id)
    if interview.status != "in_progress":
        raise HTTPException(409, "Interview not in progress")

    # Build minimal state from DB (in a real impl we'd rehydrate from memory/cache)
    state = await _rehydrate_state(db, interview)
    state["user_answer"] = payload.answer

    orchestrator = InterviewOrchestrator(state)
    await orchestrator.submit_answer(payload.answer)

    # Persist evaluation
    last_eval = orchestrator.state["evaluations"][-1]
    question = await _get_question_by_turn(db, interview.id, state["turn"] - 1 if orchestrator.state.get("turn") else 0)
    # The above may not always match; safer: match by id from last question in DB
    last_question = await _get_last_question(db, interview.id)
    db.add(
        Evaluation(
            question_id=last_question.id,
            interview_id=interview.id,
            user_answer=payload.answer,
            correctness_score=last_eval["correctness_score"],
            clarity_score=last_eval["clarity_score"],
            depth_score=last_eval["depth_score"],
            confidence_score=last_eval["confidence_score"],
            feedback=last_eval["feedback"],
            ideal_answer=last_eval["ideal_answer"],
            rubric=last_eval["rubric"],
        )
    )

    next_q_payload = None
    if not orchestrator.is_complete():
        await orchestrator.generate_next_question()
        nq = orchestrator.state["current_question"]
        db.add(
            Question(
                id=uuid.uuid4(),
                interview_id=interview.id,
                turn_index=nq["turn_index"],
                topic=nq["topic"],
                difficulty=nq["difficulty"],
                prompt=nq["prompt"],
                expected_answer=nq.get("expected_answer"),
                source="generated",
            )
        )
        next_q_payload = {
            "turn_index": nq["turn_index"],
            "topic": nq["topic"],
            "difficulty": nq["difficulty"],
            "prompt": nq["prompt"],
        }
    else:
        interview.status = "completed"
        from datetime import datetime, timezone

        interview.ended_at = datetime.now(timezone.utc)

    await db.commit()

    return {
        "evaluation": last_eval,
        "next_question": next_q_payload,
        "rationale": orchestrator.state.get("last_rationale", ""),
        "is_complete": orchestrator.is_complete(),
    }


@router.post("/{interview_id}/stream")
async def stream_interview(interview_id: uuid.UUID, user: CurrentUser, db: DbDep) -> StreamingResponse:
    """SSE endpoint that streams the orchestrator's events for one turn."""
    interview = await _get_owned_interview(db, interview_id, user.id)
    state = await _rehydrate_state(db, interview)
    orchestrator = InterviewOrchestrator(state)
    await orchestrator.generate_next_question()
    q = orchestrator.state["current_question"]

    async def gen() -> AsyncGenerator[bytes, None]:
        yield _sse("question", {"turn_index": q["turn_index"], "topic": q["topic"], "prompt": q["prompt"]})
        # In a real streaming impl, the answer submit happens via a separate POST.
        yield _sse("complete", {"summary": "Awaiting answer"})

    return StreamingResponse(gen(), media_type="text/event-stream")


def _sse(event: str, data: dict) -> bytes:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n".encode()


async def _get_owned_interview(db, interview_id, user_id) -> Interview:
    res = await db.execute(
        select(Interview).where(Interview.id == interview_id, Interview.user_id == user_id)
    )
    interview = res.scalar_one_or_none()
    if not interview:
        raise HTTPException(404, "Interview not found")
    return interview


async def _get_last_question(db, interview_id) -> Question:
    res = await db.execute(
        select(Question).where(Question.interview_id == interview_id).order_by(Question.turn_index.desc()).limit(1)
    )
    q = res.scalar_one()
    return q


async def _get_question_by_turn(db, interview_id, turn: int) -> Question | None:
    res = await db.execute(
        select(Question).where(Question.interview_id == interview_id, Question.turn_index == turn)
    )
    return res.scalar_one_or_none()


async def _rehydrate_state(db, interview: Interview) -> InterviewState:
    questions = list(interview.questions)
    evals = list(interview.evaluations)
    return {
        "user_id": str(interview.user_id),
        "interview_id": str(interview.id),
        "role": interview.role,
        "level": interview.level,
        "topic_focus": interview.topic_focus,
        "questions": [
            {
                "id": str(q.id),
                "turn_index": q.turn_index,
                "topic": q.topic,
                "difficulty": q.difficulty,
                "prompt": q.prompt,
                "expected_answer": q.expected_answer,
            }
            for q in questions
        ],
        "evaluations": [
            {
                "question_id": str(e.question_id),
                "correctness_score": e.correctness_score,
                "clarity_score": e.clarity_score,
                "depth_score": e.depth_score,
                "confidence_score": e.confidence_score,
                "feedback": e.feedback,
                "ideal_answer": e.ideal_answer or "",
                "rubric": e.rubric or {},
            }
            for e in evals
        ],
        "current_question": None,
        "current_difficulty": "medium",
        "current_topic": questions[-1].topic if questions else "",
        "weak_topics": [],
        "mastered_topics": [],
        "turn": len(questions),
        "max_turns": interview.total_questions,
        "is_complete": interview.status == "completed",
        "last_rationale": "",
        "profile_summary": "",
        "matched_skills": [],
        "weak_skills": [],
        "user_answer": None,
    }
