import json
from pathlib import Path
from typing import TypedDict

from langgraph.graph import END, StateGraph

from backend.agents.company_researcher import CompanyResearcher
from backend.agents.jd_parser import JDParser
from backend.agents.profile_matcher import ProfileMatcher
from backend.core.config import PROJECT_ROOT
from backend.models.schemas import (
    MatchScore,
    ParsedJD,
    ResearchReport,
    UserProfile,
)


PROFILE_DIR = PROJECT_ROOT / "data" / "profiles"


class PipelineState(TypedDict, total=False):
    jd_text: str
    company_name: str
    website: str
    profile_id: str
    parsed_jd: ParsedJD | None
    research_report: ResearchReport | None
    match_score: MatchScore | None
    error: str | None


_jd_parser = JDParser()
_company_researcher = CompanyResearcher()
_profile_matcher = ProfileMatcher()


def node_parse_jd(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    try:
        state["parsed_jd"] = _jd_parser.parse(state["jd_text"])
    except Exception as exc:
        state["error"] = f"parse_jd failed: {exc}"
    return state


def node_research_company(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    try:
        state["research_report"] = _company_researcher.research(
            state["company_name"], state["website"]
        )
    except Exception as exc:
        state["error"] = f"research_company failed: {exc}"
    return state


def node_match_profile(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    try:
        profile_path = PROFILE_DIR / f"{state['profile_id']}.json"
        if not profile_path.exists():
            state["error"] = f"profile '{state['profile_id']}' not found"
            return state
        profile = UserProfile(**json.loads(profile_path.read_text(encoding="utf-8")))
        parsed_jd = state.get("parsed_jd")
        if parsed_jd is None:
            state["error"] = "match_profile failed: parsed_jd missing"
            return state
        state["match_score"] = _profile_matcher.match(profile, parsed_jd)
    except Exception as exc:
        state["error"] = f"match_profile failed: {exc}"
    return state


def _build_app():
    graph = StateGraph(PipelineState)
    graph.add_node("parse_jd", node_parse_jd)
    graph.add_node("research_company", node_research_company)
    graph.add_node("match_profile", node_match_profile)
    graph.set_entry_point("parse_jd")
    graph.add_edge("parse_jd", "research_company")
    graph.add_edge("research_company", "match_profile")
    graph.add_edge("match_profile", END)
    return graph.compile()


app = _build_app()


def run_pipeline(
    jd_text: str,
    company_name: str,
    website: str,
    profile_id: str,
) -> PipelineState:
    initial: PipelineState = {
        "jd_text": jd_text,
        "company_name": company_name,
        "website": website,
        "profile_id": profile_id,
        "parsed_jd": None,
        "research_report": None,
        "match_score": None,
        "error": None,
    }
    return app.invoke(initial)
