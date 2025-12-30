"use client";

import { useState, useCallback } from "react";
import type { ResearchPaper } from "@/lib/types/database";

// Collapsible Section Component
interface SidebarSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function SidebarSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 py-3 px-1 text-left hover:bg-muted/50 transition-colors rounded-lg"
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-semibold text-foreground flex-1">
          {title}
        </span>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            isOpen ? "rotate-90" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
      {isOpen && <div className="pb-4 px-1">{children}</div>}
    </div>
  );
}

interface ProjectSidebarProps {
  papers: ResearchPaper[];
  keyInsights?: string[];
  problemStatement?: string;
}

export default function ProjectSidebar({
  papers,
  keyInsights = [],
  problemStatement,
}: ProjectSidebarProps) {
  const handleCopyQuote = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  return (
    <aside className="w-80 flex-shrink-0 bg-background">
      <div className="sticky top-12 h-[calc(100vh-48px)] overflow-y-auto p-4 scrollbar-subtle">
        {/* References */}
        <SidebarSection
          title={`References (${papers.length})`}
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          }
        >
          <div className="space-y-3">
            {papers.map((paper) => (
              <div key={paper.id} className="group">
                <div className="flex gap-2">
                  <span className="text-primary text-sm">›</span>
                  <div className="flex-1">
                    <p className="text-sm text-foreground font-medium line-clamp-2 group-hover:text-primary transition-colors cursor-pointer">
                      {paper.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {paper.authors?.slice(0, 2).join(", ")}
                      {paper.authors && paper.authors.length > 2 && " et al."}
                      {paper.year && ` (${paper.year})`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {paper.url && (
                        <a
                          href={paper.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          View Paper ↗
                        </a>
                      )}
                      <button
                        onClick={() =>
                          handleCopyQuote(paper.abstract || paper.title)
                        }
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {papers.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No references yet.
              </p>
            )}
          </div>
        </SidebarSection>
      </div>
    </aside>
  );
}
