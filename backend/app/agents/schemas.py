"""Pydantic schemas for LLM outputs."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ResumeProfile(BaseModel):
    summary: str = ""
    experience: list[dict] = Field(default_factory=list)
    education: list[dict] = Field(default_factory=list)
    projects: list[dict] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)


class SkillScore(BaseModel):
    name: str
    proficiency: int | None = None
    priority: Literal["high", "medium", "low"] | None = None


class GapAnalysis(BaseModel):
    matched: list[SkillScore] = Field(default_factory=list)
    missing: list[SkillScore] = Field(default_factory=list)
    weak: list[SkillScore] = Field(default_factory=list)
    rationale: str = ""


class GeneratedQuestion(BaseModel):
    topic: str
    difficulty: Literal["easy", "medium", "hard", "expert"]
    prompt: str
    expected_answer: str
    rationale: str


class Evaluation(BaseModel):
    correctness_score: int = Field(ge=0, le=100)
    clarity_score: int = Field(ge=0, le=100)
    depth_score: int = Field(ge=0, le=100)
    confidence_score: int = Field(ge=0, le=100)
    feedback: str
    ideal_answer: str
    rubric: dict = Field(default_factory=dict)
    suggested_followup: str | None = None


class Decision(BaseModel):
    action: Literal[
        "drill_weakness", "increase_difficulty", "decrease_difficulty",
        "new_topic", "continue", "complete",
    ]
    target_topic: str | None = None
    target_difficulty: Literal["easy", "medium", "hard", "expert"] = "medium"
    rationale: str = ""


class RoadmapTask(BaseModel):
    day: int
    title: str
    type: Literal["study", "practice", "project", "mock"]
    minutes: int
    resource: str | None = None


class RoadmapWeek(BaseModel):
    week: int
    focus: str
    tasks: list[RoadmapTask]


class RoadmapProject(BaseModel):
    name: str
    description: str
    why: str


class Roadmap(BaseModel):
    duration_days: int = 30
    weeks: list[RoadmapWeek]
    projects: list[RoadmapProject] = Field(default_factory=list)
    rationale: str = ""
