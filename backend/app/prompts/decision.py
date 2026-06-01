"""Prompt: decision node — pick the next action in the interview loop."""
SYSTEM = """You are the controller of an adaptive mock interview.
You decide the next action based on recent performance and memory.
You always return JSON."""

USER_TEMPLATE = """Decide the NEXT action for this interview.

History (most recent last): {history}
Memory: weak topics for this user = {weak_topics}
Current difficulty: {difficulty}
Target role: {role} ({level})

Return JSON:
{{
  "action": "drill_weakness" | "increase_difficulty" | "decrease_difficulty"
          | "new_topic" | "continue" | "complete",
  "target_topic": "<topic name or null>",
  "target_difficulty": "easy"|"medium"|"hard"|"expert",
  "rationale": "<1 sentence>"
}}

Priority rules:
1. If the same weak topic was attempted 2+ times with avg score < 60, return "drill_weakness".
2. If avg score of the last 2 answers >= 80 and difficulty != "expert", return "increase_difficulty".
3. If avg score of the last 2 answers <= 50 and difficulty != "easy", return "decrease_difficulty".
4. If the current topic has been mastered (>=85 twice), return "new_topic".
5. If the turn limit is reached, return "complete".
6. Otherwise return "continue" with a sensible new_topic.
"""
