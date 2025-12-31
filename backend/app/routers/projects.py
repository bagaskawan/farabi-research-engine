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

import re

def parse_markdown_inline(text: str) -> list:
    """
    Parse inline markdown (**bold**, *italic*, `code`) into BlockNote content array.
    Returns a list of inline content objects with proper styles.
    """
    result = []
    
    # Pattern matches: **bold**, *italic*, `code`, or plain text
    pattern = re.compile(r'(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|[^*`]+)')
    
    for match in pattern.finditer(text):
        segment = match.group(0)
        
        if segment.startswith('**') and segment.endswith('**'):
            # Bold text
            inner_text = segment[2:-2]
            if inner_text.strip():
                result.append({
                    "type": "text",
                    "text": inner_text,
                    "styles": {"bold": True}
                })
        elif segment.startswith('*') and segment.endswith('*') and not segment.startswith('**'):
            # Italic text
            inner_text = segment[1:-1]
            if inner_text.strip():
                result.append({
                    "type": "text",
                    "text": inner_text,
                    "styles": {"italic": True}
                })
        elif segment.startswith('`') and segment.endswith('`'):
            # Code text
            inner_text = segment[1:-1]
            if inner_text.strip():
                result.append({
                    "type": "text",
                    "text": inner_text,
                    "styles": {"code": True}
                })
        else:
            # Plain text
            if segment:
                result.append({
                    "type": "text",
                    "text": segment,
                    "styles": {}
                })
    
    # If no content parsed, return the original as plain text
    if not result and text:
        result.append({"type": "text", "text": text, "styles": {}})
    
    return result


def parse_text_block(text: str) -> list:
    """
    Parse a block of text that may contain markdown headers, tables, or regular paragraphs.
    Returns a list of BlockNote blocks.
    """
    blocks = []
    lines = text.split('\n')
    current_paragraph = []
    table_lines = []
    in_table = False
    
    def flush_paragraph():
        nonlocal current_paragraph
        if current_paragraph:
            para_text = ' '.join(current_paragraph).strip()
            if para_text:
                blocks.append({
                    "type": "paragraph",
                    "content": parse_markdown_inline(para_text)
                })
            current_paragraph = []
    
    def flush_table():
        nonlocal table_lines, in_table
        if table_lines:
            table_block = parse_markdown_table(table_lines)
            if table_block:
                blocks.append(table_block)
            table_lines = []
        in_table = False
    
    for line in lines:
        stripped = line.strip()
        
        # Check if this is a table line (starts with |)
        is_table_line = stripped.startswith('|') and stripped.endswith('|')
        # Also check for separator line like |---|---|
        is_separator_line = bool(re.match(r'^\|[-:\|\s]+\|$', stripped))
        
        if is_table_line or is_separator_line:
            # Flush paragraph before starting table
            flush_paragraph()
            in_table = True
            table_lines.append(stripped)
            continue
        
        # If we were in a table and now we're not, flush the table
        if in_table and not is_table_line:
            flush_table()
        
        # Check for markdown headers
        header_match = re.match(r'^(#{1,6})\s+(.+)$', stripped)
        
        if header_match:
            # Flush current paragraph first
            flush_paragraph()
            
            # Create header block
            level = min(len(header_match.group(1)), 3)  # BlockNote supports levels 1-3
            header_text = header_match.group(2).strip()
            blocks.append({
                "type": "heading",
                "props": {"level": level},
                "content": parse_markdown_inline(header_text)
            })
        elif stripped:
            # Regular text, accumulate for paragraph
            current_paragraph.append(stripped)
        else:
            # Empty line - flush paragraph
            flush_paragraph()
    
    # Flush remaining content
    flush_table()
    flush_paragraph()
    
    return blocks


def parse_markdown_table(lines: list) -> dict:
    """
    Parse markdown table lines into a BlockNote table block.
    
    Example input:
    ['| Header1 | Header2 |', '|---------|---------|', '| Cell1 | Cell2 |']
    
    Returns a BlockNote table block structure.
    """
    if not lines or len(lines) < 2:
        return None
    
    # Parse rows
    rows = []
    for i, line in enumerate(lines):
        # Skip separator lines (|---|---|)
        if re.match(r'^\|[-:\|\s]+\|$', line):
            continue
        
        # Parse cells
        cells = [cell.strip() for cell in line.split('|')]
        # Remove empty strings from start/end (from leading/trailing |)
        cells = [c for c in cells if c]
        
        if cells:
            rows.append(cells)
    
    if not rows:
        return None
    
    # Determine column count
    num_cols = max(len(row) for row in rows)
    
    # Build BlockNote table structure
    table_content = {
        "type": "table",
        "content": {
            "type": "tableContent",
            "rows": []
        }
    }
    
    for row_idx, row in enumerate(rows):
        row_cells = []
        for col_idx in range(num_cols):
            cell_text = row[col_idx] if col_idx < len(row) else ""
            row_cells.append({
                "type": "tableCell",
                "content": [
                    {
                        "type": "paragraph",
                        "content": parse_markdown_inline(cell_text) if cell_text else []
                    }
                ]
            })
        
        table_content["content"]["rows"].append({
            "type": "tableRow",
            "cells": row_cells
        })
    
    return table_content


def generate_canvas_content(title: str, narrative: NarrativeInput, key_insights: List[KeyInsightInput]) -> list:
    """Generate BlockNote-compatible blocks from narrative content with proper markdown parsing."""
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
        # Parse markdown in hook content
        hook_blocks = parse_text_block(narrative.hook)
        blocks.extend(hook_blocks)
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
                "content": parse_markdown_inline(insight.insight)
            })
        blocks.append({"type": "paragraph", "content": []})
    
    # Introduction section
    if narrative.introduction:
        blocks.append({
            "type": "heading",
            "props": {"level": 2},
            "content": [{"type": "text", "text": "Introduction", "styles": {}}]
        })
        intro_blocks = parse_text_block(narrative.introduction)
        blocks.extend(intro_blocks)
        blocks.append({"type": "paragraph", "content": []})
    
    # The Deep Dive section (main content)
    if narrative.deep_dive:
        blocks.append({
            "type": "heading",
            "props": {"level": 2},
            "content": [{"type": "text", "text": "The Deep Dive", "styles": {}}]
        })
        deep_dive_blocks = parse_text_block(narrative.deep_dive)
        blocks.extend(deep_dive_blocks)
        blocks.append({"type": "paragraph", "content": []})
    
    # Conclusion section
    if narrative.conclusion:
        blocks.append({
            "type": "heading",
            "props": {"level": 2},
            "content": [{"type": "text", "text": "Conclusion & Takeaways", "styles": {}}]
        })
        conclusion_blocks = parse_text_block(narrative.conclusion)
        blocks.extend(conclusion_blocks)
    
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
