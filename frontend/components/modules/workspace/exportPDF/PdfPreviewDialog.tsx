"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PdfExportDocument } from "./PdfExportTemplate";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import PDFViewer to avoid SSR issues
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface Block {
  type: string;
  props?: { level?: number };
  content?: Array<{
    type: string;
    text?: string;
    styles?: Record<string, boolean>;
  }>;
  children?: Block[];
}

interface PdfPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  title: string;
}

export default function PdfPreviewDialog({
  isOpen,
  onClose,
  projectId,
  title,
}: PdfPreviewDialogProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch latest data from Supabase whenever dialog opens
  useEffect(() => {
    async function fetchLatestContent() {
      if (!isOpen || !projectId) return;

      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from("workbench_content")
          .select("canvas_content")
          .eq("project_id", projectId)
          .single();

        if (fetchError) {
          console.error("Error fetching canvas content:", fetchError);
          setError("Failed to load content for PDF export");
          setBlocks([]);
          return;
        }

        if (data?.canvas_content && Array.isArray(data.canvas_content)) {
          console.log("✅ PDF Export: Loaded fresh data from Supabase");
          setBlocks(data.canvas_content);
        } else {
          setBlocks([]);
        }
      } catch (err) {
        console.error("Error in PDF preview:", err);
        setError("An unexpected error occurred");
        setBlocks([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLatestContent();
  }, [isOpen, projectId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-full h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>PDF Preview</DialogTitle>
        </DialogHeader>
        <div className="flex-1 w-full bg-slate-100 dark:bg-slate-800 p-4 overflow-hidden">
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center flex-col gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading latest content...
              </p>
            </div>
          ) : error ? (
            <div className="flex h-full w-full items-center justify-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : (
            <PDFViewer
              className="w-full h-full border rounded-md shadow-sm"
              showToolbar={true}
            >
              <PdfExportDocument title={title} blocks={blocks} />
            </PDFViewer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
