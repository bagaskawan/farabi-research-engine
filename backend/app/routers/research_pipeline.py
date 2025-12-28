import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from groq import Groq
from app.config import GROQ_API_KEY, MODEL_LLM

router = APIRouter()

# Initialize Groq client
client = Groq(api_key=GROQ_API_KEY)

# Request/Response Models
class PaperInput(BaseModel):
    paperId: str
    title: str
    abstract: str
    authors: List[str]
    year: Optional[int] = None
    url: Optional[str] = None

class AnalyzeRequest(BaseModel):
    papers: List[PaperInput]
    topic: str  # Original user topic for context

class KeyInsight(BaseModel):
    insight: str
    source: str  # Paper title + year
    paperId: str

class AnalyzeResponse(BaseModel):
    insights: List[KeyInsight]

class GenerateScriptRequest(BaseModel):
    insights: List[KeyInsight]
    papers: List[PaperInput]
    topic: str

class NarrativeStructure(BaseModel):
    hook: str
    problem: str
    science: str
    takeaway: str

class Reference(BaseModel):
    title: str
    authors: str
    year: Optional[int]
    url: Optional[str]

class ContentBlueprint(BaseModel):
    key_insights: List[KeyInsight]
    narrative: NarrativeStructure
    references: List[Reference]


# System prompt for extracting insights
INSIGHT_EXTRACTOR_PROMPT = """
You are a research analyst extracting KEY INSIGHTS from academic papers for a YouTube deep-dive video.

For each paper abstract provided, extract 1-2 unique insights that would be interesting for a video.

**RULES:**
- Focus on surprising facts, statistics, or counterintuitive findings
- Make insights quotable and memorable
- Keep each insight to 1-2 sentences max
- Include the paper reference in each insight

**OUTPUT FORMAT (JSON ONLY):**
{
    "insights": [
        {
            "insight": "The actual insight text with specific data/findings",
            "source": "Author et al. (Year)",
            "paperId": "the paper ID"
        }
    ]
}

Respond in the same language as the topic (Indonesian if topic is Indonesian).
"""

# System prompt for generating video script
SCRIPT_GENERATOR_PROMPT = """
You are a video script writer for YouTube deep-dive content.

Using the key insights provided, create a "Citation-Backed Content Blueprint" for a video script.

**OUTPUT STRUCTURE:**

1. **THE HOOK** - An attention-grabbing opening based on the most surprising insight
2. **THE PROBLEM** - Explain the phenomenon/issue being explored  
3. **THE SCIENCE** - Deep dive using the research insights (cite sources)
4. **THE TAKEAWAY** - Practical conclusion for viewers

**RULES:**
- Make it engaging, not academic
- Include specific citations like "Menurut penelitian dari X (2023)..."
- Hook should be provocative and curiosity-inducing
- Each section should flow naturally into the next

**OUTPUT FORMAT (JSON ONLY):**
{
    "narrative": {
        "hook": "Opening statement...",
        "problem": "The problem/phenomenon explanation...",
        "science": "Deep dive with citations...",
        "takeaway": "Practical conclusion..."
    }
}

Respond in the same language as the topic (Indonesian if topic is Indonesian).
"""


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_papers(request: AnalyzeRequest):
    """
    Analyze papers and extract key insights using LLM.
    """
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
    
    # Prepare papers for analysis
    papers_text = ""
    for i, paper in enumerate(request.papers[:10], 1):  # Limit to 10 papers
        authors = ", ".join(paper.authors[:3])
        if len(paper.authors) > 3:
            authors += " et al."
        papers_text += f"""
Paper {i}:
- ID: {paper.paperId}
- Title: {paper.title}
- Authors: {authors}
- Year: {paper.year or 'N/A'}
- Abstract: {paper.abstract}
---
"""
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": INSIGHT_EXTRACTOR_PROMPT},
                {"role": "user", "content": f"Topic: {request.topic}\n\nPapers to analyze:\n{papers_text}"}
            ],
            model=MODEL_LLM,
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        
        response_content = chat_completion.choices[0].message.content
        data = json.loads(response_content)
        
        insights = [
            KeyInsight(
                insight=ins.get("insight", ""),
                source=ins.get("source", ""),
                paperId=ins.get("paperId", "")
            )
            for ins in data.get("insights", [])
        ]
        
        return AnalyzeResponse(insights=insights)
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing papers: {str(e)}")


@router.post("/generate-script", response_model=ContentBlueprint)
async def generate_script(request: GenerateScriptRequest):
    """
    Generate video script/Content Blueprint from key insights.
    """
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
    
    # Prepare insights for script generation
    insights_text = ""
    for ins in request.insights:
        insights_text += f"- {ins.insight} (Source: {ins.source})\n"
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SCRIPT_GENERATOR_PROMPT},
                {"role": "user", "content": f"Topic: {request.topic}\n\nKey Insights:\n{insights_text}"}
            ],
            model=MODEL_LLM,
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        
        response_content = chat_completion.choices[0].message.content
        data = json.loads(response_content)
        
        narrative_data = data.get("narrative", {})
        narrative = NarrativeStructure(
            hook=narrative_data.get("hook", ""),
            problem=narrative_data.get("problem", ""),
            science=narrative_data.get("science", ""),
            takeaway=narrative_data.get("takeaway", "")
        )
        
        # Build reference list
        references = []
        for paper in request.papers:
            authors = ", ".join(paper.authors[:3])
            if len(paper.authors) > 3:
                authors += " et al."
            references.append(Reference(
                title=paper.title,
                authors=authors,
                year=paper.year,
                url=paper.url
            ))
        
        return ContentBlueprint(
            key_insights=request.insights,
            narrative=narrative,
            references=references
        )
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating script: {str(e)}")
