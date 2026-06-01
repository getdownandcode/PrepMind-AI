"""Resume parser node — uses PyPDF + LLM structured output."""
from __future__ import annotations

import logging

from pydantic import BaseModel

from app.agents.schemas import ResumeProfile
from app.core.llm import get_llm
from app.prompts import resume_parse as rp
from app.utils.pdf import extract_text

logger = logging.getLogger(__name__)


async def resume_parser_node(*, file_path: str) -> ResumeProfile:
    """Parse a PDF resume into a structured ResumeProfile."""
    text = extract_text(file_path)
    if not text.strip():
        raise ValueError("Could not extract text from PDF")

    user_msg = rp.USER_TEMPLATE.format(resume_text=text[:12_000])
    llm = get_llm()
    return await llm.generate_structured(
        system=rp.SYSTEM, user=user_msg, schema=ResumeProfile
    )


# Exposed for type hint convenience
_ = BaseModel
