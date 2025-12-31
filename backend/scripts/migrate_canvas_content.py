"""
Migration Script: Fix Markdown Formatting in Existing Canvas Content

This script updates existing workbench_content records to properly parse
markdown formatting (**bold**, *italic*, `code`, ### headers) into
BlockNote-compatible inline styles.

Usage:
    cd backend
    python scripts/migrate_canvas_content.py

Requirements:
    - SUPABASE_URL and SUPABASE_ROLE_KEY environment variables set
    - supabase-py installed
"""

import os
import re
import sys
from typing import List, Any

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ROLE_KEY = os.getenv("SUPABASE_ROLE_KEY")


def parse_markdown_inline(text: str) -> list:
    """
    Parse inline markdown (**bold**, *italic*, `code`) into BlockNote content array.
    """
    result = []
    pattern = re.compile(r'(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|[^*`]+)')
    
    for match in pattern.finditer(text):
        segment = match.group(0)
        
        if segment.startswith('**') and segment.endswith('**'):
            inner_text = segment[2:-2]
            if inner_text.strip():
                result.append({
                    "type": "text",
                    "text": inner_text,
                    "styles": {"bold": True}
                })
        elif segment.startswith('*') and segment.endswith('*') and not segment.startswith('**'):
            inner_text = segment[1:-1]
            if inner_text.strip():
                result.append({
                    "type": "text",
                    "text": inner_text,
                    "styles": {"italic": True}
                })
        elif segment.startswith('`') and segment.endswith('`'):
            inner_text = segment[1:-1]
            if inner_text.strip():
                result.append({
                    "type": "text",
                    "text": inner_text,
                    "styles": {"code": True}
                })
        else:
            if segment:
                result.append({
                    "type": "text",
                    "text": segment,
                    "styles": {}
                })
    
    if not result and text:
        result.append({"type": "text", "text": text, "styles": {}})
    
    return result


def contains_raw_markdown(text: str) -> bool:
    """Check if text contains raw markdown syntax."""
    patterns = [
        r'\*\*[^*]+\*\*',  # **bold**
        r'\*[^*]+\*',      # *italic*
        r'^#{1,6}\s',      # ### headers
        r'`[^`]+`',        # `code`
        r'^\|.+\|$',       # | table |
    ]
    for pattern in patterns:
        if re.search(pattern, text, re.MULTILINE):
            return True
    return False


def extract_text_from_content(content: List[Any]) -> str:
    """Extract plain text from BlockNote content array."""
    text = ""
    for item in content:
        if isinstance(item, dict) and "text" in item:
            text += item["text"]
    return text


def parse_markdown_table(lines: list) -> dict:
    """
    Parse markdown table lines into a BlockNote table block.
    """
    if not lines or len(lines) < 2:
        return None
    
    rows = []
    for line in lines:
        if re.match(r'^\|[-:\|\s]+\|$', line):
            continue
        
        cells = [cell.strip() for cell in line.split('|')]
        cells = [c for c in cells if c]
        
        if cells:
            rows.append(cells)
    
    if not rows:
        return None
    
    num_cols = max(len(row) for row in rows)
    
    table_content = {
        "type": "table",
        "content": {
            "type": "tableContent",
            "rows": []
        }
    }
    
    for row in rows:
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


def is_table_line(text: str) -> bool:
    """Check if a line is part of a markdown table."""
    stripped = text.strip()
    return (stripped.startswith('|') and stripped.endswith('|')) or bool(re.match(r'^\|[-:\|\s]+\|$', stripped))


def fix_block_content(block: dict) -> dict:
    """Fix a single block's content if it contains raw markdown."""
    if "content" not in block or not isinstance(block["content"], list):
        return block
    
    # Extract text from content
    full_text = extract_text_from_content(block["content"])
    
    # Check if it needs fixing
    if not contains_raw_markdown(full_text):
        return block
    
    # Check for table pattern
    if block.get("type") == "paragraph" and is_table_line(full_text):
        # This is a table row stored as paragraph - will be handled by migrate_canvas_content
        pass
    
    # Check for header pattern in paragraph blocks
    if block.get("type") == "paragraph":
        header_match = re.match(r'^(#{1,6})\s+(.+)$', full_text.strip())
        if header_match:
            level = min(len(header_match.group(1)), 3)
            header_text = header_match.group(2).strip()
            return {
                "type": "heading",
                "props": {"level": level},
                "content": parse_markdown_inline(header_text)
            }
    
    # Parse inline markdown
    new_content = parse_markdown_inline(full_text)
    
    return {
        **block,
        "content": new_content
    }


def migrate_canvas_content(canvas_content: List[dict]) -> List[dict]:
    """Migrate entire canvas_content array, including merging table rows."""
    if not canvas_content or not isinstance(canvas_content, list):
        return canvas_content
    
    new_blocks = []
    table_lines = []
    
    def flush_table():
        nonlocal table_lines
        if table_lines:
            table_block = parse_markdown_table(table_lines)
            if table_block:
                new_blocks.append(table_block)
            table_lines = []
    
    for block in canvas_content:
        # Check if this block is a table line
        if "content" in block and isinstance(block["content"], list):
            text = extract_text_from_content(block["content"])
            if is_table_line(text):
                table_lines.append(text)
                continue
        
        # If we have accumulated table lines and this is not a table line, flush
        flush_table()
        
        # Fix and add the block
        fixed_block = fix_block_content(block)
        new_blocks.append(fixed_block)
        
        # Also fix children if present
        if "children" in fixed_block and isinstance(fixed_block["children"], list):
            fixed_block["children"] = [fix_block_content(child) for child in fixed_block["children"]]
    
    # Flush any remaining table
    flush_table()
    
    return new_blocks


def main():
    print("=" * 60)
    print("🔄 Canvas Content Migration Script")
    print("=" * 60)
    
    if not SUPABASE_URL or not SUPABASE_ROLE_KEY:
        print("❌ Error: SUPABASE_URL and SUPABASE_ROLE_KEY must be set")
        sys.exit(1)
    
    # Connect to Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_ROLE_KEY)
    print("✅ Connected to Supabase")
    
    # Fetch all workbench_content records
    print("\n📥 Fetching workbench_content records...")
    result = supabase.table("workbench_content").select("id, project_id, canvas_content").execute()
    
    if not result.data:
        print("ℹ️  No records found to migrate")
        return
    
    print(f"📊 Found {len(result.data)} records to check")
    
    migrated_count = 0
    skipped_count = 0
    error_count = 0
    
    for record in result.data:
        record_id = record["id"]
        project_id = record.get("project_id", "unknown")
        canvas_content = record.get("canvas_content")
        
        if not canvas_content:
            skipped_count += 1
            continue
        
        try:
            # Check if migration needed
            needs_migration = False
            for block in canvas_content:
                if "content" in block and isinstance(block["content"], list):
                    text = extract_text_from_content(block["content"])
                    if contains_raw_markdown(text):
                        needs_migration = True
                        break
            
            if not needs_migration:
                skipped_count += 1
                continue
            
            # Migrate content
            new_canvas_content = migrate_canvas_content(canvas_content)
            
            # Update in database
            supabase.table("workbench_content").update({
                "canvas_content": new_canvas_content
            }).eq("id", record_id).execute()
            
            migrated_count += 1
            print(f"  ✅ Migrated record {record_id} (project: {project_id})")
            
        except Exception as e:
            error_count += 1
            print(f"  ❌ Error migrating {record_id}: {str(e)}")
    
    print("\n" + "=" * 60)
    print("📊 Migration Summary")
    print("=" * 60)
    print(f"  ✅ Migrated: {migrated_count}")
    print(f"  ⏭️  Skipped (no changes needed): {skipped_count}")
    print(f"  ❌ Errors: {error_count}")
    print("=" * 60)


if __name__ == "__main__":
    main()
