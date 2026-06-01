"""Decision node — picks the next action in the interview loop."""
from __future__ import annotations

import logging

from app.agents.schemas import Decision
from app.agents.state import Difficulty, InterviewState
from app.core.llm import get_llm
from app.prompts import decision as dp

logger = logging.getLogger(__name__)


def _recent_avg(scores: list[int]) -> float:
    if not scores:
        return 0.0
    return sum(scores) / len(scores)


async def decision_node(state: InterviewState) -> dict:
    if state.get("turn", 0) >= state.get("max_turns", 6):
        return {"is_complete": True, "last_rationale": "Session complete."}

    evals = state.get("evaluations", [])
    last_two_correctness = [e.get("correctness_score", 0) for e in evals[-2:]]
    avg = _recent_avg(last_two_correctness)

    weak_topics = state.get("weak_topics", [])
    mastered = state.get("mastered_topics", [])
    current_topic = state.get("current_topic", "")

    # Heuristic fallbacks first; LLM can override.
    current_difficulty: Difficulty = state.get("current_difficulty", "medium")
    directive = "continue"

    if current_topic in mastered:
        directive = "new"
    elif avg >= 80 and current_difficulty != "expert":
        directive = "increase"
    elif avg <= 50 and current_difficulty != "easy":
        directive = "decrease"
    elif current_topic and current_topic in weak_topics:
        directive = f"drill: {current_topic}"
    elif weak_topics:
        directive = f"drill: {weak_topics[0]}"
    else:
        directive = "new"

    history_lines = []
    for q, e in zip(state.get("questions", []), evals):
        history_lines.append(
            f"turn {q.get('turn_index')} topic={q.get('topic')} diff={q.get('difficulty')} "
            f"correct={e.get('correctness_score')} clarity={e.get('clarity_score')} "
            f"depth={e.get('depth_score')}"
        )
    history = "\n".join(history_lines) or "(no prior turns)"

    user_msg = dp.USER_TEMPLATE.format(
        history=history,
        weak_topics=", ".join(weak_topics) or "(none)",
        difficulty=current_difficulty,
        role=state.get("role", "Engineer"),
        level=state.get("level", "mid"),
    )

    llm = get_llm()
    decision: Decision = await llm.generate_structured(
        system=dp.SYSTEM, user=user_msg, schema=Decision
    )

    # Map the decision into a directive the question generator can parse.
    rationale = decision.rationale or f"Directive: {directive}"
    return {
        "is_complete": decision.action == "complete",
        "last_rationale": rationale,
    }
