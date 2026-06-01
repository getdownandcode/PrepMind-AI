"""Orchestrator that wires interview nodes into a state graph.

This is intentionally a simple async loop rather than a full LangGraph runtime.
Each node is a pure async function that takes a state and returns a partial
update, which is merged into the shared state dict. The loop runs until the
session is marked complete.
"""
from __future__ import annotations

import logging
from typing import Awaitable, Callable

from app.agents.nodes.decision import decision_node
from app.agents.nodes.evaluator import evaluator_node
from app.agents.nodes.question_generator import question_generator_node
from app.agents.nodes.weakness_tracker import weakness_tracker_node
from app.agents.state import InterviewState

logger = logging.getLogger(__name__)

Node = Callable[[InterviewState], Awaitable[dict]]


def merge(base: InterviewState, update: dict) -> InterviewState:
    """Shallow merge with list-replacement semantics."""
    merged: InterviewState = {**base, **update}
    return merged


class InterviewOrchestrator:
    """Stateful orchestrator. Holds the current state and runs the loop."""

    def __init__(self, initial_state: InterviewState) -> None:
        self.state: InterviewState = initial_state

    async def generate_next_question(self) -> InterviewState:
        update = await question_generator_node(self.state)
        self.state = merge(self.state, update)
        return self.state

    async def submit_answer(self, answer: str) -> InterviewState:
        self.state["user_answer"] = answer
        # Evaluate
        eval_update = await evaluator_node(self.state)
        self.state = merge(self.state, eval_update)
        # Track weakness
        track_update = await weakness_tracker_node(self.state)
        self.state = merge(self.state, track_update)
        # Decide next action
        decision_update = await decision_node(self.state)
        self.state = merge(self.state, decision_update)
        return self.state

    def is_complete(self) -> bool:
        return bool(self.state.get("is_complete"))
