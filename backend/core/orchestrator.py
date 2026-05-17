import json
from pathlib import Path
from typing import TypedDict

from langgraph.graph import END, StateGraph

from backend.agents.company_researcher import CompanyResearcher
from backend.agents.cover_letter_generator import CoverLetterGenerator
from backend.agents.jd_parser import JDParser
from backend.agents.profile_matcher import ProfileMatcher
from backend.agents.resume_generator import ResumeGenerator
from backend.core.config import PROJECT_ROOT
from backend.models.schemas import (
    MatchScore,
    ParsedJD,
    ResearchReport,
    TailoredCoverLetter,
    TailoredResume,
    UserProfile,
)


PROFILE_DIR = PROJECT_ROOT / "data" / "profiles"


class PipelineState(TypedDict, total=False):
    jd_text: str
    company_name: str
    website: str
    profile_id: str
    instructions: str
    parsed_jd: ParsedJD | None
    research_report: ResearchReport | None
    match_score: MatchScore | None
    tailored_resume: TailoredResume | None
    tailored_cover_letter: TailoredCoverLetter | None
    error: str | None


_jd_parser = JDParser()
_company_researcher = CompanyResearcher()
_profile_matcher = ProfileMatcher()
_resume_generator = ResumeGenerator()
_cover_letter_generator = CoverLetterGenerator()


def _load_profile_from_state(state: PipelineState) -> UserProfile | None:
    profile_path = PROFILE_DIR / f"{state['profile_id']}.json"
    if not profile_path.exists():
        state["error"] = f"profile '{state['profile_id']}' not found"
        return None
    return UserProfile(**json.loads(profile_path.read_text(encoding="utf-8")))


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
        profile = _load_profile_from_state(state)
        if profile is None:
            return state
        parsed_jd = state.get("parsed_jd")
        if parsed_jd is None:
            state["error"] = "match_profile failed: parsed_jd missing"
            return state
        state["match_score"] = _profile_matcher.match(profile, parsed_jd)
    except Exception as exc:
        state["error"] = f"match_profile failed: {exc}"
    return state


def node_generate_resume(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    try:
        profile = _load_profile_from_state(state)
        if profile is None:
            return state
        parsed_jd = state.get("parsed_jd")
        research = state.get("research_report")
        match = state.get("match_score")
        if not (parsed_jd and research and match):
            state["error"] = "generate_resume failed: upstream output missing"
            return state
        state["tailored_resume"] = _resume_generator.generate(
            profile, parsed_jd, research, match, state.get("instructions", "")
        )
    except Exception as exc:
        state["error"] = f"generate_resume failed: {exc}"
    return state


def node_generate_cover_letter(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    try:
        profile = _load_profile_from_state(state)
        if profile is None:
            return state
        parsed_jd = state.get("parsed_jd")
        research = state.get("research_report")
        match = state.get("match_score")
        if not (parsed_jd and research and match):
            state["error"] = "generate_cover_letter failed: upstream output missing"
            return state
        state["tailored_cover_letter"] = _cover_letter_generator.generate(
            profile, parsed_jd, research, match, state.get("instructions", "")
        )
    except Exception as exc:
        state["error"] = f"generate_cover_letter failed: {exc}"
    return state


def _build_app():
    graph = StateGraph(PipelineState)
    graph.add_node("parse_jd", node_parse_jd)
    graph.add_node("research_company", node_research_company)
    graph.add_node("match_profile", node_match_profile)
    graph.add_node("generate_resume", node_generate_resume)
    graph.add_node("generate_cover_letter", node_generate_cover_letter)
    graph.set_entry_point("parse_jd")
    graph.add_edge("parse_jd", "research_company")
    graph.add_edge("research_company", "match_profile")
    graph.add_edge("match_profile", "generate_resume")
    graph.add_edge("generate_resume", "generate_cover_letter")
    graph.add_edge("generate_cover_letter", END)
    return graph.compile()


app = _build_app()


def run_pipeline(
    jd_text: str,
    company_name: str,
    website: str,
    profile_id: str,
    instructions: str = "",
) -> PipelineState:
    initial: PipelineState = {
        "jd_text": jd_text,
        "company_name": company_name,
        "website": website,
        "profile_id": profile_id,
        "instructions": instructions,
        "parsed_jd": None,
        "research_report": None,
        "match_score": None,
        "tailored_resume": None,
        "tailored_cover_letter": None,
        "error": None,
    }
    return app.invoke(initial)
