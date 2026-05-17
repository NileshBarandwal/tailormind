import pytest

from backend.agents.company_researcher import CompanyResearcher


@pytest.mark.live
def test_live_research_company():
    researcher = CompanyResearcher()
    result = researcher.research(
        company_name="Anthropic", website="https://anthropic.com"
    )

    assert result.company_brief.company_name == "Anthropic"
    assert isinstance(result.company_brief.mission, str)
    assert result.company_brief.mission.strip() != ""
    assert len(result.raw_chunks) > 0
    for chunk in result.raw_chunks:
        assert len(chunk) >= 50
