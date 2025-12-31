"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PdfExportDocument } from "./PdfExportTemplate";
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
  title: string;
  blocks: Block[];
}

export default function PdfPreviewDialog({
  isOpen,
  onClose,
  title,
  blocks,
}: PdfPreviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-full h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>PDF Preview</DialogTitle>
        </DialogHeader>
        <div className="flex-1 w-full bg-slate-100 dark:bg-slate-800 p-4 overflow-hidden">
          <PDFViewer
            className="w-full h-full border rounded-md shadow-sm"
            showToolbar={true}
          >
            <PdfExportDocument title={title} blocks={blocks} />
          </PDFViewer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
