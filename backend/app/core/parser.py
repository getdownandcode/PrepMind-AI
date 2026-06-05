from io import BytesIO
import logging
from pypdf import PdfReader
from pydantic import BaseModel, Field
from app.core.llm import get_llm

logger = logging.getLogger(__name__)

# Pydantic Schemas for Structured JSON Parsing
class ExperienceItemSchema(BaseModel):
    company: str = Field(..., description="Name of the company/employer")
    role: str = Field(..., description="Job title/role name")
    duration: str = Field(..., description="Employment duration (e.g. 'Jan 2021 - Present' or '2 years')")
    description: str = Field(..., description="Description of responsibilities and achievements")

class EducationItemSchema(BaseModel):
    school: str = Field(..., description="Name of the school/university")
    degree: str = Field(..., description="Degree name (e.g. 'Bachelor of Science')")
    field_of_study: str = Field(..., description="Major/Field of study")

class ProjectItemSchema(BaseModel):
    name: str = Field(..., description="Name of the project")
    description: str = Field(..., description="Details on what the project does and its purpose")
    technologies: list[str] = Field(default_factory=list, description="Programming languages, frameworks, or tools used")

class SkillItemSchema(BaseModel):
    name: str = Field(..., description="Name of the technical skill/tool (e.g. 'Python', 'React', 'Docker')")
    category: str | None = Field(None, description="Category of the skill (e.g. 'Languages', 'Frontend', 'DevOps')")
    proficiency_estimate: int | None = Field(50, description="Estimated proficiency score out of 100 based on usage depth and frequency")

class ParsedResumeSchema(BaseModel):
    summary: str = Field(..., description="A brief professional summary of the candidate's experience and target role.")
    experience: list[ExperienceItemSchema] = Field(default_factory=list, description="List of work experience entries")
    education: list[EducationItemSchema] = Field(default_factory=list, description="List of education entries")
    projects: list[ProjectItemSchema] = Field(default_factory=list, description="List of personal or professional projects")
    skills: list[SkillItemSchema] = Field(default_factory=list, description="Extracted list of technical skills and tools")


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts text from PDF bytes using pypdf."""
    try:
        reader = PdfReader(BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text.strip()
    except Exception as e:
        logger.error("Failed to extract text from PDF: %s", e)
        raise ValueError("Could not extract text from PDF file. Make sure it is not corrupted.") from e


async def parse_resume(file_bytes: bytes) -> ParsedResumeSchema:
    """Parses resume PDF bytes into a structured schema using Gemini."""
    text = ""
    try:
        text = extract_text_from_pdf(file_bytes)
    except Exception as e:
        logger.info("Local text extraction failed: %s. Falling back to direct multimodal parsing.", e)

    system_prompt = (
        "You are an expert ATS (Applicant Tracking System) parser and resume scanner. "
        "Analyze the provided resume file and extract all details into the required structured JSON schema. "
        "Summarize the candidate's background, list education and work history, extract projects, "
        "and list all core technical skills with an estimated proficiency score (1 to 100) and category."
    )
    user_prompt = "Parse the attached resume file and extract its content into structured JSON."

    llm = get_llm()
    
    if not text:
        from google.genai import types
        part = types.Part.from_bytes(data=file_bytes, mime_type="application/pdf")
        result = await llm.generate_structured(
            system=system_prompt,
            contents=[part, user_prompt],
            schema=ParsedResumeSchema
        )
    else:
        full_user = f"{user_prompt}\n\n{text}"
        result = await llm.generate_structured(
            system=system_prompt,
            user=full_user,
            schema=ParsedResumeSchema
        )
        
    return result
