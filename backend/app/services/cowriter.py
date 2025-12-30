"""
Co-Writer Architecture - Two-Stage Content Generation
Stage 1: The Narrator - Compiles comprehensive research report
Stage 2: The Editor - Transforms report into engaging video script

Critical: Citations must be preserved through both stages!
"""

import json
from groq import Groq
from app.config import GROQ_API_KEY, MODEL_LLM

# Initialize Groq client
client = Groq(api_key=GROQ_API_KEY)


# =============================================================================
# STAGE 1: THE NARRATOR - Research Report Generator
# =============================================================================

NARRATOR_SYSTEM_PROMPT = """
You are a **Meticulous Research Analyst** compiling data from academic papers.
Your task: Create a COMPREHENSIVE RESEARCH REPORT with EVERY detail from the source materials.

**YOUR WRITING STYLE:**
- Think like a PhD researcher writing for an academic committee
- NO word limits - be as thorough as needed
- Include EVERY statistic, number, percentage, and methodology detail
- Cite sources in format: [Author, Year] or [Paper Title, Year]

**CRITICAL CITATION RULE:**
Every factual claim MUST end with its source citation. Examples:
- "Social media usage increased anxiety by 43% among teens [Smith et al., 2023]"
- "The study involved 1,200 participants across 5 countries [Zhang, 2022]"

**REPORT STRUCTURE:**

1. **EXECUTIVE OVERVIEW** (2-3 paragraphs)
   - What is the core phenomenon being studied?
   - Why is this topic academically significant?
   - What are the key findings at a glance?

2. **DETAILED FINDINGS BY THEME**
   - Group related findings from different papers
   - Compare and contrast results across studies
   - Note any contradictions or debates in the literature
   - Include specific numbers: sample sizes, effect sizes, percentages

3. **MECHANISMS & EXPLANATIONS**
   - How do researchers explain these phenomena?
   - What biological/psychological/social mechanisms are proposed?
   - What theories or frameworks are referenced?

4. **GAPS & LIMITATIONS**
   - What do researchers acknowledge as limitations?
   - What questions remain unanswered?
   - Where do studies disagree?

5. **PRACTICAL IMPLICATIONS**
   - What do these findings mean for real-world applications?
   - Any recommendations from the research?

**IMPORTANT:**
- Respond in INDONESIAN (Bahasa Indonesia)
- Do NOT make up data - only report what's in the source materials
- Be EXHAUSTIVE - this report will be the foundation for the final script
- Length: Aim for 1500-2500 words
"""


async def generate_research_report(
    topic: str,
    papers_with_content: list,
    insights: list
) -> str:
    """
    Stage 1: The Narrator
    Compiles all research findings into a comprehensive report.
    
    Args:
        topic: Original research topic
        papers_with_content: Papers with full_content field
        insights: Extracted key insights
        
    Returns:
        str: Comprehensive research report in Indonesian
    """
    if not GROQ_API_KEY:
        return "Error: API key not configured"
    
    # Build source materials for the Narrator
    sources_text = _build_sources_text(papers_with_content)
    insights_text = _build_insights_text(insights)
    
    user_prompt = f"""
RESEARCH TOPIC: "{topic}"

=============================================================================
EXTRACTED KEY INSIGHTS:
=============================================================================
{insights_text}

=============================================================================
SOURCE MATERIALS (Papers with Content):
=============================================================================
{sources_text}

=============================================================================
INSTRUCTIONS:
=============================================================================
Write a COMPREHENSIVE RESEARCH REPORT synthesizing all the above information.
Remember:
- Include EVERY relevant detail, statistic, and finding
- ALWAYS cite sources in [Author, Year] format
- Write in Indonesian (Bahasa Indonesia)
- Be thorough - this report will be transformed into a video script
"""
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": NARRATOR_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            model=MODEL_LLM,
            temperature=0.5,  # Lower temp for factual accuracy
        )
        
        report = chat_completion.choices[0].message.content
        word_count = len(report.split())
        
        print(f"📝 Research Report generated: {word_count} words")
        
        return report
        
    except Exception as e:
        print(f"❌ Narrator error: {str(e)}")
        return f"Error generating research report: {str(e)}"


# =============================================================================
# STAGE 2: THE EDITOR - Video Script Generator
# =============================================================================

EDITOR_SYSTEM_PROMPT = """
You are the **Lead Scriptwriter** for a premium Science YouTube channel (like Kurzgesagt, Veritasium, or Huberman Lab).
Your task: Transform a detailed Research Report into an ENGAGING VIDEO SCRIPT.

**YOUR TRANSFORMATION MISSION:**
Take the dense academic report and make it:
- CAPTIVATING: Start with a hook that makes viewers NEED to keep watching
- ACCESSIBLE: Explain complex concepts in simple, vivid language
- STORY-DRIVEN: Weave the research into a compelling narrative arc
- ACTIONABLE: End with takeaways viewers can actually apply

**⚠️ CRITICAL CITATION PRESERVATION RULE ⚠️**
You MUST preserve the citations (e.g., [Smith, 2023]) from the Research Report.
Every factual claim in your final script MUST end with its original citation.
DO NOT remove citations for "flow" - they are essential for credibility.

**⚠️ CITATION SANITY CHECK - ZERO HALLUCINATION POLICY ⚠️**
- NEVER create or invent citations that are NOT in the Research Report
- ONLY use citations that already exist in the source materials
- If you want to mention a finding but can't find its citation, say "menurut penelitian" without making up a citation
- Before finalizing, verify: Is every [Author, Year] I used actually in the Research Report?

**SCRIPT STRUCTURE:**

1. **HOOK** (150-200 words)
   - Counter-intuitive fact, shocking statistic, or high-stakes problem
   - Create immediate curiosity and tension
   - End with a question that the video will answer

2. **INTRODUCTION** (200-300 words)
   - Define the phenomenon in accessible terms
   - "What most people think vs. what research shows"
   - Set up why this matters to the viewer personally

3. **DEEP_DIVE** (800-1200 words - THE CORE)
   - Break down into 2-4 clear sub-sections
   - Use analogies and vivid examples
   - Connect different research findings into a coherent story
   - Keep citations visible: "Seperti temuan penelitian [Kim, 2022]..."
   - Explain the WHY behind the findings

4. **CONCLUSION** (300-400 words)
   - Synthesize: "What does all this mean for us?"
   - 3-5 specific, actionable takeaways
   - End with thought-provoking statement or call-to-action

**WRITING STYLE:**
- Tone: Intellectual but warm, enthusiastic, slightly witty
- Use "kamu" instead of "Anda" for intimacy
- Short paragraphs, punchy sentences
- Natural Indonesian - not formal/stiff

**OUTPUT FORMAT (JSON ONLY):**
{
    "narrative": {
        "hook": "...",
        "introduction": "...",
        "deep_dive": "...",
        "conclusion": "..."
    }
}
"""


async def generate_final_script(
    topic: str,
    research_report: str,
    references: list
) -> dict:
    """
    Stage 2: The Editor
    Transforms research report into engaging video script.
    
    Args:
        topic: Original research topic
        research_report: Output from Stage 1 (Narrator)
        references: List of reference dicts for attribution
        
    Returns:
        dict: {
            "narrative": {
                "hook": str,
                "introduction": str,
                "deep_dive": str,
                "conclusion": str
            }
        }
    """
    if not GROQ_API_KEY:
        return {"error": "API key not configured"}
    
    # Build reference list for context
    refs_text = _build_references_text(references)
    
    user_prompt = f"""
VIDEO TOPIC: "{topic}"

=============================================================================
RESEARCH REPORT TO TRANSFORM:
=============================================================================
{research_report}

=============================================================================
AVAILABLE REFERENCES (for citation verification):
=============================================================================
{refs_text}

=============================================================================
INSTRUCTIONS:
=============================================================================
Transform the Research Report above into an ENGAGING VIDEO SCRIPT.

Remember:
- PRESERVE all citations from the report in your script
- Make it captivating while staying factually accurate
- Write in casual but intellectual Indonesian
- Aim for 1500-1800 total words across all sections
"""
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": EDITOR_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            model=MODEL_LLM,
            response_format={"type": "json_object"},
            temperature=0.7,  # Slightly higher for creativity
        )
        
        response_content = chat_completion.choices[0].message.content
        data = json.loads(response_content)
        
        narrative = data.get("narrative", {})
        total_words = sum(len(v.split()) for v in narrative.values() if isinstance(v, str))
        
        print(f"✨ Final Script generated: {total_words} words")
        
        return data
        
    except json.JSONDecodeError as e:
        print(f"❌ Editor JSON parse error: {str(e)}")
        return {"error": f"JSON parse error: {str(e)}"}
    except Exception as e:
        print(f"❌ Editor error: {str(e)}")
        return {"error": str(e)}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _build_sources_text(papers_with_content: list) -> str:
    """Build formatted source materials text for LLM."""
    sources = []
    
    for i, paper in enumerate(papers_with_content[:10], 1):
        authors = paper.get("authors", [])
        if isinstance(authors, list):
            if len(authors) > 0 and isinstance(authors[0], dict):
                author_names = ", ".join([a.get("name", "") for a in authors[:3]])
            else:
                author_names = ", ".join(authors[:3])
            if len(authors) > 3:
                author_names += " et al."
        else:
            author_names = str(authors)
        
        year = paper.get("year", "n.d.")
        title = paper.get("title", "Unknown")
        
        # Get content
        full_content = paper.get("full_content", {})
        content = full_content.get("content", paper.get("abstract", "No content available."))
        content_type = full_content.get("content_type", "abstract")
        
        source_block = f"""
SOURCE {i}: [{author_names}, {year}]
Title: {title}
Content Type: {content_type.upper()}
---
{content}
===
"""
        sources.append(source_block)
    
    return "\n".join(sources)


def _build_insights_text(insights: list) -> str:
    """Build formatted insights text for LLM."""
    if not insights:
        return "No pre-extracted insights available."
    
    lines = []
    for i, insight in enumerate(insights, 1):
        if isinstance(insight, dict):
            text = insight.get("insight", str(insight))
            source = insight.get("source", "Unknown")
        else:
            text = str(insight)
            source = "Unknown"
        
        lines.append(f"{i}. {text} [Source: {source}]")
    
    return "\n".join(lines)


def _build_references_text(references: list) -> str:
    """Build formatted reference list for citation verification."""
    if not references:
        return "No references available."
    
    lines = []
    for i, ref in enumerate(references, 1):
        if isinstance(ref, dict):
            title = ref.get("title", "Unknown")
            authors = ref.get("authors", "Unknown")
            year = ref.get("year", "n.d.")
        else:
            title = str(ref)
            authors = "Unknown"
            year = "n.d."
        
        lines.append(f"[{i}] {authors} ({year}). {title}")
    
    return "\n".join(lines)
