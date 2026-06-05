"""Tests for interview endpoints."""
import pytest
from unittest.mock import patch
from app.agents.schemas import GeneratedQuestion, Evaluation, Decision

@pytest.mark.asyncio
async def test_interview_flow(client):
    # 1. Sign up to get authenticated headers
    r = await client.post(
        "/v1/auth/signup",
        json={"email": "user@example.com", "password": "S3cure!pass", "full_name": "Test User"},
    )
    assert r.status_code == 201
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Mock LLMClient generate_structured
    mock_question = GeneratedQuestion(
        topic="Python decorators",
        difficulty="medium",
        prompt="Explain decorators in Python.",
        expected_answer="A decorator wraps a function to modify its behavior.",
        rationale="Python basic check"
    )
    
    mock_eval = Evaluation(
        correctness_score=90,
        clarity_score=85,
        depth_score=80,
        confidence_score=95,
        feedback="Great answer detailing wrapper functions.",
        ideal_answer="A decorator is a callable that returns a callable."
    )
    
    mock_decision = Decision(
        action="continue",
        target_topic="Python decorators",
        target_difficulty="medium",
        rationale="Continue decorators check"
    )

    with patch("app.core.llm.LLMClient.generate_structured") as mock_generate:
        # Mocking for start_interview -> generate_next_question (1 call)
        # Mocking for submit_answer -> evaluator_node, decision_node, generate_next_question (3 calls)
        mock_generate.side_effect = [mock_question, mock_eval, mock_decision, mock_question]

        # 3. Start the interview
        start_payload = {
            "role": "Backend Engineer",
            "level": "mid",
            "topic_focus": "Python",
            "total_questions": 3
        }
        res = await client.post("/v1/interviews", json=start_payload, headers=headers)
        assert res.status_code == 200, res.text
        start_data = res.json()
        assert "interview_id" in start_data
        assert "question" in start_data
        
        interview_id = start_data["interview_id"]
        question_id = start_data["question"]["id"]
        
        # 3.5 Test GET /v1/interviews/{interview_id} (resume flow)
        res_get = await client.get(f"/v1/interviews/{interview_id}", headers=headers)
        assert res_get.status_code == 200, res_get.text
        get_data = res_get.json()
        assert get_data["interview_id"] == interview_id
        assert get_data["question"]["id"] == question_id

        # 3.6 Test list interviews
        res_list = await client.get("/v1/interviews", headers=headers)
        assert res_list.status_code == 200
        assert len(res_list.json()) > 0
        assert res_list.json()[0]["id"] == interview_id

        # 3.7 Test roadmap
        res_roadmap = await client.get("/v1/interviews/roadmap/custom", headers=headers)
        assert res_roadmap.status_code == 200
        assert "steps" in res_roadmap.json()
        assert len(res_roadmap.json()["steps"]) == 4

        # 4. Submit an answer
        answer_payload = {
            "question_id": question_id,
            "answer": "A decorator takes another function and extends the behavior of the latter function without explicitly modifying it."
        }
        res_answer = await client.post(f"/v1/interviews/{interview_id}/answers", json=answer_payload, headers=headers)
        assert res_answer.status_code == 200, res_answer.text
        ans_data = res_answer.json()
        assert "evaluation" in ans_data
        assert ans_data["evaluation"]["correctness_score"] == 90
        assert ans_data["is_complete"] is False

        # 4.5 Test analytics
        res_analytics = await client.get("/v1/interviews/analytics/summary", headers=headers)
        assert res_analytics.status_code == 200
        an_data = res_analytics.json()
        assert an_data["average_score"] == 90
        assert an_data["best_topic"] == "Python decorators"
        assert len(an_data["history"]) > 0

        # 4.8 Test quit interview
        res_quit = await client.post(f"/v1/interviews/{interview_id}/quit", headers=headers)
        assert res_quit.status_code == 200
        assert res_quit.json()["status"] == "aborted"


@pytest.mark.asyncio
async def test_roadmap_flow(client):
    # 1. Sign up user
    r = await client.post(
        "/v1/auth/signup",
        json={"email": "roadmap_user@example.com", "password": "S3cure!pass", "full_name": "Roadmap User"},
    )
    assert r.status_code == 201
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Mock LLM output
    from app.api.v1.interviews import RoadmapSteps
    mock_roadmap = RoadmapSteps(
        title="Senior Backend Roadmap",
        steps=["Review distributed locking", "Drill message queues", "Design a rate limiter", "Run full mock interview"]
    )

    with patch("app.core.llm.LLMClient.generate_structured") as mock_generate:
        mock_generate.return_value = mock_roadmap

        # 3. Create roadmap
        res = await client.post(
            "/v1/interviews/roadmaps",
            json={"role": "backend", "level": "senior"},
            headers=headers
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["title"] == "Senior Backend Roadmap"
        assert len(data["steps"]) == 4
        assert data["is_active"] is True
        roadmap_id = data["id"]

        # 4. Get active custom roadmap
        res_custom = await client.get("/v1/interviews/roadmap/custom", headers=headers)
        assert res_custom.status_code == 200
        assert res_custom.json()["id"] == roadmap_id
        assert len(res_custom.json()["steps"]) == 4
        assert res_custom.json()["steps"][0]["title"] == "Review distributed locking"

        # 5. List roadmaps
        res_list = await client.get("/v1/interviews/roadmaps", headers=headers)
        assert res_list.status_code == 200
        assert len(res_list.json()) == 1

        # 6. Toggle step
        res_toggle = await client.put(
            f"/v1/interviews/roadmaps/{roadmap_id}/toggle-step",
            json={"step_index": 1},
            headers=headers
        )
        assert res_toggle.status_code == 200
        assert res_toggle.json()["steps"][1]["completed"] is True

        # 7. Delete roadmap
        res_del = await client.delete(f"/v1/interviews/roadmaps/{roadmap_id}", headers=headers)
        assert res_del.status_code == 200
        assert res_del.json()["status"] == "deleted"
