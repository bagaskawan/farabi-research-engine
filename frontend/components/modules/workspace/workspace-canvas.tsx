"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useBlocknoteTheme } from "@/hooks/use-blocknote";
import { useAutoSave } from "@/hooks/use-autosave";

import "@blocknote/mantine/style.css";

interface WorkspaceCanvasProps {
  canvasContent?: any; // BlockNote blocks JSON from database
  title?: string;
  keyInsights?: string[];
  projectId: string;
  onSavingChange?: (isSaving: boolean) => void;
}

export default function WorkspaceCanvas({
  canvasContent,
  title,
  keyInsights,
  projectId,
  onSavingChange,
}: WorkspaceCanvasProps) {
  const isRealtimeUpdate = useRef(false);
  const [isMounted, setIsMounted] = useState(false);

  // Handle SSR - only render BlockNote after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Create initial blocks from canvas_content or generate default structure
  const initialBlocks = useMemo(() => {
    // If we have saved canvas_content, use it directly
    if (
      canvasContent &&
      Array.isArray(canvasContent) &&
      canvasContent.length > 0
    ) {
      console.log("Loading from canvas_content JSON");
      return canvasContent;
    }

    // Otherwise, create default blocks with title
    console.log("Creating default blocks (no canvas_content)");
    const blocks: any[] = [];

    // Title as H1
    if (title) {
      blocks.push({
        type: "heading",
        props: { level: 1 },
        content: [{ type: "text", text: title, styles: {} }],
      });
      blocks.push({ type: "paragraph", content: [] });
    }

    // Key Insights section if available
    if (keyInsights && keyInsights.length > 0) {
      blocks.push({
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "Key Insights", styles: {} }],
      });
      keyInsights.forEach((insight) => {
        blocks.push({
          type: "numberedListItem",
          content: [{ type: "text", text: insight, styles: {} }],
        });
      });
      blocks.push({ type: "paragraph", content: [] });
    }

    // Add default paragraph for new content
    blocks.push({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Start writing your research here...",
          styles: {},
        },
      ],
    });

    return blocks.length > 0 ? blocks : undefined;
  }, [canvasContent, title, keyInsights]);

  const editor = useCreateBlockNote({
    initialContent: initialBlocks,
  });

  const theme = useBlocknoteTheme();

  // Use the auto-save hook
  const { isSaving } = useAutoSave(editor, projectId, isRealtimeUpdate);

  // Notify parent when saving state changes
  useEffect(() => {
    onSavingChange?.(isSaving);
  }, [isSaving, onSavingChange]);

  // Don't render BlockNote until mounted (client-side)
  if (!isMounted) {
    return (
      <main className="lg:col-span-8 h-[calc(100vh-150px)] overflow-y-auto pr-4">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 py-4">
          <div className="min-h-[calc(100vh-200px)] w-full p-4 mb-4" />
        </div>
      </main>
    );
  }

  return (
    <main className="lg:col-span-8 h-[calc(100vh-150px)] overflow-y-auto pr-4">
      {/* Editor */}
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-4">
        <div className="min-h-[calc(100vh-200px)] w-full p-4 mb-4 font-barlow prose prose-stone dark:prose-invert min-w-full max-w-full flex-1">
          <BlockNoteView
            editor={editor}
            theme={theme}
            className="[&_.bn-editor]:!pl-0 [&_.bn-editor]:!pr-0 dark:[&_.bn-editor]:text-white dark:[&_.bn-block-content]:text-white"
          />
        </div>
      </div>
    </main>
  );
}
