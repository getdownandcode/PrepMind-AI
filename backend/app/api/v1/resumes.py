import uuid
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbDep
from app.core.storage import get_storage_provider
from app.core.parser import parse_resume
from app.models.resume import Resume, ResumeParsed, Skill

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/resumes", tags=["resumes"])

MAX_FILE_SIZE = 5 * 1024 * 1024 # 5MB

@router.post("/upload")
async def upload_resume(
    user: CurrentUser,
    db: DbDep,
    file: UploadFile = File(...)
):
    # 1. Validate file size and type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()
    file_size = len(file_bytes)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 5MB limit.")

    # 2. Upload file to S3/local storage
    storage = get_storage_provider()
    unique_filename = f"{uuid.uuid4()}-{file.filename}"
    try:
        file_url = await storage.upload_file(file_bytes, unique_filename)
    except Exception as e:
        logger.error("Failed to store file: %s", e)
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    # 3. Parse resume content using Gemini
    try:
        parsed_data = await parse_resume(file_bytes)
    except Exception as e:
        logger.error("Failed to parse resume: %s", e)
        # Clean up uploaded file on parsing failure
        await storage.delete_file(unique_filename)
        raise HTTPException(status_code=422, detail=f"Failed to parse resume content: {str(e)}")

    # 4. Save to Database in a transaction
    try:
        # Create Resume row
        resume = Resume(
            user_id=user.id,
            file_url=file_url,
            file_name=file.filename,
            file_size_bytes=file_size,
            status="parsed"
        )
        db.add(resume)
        await db.flush() # Populate resume.id

        # Create ResumeParsed row
        # Convert Pydantic schemas to dictionaries for JSONB serialization
        experience_dict = [exp.model_dump() for exp in parsed_data.experience]
        education_dict = [edu.model_dump() for edu in parsed_data.education]
        projects_dict = [proj.model_dump() for proj in parsed_data.projects]

        parsed_record = ResumeParsed(
            resume_id=resume.id,
            summary=parsed_data.summary,
            experience=experience_dict,
            education=education_dict,
            projects=projects_dict
        )
        db.add(parsed_record)

        # Create Skill rows
        skills_records = [
            Skill(
                resume_id=resume.id,
                name=skill.name,
                category=skill.category,
                proficiency_estimate=skill.proficiency_estimate
            )
            for skill in parsed_data.skills
        ]
        db.add_all(skills_records)

        await db.commit()
        await db.refresh(resume)
        
        # Load relationships for response
        res = await db.execute(
            select(Resume)
            .options(selectinload(Resume.parsed), selectinload(Resume.skills))
            .where(Resume.id == resume.id)
        )
        return res.scalar_one()

    except Exception as e:
        await db.rollback()
        # Clean up uploaded file on database failure
        await storage.delete_file(unique_filename)
        logger.error("Database transaction failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Database save failed: {str(e)}")


@router.get("")
async def list_resumes(user: CurrentUser, db: DbDep):
    res = await db.execute(
        select(Resume)
        .options(selectinload(Resume.parsed), selectinload(Resume.skills))
        .where(Resume.user_id == user.id)
        .order_by(Resume.created_at.desc())
    )
    return res.scalars().all()


@router.get("/{resume_id}")
async def get_resume(resume_id: uuid.UUID, user: CurrentUser, db: DbDep):
    res = await db.execute(
        select(Resume)
        .options(selectinload(Resume.parsed), selectinload(Resume.skills))
        .where(Resume.id == resume_id, Resume.user_id == user.id)
    )
    resume = res.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.delete("/{resume_id}")
async def delete_resume(resume_id: uuid.UUID, user: CurrentUser, db: DbDep):
    res = await db.execute(
        select(Resume)
        .where(Resume.id == resume_id, Resume.user_id == user.id)
    )
    resume = res.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Delete the file from S3 or local storage
    storage = get_storage_provider()
    # Extract unique filename from file_url or storage path
    file_url = resume.file_url
    filename = file_url.split("/")[-1]
    await storage.delete_file(filename)

    await db.delete(resume)
    await db.commit()
    return {"status": "deleted"}
