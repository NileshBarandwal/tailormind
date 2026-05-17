from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from backend.agents.job_discovery import JobDiscovery
from backend.models.schemas import Education, JobListing, UserProfile


def _profile() -> UserProfile:
    now = datetime.now(timezone.utc)
    return UserProfile(
        full_name="Test",
        email="test@example.com",
        skills=["Python"],
        education=[Education(institution="x", degree="y", field="z", year=2024)],
        created_at=now,
        updated_at=now,
    )


def _adzuna_raw(job_id: str = "az1", url: str = "https://adz.example/job/az1") -> dict:
    return {
        "id": job_id,
        "title": "Backend Engineer",
        "company": {"display_name": "Acme"},
        "location": {"display_name": "Bangalore"},
        "description": "x" * 600,
        "redirect_url": url,
        "salary_min": 1000000,
        "salary_max": 2000000,
        "created": "2026-05-01",
    }


def _remotive_raw(job_id: str = "rm1", url: str = "https://rmt.example/job/rm1") -> dict:
    return {
        "id": job_id,
        "title": "Remote Python Engineer",
        "company_name": "Beta",
        "candidate_required_location": "Worldwide",
        "description": "y" * 600,
        "url": url,
        "publication_date": "2026-05-02",
    }


def test_normalize_adzuna():
    discovery = JobDiscovery(model_router=MagicMock())
    listing = discovery._normalize_adzuna(_adzuna_raw())
    assert isinstance(listing, JobListing)
    assert listing.job_id == "az1"
    assert listing.title == "Backend Engineer"
    assert listing.company == "Acme"
    assert listing.location == "Bangalore"
    assert listing.source == "adzuna"
    assert listing.salary_min == 1000000.0
    assert listing.salary_max == 2000000.0
    assert len(listing.description) == 500


def test_normalize_remotive():
    discovery = JobDiscovery(model_router=MagicMock())
    listing = discovery._normalize_remotive(_remotive_raw())
    assert isinstance(listing, JobListing)
    assert listing.job_id == "rm1"
    assert listing.title == "Remote Python Engineer"
    assert listing.company == "Beta"
    assert listing.location == "Worldwide"
    assert listing.source == "remotive"
    assert len(listing.description) == 500


def test_discover_deduplicates():
    router = MagicMock()
    router.call.return_value = '{"scores": []}'
    discovery = JobDiscovery(model_router=router)
    duplicate_url = "https://example.com/job/123"
    with patch.object(
        discovery, "_fetch_adzuna", return_value=[_adzuna_raw("a", duplicate_url)]
    ), patch.object(
        discovery, "_fetch_remotive", return_value=[_remotive_raw("r", duplicate_url)]
    ):
        result = discovery.discover("python", "India", _profile())
    assert result.total_found == 1
    assert len(result.jobs) == 1


def test_discover_empty_on_api_failure():
    router = MagicMock()
    discovery = JobDiscovery(model_router=router)
    with patch.object(discovery, "_fetch_adzuna", return_value=[]), patch.object(
        discovery, "_fetch_remotive", return_value=[]
    ):
        result = discovery.discover("python", "India", _profile())
    assert result.total_found == 0
    assert result.jobs == []
    router.call.assert_not_called()
