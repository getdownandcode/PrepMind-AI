"""Shared TypedDict for the interview state graph."""
from __future__ import annotations

from typing import Literal, TypedDict

Difficulty = Literal["easy", "medium", "hard", "expert"]


class QuestionRecord(TypedDict, total=False):
    id: str
    turn_index: int
    topic: str
    difficulty: Difficulty
    prompt: str
    expected_answer: str | None
    rationale: str | None


class EvaluationRecord(TypedDict, total=False):
    question_id: str
    correctness_score: int
    clarity_score: int
    depth_score: int
    confidence_score: int
    feedback: str
    ideal_answer: str
    rubric: dict


class InterviewState(TypedDict, total=False):
    user_id: str
    interview_id: str
    role: str
    level: str
    topic_focus: str | None

    questions: list[QuestionRecord]
    evaluations: list[EvaluationRecord]

    current_question: QuestionRecord | None
    current_difficulty: Difficulty
    current_topic: str

    weak_topics: list[str]
    mastered_topics: list[str]

    turn: int
    max_turns: int
    is_complete: bool

    last_rationale: str
    profile_summary: str
    matched_skills: list[str]
    weak_skills: list[str]
    user_answer: str | None
