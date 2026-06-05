import pytest
import uuid
from unittest.mock import patch, AsyncMock
from app.core.parser import ParsedResumeSchema, ExperienceItemSchema, EducationItemSchema, ProjectItemSchema, SkillItemSchema

@pytest.mark.asyncio
async def test_resume_upload_and_crud_flow(client):
    # 1. Sign up user
    r = await client.post(
        "/v1/auth/signup",
        json={"email": "resume_test_user@example.com", "password": "S3cure!pass", "full_name": "Resume Test User"},
    )
    assert r.status_code == 201
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Mock parsed data from Gemini
    mock_parsed_data = ParsedResumeSchema(
        summary="Experienced Software Engineer specializing in Python and React.",
        experience=[
            ExperienceItemSchema(
                company="Tech Corp",
                role="Software Engineer",
                duration="2 years",
                description="Built core microservices using FastAPI."
            )
        ],
        education=[
            EducationItemSchema(
                school="State University",
                degree="Bachelor of Science",
                field_of_study="Computer Science"
            )
        ],
        projects=[
            ProjectItemSchema(
                name="PrepMind AI",
                description="Interview prep system.",
                technologies=["FastAPI", "React", "ChromaDB"]
            )
        ],
        skills=[
            SkillItemSchema(
                name="Python",
                category="Languages",
                proficiency_estimate=90
            ),
            SkillItemSchema(
                name="React",
                category="Frontend",
                proficiency_estimate=85
            )
        ]
    )

    # 3. Patch S3 Storage and Gemini Parser
    with patch("app.core.storage.StorageProvider.upload_file", new_callable=AsyncMock) as mock_upload, \
         patch("app.core.storage.StorageProvider.delete_file", new_callable=AsyncMock) as mock_delete, \
         patch("app.api.v1.resumes.parse_resume", new_callable=AsyncMock) as mock_parse:
        
        mock_upload.return_value = "https://mock-bucket.s3.amazonaws.com/unique-resume.pdf"
        mock_parse.return_value = mock_parsed_data

        # 4. Upload resume
        file_payload = {"file": ("resume.pdf", b"%PDF-1.4 mock file contents", "application/pdf")}
        res_upload = await client.post("/v1/resumes/upload", files=file_payload, headers=headers)
        assert res_upload.status_code == 200, res_upload.text
        upload_data = res_upload.json()
        assert upload_data["file_name"] == "resume.pdf"
        assert upload_data["status"] == "parsed"
        assert "id" in upload_data
        resume_id = upload_data["id"]

        assert upload_data["parsed"]["summary"] == "Experienced Software Engineer specializing in Python and React."
        assert len(upload_data["skills"]) == 2
        assert upload_data["skills"][0]["name"] == "Python"

        # 5. List resumes
        res_list = await client.get("/v1/resumes", headers=headers)
        assert res_list.status_code == 200
        assert len(res_list.json()) == 1
        assert res_list.json()[0]["id"] == resume_id

        # 6. Get resume details
        res_get = await client.get(f"/v1/resumes/{resume_id}", headers=headers)
        assert res_get.status_code == 200
        get_data = res_get.json()
        assert get_data["id"] == resume_id
        assert get_data["parsed"]["summary"] == "Experienced Software Engineer specializing in Python and React."

        # 7. Start an interview based on the resume
        # Mock LLM generation during start
        from app.agents.schemas import GeneratedQuestion
        mock_question = GeneratedQuestion(
            topic="Python",
            difficulty="medium",
            prompt="Explain decorators in Python.",
            expected_answer="Wraps a function.",
            rationale="Testing Python decorator knowledge"
        )
        with patch("app.core.llm.LLMClient.generate_structured", new_callable=AsyncMock) as mock_gen_structured:
            mock_gen_structured.return_value = mock_question

            start_payload = {
                "role": "Backend Engineer",
                "level": "mid",
                "resume_id": resume_id,
                "total_questions": 3
            }
            res_start = await client.post("/v1/interviews", json=start_payload, headers=headers)
            assert res_start.status_code == 200, res_start.text
            start_data = res_start.json()
            assert "interview_id" in start_data

        # 8. Delete resume
        res_del = await client.delete(f"/v1/resumes/{resume_id}", headers=headers)
        assert res_del.status_code == 200
        assert res_del.json()["status"] == "deleted"
        mock_delete.assert_called_once_with("unique-resume.pdf")

        # 9. Get deleted resume should 404
        res_get_deleted = await client.get(f"/v1/resumes/{resume_id}", headers=headers)
        assert res_get_deleted.status_code == 404
