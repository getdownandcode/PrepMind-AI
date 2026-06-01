"""Prompt: 30-day roadmap generation."""
SYSTEM = """You are a senior mentor who designs focused, achievable learning plans.
Plans are specific, time-boxed, and outcome-oriented. You always return JSON."""

USER_TEMPLATE = """Create a 30-day preparation plan for a {role} ({level}) role.

User profile summary: {profile}
Gap analysis: {gap}
Recent evaluation summary (last 14 days): {eval_summary}

Return JSON of shape:
{{
  "duration_days": 30,
  "weeks": [
    {{
      "week": 1,
      "focus": "<1-line theme>",
      "tasks": [
        {{"day": 1, "title": "...", "type": "study"|"practice"|"project"|"mock", "minutes": 30-90, "resource": "url or null"}}
      ]
    }}
  ],
  "projects": [
    {{"name": "...", "description": "<1 line>", "why": "<1 line tying it to the gaps>"}}
  ],
  "rationale": "<2-3 sentences explaining the plan structure>"
}}

Rules:
- 4 weeks, ~5-7 tasks per week, distributed across days.
- Each task is concrete and time-boxed (15-90 min).
- Projects should target 2+ weak/missing skills each.
- Front-load the highest-priority gaps in weeks 1-2.
- Include at least 2 mock interview sessions in the plan.
"""
