import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { type BlockNoteEditor, type Block } from "@blocknote/core";

// Helper to extract text from a block safely
function getBlockText(block: Block): string {
  if (!block || !block.content) return "";

  if (Array.isArray(block.content)) {
    return block.content
      .map((item: any) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item)
          return item.text;
        return "";
      })
      .join("");
  }

  return "";
}

export const useAutoSave = (
  editor: BlockNoteEditor | null,
  projectId: string,
  isRealtimeUpdate?: React.MutableRefObject<boolean>
) => {
  const supabase = createClient();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isInitialized = useRef(false);

  const saveChanges = useCallback(async () => {
    if (!editor || !projectId) {
      console.error("Editor or projectId is not available for saving");
      return;
    }

    console.log("Starting auto-save...");
    setIsSaving(true);
    try {
      const blocks: Block[] = editor.topLevelBlocks;
      let newTitle = "Untitled Research";

      // Extract title from first heading block
      if (blocks.length > 0) {
        const titleBlock = blocks[0];
        newTitle = getBlockText(titleBlock) || "Untitled Research";
      }

      console.log("Saving title:", newTitle);

      // Update projects table (title and updated_at)
      const { error: projectError } = await supabase
        .from("projects")
        .update({
          title: newTitle,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      if (projectError) {
        console.error("Error updating project:", projectError);
        throw projectError;
      }

      // Save BlockNote blocks as JSON to workbench_content.canvas_content
      const { error: contentError } = await supabase
        .from("workbench_content")
        .update({
          canvas_content: blocks,
        })
        .eq("project_id", projectId);

      if (contentError) {
        console.error("Error updating canvas_content:", contentError);
        // Try to insert if it doesn't exist
        const { error: insertError } = await supabase
          .from("workbench_content")
          .insert({
            project_id: projectId,
            canvas_content: blocks,
          });

        if (insertError) {
          console.error("Error inserting workbench_content:", insertError);
        }
      }

      console.log("Auto-saved successfully");
    } catch (error: any) {
      console.error("Auto-save error:", error);
    } finally {
      setIsSaving(false);
    }
  }, [editor, projectId, supabase]);

  useEffect(() => {
    if (!editor || !projectId) {
      console.log("useAutoSave: editor or projectId not ready");
      return;
    }

    // Don't re-initialize if already done
    if (isInitialized.current) {
      console.log("useAutoSave: already initialized");
      return;
    }

    console.log("useAutoSave: initializing...");

    const handleContentChange = () => {
      console.log("Content changed, scheduling save...");

      // Skip if this is a realtime update from another source
      if (isRealtimeUpdate?.current) {
        isRealtimeUpdate.current = false;
        return;
      }

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        saveChanges();
      }, 1500);
    };

    // Small delay to ensure editor is fully ready, then subscribe
    const initTimer = setTimeout(() => {
      console.log("useAutoSave: subscribing to editor changes");
      editor.onEditorContentChange(handleContentChange);
      isInitialized.current = true;
    }, 500);

    // Cleanup function
    return () => {
      console.log("useAutoSave: cleaning up");
      clearTimeout(initTimer);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      isInitialized.current = false;
    };
  }, [editor, projectId, saveChanges, isRealtimeUpdate]);

  return { isSaving };
};
