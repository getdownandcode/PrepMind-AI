"""Evaluator node — multi-axis scoring of a candidate's answer."""
from __future__ import annotations

import logging

from app.agents.schemas import Evaluation
from app.agents.state import InterviewState
from app.core.llm import get_llm
from app.prompts import evaluate as ep

logger = logging.getLogger(__name__)


async def evaluator_node(state: InterviewState) -> dict:
    q = state.get("current_question")
    answer = state.get("user_answer") or ""
    if not q:
        raise ValueError("evaluator_node called with no current_question")
    if not answer.strip():
        raise ValueError("evaluator_node called with empty user_answer")

    user_msg = ep.USER_TEMPLATE.format(
        question=q.get("prompt", ""),
        expected_answer=q.get("expected_answer") or "(none)",
        user_answer=answer,
    )

    llm = get_llm()
    result: Evaluation = await llm.generate_structured(
        system=ep.SYSTEM,
        user=user_msg,
        schema=Evaluation,
        model=None,  # single model: gemini-2.5-flash
    )

    record = {
        "question_id": q.get("id", ""),
        "correctness_score": result.correctness_score,
        "clarity_score": result.clarity_score,
        "depth_score": result.depth_score,
        "confidence_score": result.confidence_score,
        "feedback": result.feedback,
        "ideal_answer": result.ideal_answer,
        "rubric": result.rubric,
    }

    evals = list(state.get("evaluations", []))
    evals.append(record)

    return {
        "evaluations": evals,
        "user_answer": None,  # clear after use
    }
