from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.agents.jd_parser import JDParser
from backend.models.schemas import ParsedJD


router = APIRouter()

_parser = JDParser()


class ParseJDRequest(BaseModel):
    jd_text: str


@router.post("/parse-jd", response_model=ParsedJD)
def parse_jd(request: ParseJDRequest) -> ParsedJD:
    try:
        return _parser.parse(request.jd_text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
