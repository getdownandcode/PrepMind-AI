"""Weakness tracker — updates Chroma memory after each evaluation."""
from __future__ import annotations

import logging

from app.agents.state import InterviewState
from app.memory import vector as vmem

logger = logging.getLogger(__name__)


def _aggregate_score(eval_record: dict) -> int:
    """Combine axes into a 0-100 weakness-relevant score (correctness + depth)."""
    correctness = eval_record.get("correctness_score", 0)
    depth = eval_record.get("depth_score", 0)
    return int(0.6 * correctness + 0.4 * depth)


async def weakness_tracker_node(state: InterviewState) -> dict:
    evals = state.get("evaluations", [])
    if not evals:
        return {}

    last = evals[-1]
    q = state.get("current_question") or {}
    topic = (q.get("topic") or "").strip()
    if not topic:
        return {}

    score = _aggregate_score(last)
    weakness = max(0.0, min(1.0, (100 - score) / 100.0))

    content = (
        f"Weak area: {topic}. "
        f"Last answer score {score}/100. "
        f"Feedback: {last.get('feedback', '')[:280]}"
    )

    vmem.upsert_weakness(
        user_id=state.get("user_id", ""),
        topic=topic,
        content=content,
        weakness=weakness,
    )

    # Update in-state weak_topics list (in-memory cache)
    weak_topics = list(state.get("weak_topics", []))
    if weakness > 0.4 and topic not in weak_topics:
        weak_topics.append(topic)
    # If mastered twice, push to mastered
    mastered = list(state.get("mastered_topics", []))
    recent_for_topic = [
        e for e in evals[-3:]
    ]
    if len(recent_for_topic) >= 2 and all(
        _aggregate_score(e) >= 85 for e in recent_for_topic
    ) and topic not in mastered:
        mastered.append(topic)
        if topic in weak_topics:
            weak_topics.remove(topic)

    return {
        "weak_topics": weak_topics,
        "mastered_topics": mastered,
    }
