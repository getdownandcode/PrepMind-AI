"""Auth endpoint smoke tests."""
import pytest


@pytest.mark.asyncio
async def test_signup_and_login(client):
    r = await client.post(
        "/v1/auth/signup",
        json={"email": "a@example.com", "password": "S3cure!pass", "full_name": "A"},
    )
    assert r.status_code == 201, r.text
    tokens = r.json()
    assert "access_token" in tokens

    r2 = await client.post(
        "/v1/auth/login", json={"email": "a@example.com", "password": "S3cure!pass"}
    )
    assert r2.status_code == 200
    assert "access_token" in r2.json()


@pytest.mark.asyncio
async def test_me_requires_auth(client):
    r = await client.get("/v1/auth/me")
    assert r.status_code in (401, 403)
