"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkspaceHeaderProps {
  isSaving?: boolean;
}

export default function WorkspaceHeader({ isSaving }: WorkspaceHeaderProps) {
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
              <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
