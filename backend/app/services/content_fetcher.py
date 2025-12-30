"""
Content Fetcher - Full-Text Paper Retrieval
Uses Jina Reader API to extract text content from PDF papers.
Implements smart truncation to manage LLM context window limits.
"""

import httpx
import re
from typing import Optional
from app.config import JINA_API_KEY, JINA_READER_URL

# Maximum characters to keep from full-text (to prevent token explosion)
MAX_CONTENT_LENGTH = 15000  # ~4000 tokens, leaving room for multiple papers


async def fetch_paper_content(
    paper_url: str,
    pdf_url: Optional[str] = None,
    abstract: Optional[str] = None
) -> dict:
    """
    Fetch full-text content from a paper using Jina Reader.
    
    Strategy:
    1. If PDF URL available → Try Jina Reader on PDF
    2. If PDF fails → Try Jina Reader on paper URL (abstract page)
    3. Fallback → Return abstract only
    
    Args:
        paper_url: Semantic Scholar paper URL
        pdf_url: Open access PDF URL (if available)
        abstract: Paper abstract as fallback
        
    Returns:
        dict: {
            "content_type": "full_text" | "partial" | "abstract",
            "content": str,
            "source": "jina_pdf" | "jina_page" | "abstract",
            "word_count": int
        }
    """
    
    # Try PDF first (if available)
    if pdf_url:
        result = await _fetch_via_jina(pdf_url, "jina_pdf")
        if result["success"]:
            processed = _smart_truncate(result["content"])
            return {
                "content_type": "full_text" if len(processed) > 2000 else "partial",
                "content": processed,
                "source": "jina_pdf",
                "word_count": len(processed.split())
            }
    
    # Try paper page (for abstract + possibly more)
    if paper_url:
        result = await _fetch_via_jina(paper_url, "jina_page")
        if result["success"]:
            processed = _smart_truncate(result["content"])
            return {
                "content_type": "partial",
                "content": processed,
                "source": "jina_page",
                "word_count": len(processed.split())
            }
    
    # Fallback to abstract
    return {
        "content_type": "abstract",
        "content": abstract or "No content available.",
        "source": "abstract",
        "word_count": len((abstract or "").split())
    }


async def _fetch_via_jina(url: str, source_type: str) -> dict:
    """
    Call Jina Reader API to extract content from URL.
    
    Args:
        url: The URL to fetch
        source_type: Label for logging
        
    Returns:
        dict: {"success": bool, "content": str}
    """
    jina_url = f"{JINA_READER_URL}{url}"
    
    headers = {
        "Accept": "text/markdown",
        "User-Agent": "Farabi-Research-Engine/1.0"
    }
    
    # Add API key if available (higher rate limits)
    if JINA_API_KEY:
        headers["Authorization"] = f"Bearer {JINA_API_KEY}"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(jina_url, headers=headers)
            
            if response.status_code == 200:
                content = response.text
                
                # Check if we got meaningful content
                if len(content) > 200:
                    print(f"✅ Jina Reader ({source_type}): {len(content)} chars fetched")
                    return {"success": True, "content": content}
                else:
                    print(f"⚠️ Jina Reader ({source_type}): Content too short ({len(content)} chars)")
                    return {"success": False, "content": ""}
            else:
                print(f"❌ Jina Reader ({source_type}): HTTP {response.status_code}")
                return {"success": False, "content": ""}
                
    except httpx.TimeoutException:
        print(f"⏱️ Jina Reader ({source_type}): Timeout")
        return {"success": False, "content": ""}
    except Exception as e:
        print(f"❌ Jina Reader ({source_type}): {str(e)}")
        return {"success": False, "content": ""}


def _smart_truncate(content: str) -> str:
    """
    Intelligently truncate content to fit LLM context window.
    
    Strategy:
    - Keep: Abstract, Introduction, Results, Conclusion
    - Skip: Methodology details, References, Acknowledgments
    
    Args:
        content: Raw markdown content from Jina Reader
        
    Returns:
        str: Truncated content optimized for research analysis
    """
    if len(content) <= MAX_CONTENT_LENGTH:
        return content
    
    # Patterns to identify sections we want to skip/minimize
    skip_patterns = [
        r"#{1,3}\s*references?\s*\n[\s\S]*",  # References section
        r"#{1,3}\s*acknowledgments?\s*\n[\s\S]*?(?=#{1,3}|\Z)",  # Acknowledgments
        r"#{1,3}\s*supplementary\s*[\s\S]*?(?=#{1,3}|\Z)",  # Supplementary
        r"#{1,3}\s*funding\s*[\s\S]*?(?=#{1,3}|\Z)",  # Funding
        r"#{1,3}\s*author\s*contributions?\s*[\s\S]*?(?=#{1,3}|\Z)",  # Author contributions
    ]
    
    processed = content
    for pattern in skip_patterns:
        processed = re.sub(pattern, "", processed, flags=re.IGNORECASE)
    
    # Remove excessive whitespace
    processed = re.sub(r'\n{3,}', '\n\n', processed)
    
    # If still too long, truncate with indicator
    if len(processed) > MAX_CONTENT_LENGTH:
        processed = processed[:MAX_CONTENT_LENGTH] + "\n\n[... Content truncated for analysis ...]"
    
    return processed.strip()


async def fetch_multiple_papers_content(
    papers: list,
    max_papers: int = 8
) -> list:
    """
    Fetch content for multiple papers efficiently.
    
    Args:
        papers: List of paper dicts with url, pdfUrl, abstract
        max_papers: Maximum number of papers to fetch full content for
        
    Returns:
        list: Papers with added "full_content" field
    """
    papers_with_content = []
    full_text_count = 0
    
    for i, paper in enumerate(papers[:max_papers]):
        print(f"📄 Fetching content ({i+1}/{min(len(papers), max_papers)}): {paper.get('title', 'Unknown')[:50]}...")
        
        result = await fetch_paper_content(
            paper_url=paper.get("url", ""),
            pdf_url=paper.get("pdfUrl"),
            abstract=paper.get("abstract")
        )
        
        paper_with_content = {**paper, "full_content": result}
        papers_with_content.append(paper_with_content)
        
        if result["content_type"] == "full_text":
            full_text_count += 1
    
    # Add remaining papers with abstract only
    for paper in papers[max_papers:]:
        paper_with_content = {
            **paper,
            "full_content": {
                "content_type": "abstract",
                "content": paper.get("abstract", "No abstract available."),
                "source": "abstract",
                "word_count": len((paper.get("abstract") or "").split())
            }
        }
        papers_with_content.append(paper_with_content)
    
    print(f"📊 Content fetch complete: {full_text_count} full-text, {len(papers_with_content) - full_text_count} abstract-only")
    
    return papers_with_content
