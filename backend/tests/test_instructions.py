from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from backend.api import routes
from backend.api.main import app
from backend.models.schemas import Education, UserProfile


PROFILE_ID = "test_instr_user"


@pytest.fixture(autouse=True)
def isolated_dirs(tmp_path, monkeypatch):
    profile_dir = tmp_path / "data" / "profiles"
    instructions_dir = tmp_path / "data" / "instructions"
    profile_dir.mkdir(parents=True)
    instructions_dir.mkdir(parents=True)

    now = datetime.now(timezone.utc)
    profile = UserProfile(
        full_name="Test User",
        email="test_instr_user@example.com",
        skills=["Python"],
        education=[Education(institution="x", degree="y", field="z", year=2024)],
        created_at=now,
        updated_at=now,
    )
    (profile_dir / f"{PROFILE_ID}.json").write_text(profile.model_dump_json())

    monkeypatch.setattr(routes.instructions, "PROFILE_DIR", profile_dir)
    monkeypatch.setattr(routes.instructions, "INSTRUCTIONS_DIR", instructions_dir)
    yield


@pytest.fixture
def client():
    return TestClient(app)


def test_add_persistent_instruction(client):
    resp = client.post(
        "/api/instructions/persistent",
        json={"profile_id": PROFILE_ID, "instruction": "Use the Oxford comma"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "Use the Oxford comma" in body["persistent"]


def test_add_persistent_deduplicates(client):
    payload = {"profile_id": PROFILE_ID, "instruction": "Keep resume one page"}
    client.post("/api/instructions/persistent", json=payload)
    resp = client.post("/api/instructions/persistent", json=payload)
    assert resp.status_code == 200
    assert resp.json()["persistent"].count("Keep resume one page") == 1


def test_add_per_job_instruction(client):
    resp = client.post(
        "/api/instructions/per-job",
        json={
            "profile_id": PROFILE_ID,
            "job_key": "company_x",
            "instruction": "Mention TEE research",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "Mention TEE research" in body["per_job"]["company_x"]


def test_remove_persistent_instruction(client):
    payload = {"profile_id": PROFILE_ID, "instruction": "Drop me"}
    client.post("/api/instructions/persistent", json=payload)
    resp = client.request(
        "DELETE",
        "/api/instructions/persistent",
        json={"profile_id": PROFILE_ID, "instruction": "Drop me"},
    )
    assert resp.status_code == 200
    assert "Drop me" not in resp.json()["persistent"]
