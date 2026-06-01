"""Prompt: skill gap analysis."""
SYSTEM = """You are a senior engineering interviewer evaluating readiness for a target role.
You are precise, evidence-based, and honest. You return only JSON."""

USER_TEMPLATE = """Evaluate readiness for a {role} ({level}) role.

User skills (from resume, with proficiency 0-100):
{user_skills}

Common required skills for this role (canonical):
{role_skill_baseline}

Return JSON of shape:
{{
  "matched": [{{"name": "<skill>", "proficiency": 0-100}}],
  "missing": [{{"name": "<skill>", "priority": "high"|"medium"|"low"}}],
  "weak":   [{{"name": "<skill>", "proficiency": 0-100}}],
  "rationale": "<2-3 sentences explaining the assessment>"
}}

Rules:
- "matched": user clearly demonstrates the skill.
- "missing": important for the role but absent from the resume.
- "weak": present but with low demonstrated depth.
- Order lists by importance: high-priority gaps first.
- Use canonical skill names (e.g. "React", "PostgreSQL", "System Design").
"""
