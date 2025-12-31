import json
import os
import asyncio
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from groq import Groq
from app.config import GROQ_API_KEY, MODEL_LLM
from app.routers.semantic_scholar import search_papers_internal, Paper as SSPaper
# Deep Research Services
from app.services.decomposer import generate_sub_queries
from app.services.content_fetcher import fetch_multiple_papers_content
from app.services.cowriter import generate_research_report, generate_final_script

router = APIRouter()

# Initialize Groq client
client = Groq(api_key=GROQ_API_KEY)

# Search logs directory (same as semantic_scholar)
SEARCH_LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "search_logs")
os.makedirs(SEARCH_LOGS_DIR, exist_ok=True)


def save_narrative_to_file(topic: str, narrative: dict, insights: list, references: list):
    """
    Save generated narrative structure to a text file for debugging and inspection.
    """
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_topic = "".join(c if c.isalnum() or c == " " else "_" for c in topic)[:50]
        safe_topic = safe_topic.replace(" ", "_")
        filename = f"{timestamp}_NARRATIVE_{safe_topic}.txt"
        filepath = os.path.join(SEARCH_LOGS_DIR, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write("=" * 80 + "\n")
            f.write("FARABI RESEARCH ENGINE - GENERATED NARRATIVE STRUCTURE\n")
            f.write("=" * 80 + "\n\n")
            
            f.write(f"Topic: {topic}\n")
            f.write(f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("-" * 80 + "\n\n")
            
            # Key Insights
            f.write("=" * 60 + "\n")
            f.write("KEY INSIGHTS\n")
            f.write("=" * 60 + "\n\n")
            for i, insight in enumerate(insights, 1):
                f.write(f"{i}. {insight.get('insight', insight.insight if hasattr(insight, 'insight') else str(insight))}\n")
                source = insight.get('source', insight.source if hasattr(insight, 'source') else 'N/A')
                f.write(f"   Source: {source}\n\n")
            
            # The Hook
            f.write("\n" + "=" * 60 + "\n")
            f.write("🎣 THE HOOK (150-200 words)\n")
            f.write("=" * 60 + "\n\n")
            f.write(narrative.get("hook", "") + "\n")
            
            # Introduction
            f.write("\n" + "=" * 60 + "\n")
            f.write("📖 INTRODUCTION (200-300 words)\n")
            f.write("=" * 60 + "\n\n")
            f.write(narrative.get("introduction", "") + "\n")
            
            # The Deep Dive
            f.write("\n" + "=" * 60 + "\n")
            f.write("🔬 THE DEEP DIVE (800-1000 words)\n")
            f.write("=" * 60 + "\n\n")
            f.write(narrative.get("deep_dive", "") + "\n")
            
            # Conclusion & Takeaways
            f.write("\n" + "=" * 60 + "\n")
            f.write("💡 CONCLUSION & TAKEAWAYS (300-400 words)\n")
            f.write("=" * 60 + "\n\n")
            f.write(narrative.get("conclusion", "") + "\n")
            
            # References
            f.write("\n" + "=" * 60 + "\n")
            f.write("📚 REFERENCES\n")
            f.write("=" * 60 + "\n\n")
            for i, ref in enumerate(references, 1):
                if hasattr(ref, 'title'):
                    f.write(f"{i}. {ref.authors} ({ref.year or 'n.d.'}). {ref.title}\n")
                    if ref.url:
                        f.write(f"   URL: {ref.url}\n")
                else:
                    f.write(f"{i}. {ref}\n")
                f.write("\n")
            
            f.write("\n" + "=" * 80 + "\n")
            f.write("END OF NARRATIVE\n")
            f.write("=" * 80 + "\n")
        
        print(f"📄 Narrative saved to: {filepath}")
        return filepath
        
    except Exception as e:
        print(f"⚠️ Failed to save narrative to file: {str(e)}")
        return None

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
    hook: str  # 150-200 words
    introduction: str  # 200-300 words (problem/context)
    deep_dive: str  # 800-1000 words (the core analysis)
    conclusion: str  # 300-400 words (actionable takeaways)

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

# System prompt for generating video script (Deep-Dive Mode)
SCRIPT_GENERATOR_PROMPT = """
You are the **Lead Scriptwriter** for a premium Science YouTube channel (like Kurzgesagt, Veritasium, or Huberman Lab).
Your task is to synthesize academic abstracts into a **FULL-LENGTH, ENGAGING VIDEO SCRIPT** in Indonesian.

==============================================================================
**CRITICAL RULES - READ THIS CAREFULLY:**
==============================================================================

1. **NO SUMMARIES:** 
   - Do NOT just list what the papers say. 
   - Do NOT be concise. Be exhaustive and detailed.
   - WEAVE the research into a compelling STORY.

2. **EXPAND & ELABORATE (MOST IMPORTANT):**
   - Since you are provided with ABSTRACTS (not full papers), you MUST use your internal knowledge to **EXPLAIN the scientific concepts** mentioned.
   - *Example:* If an abstract mentions "Gamma waves increased focus", DO NOT just say "Gamma waves increased." 
     EXPLAIN what Gamma waves are, how the brain produces them, why they matter for focus, then cite the paper for the specific result.
   - Think of yourself as a PROFESSOR teaching the audience, not a summarizer.

3. **LENGTH REQUIREMENT (MANDATORY):**
   - Total output: 1,500 - 2,000+ words
   - The "deep_dive" section ALONE must be at least **1000 words**. 
   - If your deep_dive is shorter than 800 words, YOU HAVE FAILED.

4. **CITATION FORMAT:**
   - Don't say "studies show X". 
   - Say "Penelitian [Author] ([Year]) yang melibatkan [methodology/sample size] menemukan bahwa..."
   - Cite specific papers from the provided source materials.

==============================================================================
**WRITING STYLE:**
==============================================================================
- **Tone:** Intellectual, enthusiastic, slightly witty, but rigorous.
- **Evidence-Based:** Every claim must be backed by specific data/findings.
- **Narrative Flow:** Connect ideas logically. Tell a story about the research.
- **Language:** Write in Indonesian (Bahasa Indonesia) that sounds natural and engaging.
- **Formatting:** Use **bold** for emphasis, ### for sub-headers, and clean lists. Always ensure space after headers (e.g. "### Title").

==============================================================================
**REQUIRED OUTPUT STRUCTURE:**
==============================================================================

1. **hook** (200 words minimum):
   - Start with a counter-intuitive fact, shocking statistic, or high-stakes problem.
   - Grab attention IMMEDIATELY. Make readers NEED to keep reading.
   - Set up the central question that the script will answer.

2. **introduction** (300 words minimum):
   - Define the core problem/phenomenon scientifically.
   - Establish what most people believe vs. what the research actually shows.
   - Provide necessary background context.
   - Transition smoothly into the deep analysis.

3. **deep_dive** (1000+ words - THIS IS THE CORE):
   - This is the "MEAT" of your script. DO NOT CUT CORNERS HERE.
   - Break down the MECHANISMS found in the research.
   - **Connect different papers:** "Sementara penelitian A menunjukkan X, penelitian B menambahkan nuansa dengan menemukan Y..."
   - Explain the "MENGAPA" and "BAGAIMANA" in detail.
   - Use specific numbers, percentages, and methodologies from the abstracts.
   - When a concept is mentioned in an abstract, EXPAND on it using your knowledge.
   - Discuss nuances, exceptions, or conflicting findings if present.
   - Structure with clear sub-sections if needed (e.g., "Mekanisme Pertama:", "Faktor Kedua:", etc.)

4. **conclusion** (400 words minimum):
   - Don't just summarize. Give a SYNTHESIS: "What does this mean for us?"
   - Practical applications or ACTIONABLE TAKEAWAYS based on the evidence.
   - Specific protocols or recommendations the audience can implement.
   - End with a thought-provoking statement or call-to-action.

==============================================================================
**OUTPUT FORMAT (JSON ONLY):**
==============================================================================
{
    "narrative": {
        "hook": "[200+ words of compelling opening that grabs attention...]",
        "introduction": "[300+ words defining the problem and providing context...]",
        "deep_dive": "[1000+ words of detailed analysis with citations and explanations. This is the longest section. Break down mechanisms, connect papers, explain concepts in depth...]",
        "conclusion": "[400+ words of synthesis, practical takeaways, and actionable recommendations...]"
    }
}

**REMEMBER: If your deep_dive section is less than 800 words, you need to EXPAND it further. Explain MORE, provide MORE context, connect MORE dots between the research.**
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
    Uses "Fill in the Gaps" strategy for longer, more detailed output.
    """
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
    
    # Prepare insights for script generation
    insights_text = ""
    for ins in request.insights:
        insights_text += f"- {ins.insight} (Source: {ins.source})\n"
    
    # Prepare paper abstracts as context material
    abstracts_text = ""
    for paper in request.papers:
        authors = ", ".join(paper.authors[:3])
        if len(paper.authors) > 3:
            authors += " et al."
        abstracts_text += f"""
SOURCE: {paper.title} ({authors}, {paper.year or 'n.d.'})
ABSTRACT: {paper.abstract}
---
"""
    
    # Enhanced user prompt with "Fill in the Gaps" strategy
    user_prompt = f"""
TOPIC: "{request.topic}"

==============================================================================
KEY INSIGHTS EXTRACTED FROM RESEARCH:
==============================================================================
{insights_text}

==============================================================================
SOURCE MATERIALS (Paper Abstracts):
==============================================================================
{abstracts_text}

==============================================================================
INSTRUCTION:
==============================================================================
Write a DEEP-DIVE VIDEO SCRIPT about "{request.topic}".

Use the Key Insights and Source Materials to back up your claims, BUT you MUST **EXPAND** on the concepts using your own expert knowledge.

**DO NOT just repeat or paraphrase the abstracts.** Instead:
1. EXPLAIN the underlying mechanisms and science behind what the papers found
2. CONNECT the dots between different papers - show how their findings relate
3. PROVIDE context and background that makes the research understandable
4. USE your knowledge to elaborate on concepts mentioned in the abstracts

*Example:* If a paper mentions "Binaural Beats induced relaxation", explain HOW the brain processes frequency differences, what neural mechanisms are involved, then cite the paper for the specific result.

**LENGTH REQUIREMENT:**
- The deep_dive section MUST be at least 1000 words
- Total output should be 1500-2000+ words
- If it's too short, you need to EXPAND and explain MORE
"""
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SCRIPT_GENERATOR_PROMPT},
                {"role": "user", "content": user_prompt}
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
            introduction=narrative_data.get("introduction", ""),
            deep_dive=narrative_data.get("deep_dive", ""),
            conclusion=narrative_data.get("conclusion", "")
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
        
        # Save narrative to file for debugging/inspection
        save_narrative_to_file(
            topic=request.topic,
            narrative=narrative_data,
            insights=[{"insight": ins.insight, "source": ins.source} for ins in request.insights],
            references=references
        )
        
        return ContentBlueprint(
            key_insights=request.insights,
            narrative=narrative,
            references=references
        )
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating script: {str(e)}")


# ============================================================================
# SMART FALLBACK SEARCH ENDPOINT
# ============================================================================

class SearchWithFallbackRequest(BaseModel):
    keywords: str
    limit: int = 10

class SearchPaperResult(BaseModel):
    paperId: str
    title: str
    abstract: Optional[str] = None
    authors: List[str] = []
    year: Optional[int] = None
    citationCount: Optional[int] = None
    url: Optional[str] = None
    pdfUrl: Optional[str] = None

class SearchWithFallbackResponse(BaseModel):
    papers: List[SearchPaperResult]
    total: int
    used_fallback: bool
    original_keywords: str
    effective_keywords: str


@router.post("/search", response_model=SearchWithFallbackResponse)
async def search_with_fallback(request: SearchWithFallbackRequest):
    """
    Search for papers with Smart Fallback mechanism.
    If specific keywords return < 3 results, automatically broaden search.
    """
    original_keywords = request.keywords.strip()
    used_fallback = False
    effective_keywords = original_keywords
    
    print(f"🎯 Smart Search: '{original_keywords}'")
    
    # 1. Try specific keywords first
    results = await search_papers_internal(original_keywords, limit=request.limit)
    
    # 2. FALLBACK: If results < 3, broaden search
    if len(results) < 3:
        print(f"⚠️ Only {len(results)} results. Triggering Smart Fallback...")
        
        # Take first 3 words for broader search
        words = original_keywords.split()
        if len(words) > 3:
            broad_keywords = " ".join(words[:3])
            effective_keywords = broad_keywords
            used_fallback = True
            
            print(f"🔄 Fallback keywords: '{broad_keywords}'")
            
            broad_results = await search_papers_internal(broad_keywords, limit=15)
            
            # Merge without duplicates
            existing_ids = {p.paperId for p in results}
            for p in broad_results:
                if p.paperId not in existing_ids:
                    results.append(p)
                    existing_ids.add(p.paperId)
            
            print(f"📊 After fallback: {len(results)} total papers")
    
    # Convert to response format
    papers = [
        SearchPaperResult(
            paperId=p.paperId,
            title=p.title,
            abstract=p.abstract,
            authors=[a.name for a in p.authors],
            year=p.year,
            citationCount=p.citationCount,
            url=p.url,
            pdfUrl=p.openAccessPdf.get("url") if p.openAccessPdf else None
        )
        for p in results
    ]
    
    return SearchWithFallbackResponse(
        papers=papers,
        total=len(papers),
        used_fallback=used_fallback,
        original_keywords=original_keywords,
        effective_keywords=effective_keywords
    )


# ============================================================================
# STAGED DEEP RESEARCH ENDPOINTS - For Real-Time Progress
# ============================================================================

class DecomposeRequest(BaseModel):
    topic: str
    keywords: str

class DecomposeResponse(BaseModel):
    sub_queries: List[str]
    reasoning: str


@router.post("/decompose", response_model=DecomposeResponse)
async def decompose_topic(request: DecomposeRequest):
    """
    Stage 1: Decompose topic into sub-queries.
    Returns immediately so frontend can show results in real-time.
    """
    print(f"🧠 Decomposing: {request.topic}")
    
    result = await generate_sub_queries(request.topic, request.keywords)
    
    return DecomposeResponse(
        sub_queries=result.get("sub_queries", [request.keywords]),
        reasoning=result.get("reasoning", "")
    )


class MultiSearchRequest(BaseModel):
    sub_queries: List[str]
    limit_per_query: int = 8

class MultiSearchResponse(BaseModel):
    papers: List[SearchPaperResult]
    total_papers: int
    queries_searched: int


@router.post("/multi-search", response_model=MultiSearchResponse)
async def multi_search(request: MultiSearchRequest):
    """
    Stage 2: Parallel search across all sub-queries.
    Returns deduplicated papers immediately.
    """
    print(f"🔍 Multi-search: {len(request.sub_queries)} queries")
    
    # Create search tasks for all sub-queries
    search_tasks = [
        search_papers_internal(query, limit=request.limit_per_query)
        for query in request.sub_queries
    ]
    
    # Execute all searches in parallel
    search_results = await asyncio.gather(*search_tasks, return_exceptions=True)
    
    # Merge and deduplicate papers
    all_papers = []
    seen_ids = set()
    
    for i, result in enumerate(search_results):
        if isinstance(result, Exception):
            print(f"   ⚠️ Query '{request.sub_queries[i]}' failed: {str(result)}")
            continue
        
        for paper in result:
            if paper.paperId not in seen_ids:
                all_papers.append(paper)
                seen_ids.add(paper.paperId)
    
    print(f"   ✅ Found {len(all_papers)} unique papers")
    
    # Convert to response format
    papers_response = [
        SearchPaperResult(
            paperId=p.paperId,
            title=p.title,
            abstract=p.abstract,
            authors=[a.name for a in p.authors],
            year=p.year,
            citationCount=p.citationCount,
            url=p.url,
            pdfUrl=p.openAccessPdf.get("url") if p.openAccessPdf else None
        )
        for p in all_papers
    ]
    
    return MultiSearchResponse(
        papers=papers_response,
        total_papers=len(papers_response),
        queries_searched=len(request.sub_queries)
    )


class FetchContentRequest(BaseModel):
    papers: List[dict]  # Flexible dict to avoid validation issues
    max_papers: int = 8

class PaperWithContent(BaseModel):
    paperId: str
    title: str
    abstract: Optional[str]
    authors: List[str]
    year: Optional[int]
    url: Optional[str]
    content_type: str  # "full_text" | "partial" | "abstract"
    content: str
    word_count: int

class FetchContentResponse(BaseModel):
    papers_with_content: List[PaperWithContent]
    full_text_count: int
    abstract_only_count: int


@router.post("/fetch-content", response_model=FetchContentResponse)
async def fetch_content(request: FetchContentRequest):
    """
    Stage 3: Fetch full-text content from papers via Jina Reader.
    Returns papers with content immediately.
    """
    print(f"📄 Fetching content for {min(len(request.papers), request.max_papers)} papers")
    
    # Papers are already dicts, just pass them through
    papers_dict = [
        {
            "paperId": p.get("paperId", ""),
            "title": p.get("title", "Unknown"),
            "abstract": p.get("abstract"),
            "authors": p.get("authors", []),
            "year": p.get("year"),
            "url": p.get("url"),
            "pdfUrl": p.get("pdfUrl")
        }
        for p in request.papers
    ]
    
    papers_with_content = await fetch_multiple_papers_content(
        papers_dict,
        max_papers=request.max_papers
    )
    
    full_text_count = 0
    result_papers = []
    
    for p in papers_with_content:
        content_info = p.get("full_content", {})
        content_type = content_info.get("content_type", "abstract")
        
        if content_type == "full_text":
            full_text_count += 1
        
        result_papers.append(PaperWithContent(
            paperId=p["paperId"],
            title=p["title"],
            abstract=p.get("abstract"),
            authors=p.get("authors", []),
            year=p.get("year"),
            url=p.get("url"),
            content_type=content_type,
            content=content_info.get("content", p.get("abstract", "")),
            word_count=content_info.get("word_count", 0)
        ))
    
    return FetchContentResponse(
        papers_with_content=result_papers,
        full_text_count=full_text_count,
        abstract_only_count=len(result_papers) - full_text_count
    )


class GenerateReportRequest(BaseModel):
    topic: str
    papers_with_content: List[PaperWithContent]
    insights: List[KeyInsight]

class GenerateReportResponse(BaseModel):
    research_report: str
    word_count: int


@router.post("/generate-report", response_model=GenerateReportResponse)
async def generate_report(request: GenerateReportRequest):
    """
    Stage 5: Generate comprehensive research report (Narrator).
    """
    print(f"📝 Generating research report for: {request.topic}")
    
    # Convert to format expected by cowriter
    papers_for_report = [
        {
            "paperId": p.paperId,
            "title": p.title,
            "abstract": p.abstract,
            "authors": p.authors,
            "year": p.year,
            "url": p.url,
            "full_content": {
                "content_type": p.content_type,
                "content": p.content,
                "word_count": p.word_count
            }
        }
        for p in request.papers_with_content
    ]
    
    insights_dict = [
        {"insight": i.insight, "source": i.source, "paperId": i.paperId}
        for i in request.insights
    ]
    
    report = await generate_research_report(
        topic=request.topic,
        papers_with_content=papers_for_report,
        insights=insights_dict
    )
    
    return GenerateReportResponse(
        research_report=report,
        word_count=len(report.split())
    )


# ============================================================================
# DEEP RESEARCH ENDPOINT - Agentic Workflow (Full Pipeline - Legacy)
# ============================================================================

class DeepResearchRequest(BaseModel):
    """Request model for deep research pipeline."""
    topic: str  # Original user topic
    keywords: str  # Finalized keywords from interview
    enable_full_text: bool = True  # Toggle for Mode Cepat vs Mode Deep Dive


class DeepResearchResult(BaseModel):
    """Complete result from deep research pipeline."""
    # Decomposition
    sub_queries: List[str]
    decomposition_reasoning: str
    
    # Papers
    papers: List[SearchPaperResult]
    total_papers: int
    papers_with_full_text: int
    
    # Content
    research_report: str  # Output from Narrator stage
    
    # Final Blueprint
    content_blueprint: ContentBlueprint


@router.post("/deep-research/start", response_model=DeepResearchResult)
async def start_deep_research(request: DeepResearchRequest):
    """
    Start the full Deep Research pipeline with agentic workflow.
    
    Pipeline stages:
    1. DECOMPOSE: Break topic into 3-4 diverse sub-queries
    2. MULTI-SEARCH: Parallel search all sub-queries on Semantic Scholar
    3. DEDUPLICATE: Merge unique papers from all searches
    4. FETCH CONTENT: Get full-text from papers (if Mode Deep Dive)
    5. ANALYZE: Extract key insights from papers
    6. NARRATOR: Generate comprehensive research report
    7. EDITOR: Transform report into engaging video script
    
    Args:
        request: DeepResearchRequest with topic, keywords, and mode toggle
        
    Returns:
        DeepResearchResult with all pipeline outputs
    """
    print("\n" + "=" * 60)
    print("🚀 STARTING DEEP RESEARCH PIPELINE")
    print(f"📝 Topic: {request.topic}")
    print(f"🔑 Keywords: {request.keywords}")
    print(f"📖 Mode: {'Deep Dive (Full Text)' if request.enable_full_text else 'Cepat (Abstract Only)'}")
    print("=" * 60 + "\n")
    
    try:
        # ========================================
        # STAGE 1: DECOMPOSITION
        # ========================================
        print("🧠 Stage 1: Decomposing topic into sub-queries...")
        
        decomposition = await generate_sub_queries(request.topic, request.keywords)
        sub_queries = decomposition.get("sub_queries", [request.keywords])
        reasoning = decomposition.get("reasoning", "")
        
        print(f"   ✅ Generated {len(sub_queries)} sub-queries\n")
        
        # ========================================
        # STAGE 2: PARALLEL MULTI-SEARCH
        # ========================================
        print("🔍 Stage 2: Parallel searching across all sub-queries...")
        
        # Create search tasks for all sub-queries
        search_tasks = [
            search_papers_internal(query, limit=8)
            for query in sub_queries
        ]
        
        # Execute all searches in parallel
        search_results = await asyncio.gather(*search_tasks, return_exceptions=True)
        
        # Merge and deduplicate papers
        all_papers = []
        seen_ids = set()
        
        for i, result in enumerate(search_results):
            if isinstance(result, Exception):
                print(f"   ⚠️ Query '{sub_queries[i]}' failed: {str(result)}")
                continue
            
            for paper in result:
                if paper.paperId not in seen_ids:
                    all_papers.append(paper)
                    seen_ids.add(paper.paperId)
        
        print(f"   ✅ Found {len(all_papers)} unique papers from {len(sub_queries)} queries\n")
        
        if len(all_papers) == 0:
            raise HTTPException(
                status_code=404,
                detail="No papers found across all search queries"
            )
        
        # Convert to dict format for further processing
        papers_dict = [
            {
                "paperId": p.paperId,
                "title": p.title,
                "abstract": p.abstract,
                "authors": [{"name": a.name} for a in p.authors],
                "year": p.year,
                "citationCount": p.citationCount,
                "url": p.url,
                "pdfUrl": p.openAccessPdf.get("url") if p.openAccessPdf else None
            }
            for p in all_papers
        ]
        
        # ========================================
        # STAGE 3: FETCH FULL CONTENT (if Mode Deep Dive)
        # ========================================
        papers_with_content = papers_dict
        full_text_count = 0
        
        if request.enable_full_text:
            print("📄 Stage 3: Fetching full-text content via Jina Reader...")
            
            papers_with_content = await fetch_multiple_papers_content(
                papers_dict,
                max_papers=8  # Limit to avoid rate limits and token explosion
            )
            
            full_text_count = sum(
                1 for p in papers_with_content 
                if p.get("full_content", {}).get("content_type") == "full_text"
            )
            
            print(f"   ✅ {full_text_count} papers with full text, {len(papers_with_content) - full_text_count} abstract-only\n")
        else:
            print("⏩ Stage 3: Skipped (Mode Cepat - Abstract Only)\n")
            # Add abstract as content for all papers
            for paper in papers_with_content:
                paper["full_content"] = {
                    "content_type": "abstract",
                    "content": paper.get("abstract", "No abstract available."),
                    "source": "abstract",
                    "word_count": len((paper.get("abstract") or "").split())
                }
        
        # ========================================
        # STAGE 4: ANALYZE - Extract Insights
        # ========================================
        print("🔬 Stage 4: Extracting key insights...")
        
        # Prepare papers for insight extraction
        papers_for_analysis = [
            PaperInput(
                paperId=p["paperId"],
                title=p["title"],
                abstract=p.get("abstract") or "",
                authors=[a.get("name", "") if isinstance(a, dict) else a for a in p.get("authors", [])],
                year=p.get("year"),
                url=p.get("url")
            )
            for p in papers_with_content[:10]
            if p.get("abstract")
        ]
        
        analyze_request = AnalyzeRequest(papers=papers_for_analysis, topic=request.topic)
        analyze_response = await analyze_papers(analyze_request)
        insights = analyze_response.insights
        
        print(f"   ✅ Extracted {len(insights)} key insights\n")
        
        # ========================================
        # STAGE 5: NARRATOR - Research Report
        # ========================================
        print("📝 Stage 5: Generating comprehensive research report (Narrator)...")
        
        research_report = await generate_research_report(
            topic=request.topic,
            papers_with_content=papers_with_content[:10],
            insights=[{"insight": i.insight, "source": i.source, "paperId": i.paperId} for i in insights]
        )
        
        report_word_count = len(research_report.split())
        print(f"   ✅ Research report: {report_word_count} words\n")
        
        # ========================================
        # STAGE 6: EDITOR - Final Script
        # ========================================
        print("✨ Stage 6: Crafting final video script (Editor)...")
        
        # Build references for Editor
        references = [
            {
                "title": p["title"],
                "authors": ", ".join([a.get("name", "") if isinstance(a, dict) else a for a in p.get("authors", [])[:3]]),
                "year": p.get("year"),
                "url": p.get("url")
            }
            for p in papers_with_content[:10]
        ]
        
        script_result = await generate_final_script(
            topic=request.topic,
            research_report=research_report,
            references=references
        )
        
        if "error" in script_result:
            raise HTTPException(status_code=500, detail=f"Editor failed: {script_result['error']}")
        
        narrative_data = script_result.get("narrative", {})
        narrative = NarrativeStructure(
            hook=narrative_data.get("hook", ""),
            introduction=narrative_data.get("introduction", ""),
            deep_dive=narrative_data.get("deep_dive", ""),
            conclusion=narrative_data.get("conclusion", "")
        )
        
        script_word_count = sum(len(v.split()) for v in [
            narrative.hook, narrative.introduction, narrative.deep_dive, narrative.conclusion
        ])
        print(f"   ✅ Final script: {script_word_count} words\n")
        
        # ========================================
        # BUILD FINAL RESULT
        # ========================================
        
        # Convert papers to response format
        papers_response = [
            SearchPaperResult(
                paperId=p["paperId"],
                title=p["title"],
                abstract=p.get("abstract"),
                authors=[a.get("name", "") if isinstance(a, dict) else a for a in p.get("authors", [])],
                year=p.get("year"),
                citationCount=p.get("citationCount"),
                url=p.get("url"),
                pdfUrl=p.get("pdfUrl")
            )
            for p in papers_with_content
        ]
        
        # Build reference list
        references_response = [
            Reference(
                title=p["title"],
                authors=", ".join([a.get("name", "") if isinstance(a, dict) else a for a in p.get("authors", [])[:3]]),
                year=p.get("year"),
                url=p.get("url")
            )
            for p in papers_with_content[:10]
        ]
        
        content_blueprint = ContentBlueprint(
            key_insights=insights,
            narrative=narrative,
            references=references_response
        )
        
        # Save narrative to file for debugging
        save_narrative_to_file(
            topic=request.topic,
            narrative={
                "hook": narrative.hook,
                "introduction": narrative.introduction,
                "deep_dive": narrative.deep_dive,
                "conclusion": narrative.conclusion
            },
            insights=[{"insight": i.insight, "source": i.source} for i in insights],
            references=references_response
        )
        
        print("=" * 60)
        print("✅ DEEP RESEARCH PIPELINE COMPLETE!")
        print(f"   📊 Papers: {len(papers_response)}")
        print(f"   💡 Insights: {len(insights)}")
        print(f"   📝 Report: {report_word_count} words")
        print(f"   ✨ Script: {script_word_count} words")
        print("=" * 60 + "\n")
        
        return DeepResearchResult(
            sub_queries=sub_queries,
            decomposition_reasoning=reasoning,
            papers=papers_response,
            total_papers=len(papers_response),
            papers_with_full_text=full_text_count,
            research_report=research_report,
            content_blueprint=content_blueprint
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Deep Research Pipeline Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Deep research failed: {str(e)}")
