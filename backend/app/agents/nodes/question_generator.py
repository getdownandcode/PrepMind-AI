"""Adaptive question generator node."""
from __future__ import annotations

import logging

from app.agents.schemas import GeneratedQuestion
from app.agents.state import InterviewState
from app.core.llm import get_llm
from app.prompts import question_generate as qp

logger = logging.getLogger(__name__)


def _format_history(state: InterviewState) -> str:
    out: list[str] = []
    for q, e in zip(state.get("questions", []), state.get("evaluations", [])):
        avg = (e.get("correctness_score", 0) + e.get("depth_score", 0)) // 2
        out.append(
            f"Q{q.get('turn_index')} [{q.get('difficulty')}] {q.get('topic')}: "
            f"{q.get('prompt')[:120]}... -> avg {avg}/100"
        )
    return "\n".join(out) or "(no prior turns)"


async def question_generator_node(state: InterviewState) -> dict:
    """Decide the next question prompt based on directive + memory + history."""
    directive = state.get("last_rationale") or "continue"
    history = _format_history(state)
    weak_topics = state.get("weak_topics", []) or state.get("weak_skills", [])
    matched = state.get("matched_skills", [])
    weak = state.get("weak_skills", [])
    profile = state.get("profile_summary", "")

    user_msg = qp.USER_TEMPLATE.format(
        role=state.get("role", "Engineer"),
        level=state.get("level", "mid"),
        turn=state.get("turn", 1),
        max_turns=state.get("max_turns", 6),
        directive=directive,
        profile_summary=profile or "Not provided",
        matched=", ".join(matched) or "(none)",
        weak=", ".join(weak) or "(none)",
        weak_topics=", ".join(weak_topics) or "(none)",
        history=history,
    )

    llm = get_llm()
    result: GeneratedQuestion = await llm.generate_structured(
        system=qp.SYSTEM,
        user=user_msg,
        schema=GeneratedQuestion,
        model=None,  # single model: gemini-2.5-flash
    )

    turn = state.get("turn", 0) + 1
    return {
        "current_question": {
            "topic": result.topic,
            "difficulty": result.difficulty,
            "prompt": result.prompt,
            "expected_answer": result.expected_answer,
            "rationale": result.rationale,
            "turn_index": turn,
        },
        "current_difficulty": result.difficulty,
        "current_topic": result.topic,
        "turn": turn,
        "last_rationale": result.rationale,
    }
