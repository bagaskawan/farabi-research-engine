import httpx
import os
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.config import SEMANTIC_SCHOLAR_KEY

router = APIRouter()

# Semantic Scholar API Base URL
SS_API_BASE = "https://api.semanticscholar.org/graph/v1"

# Search logs directory
SEARCH_LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "search_logs")
os.makedirs(SEARCH_LOGS_DIR, exist_ok=True)


def save_search_results_to_file(keywords: str, papers: list, total_available: int):
    """
    Save search results to a text file for debugging and inspection.
    File is saved to backend/search_logs/ with timestamp-based naming.
    """
    try:
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_keywords = "".join(c if c.isalnum() or c == " " else "_" for c in keywords)[:50]
        safe_keywords = safe_keywords.replace(" ", "_")
        filename = f"{timestamp}_{safe_keywords}.txt"
        filepath = os.path.join(SEARCH_LOGS_DIR, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write("=" * 80 + "\n")
            f.write("FARABI RESEARCH ENGINE - SEMANTIC SCHOLAR SEARCH RESULTS\n")
            f.write("=" * 80 + "\n\n")
            
            f.write(f"Search Keywords: {keywords}\n")
            f.write(f"Search Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Total Available in API: {total_available}\n")
            f.write(f"Papers Retrieved: {len(papers)}\n")
            f.write("-" * 80 + "\n\n")
            
            if not papers:
                f.write("No papers found.\n")
            else:
                for i, paper in enumerate(papers, 1):
                    f.write(f"{'='*60}\n")
                    f.write(f"PAPER #{i}\n")
                    f.write(f"{'='*60}\n")
                    f.write(f"Paper ID: {paper.get('paperId', 'N/A')}\n")
                    f.write(f"Title: {paper.get('title', 'N/A')}\n")
                    
                    # Authors
                    authors = paper.get('authors', [])
                    if authors:
                        author_names = [a.get('name', '') for a in authors]
                        f.write(f"Authors: {', '.join(author_names)}\n")
                    else:
                        f.write("Authors: N/A\n")
                    
                    f.write(f"Year: {paper.get('year', 'N/A')}\n")
                    f.write(f"Citation Count: {paper.get('citationCount', 'N/A')}\n")
                    f.write(f"URL: {paper.get('url', 'N/A')}\n")
                    
                    # Open Access PDF
                    pdf_info = paper.get('openAccessPdf')
                    if pdf_info and pdf_info.get('url'):
                        f.write(f"PDF URL: {pdf_info.get('url')}\n")
                    else:
                        f.write("PDF URL: Not available (paywalled or no open access)\n")
                    
                    # Abstract
                    abstract = paper.get('abstract')
                    if abstract:
                        f.write(f"\nAbstract:\n{abstract}\n")
                    else:
                        f.write("\nAbstract: Not available\n")
                    
                    f.write("\n")
            
            f.write("\n" + "=" * 80 + "\n")
            f.write("END OF SEARCH RESULTS\n")
            f.write("=" * 80 + "\n")
        
        print(f"📄 Search results saved to: {filepath}")
        return filepath
        
    except Exception as e:
        print(f"⚠️ Failed to save search results to file: {str(e)}")
        return None

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


async def search_papers_internal(keywords: str, limit: int = 15) -> List[Paper]:
    """
    Internal helper function for paper search.
    Can be called directly from other modules (e.g., for fallback mechanism).
    Returns a list of Paper objects.
    """
    headers = {
        "User-Agent": "Farabi-Research-Engine/1.0 (Academic Research Tool)"
    }
    
    if SEMANTIC_SCHOLAR_KEY:
        headers["x-api-key"] = SEMANTIC_SCHOLAR_KEY
    
    fields = "paperId,title,abstract,authors,year,citationCount,url,openAccessPdf"
    
    print(f"🔍 SEARCHING Semantic Scholar: '{keywords}'")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SS_API_BASE}/paper/search",
                params={
                    "query": keywords,
                    "limit": limit,
                    "fields": fields
                },
                headers=headers
            )
            
            print(f"📡 API Response Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ API ERROR {response.status_code}: {response.text}")
                return []  # Return empty list on error for fallback to work
            
            data = response.json()
            papers = data.get("data", [])
            total = data.get("total", 0)
            
            print(f"📊 Raw results: {len(papers)} papers, total available: {total}")
            
            parsed_papers = [
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
                if p.get("title")
            ]
            
            papers_with_abstract = len([p for p in parsed_papers if p.abstract])
            print(f"✅ FOUND: {len(parsed_papers)} papers ({papers_with_abstract} with abstracts)")
            
            # Save search results to file for debugging/inspection
            save_search_results_to_file(keywords, papers, total)
            
            return parsed_papers
            
    except httpx.TimeoutException:
        print("❌ TIMEOUT: Semantic Scholar API did not respond in time")
        return []
    except Exception as e:
        print(f"❌ CRITICAL ERROR in search_papers_internal: {str(e)}")
        return []


@router.post("/search", response_model=SearchResponse)
async def search_papers(request: SearchRequest):
    """
    Search for papers on Semantic Scholar using keywords.
    Returns top papers with abstracts for analysis.
    """
    papers = await search_papers_internal(request.keywords, request.limit)
    
    if not papers:
        raise HTTPException(
            status_code=404,
            detail="No papers found or API error occurred"
        )
    
    return SearchResponse(
        papers=papers,
        total=len(papers)
    )

