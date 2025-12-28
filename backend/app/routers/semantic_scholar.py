import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.config import SEMANTIC_SCHOLAR_KEY

router = APIRouter()

# Semantic Scholar API Base URL
SS_API_BASE = "https://api.semanticscholar.org/graph/v1"

# Request/Response Models
class SearchRequest(BaseModel):
    keywords: str
    limit: int = 15

class Author(BaseModel):
    name: str

class Paper(BaseModel):
    paperId: str
    title: str
    abstract: Optional[str] = None
    authors: List[Author] = []
    year: Optional[int] = None
    citationCount: Optional[int] = None
    url: Optional[str] = None
    openAccessPdf: Optional[dict] = None

class SearchResponse(BaseModel):
    papers: List[Paper]
    total: int


@router.post("/search", response_model=SearchResponse)
async def search_papers(request: SearchRequest):
    """
    Search for papers on Semantic Scholar using keywords.
    Returns top papers with abstracts for analysis.
    """
    headers = {}
    if SEMANTIC_SCHOLAR_KEY:
        headers["x-api-key"] = SEMANTIC_SCHOLAR_KEY
    
    fields = "paperId,title,abstract,authors,year,citationCount,url,openAccessPdf"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SS_API_BASE}/paper/search",
                params={
                    "query": request.keywords,
                    "limit": request.limit,
                    "fields": fields
                },
                headers=headers
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Semantic Scholar API error: {response.text}"
                )
            
            data = response.json()
            papers = data.get("data", [])
            total = data.get("total", 0)
            
            # Filter papers with abstracts (we need them for analysis)
            papers_with_abstract = [
                Paper(
                    paperId=p.get("paperId", ""),
                    title=p.get("title", ""),
                    abstract=p.get("abstract"),
                    authors=[Author(name=a.get("name", "")) for a in p.get("authors", [])],
                    year=p.get("year"),
                    citationCount=p.get("citationCount"),
                    url=p.get("url"),
                    openAccessPdf=p.get("openAccessPdf")
                )
                for p in papers
                if p.get("abstract")  # Only include papers with abstracts
            ]
            
            return SearchResponse(
                papers=papers_with_abstract,
                total=total
            )
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Semantic Scholar API timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching papers: {str(e)}")
