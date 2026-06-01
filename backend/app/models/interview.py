"""Interview, question, and evaluation models."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String, nullable=False)
    level: Mapped[str] = mapped_column(String, nullable=False)
    topic_focus: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="in_progress", nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, default=6, nullable=False)
    current_difficulty: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    questions: Mapped[list["Question"]] = relationship(
        back_populates="interview", cascade="all, delete-orphan", order_by="Question.turn_index"
    )
    evaluations: Mapped[list["Evaluation"]] = relationship(
        back_populates="interview", cascade="all, delete-orphan"
    )


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (
        CheckConstraint(
            "difficulty IN ('easy','medium','hard','expert')", name="ck_question_difficulty"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    interview_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interviews.id", ondelete="CASCADE"), index=True
    )
    turn_index: Mapped[int] = mapped_column(Integer, nullable=False)
    topic: Mapped[str] = mapped_column(String, nullable=False)
    difficulty: Mapped[str] = mapped_column(String, nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    expected_answer: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String, default="generated", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    interview: Mapped[Interview] = relationship(back_populates="questions")
    evaluation: Mapped["Evaluation | None"] = relationship(
        back_populates="question", uselist=False, cascade="all, delete-orphan"
    )


class Evaluation(Base):
    __tablename__ = "evaluations"
    __table_args__ = (
        CheckConstraint("correctness_score BETWEEN 0 AND 100", name="ck_eval_correct"),
        CheckConstraint("clarity_score BETWEEN 0 AND 100", name="ck_eval_clarity"),
        CheckConstraint("depth_score BETWEEN 0 AND 100", name="ck_eval_depth"),
        CheckConstraint("confidence_score BETWEEN 0 AND 100", name="ck_eval_conf"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), unique=True
    )
    interview_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interviews.id", ondelete="CASCADE"), index=True
    )
    user_answer: Mapped[str] = mapped_column(Text, nullable=False)
    correctness_score: Mapped[int] = mapped_column(Integer, nullable=False)
    clarity_score: Mapped[int] = mapped_column(Integer, nullable=False)
    depth_score: Mapped[int] = mapped_column(Integer, nullable=False)
    confidence_score: Mapped[int] = mapped_column(Integer, nullable=False)
    feedback: Mapped[str] = mapped_column(Text, nullable=False)
    ideal_answer: Mapped[str | None] = mapped_column(Text)
    rubric: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    interview: Mapped[Interview] = relationship(back_populates="evaluations")
    question: Mapped[Question] = relationship(back_populates="evaluation")
