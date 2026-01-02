"use client";

import { useEffect, useState, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useBlocknoteTheme } from "@/hooks/use-blocknote";
import { useAutoSave } from "@/hooks/use-autosave";
import "@blocknote/mantine/style.css";
import { AIExtension, AIMenuController } from "@blocknote/xl-ai";
import { DefaultChatTransport } from "ai";
import { en } from "@blocknote/core/locales";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import "@blocknote/xl-ai/style.css";
import {
  CustomAIMenu,
  FormattingToolbarWithAI,
  SlashMenuWithAI,
} from "@/components/modules/workspace/EditorComponents";

interface WorkspaceCanvasProps {
  canvasContent?: any; // Bisa berupa Array (Blocks) atau Object (AI Markdown)
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
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

  // 1. Inisialisasi Editor dengan AI Extension
  const editor = useCreateBlockNote({
    dictionary: {
      ...en,
      ai: aiEn,
    },
    extensions: [
      AIExtension({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: new DefaultChatTransport({
          api: "/api/ai/chat",
        }) as any,
      }),
    ],
  });
  const theme = useBlocknoteTheme();

  // 2. Logic Utama: Parsing Data & Loading ke Editor
  useEffect(() => {
    if (!editor) return;
    if (hasLoadedInitialData) return; // Mencegah overwrite saat user sedang mengetik

    const loadContent = async () => {
      console.log("🔍 Menganalisis Data Masuk:", canvasContent);

      // KASUS A: Data sudah berupa BlockNote Array (Saved State dari DB/History)
      if (Array.isArray(canvasContent) && canvasContent.length > 0) {
        console.log("✅ Loading Saved Blocks (Array)");
        editor.replaceBlocks(editor.document, canvasContent);
        setHasLoadedInitialData(true);
        return;
      }

      // KASUS B: Data berupa Object dari AI (Perlu di-Convert dari Markdown)
      // Cek apakah ini object dan punya properti konten AI
      const contentObj = canvasContent?.content || canvasContent; // Handle nesting

      if (
        contentObj &&
        (contentObj.hook || contentObj.deep_dive_analysis || contentObj.body)
      ) {
        console.log("✨ Parsing AI Markdown Content (Object)");

        const safeString = (val: any): string => {
          if (!val) return "";
          if (Array.isArray(val)) return val.join("\n\n");
          if (typeof val === "object") return JSON.stringify(val); // Fallback
          return String(val);
        };

        const {
          hook,
          introduction,
          deep_dive, // Matches new backend response
          deep_dive_analysis, // Legacy fallback
          body, // Legacy fallback
          actionable_conclusion,
          conclusion,
        } = contentObj;

        // Susun String Markdown
        let fullMarkdown = `# ${title || "Untitled Research"}\n\n`;

        const hookText = safeString(hook);
        if (hookText) fullMarkdown += `## 🎣 The Hook\n${hookText}\n\n`;

        const introText = safeString(introduction);
        if (introText) fullMarkdown += `## 📖 Introduction\n${introText}\n\n`;

        // Prioritas ke deep_dive (new), lalu deep_dive_analysis/body (legacy)
        const deepDiveText = safeString(
          deep_dive || deep_dive_analysis || body
        );
        if (deepDiveText)
          fullMarkdown += `## 🔬 The Deep Dive\n${deepDiveText}\n\n`;

        // Prioritas ke actionable, fallback ke conclusion
        const conclusionText = safeString(actionable_conclusion || conclusion);
        if (conclusionText)
          fullMarkdown += `## 🚀 Takeaways\n${conclusionText}\n\n`;

        // 🔥 MAGIC FUNCTION: Ubah String "**Bold**" jadi Block Bold
        // 1. Bersihkan formatting markdown yang mungkin rusak dari AI
        const cleanMarkdown = fullMarkdown
          // Unescape literal newlines (common in JSON)
          .replace(/\\n/g, "\n")
          // Ensure space after headers (e.g. "###Header" -> "### Header")
          .replace(/^(#+)([^#\s])/gm, "$1 $2")
          // Ensure double newlines before headers if missing
          .replace(/([^\n])\n(#+\s)/g, "$1\n\n$2");

        console.log("📝 Cleaned Markdown for BlockNote:", cleanMarkdown);

        const blocks = await editor.tryParseMarkdownToBlocks(cleanMarkdown);

        // Timpa isi editor
        editor.replaceBlocks(editor.document, blocks);
        setHasLoadedInitialData(true);
        return;
      }

      // KASUS C: Data Kosong / Project Baru
      // Hanya jalankan jika belum ada konten sama sekali
      if (!canvasContent && editor.document.length <= 1) {
        console.log("⚡ Initializing Empty Template");
        const defaultBlocks: any[] = [
          {
            type: "heading",
            props: { level: 1 },
            content: [
              { type: "text", text: title || "Untitled Research", styles: {} },
            ],
          },
        ];

        if (keyInsights && keyInsights.length > 0) {
          defaultBlocks.push({
            type: "heading",
            props: { level: 2 },
            content: [{ type: "text", text: "Key Insights", styles: {} }],
          });
          keyInsights.forEach((insight) => {
            defaultBlocks.push({
              type: "numberedListItem",
              content: [{ type: "text", text: insight, styles: {} }],
            });
          });
        }

        defaultBlocks.push({ type: "paragraph", content: [] });
        editor.replaceBlocks(editor.document, defaultBlocks);
        setHasLoadedInitialData(true);
      }
    };

    loadContent();
  }, [editor, canvasContent, title, keyInsights, hasLoadedInitialData]);

  // 3. Auto Save
  const { isSaving } = useAutoSave(editor, projectId, isRealtimeUpdate);

  useEffect(() => {
    onSavingChange?.(isSaving);
  }, [isSaving, onSavingChange]);

  // 4. Handle SSR
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen animate-pulse bg-gray-50 dark:bg-gray-900" />
    );
  }

  return (
    <main className="lg:col-span-8 h-[calc(100vh-150px)] overflow-y-auto pr-4 scrollbar-subtle">
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-4">
        <div className="min-h-[calc(100vh-200px)] w-full p-4 mb-4 font-barlow prose prose-stone dark:prose-invert min-w-full max-w-full flex-1">
          <BlockNoteView
            editor={editor}
            theme={theme}
            formattingToolbar={false}
            slashMenu={false}
            className="[&_.bn-editor]:!pl-0 [&_.bn-editor]:!pr-0 dark:[&_.bn-editor]:text-white dark:[&_.bn-block-content]:text-white"
          >
            <AIMenuController aiMenu={CustomAIMenu} />
            <FormattingToolbarWithAI />
            <SlashMenuWithAI editor={editor} />
          </BlockNoteView>
        </div>
      </div>
    </main>
  );
}
