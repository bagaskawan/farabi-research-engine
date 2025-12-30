"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  Project,
  WorkbenchContent,
  ResearchPaper,
} from "@/lib/types/database";
import LoadingPage from "@/components/ui/loading-page";

import ProjectSidebar from "@/components/modules/workspace/reference-literature";
import WorkspaceHeader from "@/components/modules/workspace/workspace-header";
import WorkspaceCanvas from "@/components/modules/workspace/workspace-canvas";
import BlokHeader from "@/components/modules/research/BlokHeader";

interface WorkspacePageProps {
  projectId?: string;
}

export default function WorkspacePage({
  projectId: propProjectId,
}: WorkspacePageProps) {
  const params = useParams();
  const router = useRouter();
  const projectId = propProjectId || (params.id as string);

  const [project, setProject] = useState<Project | null>(null);
  const [content, setContent] = useState<WorkbenchContent | null>(null);
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch project data
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) {
        console.error("Error fetching project:", projectError);
        router.push("/");
        return;
      }

      setProject(projectData);

      // Fetch workbench content
      const { data: contentData } = await supabase
        .from("workbench_content")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (contentData) {
        setContent(contentData);
      }

      // Fetch research papers
      const { data: papersData } = await supabase
        .from("research_papers")
        .select("*")
        .eq("project_id", projectId)
        .order("citation_count", { ascending: false });

      if (papersData) {
        setPapers(papersData);
      }

      setIsLoading(false);
    }

    fetchData();
  }, [projectId, router]);

  // Extract first paragraph text from canvas_content for sidebar display
  const getProblemStatement = (): string | undefined => {
    if (!content?.canvas_content) return undefined;
    try {
      const blocks = content.canvas_content;
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].type === "paragraph" && blocks[i].content?.length > 0) {
          return blocks[i].content.map((c: any) => c.text || "").join("");
        }
      }
    } catch {
      return undefined;
    }
    return undefined;
  };

  // Show loading page while loading
  if (isLoading) {
    return <LoadingPage message="Preparing your workspace" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <BlokHeader />
      <div className="max-w-screen-2xl h-full mx-auto px-4 sm:px-6 lg:px-6 mt-12">
        <WorkspaceHeader
          isSaving={isSaving}
          projectId={projectId}
          projectTitle={project?.title || "Untitled"}
        />
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-8 mt-8">
          {/* Left: Canvas/Editor Area */}
          <WorkspaceCanvas
            canvasContent={content?.canvas_content}
            title={project?.title || "Untitled Research"}
            keyInsights={content?.key_insights || []}
            projectId={projectId}
            onSavingChange={setIsSaving}
          />

          {/* Right: Project Sidebar */}
          <ProjectSidebar
            papers={papers}
            keyInsights={content?.key_insights || []}
            problemStatement={getProblemStatement()}
          />
        </div>
      </div>
    </div>
  );
}
