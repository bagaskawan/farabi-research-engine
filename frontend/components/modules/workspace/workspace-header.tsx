"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { ArrowLeft, Ellipsis, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";

interface WorkspaceHeaderProps {
  isSaving?: boolean;
  projectId: string;
  projectTitle: string;
}

export default function WorkspaceHeader({
  isSaving,
  projectId,
  projectTitle,
}: WorkspaceHeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Handle delete confirmation
  const handleDeleteConfirm = async (event: React.MouseEvent) => {
    event.preventDefault(); // Prevent dialog from auto-closing

    // Validate input matches project title
    if (deleteConfirmationInput.trim() !== projectTitle.trim()) {
      setDeleteError(`Please type "${projectTitle}" to confirm.`);
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Delete related data first (due to foreign key constraints)
      // 1. Delete workbench_content
      await supabase
        .from("workbench_content")
        .delete()
        .eq("project_id", projectId);

      // 2. Delete research_papers
      await supabase
        .from("research_papers")
        .delete()
        .eq("project_id", projectId);

      // 3. Delete the project itself
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      // Redirect to dashboard after successful deletion
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Error deleting project:", error);
      setDeleteError(error.message || "Failed to delete project");
      setIsDeleting(false);
    }
  };

  // Reset dialog state when closing
  const handleDialogChange = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) {
      setDeleteConfirmationInput("");
      setDeleteError(null);
    }
  };

  return (
    <>
      <ThemeToggle />
      <header className="sticky top-0 z-50 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            {/* Left: Back Button */}
            <Link href="/dashboard">
              <Button variant="ghost" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke List Proyek</span>
              </Button>
            </Link>

            {/* Right: Save Status + More Menu */}
            <div className="flex items-center gap-3">
              {/* Save Status */}
              <span className="text-xs text-muted-foreground">
                {isSaving ? "Saving..." : ""}
              </span>

              {/* More Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center"
                  >
                    <Ellipsis className="w-4 h-4" />
                    <span className="sr-only">Settings</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    <span>Delete Project</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete this entire project permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              project and all its contents. Please type{" "}
              <strong className="text-foreground">{projectTitle}</strong> to
              confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-2 space-y-2">
            <Input
              value={deleteConfirmationInput}
              onChange={(e) => {
                setDeleteConfirmationInput(e.target.value);
                if (deleteError) setDeleteError(null);
              }}
              placeholder={projectTitle}
              className="my-2"
              autoFocus
            />
            {/* Error message */}
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Yes, delete this project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
