from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_ROLE_KEY

router = APIRouter()

# Initialize Supabase client
supabase: Client = None
if SUPABASE_URL and SUPABASE_ROLE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_ROLE_KEY)


# Request/Response Models
class KeyInsightInput(BaseModel):
    insight: str
    source: str
    paperId: str

class NarrativeInput(BaseModel):
    hook: str
    introduction: str  # Was 'problem'
    deep_dive: str  # Was 'science'
    conclusion: str  # Was 'takeaway'

class PaperInput(BaseModel):
    paperId: str
    title: str
    abstract: Optional[str] = None
    authors: List[str] = []
    year: Optional[int] = None
    citationCount: Optional[int] = None
    url: Optional[str] = None
    isOpenAccess: bool = False

class SaveProjectRequest(BaseModel):
    user_id: str
    title: str
    query_topic: str
    key_insights: List[KeyInsightInput]
    narrative: NarrativeInput
    papers: List[PaperInput]

class SaveProjectResponse(BaseModel):
    project_id: str
    message: str


def generate_canvas_content(title: str, narrative: NarrativeInput, key_insights: List[KeyInsightInput]) -> list:
    """Generate BlockNote-compatible blocks from narrative content."""
    blocks = []
    
    # Title as H1
    blocks.append({
        "type": "heading",
        "props": {"level": 1},
        "content": [{"type": "text", "text": title, "styles": {}}]
    })
    blocks.append({"type": "paragraph", "content": []})
    
    # The Hook section
    if narrative.hook:
        blocks.append({
            "type": "heading",
            "props": {"level": 2},
            "content": [{"type": "text", "text": "The Hook", "styles": {}}]
        })
        # Split hook into paragraphs for better formatting
        for para in narrative.hook.split("\n\n"):
            if para.strip():
                blocks.append({
                    "type": "paragraph",
                    "content": [{"type": "text", "text": para.strip(), "styles": {}}]
                })
        blocks.append({"type": "paragraph", "content": []})
    
    # Key Insights section
    if key_insights:
        blocks.append({
            "type": "heading",
            "props": {"level": 2},
            "content": [{"type": "text", "text": "Key Insights", "styles": {}}]
        })
        for insight in key_insights:
            blocks.append({
                "type": "numberedListItem",
                "content": [{"type": "text", "text": insight.insight, "styles": {}}]
            })
        blocks.append({"type": "paragraph", "content": []})
    
    # Introduction section
    if narrative.introduction:
        blocks.append({
            "type": "heading",
            "props": {"level": 2},
            "content": [{"type": "text", "text": "Introduction", "styles": {}}]
        })
        for para in narrative.introduction.split("\n\n"):
            if para.strip():
                blocks.append({
                    "type": "paragraph",
                    "content": [{"type": "text", "text": para.strip(), "styles": {}}]
                })
        blocks.append({"type": "paragraph", "content": []})
    
    # The Deep Dive section (main content)
    if narrative.deep_dive:
        blocks.append({
            "type": "heading",
            "props": {"level": 2},
            "content": [{"type": "text", "text": "The Deep Dive", "styles": {}}]
        })
        # Split deep_dive into paragraphs
        for para in narrative.deep_dive.split("\n\n"):
            if para.strip():
                blocks.append({
                    "type": "paragraph",
                    "content": [{"type": "text", "text": para.strip(), "styles": {}}]
                })
        blocks.append({"type": "paragraph", "content": []})
    
    # Conclusion section
    if narrative.conclusion:
        blocks.append({
            "type": "heading",
            "props": {"level": 2},
            "content": [{"type": "text", "text": "Conclusion & Takeaways", "styles": {}}]
        })
        for para in narrative.conclusion.split("\n\n"):
            if para.strip():
                blocks.append({
                    "type": "paragraph",
                    "content": [{"type": "text", "text": para.strip(), "styles": {}}]
                })
    
    return blocks


@router.post("/save-project", response_model=SaveProjectResponse)
async def save_project(request: SaveProjectRequest):
    """
    Save Content Blueprint and papers to Supabase.
    Creates a new project with generated content and research papers.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # 1. Create project
        project_result = supabase.table("projects").insert({
            "user_id": request.user_id,
            "title": request.title,
            "query_topic": request.query_topic,
            "status": "draft"
        }).execute()
        
        if not project_result.data:
            raise HTTPException(status_code=500, detail="Failed to create project")
        
        project_id = project_result.data[0]["id"]
        
        # 2. Generate canvas content (BlockNote blocks)
        canvas_content = generate_canvas_content(
            request.title,
            request.narrative,
            request.key_insights
        )
        
        # 3. Save to workbench_content
        content_result = supabase.table("workbench_content").insert({
            "project_id": project_id,
            "canvas_content": canvas_content,
            "key_insights": [ins.insight for ins in request.key_insights],
            "tone_style": "casual"
        }).execute()
        
        # 4. Save research papers
        papers_data = []
        for paper in request.papers:
            papers_data.append({
                "project_id": project_id,
                "title": paper.title,
                "authors": paper.authors,
                "year": paper.year,
                "citation_count": paper.citationCount,
                "url": paper.url,
                "is_open_access": paper.isOpenAccess,
                "abstract": paper.abstract
            })
        
        if papers_data:
            supabase.table("research_papers").insert(papers_data).execute()
        
        return SaveProjectResponse(
            project_id=project_id,
            message="Project saved successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving project: {str(e)}")
