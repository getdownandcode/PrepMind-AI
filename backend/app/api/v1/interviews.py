"""Interview router: start, submit answer, stream, report."""
from __future__ import annotations

import json
import uuid
from collections.abc import AsyncGenerator
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from app.core.llm import get_llm

from app.agents.orchestrator import InterviewOrchestrator
from app.agents.state import InterviewState
from app.api.deps import CurrentUser, DbDep
from app.memory import vector as vmem
from app.models.interview import Evaluation, Interview, Question, Roadmap
from app.models.resume import ResumeParsed, Skill

router = APIRouter(prefix="/interviews", tags=["interviews"])


class StartInterviewRequest(BaseModel):
    role: str
    level: Literal["intern", "junior", "mid", "senior"]
    topic_focus: str | None = None
    resume_id: uuid.UUID | None = None
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
        resume_id=payload.resume_id,
        total_questions=payload.total_questions,
    )
    db.add(interview)
    await db.commit()
    await db.refresh(interview)

    profile_summary = ""
    matched_skills = []
    if payload.resume_id:
        res_parsed = await db.execute(
            select(ResumeParsed).where(ResumeParsed.resume_id == payload.resume_id)
        )
        parsed_record = res_parsed.scalar_one_or_none()
        if parsed_record:
            profile_summary = parsed_record.summary or ""
        
        res_skills = await db.execute(
            select(Skill).where(Skill.resume_id == payload.resume_id)
        )
        skills_records = res_skills.scalars().all()
        matched_skills = [s.name for s in skills_records]

    weak = vmem.get_top_weak_topics(str(user.id), k=3)
    initial_weak_skills = matched_skills[:3] if matched_skills else [w["topic"] for w in weak]

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
        "weak_topics": initial_weak_skills,
        "mastered_topics": [],
        "turn": 0,
        "max_turns": payload.total_questions,
        "is_complete": False,
        "last_rationale": "start",
        "profile_summary": profile_summary or user.full_name or "",
        "matched_skills": matched_skills,
        "weak_skills": initial_weak_skills,
        "user_answer": None,
    }

    orchestrator = InterviewOrchestrator(state)
    await orchestrator.generate_next_question()
    q = orchestrator.state["current_question"]

    question_id = uuid.uuid4()
    db.add(
        Question(
            id=question_id,
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
            "id": str(question_id),
            "turn_index": q["turn_index"],
            "topic": q["topic"],
            "difficulty": q["difficulty"],
            "prompt": q["prompt"],
        },
        "rationale": q.get("rationale", ""),
    }


@router.get("")
async def list_interviews(user: CurrentUser, db: DbDep):
    res = await db.execute(
        select(Interview)
        .options(
            selectinload(Interview.questions),
            selectinload(Interview.evaluations)
        )
        .where(Interview.user_id == user.id)
        .order_by(Interview.started_at.desc())
    )
    interviews = res.scalars().all()
    return [
        {
            "id": str(i.id),
            "role": i.role,
            "level": i.level,
            "status": i.status,
            "started_at": i.started_at.isoformat() if i.started_at else None,
            "ended_at": i.ended_at.isoformat() if i.ended_at else None,
            "total_questions": i.total_questions,
            "turns_completed": len(i.evaluations),
            "average_score": int(sum(e.correctness_score for e in i.evaluations) / len(i.evaluations)) if i.evaluations else 0,
        }
        for i in interviews
    ]


@router.get("/analytics/summary")
async def get_analytics(user: CurrentUser, db: DbDep):
    res = await db.execute(
        select(Evaluation)
        .join(Interview)
        .options(selectinload(Evaluation.question))
        .where(Interview.user_id == user.id)
    )
    evals = res.scalars().all()
    
    # Calculate total interviews
    res_interviews = await db.execute(
        select(Interview).where(Interview.user_id == user.id)
    )
    total_interviews = len(res_interviews.scalars().all())
    
    if not evals:
        return {
            "average_score": 0,
            "best_topic": "None yet",
            "weakest_topic": "None yet",
            "readiness_score": user.readiness_score or 0,
            "total_interviews": total_interviews,
            "topic_scores": [],
            "history": []
        }
        
    topic_scores = {}
    for e in evals:
        t = e.question.topic if e.question else "General"
        if t not in topic_scores:
            topic_scores[t] = []
        topic_scores[t].append(e.correctness_score)
        
    topic_averages = {
        t: int(sum(scores) / len(scores))
        for t, scores in topic_scores.items()
    }
    
    sorted_topics = sorted(topic_averages.items(), key=lambda x: x[1])
    weakest = sorted_topics[0][0] if sorted_topics else "None yet"
    best = sorted_topics[-1][0] if sorted_topics else "None yet"
    
    total_score = sum(e.correctness_score for e in evals)
    avg_score = int(total_score / len(evals))
    
    history = [
        {
            "date": e.created_at.strftime("%b %d") if e.created_at else "Today",
            "score": e.correctness_score,
            "topic": e.question.topic if e.question else "General"
        }
        for e in evals[-10:]
    ]
    
    return {
        "average_score": avg_score,
        "best_topic": best,
        "weakest_topic": weakest,
        "readiness_score": user.readiness_score or 0,
        "total_interviews": total_interviews,
        "topic_scores": [{"topic": t, "score": s} for t, s in topic_averages.items()],
        "history": history
    }


class CreateRoadmapRequest(BaseModel):
    role: str
    level: str
    redo_id: uuid.UUID | None = None


class RoadmapSteps(BaseModel):
    title: str
    steps: list[str]


class ToggleStepRequest(BaseModel):
    step_index: int


@router.get("/roadmap/custom")
async def get_roadmap(user: CurrentUser, db: DbDep):
    res = await db.execute(
        select(Roadmap).where(Roadmap.user_id == user.id, Roadmap.is_active == True)
    )
    active = res.scalar_one_or_none()
    
    if not active:
        return {
            "title": "General Prep Roadmap",
            "role": "software engineer",
            "level": "mid",
            "steps": [
                {"title": "Review core backend fundamentals", "completed": False},
                {"title": "Practice concurrency and race-condition questions", "completed": False},
                {"title": "Drill system design tradeoffs", "completed": False},
                {"title": "Run a timed mock interview", "completed": False}
            ]
        }
        
    return {
        "id": str(active.id),
        "title": active.title,
        "role": active.role,
        "level": active.level,
        "steps": active.steps,
    }

@router.get("/roadmaps")
async def list_user_roadmaps(user: CurrentUser, db: DbDep):
    res = await db.execute(
        select(Roadmap)
        .where(Roadmap.user_id == user.id)
        .order_by(Roadmap.created_at.desc())
    )
    return res.scalars().all()


@router.post("/roadmaps")
async def create_user_roadmap(payload: CreateRoadmapRequest, user: CurrentUser, db: DbDep):
    system_prompt = (
        f"You are an expert technical interviewer and lead engineer. Generate a structured 4-step preparation roadmap "
        f"for a {payload.level} level {payload.role} engineer. Focus on specific technical topics, libraries, "
        f"and design patterns relevant to {payload.role} at a {payload.level} level. Keep each step descriptive and under 15 words."
    )
    user_prompt = "Generate the roadmap title and the 4 steps as a list of strings."
    
    llm = get_llm()
    result = await llm.generate_structured(
        system=system_prompt,
        user=user_prompt,
        schema=RoadmapSteps,
    )
    
    # Set other roadmaps to inactive
    await db.execute(
        update(Roadmap).where(Roadmap.user_id == user.id).values(is_active=False)
    )
    
    new_roadmap = Roadmap(
        user_id=user.id,
        title=result.title or f"{payload.level.capitalize()} {payload.role.capitalize()} Prep",
        role=payload.role,
        level=payload.level,
        steps=[{"title": step, "completed": False} for step in result.steps[:4]],
        is_active=True
    )
    db.add(new_roadmap)
    
    if payload.redo_id:
        old = await db.get(Roadmap, payload.redo_id)
        if old and old.user_id == user.id:
            await db.delete(old)
            
    await db.commit()
    await db.refresh(new_roadmap)
    return new_roadmap


@router.put("/roadmaps/{roadmap_id}/activate")
async def activate_roadmap(roadmap_id: uuid.UUID, user: CurrentUser, db: DbDep):
    await db.execute(
        update(Roadmap).where(Roadmap.user_id == user.id).values(is_active=False)
    )
    res = await db.execute(
        select(Roadmap).where(Roadmap.id == roadmap_id, Roadmap.user_id == user.id)
    )
    roadmap = res.scalar_one_or_none()
    if not roadmap:
        raise HTTPException(404, "Roadmap not found")
    roadmap.is_active = True
    await db.commit()
    await db.refresh(roadmap)
    return roadmap


@router.put("/roadmaps/{roadmap_id}/toggle-step")
async def toggle_roadmap_step(roadmap_id: uuid.UUID, payload: ToggleStepRequest, user: CurrentUser, db: DbDep):
    res = await db.execute(
        select(Roadmap).where(Roadmap.id == roadmap_id, Roadmap.user_id == user.id)
    )
    roadmap = res.scalar_one_or_none()
    if not roadmap:
        raise HTTPException(404, "Roadmap not found")
        
    steps = list(roadmap.steps)
    if payload.step_index < 0 or payload.step_index >= len(steps):
        raise HTTPException(400, "Invalid step index")
        
    steps[payload.step_index]["completed"] = not steps[payload.step_index]["completed"]
    
    from sqlalchemy.orm.attributes import flag_modified
    roadmap.steps = steps
    flag_modified(roadmap, "steps")
    
    await db.commit()
    await db.refresh(roadmap)
    return roadmap


@router.delete("/roadmaps/{roadmap_id}")
async def delete_roadmap(roadmap_id: uuid.UUID, user: CurrentUser, db: DbDep):
    res = await db.execute(
        select(Roadmap).where(Roadmap.id == roadmap_id, Roadmap.user_id == user.id)
    )
    roadmap = res.scalar_one_or_none()
    if not roadmap:
        raise HTTPException(404, "Roadmap not found")
        
    was_active = roadmap.is_active
    await db.delete(roadmap)
    await db.commit()
    
    if was_active:
        res_next = await db.execute(
            select(Roadmap)
            .where(Roadmap.user_id == user.id)
            .order_by(Roadmap.created_at.desc())
            .limit(1)
        )
        next_r = res_next.scalar_one_or_none()
        if next_r:
            next_r.is_active = True
            await db.commit()
            
    return {"status": "deleted"}


@router.get("/{interview_id}")
async def get_interview(interview_id: uuid.UUID, user: CurrentUser, db: DbDep):
    interview = await _get_owned_interview(db, interview_id, user.id)
    try:
        last_question = await _get_last_question(db, interview.id)
    except Exception:
        raise HTTPException(404, "No questions generated for this interview yet")
    return {
        "interview_id": str(interview.id),
        "question": {
            "id": str(last_question.id),
            "turn_index": last_question.turn_index,
            "topic": last_question.topic,
            "difficulty": last_question.difficulty,
            "prompt": last_question.prompt,
        },
        "rationale": "Resumed interview session.",
    }


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
        next_question_id = uuid.uuid4()
        db.add(
            Question(
                id=next_question_id,
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
            "id": str(next_question_id),
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


@router.post("/{interview_id}/quit")
async def quit_interview(interview_id: uuid.UUID, user: CurrentUser, db: DbDep):
    interview = await _get_owned_interview(db, interview_id, user.id)
    if interview.status == "in_progress":
        interview.status = "aborted"
        from datetime import datetime, timezone
        interview.ended_at = datetime.now(timezone.utc)
        await db.commit()
    return {"status": "aborted"}



def _sse(event: str, data: dict) -> bytes:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n".encode()


async def _get_owned_interview(db, interview_id, user_id) -> Interview:
    res = await db.execute(
        select(Interview)
        .options(
            selectinload(Interview.questions),
            selectinload(Interview.evaluations)
        )
        .where(Interview.id == interview_id, Interview.user_id == user_id)
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
    last_q = questions[-1] if questions else None
    current_q_payload = {
        "id": str(last_q.id),
        "turn_index": last_q.turn_index,
        "topic": last_q.topic,
        "difficulty": last_q.difficulty,
        "prompt": last_q.prompt,
        "expected_answer": last_q.expected_answer,
    } if last_q else None

    # Load resume details if linked
    profile_summary = ""
    matched_skills = []
    if interview.resume_id:
        res_parsed = await db.execute(
            select(ResumeParsed).where(ResumeParsed.resume_id == interview.resume_id)
        )
        parsed_record = res_parsed.scalar_one_or_none()
        if parsed_record:
            profile_summary = parsed_record.summary or ""
        
        res_skills = await db.execute(
            select(Skill).where(Skill.resume_id == interview.resume_id)
        )
        skills_records = res_skills.scalars().all()
        matched_skills = [s.name for s in skills_records]

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
        "current_question": current_q_payload,
        "current_difficulty": last_q.difficulty if last_q else "medium",
        "current_topic": last_q.topic if last_q else "",
        "weak_topics": matched_skills[:3] if matched_skills else [],
        "mastered_topics": [],
        "turn": len(questions),
        "max_turns": interview.total_questions,
        "is_complete": interview.status == "completed",
        "last_rationale": "",
        "profile_summary": profile_summary,
        "matched_skills": matched_skills,
        "weak_skills": matched_skills[:3] if matched_skills else [],
        "user_answer": None,
    }
